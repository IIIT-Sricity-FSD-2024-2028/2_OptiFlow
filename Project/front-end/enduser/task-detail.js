/* global Auth, Helpers, Sidebar, Toast, TasksStore */

let session,
  state,
  task,
  project,
  manager;

function getStoredUserRoleSlug() {
  try {
    const u = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    return String(u.role || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  } catch (_) {
    return "";
  }
}

function isTeamLeaderRole() {
  const sess = window.Auth ? window.Auth.getSession() : null;
  if (!sess) return false;
  // Check roleId 4 (auth.js Team Leader) or subRole
  return sess.roleId === 4 || sess.subRole === "team_leader" || sess.roleName === "Team_Leader";
}

function taskDisplayTitle(t) {
  if (!t) return "Untitled task";
  const raw =
    t.taskName ||
    t.task_name ||
    t.title ||
    t.name ||
    t.taskTitle ||
    t.projectTaskTitle;
  const s = raw != null && String(raw).trim() !== "" ? String(raw).trim() : "";
  return s || "Untitled task";
}

function strictNumericId(v) {
  if (window.TasksStore && typeof window.TasksStore.strictNumericId === "function") {
    return window.TasksStore.strictNumericId(v);
  }
  const n = parseInt(String(v == null ? "" : v).replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function numericSessionUserId(sess) {
  if (window.TasksStore && typeof window.TasksStore.parseNumericUserId === "function") {
    return window.TasksStore.parseNumericUserId(sess);
  }
  return Number(sess.rawId ?? sess.id);
}

function tlTeamMemberIds() {
  const tid = numericSessionUserId(session);
  if (!window.TasksStore || typeof window.TasksStore.teamMemberUserIds !== "function") return [];
  return window.TasksStore.teamMemberUserIds(state.users, tid);
}

function statusLabel(raw) {
  const s = String(raw || "").replace(/_/g, " ");
  return s || "Unknown";
}

function taskDueDisplay(t) {
  const d = t.dueDate || t.due_date || t.deadline || t.deadlineLabel;
  if (!d) return "N/A";
  try {
    return String(d).split(",")[0];
  } catch (_) {
    return String(d);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!sessionStorage.getItem("currentUser")) {
    window.location.replace("../login.html");
    return;
  }
  try {
  session = window.Auth.getSession();
  window.Sidebar.render("tasks");
  window.Toast.init();

  // ── Step 1: Get task ID from URL ──────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const taskIdParam = params.get("id");
  console.log("[task-detail] taskIdParam:", taskIdParam);

  // ── Step 2: Fetch task DIRECTLY from API (most reliable) ──────────────
  if (taskIdParam && taskIdParam !== "null" && taskIdParam !== "undefined") {
    try {
      const rawTask = await window.Helpers.api.request(`/tasks/${taskIdParam}`, "GET");
      // api.request already unwraps { success, data } — rawTask IS the task object
      if (rawTask && rawTask.task_id) {
        task = {
          id:             String(rawTask.task_id),
          taskId:         rawTask.task_id,
          title:          rawTask.title          || '',
          description:    rawTask.description    || '',
          projectId:      rawTask.project_id     || null,
          createdBy:      rawTask.created_by     || null,
          assignedTo:     rawTask.assigned_to    || null,
          assignedUserId: rawTask.assigned_to    ? String(rawTask.assigned_to) : null,
          priority:       rawTask.priority       || 'Medium',
          status:         rawTask.status         || 'Pending',
          estimatedHours: rawTask.estimated_hours || 0,
          dueDate:        rawTask.due_date       || null,
          completedAt:    rawTask.completed_at   || null,
          createdAt:      rawTask.created_at     || null,
          subtasks:       rawTask.subtasks       || [],
        };
        console.log("[task-detail] Task loaded from API:", task.title, "| status:", task.status);
      }
    } catch (taskErr) {
      console.warn("[task-detail] Direct task fetch failed:", taskErr.message);
    }
  }

  // ── Step 3: Load full state for supplementary data (project, users) ───
  try {
    state = await window.Helpers.getState();
  } catch (stateErr) {
    console.warn("[task-detail] getState() failed, using minimal state:", stateErr.message);
    state = { tasks: [], projects: [], users: [], subtasks: [], escalations: [], evidence: [], departments: [], roles: [], userRoles: [], complianceRules: [], complianceViolations: [], auditLogs: [], workflowInstances: [], workflowTemplates: [], workflowInstanceSteps: [], teams: [] };
  }

  // ── Step 4: Fallback to state lookup if direct fetch failed ───────────
  if (!task && taskIdParam) {
    task = state.tasks.find(
      (t) => String(t.taskId) === String(taskIdParam) || String(t.id) === String(taskIdParam)
    ) || null;
    console.log("[task-detail] State fallback lookup:", task ? "found" : "not found");
  }

  if (!task) {
    const ac = document.getElementById("alert-container");
    if (ac)
      ac.innerHTML =
        "<div class='banner-alert'>Task not found. Go back to <a href='my-tasks.html'>My Tasks</a>.</div>";
    document.getElementById("bc-task-name").textContent = "Not found";
    return;
  }

  project =
    state.projects.find(
      (p) => Number(p.projectId) === Number(task.projectId),
    ) ||
    state.projects.find((p) => String(p.id) === String(task.projectId)) ||
    { name: "General process", createdBy: null };

  manager =
    state.users.find((u) => Number(u.userId) === Number(task.createdBy || project.createdBy)) || {
      fullName: "System Admin",
      name: "System Admin",
    };

  renderPage();
  } catch (err) {
    console.error(err);
    window.Helpers.notifyApiError(err, "Unable to load task workspace.");
    const ac = document.getElementById("alert-container");
    if (ac)
      ac.innerHTML =
        "<div class='banner-alert'>Could not load data. Try again or return to My Tasks.</div>";
  }
});

function renderPage() {
  try {
    if (!task) return;

    document.getElementById("bc-task-name").textContent = taskDisplayTitle(task);
    const displayDate = taskDueDisplay(task);

    const tl = isTeamLeaderRole();

    let isPending =
      task.status === "not_started" &&
      taskDisplayTitle(task).toLowerCase().includes("report");

    const showAcceptanceFlow = isPending; // Legacy demo branch

    if (showAcceptanceFlow) {
      document.getElementById("alert-container").innerHTML = `
          <div class="banner-alert" style="background:#fffbeb; border-color:#fed7aa; border-radius:12px; padding:16px 20px; margin-bottom:24px; display:flex; gap:16px; align-items:flex-start">
            <div style="color:#d97706; margin-top:2px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
            <div>
              <div style="font-size:14px; font-weight:700; color:#b45309; margin-bottom:4px">Action required</div>
              <div style="font-size:13px; color:#92400e; line-height:1.5">${manager.fullName || manager.name || "Lead"} assigned you this task. Accept to begin.</div>
            </div>
          </div>`;
      document.getElementById("accept-row").style.display = "flex";
      document.getElementById("accept-row").innerHTML = `
          <div style="font-size:13px; color:var(--text-secondary)">Do you accept this task?</div>
          <div style="display:flex; gap:12px">
            <button class="btn btn-danger" onclick="declineTask()">Decline</button>
            <button class="btn btn-success" onclick="acceptTask()">Accept</button>
          </div>`;
      document.getElementById("decline-warning").style.display = "flex";
      document.getElementById("stage-current").innerHTML = `
          <div class="stage-dot active">2</div>
          <div class="stage-info"><div class="stage-name">Document preparation</div><div class="stage-sub" style="color:#d97706">Awaiting acceptance</div></div>`;
    } else {
      document.getElementById("alert-container").innerHTML = "";
      document.getElementById("accept-row").style.display = "none";
      document.getElementById("decline-warning").style.display = "none";
      document.getElementById("stage-current").innerHTML = `
          <div class="stage-dot active-blue">2</div>
          <div class="stage-info"><div class="stage-name">Document preparation</div><div class="stage-sub" style="color:var(--blue)">In progress</div></div>`;
    }

    let statLabel = showAcceptanceFlow
      ? "Pending acceptance"
      : statusLabel(task.status || task.statusLabel);
    let statStyle =
      "background:#f1f5f9; color:#64748b; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600";

    if (task.status === "Completed" || task.status === "done")
      statStyle =
        "background:#dcfce7; color:#15803d; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600";
    else if (
      ["In_Review", "Pending_TL_Review", "Pending_PM_Review", "Pending_Compliance"].includes(
        String(task.status),
      )
    )
      statStyle =
        "background:#ede9fe; color:#6b21a8; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600";
    else if (task.status === "Blocked")
      statStyle =
        "background:#ffedd5; color:#c2410c; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600";
    else if (showAcceptanceFlow)
      statStyle =
        "background:#ffedd5; color:#c2410c; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600";

    let actionsHTML = "";
    if (!showAcceptanceFlow && task.status !== "Completed" && task.status !== "done") {
      let isPending = ["Pending_TL_Review", "Pending_PM_Review", "Pending_Compliance", "In_Review", "Under_Review"].includes(task.status);
      const isTm = !tl;
      const isAssignedToTmTask = isTm && (Number(task.assignedTo) === numericSessionUserId(session));
      
      // If TM is not assigned to the parent task, check if their subtasks are pending
      if (isTm && !isAssignedToTmTask) {
         const mySubtasks = (state.subtasks || []).filter(s => Number(s.taskId) === Number(task.taskId) && Number(s.assignedTo) === numericSessionUserId(session));
         const activeSubtasks = mySubtasks.filter(s => s.status !== "Completed");
         if (activeSubtasks.length > 0 && activeSubtasks.every(s => ["Pending_TL_Review", "In_Review"].includes(s.status))) {
            isPending = true;
         }
      }

      const isAssignedToTm = tl && (Number(task.assignedTo) !== numericSessionUserId(session));
      const isAssignedToTl = tl && (Number(task.assignedTo) === numericSessionUserId(session));

      if (isTm) {
        actionsHTML = `
          <div style="display:flex; gap:12px; align-items:center">
            <button class="btn btn-secondary" onclick="openModal('blocker')">Report blocker</button>
            ${isPending ? `<button class="btn btn-primary" disabled style="opacity:0.6;cursor:not-allowed;">Under review</button>` : `<button class="btn btn-primary" onclick="openModal('submit')">Submit work</button>`}
          </div>`;
      } else if (isAssignedToTm) {
        actionsHTML = `
          <div style="display:flex; gap:12px; align-items:center">
            <button class="btn btn-primary" onclick="approveTaskWork()">Approve Work</button>
            <button class="btn btn-secondary" onclick="openRejectModal()">Reject / Request Changes</button>
            <button class="btn btn-danger" onclick="openModal('blocker')">Escalate to PM</button>
          </div>`;
      } else if (isAssignedToTl) {
        actionsHTML = `
          <div style="display:flex; gap:12px; align-items:center">
            <button class="btn btn-secondary" onclick="openModal('blocker')">Report blocker</button>
            ${isPending ? `<button class="btn btn-primary" disabled style="opacity:0.6;cursor:not-allowed;">Under review</button>` : `<button class="btn btn-primary" onclick="openModal('submit')">Submit to PM</button>`}
          </div>`;
      }
    }

    document.getElementById("detail-header").innerHTML = `
        <div style="width:100%; display:flex; justify-content:space-between; align-items:flex-start">
          <div>
            <h2 class="detail-title">${escapeHtml(taskDisplayTitle(task))}</h2>
            <div class="detail-meta-row">
              <span style="${statStyle}">${escapeHtml(statLabel)}</span>
              <span class="meta-divider">•</span>
              <span>Due ${escapeHtml(displayDate)}</span>
              <span class="meta-divider">•</span>
              <span>${escapeHtml(project.name || "")}</span>
              ${tl ? `<span class="meta-divider">•</span><span style="font-size:11px;color:var(--text-muted)">Team leader view</span>` : ""}
            </div>
          </div>
          ${actionsHTML}
        </div>`;

    document.getElementById("task-info").innerHTML = `
        <div><div class="lbl">Priority</div><div class="val">${escapeHtml(String(task.priority || task.priorityLabel || "Medium"))}</div></div>
        <div><div class="lbl">Assigned by</div><div class="val">${escapeHtml(manager.fullName || manager.name || "—")}</div></div>
        <div class="desc-box">
          <div class="lbl">Description</div>
          <div style="color:#475569">${escapeHtml(task.description || task.desc || "No description provided.")}</div>
        </div>`;

    const taskPk = task.taskId != null ? task.taskId : task.id;
    const subs = (state.subtasks || []).filter(
      (st) => Number(st.taskId) === Number(taskPk),
    );
    const subtasksHtml =
      subs.length === 0
        ? `<div style="padding:12px 0; font-size:13px; color:var(--text-muted)">No subtasks yet.</div>`
        : subs
            .map((st) => {
              const assignee =
                state.users.find((u) => Number(u.userId) === Number(st.assignedTo)) || {};
              const an = assignee.fullName || assignee.name || "Unknown";
              const done = st.status === "Completed";
              const badgeCls = done
                ? "background:#10b981;color:white"
                : "background:#e2e8f0;color:#475569";
              return `
              <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 0; border-bottom:1px solid var(--border)">
                <div>
                   <div style="font-size:13px; font-weight:600; color:var(--text-primary)">${escapeHtml(taskDisplayTitle(st))}</div>
                   <div style="font-size:11px; color:var(--text-muted); margin-top:2px">Assigned to: ${escapeHtml(an)}</div>
                </div>
                <div><span style="font-size:11px; font-weight:600; padding:4px 8px; border-radius:12px; ${badgeCls}">${escapeHtml(String(st.status || "Pending"))}</span></div>
              </div>
            `;
            })
            .join("");

    const addBtn = isTeamLeaderRole()
      ? `<button type="button" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="openSubtaskModal()">+ Add subtask</button>`
      : "";

    document.getElementById("subtasks-wrapper").innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 8px;">
               <div style="font-size: 14px; font-weight: 700; color: var(--text-primary)">Subtasks</div>
               ${addBtn}
            </div>
            <div style="margin-bottom: 24px" id="subtasks-container">
               ${subtasksHtml}
            </div>
          `;

    document.getElementById("activity-log").innerHTML = `
    <div style="display:flex; gap:12px; align-items:flex-start">
      <div style="width:32px; height:32px; border-radius:50%; background:var(--blue); color:white; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0">You</div>
      <div>
        <div style="font-size:13px; color:var(--text-primary)">Status · <strong>${escapeHtml(statusLabel(task.status))}</strong></div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px">Tracked from workspace</div>
      </div>
    </div>`;

    document.getElementById("modal-task-subtitle").textContent = taskDisplayTitle(task);
  } catch (e) {
    console.error("Render Error:", e);
    const ac = document.getElementById("alert-container");
    if (ac) ac.innerHTML = `<div class='banner-alert'>UI error: ${escapeHtml(e.message)}</div>`;
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function acceptTask() {
  try {
    await window.Helpers.api.request(`/tasks/${task.taskId}`, "PATCH", { status: "In_Progress" });
    state = await window.Helpers.getState();
    task = state.tasks.find((t) => Number(t.taskId) === Number(task.taskId));
    window.Toast.success("Accepted", "Task is now in progress.");
    renderPage();
  } catch (e) {
    console.error(e);
    window.Helpers.notifyApiError(e, (e && e.message) || "Could not update task.");
  }
}

async function approveTaskWork() {
  if (!task) return;
  try {
    await window.Helpers.api.request(`/tasks/${task.taskId}`, "PATCH", { status: "Completed" });
    window.Toast.success("Approved", "Task marked complete.");
    
    if (task && task.assignedTo) {
      window.Helpers.pushNotification(Number(task.assignedTo), {
        title:   'Task Approved',
        message: `Your work on "${task.title || task.taskName || 'Untitled'}" was approved by your Team Leader.`,
        type:    'success',
      });
    }
    
    state = await window.Helpers.getState();
    task = state.tasks.find((t) => Number(t.taskId) === Number(task.taskId));
    renderPage();
  } catch (e) {
    console.error(e);
    window.Helpers.notifyApiError(e, (e && e.message) || "Could not approve this task.");
  }
}

function openRejectModal() {
  if (window.Modal && typeof window.Modal.create === "function") {
    window.Modal.create({
      id: "reject-task-modal",
      title: "Reject Task",
      body: `
        <div class="form-group" style="margin: 0">
          <label class="form-label" for="reject-reason">Reason for rejection *</label>
          <textarea id="reject-reason" class="form-textarea" placeholder="Provide feedback on what needs to be changed..."></textarea>
        </div>
      `,
      actions: [
        { text: "Cancel", class: "btn-secondary", close: true },
        { 
          text: "Reject Task", 
          class: "btn-danger", 
          onClick: async () => {
            const reason = document.getElementById("reject-reason").value.trim();
            if (!reason) {
              window.Toast.error("Missing reason", "Please provide a reason for rejection.");
              return false;
            }
            try {
              await window.Helpers.api.request(`/tasks/${task.taskId}`, "PATCH", {
                status: "Rejected",
              });
              
              if (task && task.assignedTo) {
                window.Helpers.pushNotification(Number(task.assignedTo), {
                  title:   'Task Rejected',
                  message: `Task Rejected: "${task.title || task.taskName || 'Untitled'}". Reason: ${reason}`,
                  type:    'error',
                });
              }

              window.Toast.info("Returned", "Task has been rejected and sent back.");
              
              state = await window.Helpers.getState();
              task = state.tasks.find((t) => Number(t.taskId) === Number(task.taskId));
              renderPage();
              return true;
            } catch (e) {
              console.error(e);
              window.Helpers.notifyApiError(e, (e && e.message) || "Could not update task.");
              return false;
            }
          } 
        }
      ]
    });
  }
}

function declineTask() {
  window.Toast.warning("Not available", "Decline flow is not wired to the API in this build.");
}

function openSubtaskModal() {
  document.getElementById("subtask-title").value = "";
  const dueEl = document.getElementById("subtask-due");
  if (dueEl) dueEl.value = "";

  const selectEl = document.getElementById("subtask-assignee");
  const members = tlTeamMemberIds();
  const users = (state.users || []).filter((u) => members.includes(Number(u.userId)));
  if (users.length > 0) {
    selectEl.innerHTML =
      '<option value="">Select a team member…</option>' +
      users
        .map(
          (u) =>
            `<option value="${u.userId}">${escapeHtml(u.fullName || u.name || "User")}</option>`,
        )
        .join("");
  } else {
    selectEl.innerHTML =
      '<option value="">No direct reports found — add subtasks from the TL dashboard</option>';
  }

  document.getElementById("subtask-modal").classList.add("open");
}

function closeSubtaskModal() {
  document.getElementById("subtask-modal").classList.remove("open");
}

async function saveSubtask() {
  const titleEl = document.getElementById("subtask-title");
  const assigneeEl = document.getElementById("subtask-assignee");
  const dueEl = document.getElementById("subtask-due");
  const title = titleEl && titleEl.value.trim();
  const assigneeRaw = assigneeEl && assigneeEl.value;

  const terr = document.getElementById("subtask-title-error");
  const aerr = document.getElementById("subtask-assignee-error");
  if (terr) {
    terr.classList.add("hidden");
    terr.textContent = "";
  }
  if (aerr) {
    aerr.classList.add("hidden");
    aerr.textContent = "";
  }

  if (!title) {
    if (terr) {
      terr.textContent = "Title is required.";
      terr.classList.remove("hidden");
    }
    return;
  }
  if (!assigneeRaw) {
    if (aerr) {
      aerr.textContent = "Pick an assignee.";
      aerr.classList.remove("hidden");
    }
    return;
  }

  const body = {
    task_id: Number(task.taskId),
    title,
    assigned_to: Number(assigneeRaw),
    description: "",
  };
  if (dueEl && dueEl.value) body.due_date = dueEl.value;

  try {
    await window.Helpers.api.request("/subtasks", "POST", body);
    state = await window.Helpers.getState();
    task = state.tasks.find((t) => Number(t.taskId) === Number(task.taskId));
    closeSubtaskModal();
    renderPage();
    window.Toast.success("Subtask created", "Assigned to your team.");

    // ── Notify the assigned team member ──────────────────────────────────
    if (Number(assigneeRaw) && window.Helpers.pushNotification) {
      window.Helpers.pushNotification(Number(assigneeRaw), {
        title:   'New Subtask Assigned',
        message: `You have been assigned a new subtask: "${title}" under task "${task ? (task.title || task.taskName || 'Unknown') : 'Unknown'}".`,
        type:    'info',
      });
    }
  } catch (e) {
    console.error(e);
    window.Helpers.notifyApiError(e, (e && e.message) || "Cannot create subtask.");
  }
}

function openModal(type) {
  document.getElementById("blocker-modal").classList.add("open");
  switchTab(type);
}

function closeModals() {
  document.getElementById("blocker-modal").classList.remove("open");
}

function switchTab(type) {
  const tabs = document.querySelectorAll("#blocker-modal .modal-tab");
  tabs.forEach((t) => {
    t.style.color = "var(--text-muted)";
    t.style.borderBottom = "none";
  });

  if (type === "submit") {
    document.getElementById("tab-submit").style.color = "var(--blue)";
    document.getElementById("tab-submit").style.borderBottom = "2px solid var(--blue)";
    document.getElementById("modal-content-area").innerHTML = `
        <div style="background:#fffbeb; padding:12px; border-radius:8px; color:#b45309; font-size:12px; margin-bottom:24px;">
          ${
            isTeamLeaderRole()
              ? "As team leader, your submission is sent upward for PM or compliance review (not for your own TL queue)."
              : "This submission will be reviewed by your team leader."
          }
        </div>
        <div class="form-group">
          <label class="form-label" for="review-notes">Work notes / summary *</label>
          <textarea id="review-notes" class="form-textarea" placeholder="Describe the work completed…"></textarea>
          <span class="form-error hidden" id="review-notes-error"></span>
        </div>
      `;
    document.getElementById("modal-footer-area").innerHTML = `
        <button class="btn btn-secondary" onclick="closeModals()">Cancel</button>
        <button class="btn btn-primary" onclick="submitAct('review')">Submit</button>
      `;
  } else if (type === "blocker") {
    document.getElementById("tab-blocker").style.color = "var(--blue)";
    document.getElementById("tab-blocker").style.borderBottom = "2px solid var(--blue)";
    document.getElementById("modal-content-area").innerHTML = `
        <div style="background:#fff1f2; padding:12px; border-radius:8px; color:#be123c; font-size:12px; margin-bottom:24px;">
          Reporting a blocker will flag this task and can notify leadership.
        </div>
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label" for="blocker-type">Blocker type</label>
          <select id="blocker-type" class="form-select">
            <option value="Missing Information / Data">Missing information</option>
            <option value="System Issue / Bug">System issue</option>
            <option value="Dependency Delay">Dependency delay</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="blocker-desc">Description *</label>
          <textarea id="blocker-desc" class="form-textarea" placeholder="What's blocking progress?"></textarea> 
          <span class="form-error hidden" id="blocker-desc-error"></span>
        </div>
      `;
    document.getElementById("modal-footer-area").innerHTML = `
        <button class="btn btn-secondary" onclick="closeModals()">Cancel</button>
        <button class="btn btn-danger" onclick="submitAct('blocker')">Report blocker</button>
      `;
  } else if (type === "extension") {
    document.getElementById("tab-extension").style.color = "var(--blue)";
    document.getElementById("tab-extension").style.borderBottom = "2px solid var(--blue)";
    document.getElementById("modal-content-area").innerHTML =
      '<div style="font-size:13px;color:var(--text-muted);">Extension workflow is not connected to an API endpoint yet.</div>';
    document.getElementById("modal-footer-area").innerHTML =
      '<button class="btn btn-secondary" onclick="closeModals()">Close</button>';
  }
}

async function submitAct(type) {
  if (!task) return;

  if (type === "blocker") {
    const descEl = document.getElementById("blocker-desc");
    const notes = descEl ? descEl.value.trim() : "";
    if (!notes) {
      const err = document.getElementById("blocker-desc-error");
      if (err) {
        err.textContent = "Describe the blocker.";
        err.classList.remove("hidden");
      }
      window.Toast.error("Missing info", "Add a blocker description.");
      return;
    }

    try {
      await window.Helpers.api.request(`/tasks/${task.taskId}`, "PATCH", { status: "Blocked" });

      const pid = strictNumericId(task.projectId);
      const raw = numericSessionUserId(session);
      const sessionUser = state.users.find((u) => Number(u.userId) === Number(raw));
      const tlOrPm =
        strictNumericId(sessionUser?.managerId) ||
        strictNumericId(sessionUser?.reportsTo) ||
        (state.users[0] ? strictNumericId(state.users[0].userId) : null) ||
        1;

      if (pid) {
        const body = {
          task_id: strictNumericId(task.taskId) || Number(task.taskId),
          project_id: pid,
          reported_by: strictNumericId(raw) || Number(raw),
          target_manager_id: tlOrPm,
          escalated_to: tlOrPm,
          title: `Blocked: ${taskDisplayTitle(task)}`,
          description: notes,
          blocker_type: document.getElementById("blocker-type").value || "General",
          priority: "High",
        };
        await window.Helpers.api.request("/escalations", "POST", body);
        
        if (tlOrPm) {
          window.Helpers.pushNotification(tlOrPm, {
            title:   'New Blocker Reported',
            message: `Task Blocked: "${taskDisplayTitle(task)}". Reported by team member.`,
            type:    'warning',
          });
        }
      }

      window.Toast.success(
        "Escalation sent",
        "Task marked blocked and leadership notified.",
      );
      closeModals();
      state = await window.Helpers.getState();
      task = state.tasks.find((t) => Number(t.taskId) === Number(task.taskId));
      renderPage();
    } catch (e) {
      console.error(e);
      window.Helpers.notifyApiError(e, (e && e.message) || "Could not record blocker.");
    }
    return;
  }

  if (type === "review") {
    const notesEl = document.getElementById("review-notes");
    const notes = notesEl ? notesEl.value.trim() : "";
    if (!notes) {
      window.Toast.error("Missing summary", "Add work notes before submitting.");
      return;
    }

    const tl = isTeamLeaderRole();
    const p = project || {};
    const pname = String(p.name || p.projectName || "").toLowerCase();
    const complianceHint =
      /compliance|audit|iso|sox|gdpr|hipaa/.test(pname) ||
      /compliance|audit|iso|sox/i.test(taskDisplayTitle(task));

    const nextStatus = tl
      ? complianceHint
        ? "Pending_Compliance"
        : "Pending_PM_Review"
      : "Pending_TL_Review";

    try {
      const isTm = !tl;
      const isAssignedToTmTask = isTm && (Number(task.assignedTo) === numericSessionUserId(session));

      if (isTm && !isAssignedToTmTask) {
        const mySubtasks = (state.subtasks || []).filter(s => Number(s.taskId) === Number(task.taskId) && Number(s.assignedTo) === numericSessionUserId(session) && s.status !== "Completed");
        for (const st of mySubtasks) {
          await window.Helpers.api.request(`/subtasks/${st.subtaskId || st.id}`, "PATCH", { status: nextStatus });
        }
      } else {
        await window.Helpers.api.request(`/tasks/${task.taskId}`, "PATCH", { status: nextStatus });
      }

      window.Toast.success(
        "Submitted",
        tl
          ? "Routed for PM / compliance review."
          : "Sent to your team leader for review.",
      );
      closeModals();
      state = await window.Helpers.getState();
      task = state.tasks.find((t) => Number(t.taskId) === Number(task.taskId)) || task;
      project = state.projects.find(p => Number(p.projectId || p.id) === Number(task.projectId || task.project_id)) || project;
      renderPage();

      try {
        const tTitle = task.taskName || task.task_name || task.title || 'Task';
        const sessionUser = window.Auth.getSession();
        const p = project || {};
        let targetId = null;
        
        if (tl) {
          // If Team Leader, notify the Project Manager
          const proj = p.projectId ? p : (state.projects.find(prj => Number(prj.projectId || prj.id) === Number(task.projectId || task.project_id)) || {});
          targetId = proj.createdBy || proj.created_by || (state.users.find(u => u.roleId === 2 || u.roleName === "Project_Manager")?.userId);
        } else {
          // If Team Member, notify their Team Leader (managerId) or the task creator
          targetId = sessionUser.reportsTo || sessionUser.managerId || task.createdBy || task.created_by;
        }
        
        if (targetId) {
          window.Helpers.pushNotification(Number(targetId), {
            title:   'Work Submitted for Review',
            message: `${sessionUser?.name || sessionUser?.fullName || 'A team member'} submitted "${tTitle}" for review.`,
            type:    'info',
          });
        }
      } catch (_) {
        /* ignore */
      }
    } catch (e) {
      console.error(e);
      window.Helpers.notifyApiError(e, (e && e.message) || "Submit failed.");
    }
  }
}

async function submitBlocker() {
  await submitAct("blocker");
}

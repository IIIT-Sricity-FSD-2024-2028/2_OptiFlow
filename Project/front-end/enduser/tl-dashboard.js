/* global Auth, Helpers, Sidebar, Toast, TasksStore */

(function tlDashboardBoot() {
  let stateRef = null;
  let sessionNumericId = null;
  let teamMemberIds = [];
  let teamOverviewTasks = [];
  let reviewQueueTasks = [];
  /** When set from “Break down”, parent task dropdown is locked to this id */
  let tlSubtaskParentLockedId = null;

  function mapEscalationPriority(v) {
    const m = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
    const k = String(v || "medium").toLowerCase();
    return m[k] || "Medium";
  }

  function taskTitle(t) {
    return (t && (t.title || t.name || t.taskName || t.task_name)) || "";
  }

  function renderTeamEscalationLog() {
    const container = document.getElementById("tl-escalation-history");
    if (!container || !stateRef) return;

    const teamSet = new Set(teamMemberIds.map(Number));
    teamSet.add(Number(sessionNumericId));

    const teamEscalations = (stateRef.escalations || []).filter((e) => {
      const rid = Number(e.reportedBy);
      return teamSet.has(rid);
    });

    if (teamEscalations.length === 0) {
      container.innerHTML = `
      <div class="empty-state" style="padding-top:24px;">
        <div class="empty-state-text">No team escalations</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">When your team reports blockers, they appear here.</div>
      </div>`;
      return;
    }

    const sorted = [...teamEscalations].reverse();
    container.innerHTML = sorted
      .map((esc) => {
        const st = String(esc.status || "");
        const isResolved = st === "Resolved" || st === "Closed" || st === "resolved";
        const badgeClass = isResolved ? "badge-green" : "badge-orange";
        return `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:12px 10px; border-bottom:1px solid var(--border); ${!isResolved ? 'cursor:pointer; background:#fff1f2; border-radius:4px;' : ''}" ${!isResolved ? `onclick="window.TlDashboard.resolveEscalation(${esc.id})"` : ''}>
        <div style="flex:1">
          <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:4px;">${esc.title}</div>
          <div style="font-size:11px; color:var(--text-muted);">
            ${esc.createdAt ? new Date(esc.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""} · ${esc.blockerType || "Blocker"}
          </div>
          <div style="margin-top:8px">
            <a href="task-detail?id=${esc.taskId}" style="font-size:11px; color:var(--blue); text-decoration:none; font-weight:600" onclick="event.stopPropagation()">View task →</a>
          </div>
        </div>
        <span class="badge ${badgeClass}" style="flex-shrink:0;">${st.replace(/_/g, " ")}</span>
      </div>`;
      })
      .join("");
  }

  function populateTlEscalationTaskSelect() {
    const sel = document.getElementById("tl-esc-task");
    if (!sel) return;
    const list = teamOverviewTasks.length ? teamOverviewTasks : stateRef.tasks || [];
    sel.innerHTML =
      `<option value="">Select a team task …</option>` +
      list
        .map(
          (t) =>
            `<option value="${t.taskId}" data-project-id="${t.projectId || ""}">${taskTitle(t).replace(/"/g, "&quot;")}</option>`,
        )
        .join("");
  }

  function setupTlEscQuickFieldListeners() {
    const titleEl = document.getElementById("tl-esc-quick-title");
    const errEl = document.getElementById("tl-esc-quick-title-error");
    if (!titleEl || titleEl.dataset.liveBound === "1") return;
    titleEl.dataset.liveBound = "1";
    const clear = () => {
      if (errEl) {
        errEl.textContent = "";
        errEl.classList.add("hidden");
      }
    };
    titleEl.addEventListener("input", clear);
    titleEl.addEventListener("blur", () => {
      const v = (titleEl.value || "").trim();
      if (v && v.length < 5 && errEl) {
        errEl.textContent = "Use at least 5 characters.";
        errEl.classList.remove("hidden");
      }
    });
  }

  async function loadTlStateAndRender() {
    stateRef = await window.Helpers.getState();

    teamMemberIds =
      window.TasksStore && typeof window.TasksStore.teamMemberUserIds === "function"
        ? window.TasksStore.teamMemberUserIds(stateRef.users, sessionNumericId)
        : (stateRef.users || [])
            .filter((u) => Number(u.managerId || u.manager_id || u.reportsTo) === Number(sessionNumericId))
            .map((u) => Number(u.userId || u.user_id || u.id));
    
    console.log("[tl-dashboard] sessionNumericId:", sessionNumericId, "teamMemberIds:", teamMemberIds);

    teamOverviewTasks =
      window.TasksStore && typeof window.TasksStore.filterTeamOverviewTasksForLeader === "function"
        ? window.TasksStore.filterTeamOverviewTasksForLeader(stateRef.tasks, teamMemberIds)
        : (stateRef.tasks || []).filter((t) => teamMemberIds.includes(Number(t.assignedTo || t.assigned_to)));

    const parentTasksInReview = teamOverviewTasks.filter(t => ["In_Review", "Pending_TL_Review"].includes(t.status));
    const subtasksInReview = (stateRef.subtasks || []).filter(s => 
      teamMemberIds.includes(Number(s.assignedTo)) && ["In_Review", "Pending_TL_Review"].includes(s.status)
    ).map(s => ({
       ...s,
       taskId: s.taskId,
       isSubtask: true,
       title: `↳ ${s.title} (Subtask)`
    }));

    reviewQueueTasks = [...parentTasksInReview, ...subtasksInReview];

    const blocked = teamOverviewTasks.filter((t) => t.status === "Blocked").length;
    const done = teamOverviewTasks.filter((t) => t.status === "Completed").length;
    const inProgress = teamOverviewTasks.filter((t) =>
      ["In_Progress", "In_Review", "Pending_TL_Review"].includes(String(t.status)),
    ).length;

    const myProjectTask = teamOverviewTasks[0] || null;
    const myProject = myProjectTask
      ? stateRef.projects.find((p) => p.projectId === myProjectTask.projectId)
      : null;

    const teamEvidence = (stateRef.evidence || []).filter(
      (e) =>
        teamMemberIds.includes(Number(e.userId)) &&
        (e.status === "Pending" || e.status === "Under_Review"),
    );
    const pendingEvidenceCount = teamEvidence.length;

    const stats = document.getElementById("tl-stats");
    if (stats) {
      stats.style.display = "grid";
      stats.style.gridTemplateColumns = "repeat(5, 1fr)";
      stats.style.gap = "16px";
      stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Team size</div>
      <div class="stat-value"><div class="stat-number">${teamMemberIds.length}</div></div>
      <div class="stat-sub blue">Direct reports</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Team workload</div>
      <div class="stat-value"><div class="stat-number">${teamOverviewTasks.length}</div><div class="stat-arrow" onclick="window.location.href='my-tasks.html'">→</div></div>
      <div class="stat-sub blue">${inProgress} active tasks</div>
    </div>
    <div class="stat-card" style="${reviewQueueTasks.length ? "border:1px solid #c4b5fd;background:#faf5ff" : ""}">
      <div class="stat-label">Review queue</div>
      <div class="stat-value"><div class="stat-number">${reviewQueueTasks.length}</div></div>
      <div class="stat-sub ${reviewQueueTasks.length ? "orange" : "green"}">${reviewQueueTasks.length ? "Awaiting approval" : "Clear"}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Blocked</div>
      <div class="stat-value"><div class="stat-number">${blocked}</div></div>
      <div class="stat-sub ${blocked > 0 ? "red" : "green"}">${blocked > 0 ? "Unblock planning" : "None"}</div>
    </div>
    <div class="stat-card" style="cursor:pointer; border: 1px solid ${pendingEvidenceCount > 0 ? "#fed7aa" : "var(--border)"}; background: ${pendingEvidenceCount > 0 ? "#fffbeb" : "#fff"};" onclick="window.location.href='tl-evidence-review.html'">
      <div class="stat-label">Pending evidence</div>
      <div class="stat-value"><div class="stat-number">${pendingEvidenceCount}</div></div>
      <div class="stat-sub orange">${pendingEvidenceCount > 0 ? "Review →" : "Vault clear"}</div>
    </div>`;
    }

    const mgr = document.getElementById("tl-managerial-actions");
    if (mgr) {
      mgr.innerHTML = `
        <button type="button" class="btn btn-primary" onclick="event.preventDefault(); event.stopPropagation(); window.TlDashboard.openCreateSubtaskModal(null)">Create subtasks</button>
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('tl-review-queue-panel')?.scrollIntoView({behavior:'smooth'})">Approve work</button>
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('tl-review-queue-panel')?.scrollIntoView({behavior:'smooth'})" style="background:#fff;border:1px solid var(--border);color:var(--text-primary)">Reject / request changes</button>
      `;
    }

    const previewEl = document.getElementById("tl-team-overview-list");
    if (previewEl) {
      const preview = teamOverviewTasks.slice(0, 6);
      previewEl.innerHTML =
        preview.length === 0
          ? '<div class="empty-state"><div class="empty-state-text">No tasks allocated to your team yet</div></div>'
          : preview
              .map((t) => {
                const tid = t.taskId || t.id || '';
                let badgeClass = "badge-gray";
                if (t.status === "Completed") badgeClass = "badge-green";
                if (t.status === "In_Progress") badgeClass = "badge-blue";
                if (t.status === "In_Review" || t.status === "Pending_TL_Review")
                  badgeClass = "badge-purple";
                if (t.status === "Blocked") badgeClass = "badge-orange";

                const owner =
                  stateRef.users.find((u) => Number(u.userId) === Number(t.assignedTo)) || {};
                const name = owner.fullName || owner.name || "Assignee";

                return `
        <div data-task-id="${tid}" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="window.location.href='task-detail.html?id=${tid}'">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:2px">${taskTitle(t)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${name} · Due ${t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "N/A"}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-left:8px;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="event.preventDefault(); event.stopPropagation(); window.TlDashboard.openCreateSubtaskModal(${tid})">Break down</button>
            <span class="badge ${badgeClass}">${t.status || "Pending"}</span>
          </div>
        </div>`;
              })
              .join("");
    }

    const rq = document.getElementById("tl-review-queue-list");
    if (rq) {
      if (!reviewQueueTasks.length) {
        rq.innerHTML =
          '<div class="empty-state"><div class="empty-state-text">Nothing in review right now</div><div style="font-size:12px;color:var(--text-muted);margin-top:6px">When members submit work (<b>Pending TL Review</b> or <b>In Review</b>), it appears here.</div></div>';
      } else {
        rq.innerHTML = reviewQueueTasks
          .map((t) => {
            const owner =
              stateRef.users.find((u) => Number(u.userId) === Number(t.assignedTo)) || {};
            const name = owner.fullName || owner.name || "Member";
            const tid = t.isSubtask ? (t.subtaskId || t.id) : (t.taskId || t.id || '');
            const isSub = t.isSubtask ? 'true' : 'false';
            return `
          <div data-task-id="${tid}" style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid var(--border);gap:12px;cursor:pointer" onclick="window.location.href='task-detail.html?id=${t.taskId}'">
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:2px">${taskTitle(t)}</div>
              <div style="font-size:11px;color:var(--text-muted)">Submitted by ${name}</div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              <button type="button" class="btn btn-sm btn-primary" onclick="event.stopPropagation(); window.TlDashboard.approveWork(${tid}, ${isSub})">Approve work</button>
              <button type="button" class="btn btn-sm btn-secondary" style="background:#fff;border:1px solid var(--border);color:var(--text-primary)" onclick="event.stopPropagation(); window.TlDashboard.rejectWork(${tid}, ${isSub})">Reject / request changes</button>
              ${t.isSubtask ? '' : `<button type="button" class="btn btn-sm btn-secondary" onclick="event.preventDefault(); event.stopPropagation(); window.TlDashboard.openCreateSubtaskModal(${tid})">Create subtasks</button>`}
            </div>
          </div>`;
          })
          .join("");
      }
    }

    const po = document.getElementById("project-overview");
    if (po) {
      if (myProject) {
        let fc = "fill-blue";
        if (myProject.status === "On_Hold") fc = "fill-red";
        if (myProject.status === "Completed") fc = "fill-green";
        po.innerHTML = `
      <div style="margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:15px;font-weight:700;color:var(--text-primary)">${myProject.name}</div>
          <span class="badge ${fc.replace("fill-", "badge-")}">${myProject.status || ""}</span>
        </div>
        <div class="progress-wrap">
          <div class="progress-label"><span>Overall progress</span><span class="progress-pct">${myProject.progress || 0}%</span></div>
          <div class="progress-bar" style="background:#e2e8f0;border-radius:4px;height:8px;"><div class="progress-fill ${fc}" style="width:${myProject.progress || 0}%;height:100%;border-radius:4px;"></div></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;text-align:center">
        <div style="background:var(--main-bg);padding:12px;border-radius:var(--r);border:1px solid var(--border)"><div style="font-size:22px;font-weight:800">${myProject.totalTasks || teamOverviewTasks.length}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-top:4px">Scope</div></div>
        <div style="background:#eff6ff;padding:12px;border-radius:var(--r);border:1px solid #bfdbfe"><div style="font-size:22px;font-weight:800;color:var(--blue)">${inProgress}</div><div style="font-size:10px;color:var(--blue);text-transform:uppercase;margin-top:4px">Moving</div></div>
        <div style="background:#f0fdf4;padding:12px;border-radius:var(--r);border:1px solid #bbf7d0"><div style="font-size:22px;font-weight:800;color:var(--green)">${done}</div><div style="font-size:10px;color:var(--green);text-transform:uppercase;margin-top:4px">Done</div></div>
        <div style="background:#fef2f2;padding:12px;border-radius:var(--r);border:1px solid #fecaca"><div style="font-size:22px;font-weight:800;color:var(--red)">${blocked}</div><div style="font-size:10px;color:var(--red);text-transform:uppercase;margin-top:4px">Risk</div></div>
      </div>`;
      } else {
        po.innerHTML =
          '<div class="empty-state"><div class="empty-state-text">No project inferred from team tasks</div></div>';
      }
    }

    populateTlEscalationTaskSelect();
    renderTeamEscalationLog();
  }

  async function bootstrapTlDashboard() {
    if (!sessionStorage.getItem("currentUser")) {
      window.location.replace("../login.html");
      return;
    }
    const session = window.Auth.getSession();
    sessionNumericId = window.TasksStore && typeof window.TasksStore.parseNumericUserId === "function"
        ? window.TasksStore.parseNumericUserId(session)
        : parseInt(String(session.rawId || session.id || "").replace(/\D/g, ""), 10);

    window.Sidebar.render("dashboard");
    window.Toast.init();
    await window.Notifications.init();

    await loadTlStateAndRender();
    setupTlEscQuickFieldListeners();
  }

  async function approveWork(taskId, isSubtask = false) {
    try {
      const endpoint = isSubtask ? `/subtasks/${taskId}` : `/tasks/${taskId}`;
      await window.Helpers.api.request(endpoint, "PATCH", {
        status: "Completed",
      });
      window.Toast.success('Approved', 'Task marked complete.');
      
      const task = isSubtask 
         ? stateRef.subtasks.find((t) => Number(t.subtaskId || t.id) === Number(taskId))
         : stateRef.tasks.find((t) => Number(t.taskId) === Number(taskId));
         
      if (task && task.assignedTo) {
        window.Helpers.pushNotification(Number(task.assignedTo), {
          title:   'Task Approved',
          message: `Your work on "${task.title || task.taskName || 'Untitled'}" was approved by your Team Leader.`,
          type:    'success',
        });
      }

      // ── Notify Project Manager (the project creator) ──────────────────
      const project = (stateRef.projects || []).find(p => p.projectId === task.projectId);
      if (project && project.createdBy) {
        window.Helpers.pushNotification(Number(project.createdBy), {
          title:   'Task Finalized',
          message: `Team Leader has approved task: "${task.title || task.taskName || 'Untitled'}" in project "${project.name}".`,
          type:    'info',
        });
      }
      
      await loadTlStateAndRender();
    } catch (e) {
      console.error(e);
      window.Helpers.notifyApiError(e, (e && e.message) || "Could not approve this task.");
    }
  }

  function rejectWork(taskId, isSubtask = false) {
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
        footerHTML: `
          <button type="button" class="btn btn-secondary" onclick="window.Modal.close('reject-task-modal')">Cancel</button>
          <button type="button" class="btn btn-danger" id="tl-reject-submit-btn">Submit & Reassign</button>
        `
      });

      const submitBtn = document.getElementById("tl-reject-submit-btn");
      if (submitBtn) {
        submitBtn.addEventListener("click", async () => {
          const reason = document.getElementById("reject-reason").value.trim();
          if (!reason) {
            window.Toast.error("Missing reason", "Please provide a reason for rejection.");
            return;
          }
          try {
            const endpoint = isSubtask ? `/subtasks/${taskId}` : `/tasks/${taskId}`;
            await window.Helpers.api.request(endpoint, "PATCH", {
              status: "In_Progress",
            });
            
            const task = isSubtask 
              ? stateRef.subtasks.find((t) => Number(t.subtaskId || t.id) === Number(taskId))
              : stateRef.tasks.find((t) => Number(t.taskId) === Number(taskId));
              
            if (task && task.assignedTo) {
              window.Helpers.pushNotification(Number(task.assignedTo), {
                title:   'Task Returned for Rework',
                message: `Task Reassigned: "${task.title || task.taskName || 'Untitled'}". Feedback: ${reason}`,
                type:    'warning',
              });
            }

            window.Toast.info("Returned", "Task has been reassigned to the member.");
            window.Modal.close('reject-task-modal');
            await loadTlStateAndRender();
          } catch (e) {
            console.error(e);
            window.Helpers.notifyApiError(e, (e && e.message) || "Could not update task.");
          }
        });
      }
    }
  }

  function resolveEscalation(escId) {
    if (window.Modal && typeof window.Modal.create === "function") {
      window.Modal.create({
        id: "resolve-esc-modal",
        title: "Resolve Escalation",
        body: `
          <div class="form-group" style="margin: 0">
            <label class="form-label" for="resolve-notes">Resolution notes *</label>
            <textarea id="resolve-notes" class="form-textarea" placeholder="Explain how this blocker was resolved..."></textarea>
          </div>
        `,
        footerHTML: `
          <button type="button" class="btn btn-secondary" onclick="window.Modal.close('resolve-esc-modal')">Cancel</button>
          <button type="button" class="btn btn-success" id="tl-resolve-submit-btn">Mark as Resolved</button>
        `
      });

      const submitBtn = document.getElementById("tl-resolve-submit-btn");
      if (submitBtn) {
        submitBtn.addEventListener("click", async () => {
          const notes = document.getElementById("resolve-notes").value.trim();
          if (!notes) {
            window.Toast.error("Missing notes", "Please provide resolution notes.");
            return;
          }
          try {
            await window.Helpers.api.request(`/escalations/${escId}`, "PATCH", {
              status: "Resolved",
              notes: notes,
            });
            
            const esc = (stateRef.escalations || []).find(e => Number(e.id) === Number(escId));
            if (esc && esc.reportedBy) {
              window.Helpers.pushNotification(Number(esc.reportedBy), {
                title:   'Escalation Resolved',
                message: `Escalation Resolved: "${esc.title || 'Untitled'}". Notes: ${notes}`,
                type:    'success',
              });
            }

            window.Toast.success('Resolved', 'Escalation has been marked as resolved.');
            window.Modal.close('resolve-esc-modal');
            await loadTlStateAndRender();
          } catch (e) {
            console.error(e);
            window.Helpers.notifyApiError(e, (e && e.message) || 'Could not resolve escalation.');
          }
        });
      }
    }
  }

  function populateSubtaskParentSelect() {
    const sel = document.getElementById("tl-sub-parent-task");
    if (!sel) return;
    const list = teamOverviewTasks.length ? teamOverviewTasks : stateRef.tasks || [];
    sel.innerHTML =
      `<option value="">Select parent task …</option>` +
      list
        .map(
          (t) =>
            `<option value="${t.taskId || t.id}">${(taskTitle(t) || "Task #" + (t.taskId || t.id)).replace(/"/g, "&quot;")}</option>`,
        )
        .join("");
  }

  function populateSubtaskAssignees() {
    const sel = document.getElementById("tl-sub-assignee");
    if (!sel || !stateRef) return;
    const ids = teamMemberIds.length ? teamMemberIds : [];
    const users = (stateRef.users || []).filter((u) => {
      const uid = Number(u.userId || u.user_id || u.id);
      return ids.includes(uid);
    });
    sel.innerHTML =
      `<option value="">Select team member …</option>` +
      users
        .map((u) => {
          const uid = u.userId || u.user_id || u.id;
          const label = `${u.fullName || u.name || "User"}`;
          return `<option value="${uid}">${label.replace(/"/g, "&quot;")}</option>`;
        })
        .join("");
  }

  function openCreateSubtaskModal(parentTaskId) {
    tlSubtaskParentLockedId =
      parentTaskId != null && Number.isFinite(Number(parentTaskId)) ? Number(parentTaskId) : null;
    populateSubtaskParentSelect();
    populateSubtaskAssignees();
    const parentSel = document.getElementById("tl-sub-parent-task");
    if (parentSel) {
      parentSel.disabled = tlSubtaskParentLockedId != null;
      if (tlSubtaskParentLockedId != null) parentSel.value = String(tlSubtaskParentLockedId);
    }
    const label = document.getElementById("tl-sub-parent-label");
    if (label) {
      label.textContent = tlSubtaskParentLockedId
        ? `Breaking down task #${tlSubtaskParentLockedId}`
        : "Pick the team task this subtask rolls up under.";
    }
    const titleEl = document.getElementById("tl-sub-title");
    const dueEl = document.getElementById("tl-sub-due");
    if (titleEl) titleEl.value = "";
    if (dueEl) dueEl.value = "";
    ["tl-sub-title-error", "tl-sub-assignee-error", "tl-sub-parent-task-error"].forEach((id) => {
      const e = document.getElementById(id);
      if (e) {
        e.textContent = "";
        e.classList.add("hidden");
      }
    });
    const overlay = document.getElementById("tl-create-subtask-modal");
    if (overlay) overlay.classList.add("open");
  }

  function closeSubtaskModal() {
    const overlay = document.getElementById("tl-create-subtask-modal");
    if (overlay) overlay.classList.remove("open");
    const parentSel = document.getElementById("tl-sub-parent-task");
    if (parentSel) parentSel.disabled = false;
    tlSubtaskParentLockedId = null;
  }

  async function submitSubtask() {
    const title = (document.getElementById("tl-sub-title") || {}).value;
    const assigneeRaw = (document.getElementById("tl-sub-assignee") || {}).value;
    const due = (document.getElementById("tl-sub-due") || {}).value;
    let parentSel = document.getElementById("tl-sub-parent-task");
    let pid = parentSel && parentSel.value ? Number(parentSel.value) : NaN;
    if (tlSubtaskParentLockedId != null) pid = tlSubtaskParentLockedId;

    let ok = true;
    const terr = document.getElementById("tl-sub-title-error");
    const aerr = document.getElementById("tl-sub-assignee-error");
    const perr = document.getElementById("tl-sub-parent-task-error");
    [terr, aerr, perr].forEach((e) => {
      if (e) {
        e.textContent = "";
        e.classList.add("hidden");
      }
    });

    if (!title || String(title).trim().length < 2) {
      ok = false;
      if (terr) {
        terr.textContent = "Enter a title (min 2 characters).";
        terr.classList.remove("hidden");
      }
    }
    if (!assigneeRaw) {
      ok = false;
      if (aerr) {
        aerr.textContent = "Pick a team member.";
        aerr.classList.remove("hidden");
      }
    }
    if (!Number.isFinite(pid) || pid <= 0) {
      ok = false;
      if (perr) {
        perr.textContent = "Pick a parent task.";
        perr.classList.remove("hidden");
      }
    }
    if (!ok) return;

    const body = {
      task_id: pid,
      title: String(title).trim(),
      assigned_to: Number(assigneeRaw),
      description: "",
    };
    if (due) body.due_date = due;

    try {
      await window.Helpers.api.request("/subtasks", "POST", body);
      window.Toast.success("Subtask created", "Saved to the workspace.");

      // ── Notify the assigned team member ──────────────────────────────
      if (Number(assigneeRaw) && window.Helpers.pushNotification) {
        const parentTask = stateRef.tasks.find(t => Number(t.taskId) === pid);
        const taskName   = parentTask ? (parentTask.title || parentTask.taskName || `Task #${pid}`) : `Task #${pid}`;
        const memberUser = (stateRef.users || []).find(u => Number(u.userId) === Number(assigneeRaw));
        const memberName = memberUser ? (memberUser.fullName || memberUser.name || 'Team Member') : 'Team Member';
        const dueHint    = due ? ` Due: ${new Date(due).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}.` : '';
        window.Helpers.pushNotification(Number(assigneeRaw), {
          title:   'New Subtask Assigned',
          message: `Hi ${memberName.split(' ')[0]}, you have been assigned a new subtask: "${String(title).trim()}" under "${taskName}".${dueHint}`,
          type:    'info',
        });
      }

      closeSubtaskModal();
      await loadTlStateAndRender();
    } catch (e) {
      console.error(e);
      window.Helpers.notifyApiError(e, (e && e.message) || "Could not create subtask.");
    }
  }

  async function raiseTlEscalation() {
    const titleVal = window.Helpers.getVal("tl-esc-quick-title");
    const tlErr = document.getElementById("tl-esc-quick-title-error");
    if (!titleVal || titleVal.trim().length < 5) {
      if (tlErr) {
        tlErr.textContent = "Enter a descriptive title (at least 5 characters).";
        tlErr.classList.remove("hidden");
      }
      window.Toast.error("Missing information", "Add a descriptive title.");
      return;
    }
    if (tlErr) tlErr.classList.add("hidden");
    const sel = document.getElementById("tl-esc-task");
    const opt = sel && sel.selectedOptions && sel.selectedOptions[0];
    const taskId = opt ? Number(opt.value) : NaN;
    const projectFromOpt = opt && opt.dataset ? Number(opt.dataset.projectId) : NaN;
    if (!Number.isFinite(taskId) || taskId <= 0) {
      window.Toast.error("Task required", "Select a task for this escalation.");
      return;
    }
    const taskObj = stateRef.tasks.find((t) => Number(t.taskId) === taskId);
    const projectId =
      Number.isFinite(projectFromOpt) && projectFromOpt > 0
        ? projectFromOpt
        : taskObj?.projectId != null
          ? Number(taskObj.projectId)
          : null;
    if (!projectId) {
      window.Toast.error("Missing project", "Pick a task with a linked project.");
      return;
    }
    const project = stateRef.projects.find(p => p.projectId === projectId);
    const pmId = project ? project.createdBy : null;
    const me = stateRef.users.find((u) => Number(u.userId) === Number(sessionNumericId));
    let targetManagerStr = pmId || me?.managerId || me?.reportsTo || (stateRef.users.find(u => u.roleId === 2 || u.role_id === 2)?.userId);
    let targetManager = targetManagerStr ? parseInt(String(targetManagerStr).replace(/[^0-9]/g, ''), 10) : null;

    const body = {
      task_id: taskId,
      project_id: projectId,
      reported_by: Number(sessionNumericId),
      target_manager_id: targetManager,
      escalated_to: targetManager,
      title: window.Helpers.getVal("tl-esc-quick-title"),
      description: window.Helpers.getVal("tl-esc-quick-title"),
      blocker_type: window.Helpers.getVal("tl-esc-quick-blocker") || "General",
      priority: mapEscalationPriority(window.Helpers.getVal("tl-esc-quick-priority")),
    };
    try {
      await window.Helpers.api.request("/escalations", "POST", body);
      
      // Notify the target PM/manager with their real numeric ID
      if (targetManager) {
        // Notification 1: General Escalation Alert
        window.Helpers.pushNotification(targetManager, {
          title:   'New Escalation Raised',
          message: `New Escalation from Team Leader: "${window.Helpers.getVal("tl-esc-quick-title")}" for task: ${taskObj?.title || taskObj?.taskName || 'Unknown task'}.`,
          type:    'warning',
        });

        // Notification 2: High Priority System Alert (Requirement)
        window.Helpers.pushNotification(targetManager, {
          title:   'Priority Management Alert',
          message: `URGENT: A new blocker has been flagged by a Team Leader that requires your immediate attention.`,
          type:    'error',
        });
      }

      window.Toast.success("Escalation recorded", "Your PM / manager chain has been notified.");
      document.getElementById("tl-esc-quick-title").value = "";
      await loadTlStateAndRender();
    } catch (e) {
      console.error(e);
      window.Helpers.notifyApiError(e, (e && e.message) || "Failed to raise escalation.");
    }
  }

  window.TlDashboard = {
    init: bootstrapTlDashboard,
    approveWork,
    rejectWork,
    resolveEscalation,
    raiseEscalation: raiseTlEscalation,
    openCreateSubtaskModal,
    closeSubtaskModal,
    submitSubtask,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapTlDashboard);
  } else {
    bootstrapTlDashboard();
  }
})();

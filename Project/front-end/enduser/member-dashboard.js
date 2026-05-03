/* global Auth, Helpers, Sidebar, Toast, TasksStore */

(function memberDashboardBoot() {
  let stateRef = null;
  let rawIdRef = null;

  function taskDisplayTitle(t) {
    if (!t) return "";
    return t.title || t.name || t.taskName || t.task_name || "";
  }

  function strictId(v) {
    return window.TasksStore && typeof window.TasksStore.strictNumericId === "function"
      ? window.TasksStore.strictNumericId(v)
      : parseInt(String(v == null ? "" : v).replace(/[^0-9]/g, ""), 10) || null;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function badgeClassForTask(t, isCompleted) {
    if (isCompleted) return "badge-green";
    if (t.overdue && t.status !== "Completed") return "badge-red";
    if (t.status === "In_Progress") return "badge-blue";
    if (t.status === "In_Review" || t.status === "Pending_TL_Review") return "badge-purple";
    if (t.status === "Blocked") return "badge-orange";
    return "badge-gray";
  }

  function mapEscalationPriority(v) {
    const m = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
    const k = String(v || "medium").toLowerCase();
    return m[k] || "Medium";
  }

  function setupMemberEscFieldListeners() {
    const titleEl = document.getElementById("member-esc-quick-title");
    const errEl = document.getElementById("member-esc-quick-title-error");
    if (!titleEl || titleEl.dataset.liveBound === "1") return;
    titleEl.dataset.liveBound = "1";
    titleEl.addEventListener("input", () => {
      if (errEl) errEl.classList.add("hidden");
    });
    titleEl.addEventListener("blur", () => {
      const v = (titleEl.value || "").trim();
      if (v && v.length < 5 && errEl) {
        errEl.textContent = "Use at least 5 characters.";
        errEl.classList.remove("hidden");
      }
    });
  }

  async function refreshMemberDashboard() {
    try {
      stateRef = await window.Helpers.getState();
      paintMemberDashboard();
      window.__memberDashboardState = stateRef;
      window.__memberRawId = rawIdRef;
    } catch (e) {
      console.error(e);
      window.Helpers.notifyApiError(e);
      const b = document.getElementById("debug-banner");
      if (b) {
        b.style.display = "block";
        b.innerHTML = `<b>UI Error:</b> ${escapeHtml(e.message || String(e))}`;
      }
    }
  }

  function paintMemberDashboard() {
    const state = stateRef;
    const rawId = rawIdRef;
    if (!state || rawId == null) return;

    const sessionUser = (state.users || []).find((u) => Number(u.userId) === Number(rawId));
    const myLeader = sessionUser
      ? (state.users || []).find((u) => Number(u.userId) === Number(sessionUser.managerId))
      : null;

    const myLeaderName = myLeader ? myLeader.fullName || myLeader.name : null;
    const badgeArea = document.getElementById("reporting-badge-area");
    if (badgeArea) {
      badgeArea.innerHTML = myLeaderName
        ? `
            <div style="display:flex; align-items:center; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; padding:6px 14px 6px 6px; border-radius:99px; font-size:12px; color:#475569; font-weight:500;">
              <div style="width:28px; height:28px; border-radius:50%; background:var(--blue); color:white; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700;">
                ${escapeHtml(myLeaderName.charAt(0).toUpperCase())}
              </div>
              <span>Reporting to: <span style="color:#0f172a; font-weight:600">${escapeHtml(myLeaderName)}</span></span>
            </div>`
        : "";
    }

    const myTasks =
      window.TasksStore && typeof window.TasksStore.filterExecutionTasksForMember === "function"
        ? window.TasksStore.filterExecutionTasksForMember(state.tasks, rawId)
        : [];
        
    const mySubtasks = (state.subtasks || []).filter(s => Number(s.assignedTo) === Number(rawId));
    myTasks.push(...mySubtasks);

    const myFirstTask = myTasks[0] || null;
    const myProject = myFirstTask
      ? state.projects.find((p) => p.projectId === myFirstTask.projectId)
      : null;

    const done = myTasks.filter((t) => t.status === "Completed").length;
    const progress = myTasks.filter((t) =>
      ["In_Progress", "In_Review", "Pending_TL_Review"].includes(String(t.status)),
    ).length;
    const total = myTasks.length;
    const overdue = myTasks.filter((t) => t.overdue && t.status !== "Completed").length;

    const statsEl = document.getElementById("member-stats");
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">My assigned tasks</div>
          <div class="stat-number">${total}</div>
          <div class="stat-sub">Active scope</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">In progress</div>
          <div class="stat-number">${progress}</div>
          <div class="stat-sub blue">Including review</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Completed</div>
          <div class="stat-number">${done}</div>
          <div class="stat-sub green">Done</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Overdue</div>
          <div class="stat-number">${overdue}</div>
          <div class="stat-sub ${overdue ? "orange" : "green"}">${overdue ? "Needs attention" : "On track"}</div>
        </div>
        <div class="stat-card" style="background:#f8fafc">
          <div class="stat-label">Project</div>
          <div class="stat-number" style="color:var(--blue)">${myProject ? `${myProject.progress || 0}%` : "N/A"}</div>
          <div class="stat-sub" style="max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${myProject ? escapeHtml(myProject.name) : "No project"}</div>
        </div>`;
    }

    const execBar = document.getElementById("tm-execution-actions");
    if (execBar) {
      execBar.innerHTML = `
          <button type="button" class="btn btn-primary" onclick="window.location.href='my-tasks.html'">My tasks</button>
          <button type="button" class="btn btn-secondary" onclick="window.location.href='evidence.html'">Upload evidence</button>
          <button type="button" class="btn btn-secondary" style="background:#fff;border:1px solid var(--border)" onclick="document.getElementById('tm-report-blocker')?.scrollIntoView({behavior:'smooth'})">Report blocker</button>
        `;
    }

    const list = document.getElementById("member-tasks-list");
    if (!list) return;

    if (myTasks.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-text">No tasks assigned yet</div><div style="font-size:12px;color:var(--text-muted);margin-top:6px">Check with your team leader.</div></div>`;
    } else {
      list.innerHTML = myTasks
        .slice(0, 8)
        .map((t) => {
          const proj =
            (state.projects || []).find((p) => p.projectId === t.projectId) || {
              name: "General",
            };
          const assignerId = t.createdBy || myFirstTask?.createdBy || null;
          const assigner =
            (state.users || []).find((u) => Number(u.userId) === Number(assignerId)) || {};
          const assignerFullName = assigner.fullName || assigner.name || "Lead";
          const parts = assignerFullName.split(" ");
          const assignerFormatted =
            parts[0] + (parts[1] ? " " + parts[1][0] + "." : "");
          const isChecked = t.status === "Completed";
          const statClass = badgeClassForTask(t, isChecked);
          const dateFmt = t.dueDate
            ? new Date(t.dueDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })
            : "N/A";
          const tid = t.taskId;
          const tname = escapeHtml(taskDisplayTitle(t) || "Untitled");

          return `
          <div class="hover-bg" style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:1px solid var(--border); cursor:pointer; margin: 0 -12px; border-radius: 8px; transition: background 0.2s;" onclick="window.location.href='task-detail.html?id=${tid}'">
            <div style="display:flex; align-items:center; gap:12px; flex:1">
              <div>
                <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:4px">${tname}</div>
                <div style="font-size:12px; color:var(--text-muted)">${escapeHtml(proj.name)} · Assigned by ${escapeHtml(assignerFormatted)}</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
              <span class="badge ${statClass}">${escapeHtml(String(t.status || "Pending"))}</span>
              <span style="font-size:12px; font-weight:600; color:${t.overdue && !isChecked ? "var(--red)" : "var(--text-secondary)"}; width:54px; text-align:right">${dateFmt}</span>
            </div>
          </div>`;
        })
        .join("");
      if (list.lastElementChild) list.lastElementChild.style.borderBottom = "none";
    }

    const upcoming = myTasks
      .filter((t) => t.status !== "Completed" && t.status !== "Cancelled")
      .slice(0, 3);
    const upContainer = document.getElementById("upcoming-deadlines");
    if (upContainer) {
      if (upcoming.length === 0) {
        upContainer.innerHTML =
          '<div style="font-size:13px; color:var(--text-muted)">No upcoming deadlines</div>';
      } else {
        const colors = ["#ef4444", "#f59e0b", "#3b82f6"];
        upContainer.innerHTML = upcoming
          .map(
            (t, idx) => `
          <div>
            <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:2px">${escapeHtml(taskDisplayTitle(t) || "Task")}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px">Due ${t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN",{day:'numeric',month:'short'}) : "N/A"}</div>
            <div style="height:4px; background:#f1f5f9; border-radius:2px; overflow:hidden; display:flex;">
              <div style="height:100%; width:${70 - idx * 20}%; background:${colors[idx % 3]}; border-radius:2px"></div>
            </div>
          </div>`,
          )
          .join("");
      }
    }

    const compContainer = document.getElementById("compliance-activity");
    if (compContainer) {
      const myComplianceTasks = state.complianceItems
        ? state.complianceItems.filter(
            (c) => c.projectName === (myProject ? myProject.name : ""),
          )
        : [];
      if (myComplianceTasks.length === 0) {
        compContainer.innerHTML = `
          <div class="empty-state" style="padding: 20px 0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px; height:32px; color:var(--text-muted); margin:0 auto 8px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div class="empty-state-text">No active requirements</div>
            <button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="window.location.href='evidence.html'">Open evidence vault</button>
          </div>`;
      } else {
        compContainer.innerHTML = myComplianceTasks
          .map(
            (c) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border); cursor:pointer" onclick="window.location.href='evidence.html'">
            <div>
              <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:2px">${escapeHtml(c.policy || "Policy")} requirement</div>
              <div style="font-size:11px; color:var(--text-muted)">Project: ${escapeHtml(c.projectName || "")}</div>
            </div>
            <span class="badge ${c.status === "at_risk" || c.status === "violation" ? "badge-orange" : "badge-green"}">${escapeHtml(c.evidenceLabel || "")}</span>
          </div>`,
          )
          .join("");
        if (compContainer.lastElementChild) compContainer.lastElementChild.style.borderBottom = "none";
        compContainer.innerHTML += `<button class="btn btn-secondary btn-sm" style="width:100%; margin-top:12px" onclick="window.location.href='evidence.html'">Upload evidence</button>`;
      }
    }

    populateEscalationTaskSelect(myTasks);
  }

  async function bootstrapMemberDashboard() {
    try {
      if (!sessionStorage.getItem("currentUser")) {
        window.location.replace("../login.html");
        return;
      }
      const session = window.Auth.getSession();
      rawIdRef =
        window.TasksStore && typeof window.TasksStore.parseNumericUserId === "function"
          ? window.TasksStore.parseNumericUserId(session)
          : Number(session.rawId ?? session.id);

      window.Sidebar.render("dashboard");
      window.Toast.init();

      const b = document.getElementById("debug-banner");
      if (b) {
        b.style.display = "none";
        b.innerHTML = "";
      }

      await refreshMemberDashboard();
      setupMemberEscFieldListeners();
    } catch (error) {
      console.error(error);
      window.Helpers.notifyApiError(error);
      const b = document.getElementById("debug-banner");
      if (b) {
        b.style.display = "block";
        b.innerHTML = `<b>UI Error:</b> ${escapeHtml(error.message || String(error))}`;
      }
    }
  }

  function populateEscalationTaskSelect(myTasks) {
    const sel = document.getElementById("member-esc-task");
    if (!sel) return;
    sel.innerHTML =
      `<option value="">Select a task …</option>` +
      myTasks
        .map((t) => {
          const label = (taskDisplayTitle(t) || "Task").replace(/"/g, "&quot;");
          return `<option value="${t.taskId}" data-project-id="${t.projectId || ""}">${label}</option>`;
        })
        .join("");
  }

  async function toggleTaskComplete(taskId) {
    const state = window.__memberDashboardState;
    if (!state) return;
    const task = state.tasks.find((t) => Number(t.taskId) === Number(taskId));
    if (!task) return;
    const newStatus = task.status === "Completed" ? "In_Progress" : "Completed";
    try {
      await window.Helpers.api.request(`/tasks/${task.taskId}`, "PATCH", {
        status: newStatus,
      });
      window.Toast.success(
        newStatus === "Completed" ? "Marked complete" : "Reopened",
        "Workspace updated.",
      );
      await refreshMemberDashboard();
    } catch (e) {
      console.error("Failed to update task status", e);
      window.Helpers.notifyApiError(e, (e && e.message) || "Update failed.");
    }
  }

  async function raiseMemberEscalation() {
    const titleVal = window.Helpers.getVal("member-esc-quick-title");
    const titleErr = document.getElementById("member-esc-quick-title-error");
    if (!titleVal || titleVal.trim().length < 5) {
      if (titleErr) {
        titleErr.textContent = "Enter an issue title (at least 5 characters).";
        titleErr.classList.remove("hidden");
      }
      window.Toast.error(
        "Missing information",
        "Provide an issue title (min 5 characters).",
      );
      return;
    }
    if (titleErr) titleErr.classList.add("hidden");

    const state = window.__memberDashboardState;
    const rawId = window.__memberRawId;
    if (!state || rawId == null) return;

    const sel = document.getElementById("member-esc-task");
    const opt = sel && sel.selectedOptions && sel.selectedOptions[0];
    const taskId = strictId(opt && opt.value) || NaN;
    const projRaw = opt && opt.dataset ? opt.dataset.projectId : "";
    const projectFromOpt = strictId(projRaw);
    if (!Number.isFinite(taskId) || taskId <= 0) {
      window.Toast.error("Pick a task", "Select which task is blocked.");
      return;
    }

    const taskObj = state.tasks.find((t) => Number(t.taskId) === taskId);
    const projectId =
      projectFromOpt && projectFromOpt > 0
        ? projectFromOpt
        : taskObj && taskObj.projectId != null
          ? strictId(taskObj.projectId)
          : null;
    if (!projectId) {
      window.Toast.error("Missing project", "Chosen task needs a linked project.");
      return;
    }

    const sessionUser = (state.users || []).find((u) => Number(u.userId) === Number(rawId));
    let targetManagerStr = taskObj?.createdBy || sessionUser?.managerId || sessionUser?.reportsTo || (state.users[0]?.userId) || 1;
    let targetManager = parseInt(String(targetManagerStr).replace(/[^0-9]/g, ''), 10) || 1;

    const priority = window.Helpers.getVal("member-esc-quick-priority");
    const blocker = window.Helpers.getVal("member-esc-quick-blocker") || "General";

    const body = {
      task_id: taskId,
      project_id: projectId,
      reported_by: strictId(rawId) || Number(rawId),
      target_manager_id: targetManager,
      escalated_to: targetManager,
      title: window.Helpers.getVal("member-esc-quick-title"),
      description: window.Helpers.getVal("member-esc-quick-title"),
      blocker_type: blocker,
      priority: mapEscalationPriority(priority),
    };

    try {
      await window.Helpers.api.request("/escalations", "POST", body);
      window.Toast.success(
        "Escalation sent to team leader",
        "Leadership has been notified about this blocker.",
      );
      document.getElementById("member-esc-quick-title").value = "";
      if (document.getElementById("member-esc-quick-blocker"))
        document.getElementById("member-esc-quick-blocker").selectedIndex = 0;
      if (document.getElementById("member-esc-quick-priority"))
        document.getElementById("member-esc-quick-priority").value = "medium";
      await refreshMemberDashboard();
    } catch (e) {
      console.error(e);
      window.Helpers.notifyApiError(e, (e && e.message) || "Failed to submit escalation.");
    }
  }

  window.MemberDashboard = {
    init: bootstrapMemberDashboard,
    toggleTaskComplete,
    raiseEscalation: raiseMemberEscalation,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapMemberDashboard);
  } else {
    bootstrapMemberDashboard();
  }
})();

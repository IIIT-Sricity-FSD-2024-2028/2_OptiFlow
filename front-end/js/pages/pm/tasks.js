/**
 * Tasks page JS (Project Detailed Dashboard) — Updated to match Figma design
 */
window.TasksPage = {
  state: null,
  project: null,
  tasks: [],

  async init() {
    const sessionRaw = sessionStorage.getItem('currentUser');
    if (sessionRaw) {
      try {
        const s = JSON.parse(sessionRaw);
        const role = String(s.role || '').toLowerCase();
        const label = String(s.roleLabel || '').toLowerCase();
        if (role === 'company_owner' || label.includes('owner') || label.includes('ceo')) {
          window.location.href = '../admin/executive/executive_tasks.html';
          return;
        }
      } catch { /* continue */ }
    }

    this.state = await window.Helpers.getState();
    const urlParam = window.Helpers.getParam("project");
    const localParam = localStorage.getItem("selectedProjectId");
    const param = urlParam || localParam || "1";

    // SAFETY GUARD: Prevent crash if the project database is empty
    if (!this.state.projects || this.state.projects.length === 0) {
      console.warn("No projects found in database!");
      return;
    }

    this.project =
      this.state.projects.find((p) => String(p.id || p.projectId) === String(param)) || this.state.projects[0];

    // SAFETY GUARD: Stop rendering if project doesn't exist
    if (!this.project) return;

    const currentProjId = String(this.project.id || this.project.projectId);
    this.tasks = this.state.tasks.filter(
      (t) => String(t.projectId) === currentProjId,
    );
    this.render();
    this.bindEvents();
  },
  
  render() {
    const p = this.project;
    if (!p) return;

    const param = window.Helpers.getParam("project") || "none";
    // Header Breadcrumb
    window.Helpers.setHTML(
      "page-breadcrumb",
      `
      <a class="breadcrumb-link" href="projects.html">Projects</a>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-current">${p.name}</span>`,
    );

    // Project header info
    const statusCls = window.Helpers.statusClass(p.status);
    const dateLabel = p.endDate
      ? p.endDate.split("-").slice(1).reverse().join("/")
      : "—";
    const dept =
      (this.state.departments.find((d) => d.id === p.departmentId) || {})
        .name || "Unknown";

    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter(t => t.status === "Completed" || t.status === "resolved").length;
    let computedProgress = totalTasks ? Math.round((completedTasks/totalTasks)*100) : 0;
    
    window.Helpers.setHTML(
      "project-header-container",
      `
      <div class="project-header-card" style="padding:24px; background:#fff; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:24px; box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <h1 style="font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#0f172a;line-height:1.2">${p.name}</h1>
              <span class="badge ${statusCls}">${p.status || p.statusLabel || ''}</span>
            </div>
            <div style="display:flex;align-items:center;gap:16px;font-size:13px;color:#64748b">
              <span style="display:flex;align-items:center;gap:4px">Due: ${dateLabel}</span>
              <span style="display:flex;align-items:center;gap:4px">Dept: ${dept}</span>
              <span style="display:flex;align-items:center;gap:4px">ID: P-${(this.project.projectId || this.project.id).toString().padStart(4, "0")}</span>
            </div>
          </div>
          <div style="display:flex;gap:12px">
            <button class="btn btn-secondary" onclick="window.location.href='compliance-dashboard.html'" style="border:1px solid #e2e8f0; background:#fff; color:#475569; padding:8px 16px; border-radius:8px">View Compliance</button>
            <button class="btn btn-primary" id="btn-add-task" style="background:#2563eb; color:white; padding:8px 16px; border-radius:8px">+ Create Task</button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; margin:24px 0 16px">
          <div style="background:#f0f7ff; border-radius:10px; padding:16px; text-align:center">
            <div style="font-size:28px; font-weight:800; color:#0f172a; line-height:1">${totalTasks}</div>
            <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-top:6px">Total Tasks</div>
          </div>
          <div style="background:#f0f7ff; border-radius:10px; padding:16px; text-align:center">
            <div style="font-size:28px; font-weight:800; color:#2563eb; line-height:1">${this.tasks.filter(t => t.status === "In_Progress").length}</div>
            <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-top:6px">In Progress</div>
          </div>
          <div style="background:#f0f7ff; border-radius:10px; padding:16px; text-align:center">
            <div style="font-size:28px; font-weight:800; color:#10b981; line-height:1">${completedTasks}</div>
            <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-top:6px">Completed</div>
          </div>
          <div style="background:#fef2f2; border-radius:10px; padding:16px; text-align:center">
            <div style="font-size:28px; font-weight:800; color:#ef4444; line-height:1">${this.tasks.filter(t => t.overdue).length}</div>
            <div style="font-size:10px; font-weight:700; color:#ef4444; text-transform:uppercase; letter-spacing:1px; margin-top:6px">Overdue</div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:16px">
          <div style="font-size:13px; font-weight:600; color:#475569; width:120px">Overall Progress</div>
          <div style="flex:1; height:8px; background:#e2e8f0; border-radius:99px; overflow:hidden">
            <div style="height:100%; width:${computedProgress}%; background:#2563eb; border-radius:99px;"></div>
          </div>
          <div style="font-size:13px; font-weight:700; color:#0f172a; width:40px; text-align:right">${computedProgress}%</div>
        </div>
      </div>`,
    );

    this.renderTasksTable();
    this.renderTeamPanel();
    this.renderCompliancePanel();
  },

  renderTasksTable() {
    const container = document.getElementById("tasks-table-body");
    if (!container) return;

    if (this.tasks.length === 0) {
      container.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:40px">
        <div class="empty-state-text">No tasks yet</div>
        <div class="empty-state-sub">Click "+ Create Task" to add the first task.</div>
      </div></td></tr>`;
      return;
    }

    container.innerHTML = this.tasks
      .map((t) => {
        const pDotCls = `priority-dot priority-${(t.priority || "").toLowerCase()}`;

        let sBadgeClass = "badge-gray";
        if (t.status === "Completed" || t.status === "resolved") sBadgeClass = "badge-green";
        if (t.status === "In_Progress" || t.status === "In_Review")
          sBadgeClass = "badge-blue";
        if (t.status === "Pending" || t.status === "open")
          sBadgeClass = t.blocked ? "badge-red" : "badge-gray";

        const assigneeObj = this.state.users.find(
          (u) => String(u.id || u.userId) === String(t.assignedToId || t.assignedTo || t.assignedUserId),
        );
        const assigneeName = assigneeObj ? (assigneeObj.fullName || assigneeObj.name) : (t.assignedTo?.fullName || "Unassigned");
        const assigneeColor = assigneeObj ? assigneeObj.avatarColor || "blue" : "gray";
        const assigneeInitials = assigneeObj
          ? (assigneeObj.avatar || (assigneeObj.fullName ? assigneeObj.fullName.substring(0, 2).toUpperCase() : "?"))
          : "?";

        const assigneeHTML = `<div style="display:flex;align-items:center;gap:8px">
        <div class="avatar avatar-sm avatar-${assigneeColor}">${assigneeInitials}</div>
        <span style="font-size:13px;font-weight:500;color:#1e293b">${assigneeName}</span>
      </div>`;

        const rawDue = t.dueDate || t.deadline;
        const deadline = rawDue
          ? new Date(rawDue).toLocaleDateString()
          : "—";
        const isOverdue = rawDue && new Date(rawDue) < new Date() && !['Completed', 'Resolved', 'Closed'].includes(t.status);
        const dateHTML = isOverdue
          ? `<span style="color:#ef4444;font-weight:600">${deadline} &nbsp;<span title="Overdue">!</span></span>`
          : `<span style="color:#475569;font-weight:500">${deadline}</span>`;

        const taskIdStr = String(t.id || t.taskId);
        const subtasks = this.state.subtasks.filter((st) => String(st.taskId) === taskIdStr);
        const subHTML =
          subtasks.length > 0
            ? `<div style="font-size:11px;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:4px">↳ ${subtasks.filter((s) => s.status === "Completed").length}/${subtasks.length} subtasks done</div>`
            : "";

        return `<tr style="cursor:pointer" onclick="window.TasksPage.openEdit('${taskIdStr}')">
        <td style="padding:16px">
          <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:2px">${t.title || t.name}</div>
          <div style="font-size:12px;color:#64748b">${t.category || "Task"}</div>
          ${subHTML}
        </td>
        <td style="padding:16px">${assigneeHTML}</td>
        <td style="padding:16px"><span class="${pDotCls}">${t.priority || "Medium"}</span></td>
        <td style="padding:16px"><span class="badge ${sBadgeClass}">${t.status || "Pending"}</span></td>
        <td style="padding:16px">${dateHTML}</td>
        <td style="padding:16px" onclick="event.stopPropagation()">
          <button class="btn btn-sm" style="background:#eff6ff;color:#2563eb;font-weight:600;border:none;padding:6px 14px" onclick="window.TasksPage.openEdit('${taskIdStr}')">${t.status === "Completed" ? "View" : "Review"}</button>
        </td>
      </tr>`;
      })
      .join("");
  },

  renderTeamPanel() {
    const assignedUserIds = [
      ...new Set(this.tasks.map((t) => String(t.assignedToId || t.assignedTo || t.assignedUserId)).filter(Boolean)),
    ];
    const members = this.state.users.filter((u) =>
      assignedUserIds.includes(String(u.id || u.userId)),
    );

    const html =
      members.length === 0
        ? '<div class="text-muted text-sm" style="padding:16px">No team members assigned.</div>'
        : members
            .map(
              (m) => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #f1f5f9">
            <div class="avatar avatar-md avatar-${m.avatarColor || 'blue'}">${m.avatar || (m.fullName ? m.fullName.substring(0, 2).toUpperCase() : '??')}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:#0f172a">${m.fullName}</div>
              <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">${m.roleName || 'Team Member'}</div>
            </div>
            <div style="font-size:12px;font-weight:600;color:#2563eb;background:#eff6ff;padding:4px 8px;border-radius:6px;white-space:nowrap">${this.tasks.filter((t) => String(t.assignedToId || t.assignedTo || t.assignedUserId) === String(m.id || m.userId)).length} tasks</div>
          </div>`,
            )
            .join("");

    const panel = document.getElementById("team-panel");
    if (panel) {
      panel.style.padding = "0";
      panel.innerHTML = html;
    }
  },

  renderCompliancePanel() {
    const parentContainer = document.getElementById("compliance-panel");
    if (!parentContainer) return;
    parentContainer.style.padding = "0";

    // Filter violations linked to tasks in this project
    const projectTaskIds = this.tasks.map(t => String(t.taskId));
    const projectViolations = this.state.complianceViolations.filter(v =>
      v.entityType === 'Task' && projectTaskIds.includes(String(v.entityId))
    );

    const compItems = projectViolations.map(v => {
      const rule = this.state.complianceRules.find(r => String(r.ruleId) === String(v.ruleId));
      return {
        policy: rule ? rule.name : `Rule #${v.ruleId}`,
        status: v.status === 'Open' ? 'violation' : v.status === 'Under_Review' ? 'at_risk' : 'clear',
        evidenceLabel: v.status,
      };
    });

    // Fallback if no violations linked to this project's tasks
    const displayItems = compItems.length > 0 ? compItems : [
      { policy: 'No active violations', status: 'clear', evidenceLabel: 'All checks passed' }
    ];

    const html = displayItems
      .map((c) => {
        let icon = "";
        let subText = c.evidenceLabel || "";
        if (c.status === "violation") {
          icon = `<div style="width:24px;height:24px;border-radius:50%;background:#fef2f2;color:#ef4444;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800">!</div>`;
          subText += " · Critical";
        } else if (c.status === "at_risk") {
          icon = `<div style="width:24px;height:24px;border-radius:50%;background:#fffbeb;color:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800">·</div>`;
          subText += " · Under Review";
        } else {
          icon = `<div style="width:24px;height:24px;border-radius:50%;background:#f0fdf4;color:#10b981;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800">✓</div>`;
          subText += " · Clear";
        }
        return `
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid #f1f5f9">
          ${icon}
          <div>
            <div style="font-size:13px;font-weight:600;color:#0f172a">${c.policy}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px">${subText}</div>
          </div>
        </div>
      `;
      })
      .join("");

    parentContainer.innerHTML = html;
  },

  _eventsBound: false,
  bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;
    // Robust event delegation for "Add Task" buttons
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("#btn-add-task") || (e.target.id === "btn-add-task" ? e.target : null);
      if (btn) {
        e.preventDefault();
        this.openAddModal();
      }
    });
  },

  openAddModal() {
    const allUsers = this.state.users || [];
    let users = allUsers.filter(u => {
      const role = String(u.roleName || u.role || u.roleSlug || '').toLowerCase();
      const label = String(u.roleLabel || u.role_label || '').toLowerCase();
      return (
        role === 'team_leader' ||
        role === 'team_lead' ||
        label.includes('team lead') ||
        label.includes('team leader') ||
        label.includes('leader')
      );
    });
    if (users.length === 0) users = allUsers;

    const userOptions = users
      .map((u) => `<option value="${u.id || u.userId}">${u.fullName || u.name} (${u.roleLabel || 'Team Leader'})</option>`)
      .join("");

    window.Modal.create({
      id: "modal-add-task",
      title: "+ Create Task (Assign to Team Leader)",
      body: `
        <div class="form-group">
          <label class="form-label" for="task-name">Task Name *</label>
          <input type="text" id="task-name" class="form-input" placeholder="Enter task name">
          <span class="form-error hidden" id="task-name-error"></span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="task-assigned">Assign To (Team Leader) *</label>
            <select id="task-assigned" class="form-select">
              <option value="">Select team leader</option>
              ${userOptions}
            </select>
            <span class="form-error hidden" id="task-assigned-error"></span>
          </div>
          <div class="form-group">
            <label class="form-label" for="task-priority">Priority</label>
            <select id="task-priority" class="form-select">
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="task-est">Estimated Hours</label>
            <input type="number" id="task-est" class="form-input" value="0" step="0.5">
          </div>
          <div class="form-group">
            <label class="form-label" for="task-deadline">Deadline *</label>
            <input type="date" id="task-deadline" class="form-input">
            <span class="form-error hidden" id="task-deadline-error"></span>
          </div>
        </div>`,
      footerHTML: `
        <button class="btn btn-secondary btn-sm" onclick="window.Modal.close('modal-add-task')">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="window.TasksPage.submitAdd()">Add Task</button>`,
    });

    window.Validator.attachLive("task-name", { required: true, minLength: 3 });
    window.Validator.attachLive("task-assigned", { required: true });
    window.Validator.attachLive("task-deadline", {
      required: true,
      date: true,
    });
  },

  async submitAdd() {
    const result = window.Validator.validateForm({
      "task-name": { required: true, minLength: 3 },
      "task-assigned": { required: true },
      "task-deadline": { required: true, date: true },
    });
    if (!result.valid) return;

    const session = window.Auth.getSession();
    const priority = window.Helpers.getVal("task-priority") || "Medium";
    const deadline = window.Helpers.getVal("task-deadline");
    const assignedId = window.Helpers.getVal("task-assigned") || null;
    const creatorId = session && session.id ? String(session.id) : null;
    const projectId = String(this.project.id || this.project.projectId);

    const newTask = {
      projectId: projectId,
      title: window.Helpers.getVal("task-name"),
      assignedToId: assignedId,
      createdById: creatorId,
      priority: priority,
      status: "Active",
      estimatedHours: parseFloat(window.Helpers.getVal("task-est")) || 0,
      dueDate: deadline ? new Date(deadline).toISOString() : null,
    };

    try {
      await window.Helpers.api.request('/tasks', 'POST', newTask);
      this.state = await window.Helpers.getState();

      window.Modal.close("modal-add-task");
      window.Toast.success("Task Added", `"${newTask.title}" created.`);
      const currentProjId = String(this.project.id || this.project.projectId);
      this.tasks = this.state.tasks.filter((t) => String(t.projectId) === currentProjId);
      this.render();
    } catch (e) {
      console.error(e);
      window.Toast.warning("Error", "Failed to add task.");
    }
  },

  openEdit(taskId) {
    const task = this.state.tasks.find((t) => String(t.id || t.taskId) === String(taskId));
    if (!task) return;

    const existing = document.getElementById("task-side-panel-overlay");
    if (existing) window.TasksPage.closeEdit();

    const taskIdStr = String(task.id || task.taskId);
    const subtasks = this.state.subtasks.filter((st) => String(st.taskId) === taskIdStr);
    const subHTML =
      subtasks
        .map(
          (st) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:12px">
          <input type="checkbox" ${st.status === "Completed" ? "checked" : ""} style="width:16px;height:16px;accent-color:#2563eb;cursor:pointer">
          <span style="font-weight:500;font-size:13px;color:${st.status === "Completed" ? "#94a3b8;text-decoration:line-through" : "#1e293b"}">${st.title}</span>
        </div>
        <span class="badge ${window.Helpers.statusClass(st.status)}">${String(st.status).replace("_", " ")}</span>
      </div>`,
        )
        .join("") ||
      '<div class="text-muted text-sm" style="padding:12px 0">No subtasks found for this task.</div>';

    const panelHTML = `
    <div id="task-side-panel-overlay" style="position:fixed;inset:0;background:rgba(15,23,42,0.4);z-index:9000;opacity:0;transition:opacity 0.3s" onclick="window.TasksPage.closeEdit()"></div>
    <div id="task-side-panel" style="position:fixed;top:0;right:-500px;width:480px;height:100vh;background:#fff;z-index:9001;box-shadow:-4px 0 24px rgba(0,0,0,0.1);transition:right 0.3s cubic-bezier(0.16, 1, 0.3, 1);display:flex;flex-direction:column">
      
      <div style="display:flex;align-items:center;justify-content:space-between;padding:24px;border-bottom:1px solid #e2e8f0;background:#f8fafc">
        <div>
          <div style="font-size:18px;font-weight:800;color:#0f172a">Task Review</div>
          <div style="font-size:12px;font-weight:600;color:#64748b;margin-top:4px;letter-spacing:0.5px">ID: T-${taskIdStr.substring(0, 8)}</div>
        </div>
        <button onclick="window.TasksPage.closeEdit()" style="background:#e2e8f0;border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:#475569;cursor:pointer;font-weight:bold">&times;</button>
      </div>

      <div style="flex:1;overflow-y:auto;padding:28px 24px">
        <div style="font-size:22px;font-weight:800;color:#0f172a;line-height:1.3;margin-bottom:10px">${task.title || task.name}</div>
        <div style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:28px">${task.description || "Review the status of this compliance task and update logs accordingly. Check subtasks for sequential blocks."}</div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px">
          <div style="background:#f0f4f8;padding:16px;border-radius:12px">
            <label style="display:block;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">STATUS</label>
            <select id="etask-status" class="form-select" style="background:#fff;border-color:#e2e8f0;padding:8px 12px;font-weight:500;color:#0f172a">
              <option value="Active"      ${task.status === "Active" ? "selected" : ""}>Active</option>
              <option value="In_Progress" ${task.status === "In_Progress" ? "selected" : ""}>In Progress</option>
              <option value="In_Review"   ${task.status === "In_Review" ? "selected" : ""}>In Review</option>
              <option value="Completed"   ${task.status === "Completed" ? "selected" : ""}>Completed</option>
              <option value="Blocked"     ${task.status === "Blocked" ? "selected" : ""}>Blocked</option>
              <option value="Cancelled"   ${task.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
          </div>
          <div style="background:#f0f4f8;padding:16px;border-radius:12px">
            <label style="display:block;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">HOURS LOGGED</label>
            <input type="number" id="etask-actual" class="form-input" style="background:#fff;border-color:#e2e8f0;padding:8px 12px;font-weight:500;color:#0f172a" value="${task.actualHours || 0}" step="0.5">
          </div>
        </div>

        <div style="margin-bottom:28px">
          <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Checklist / Subtasks</div>
          ${subHTML}
        </div>

        <!-- ── Compliance Evidence Upload (PM/TL/TM Role Integration) ── -->
        <div style="margin-bottom:28px;padding:16px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;">
          <div style="font-size:12px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">📎 Submit Compliance Evidence</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:12px">Attach audit documents or logs to satisfy compliance requirements for this task.</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <input type="text" id="task-evidence-title" class="form-input" placeholder="Evidence Title (e.g. Server Audit Signoff)" style="font-size:13px;background:#fff;">
            <input type="file" id="task-evidence-file" class="form-input" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.txt,.csv" style="font-size:12px;background:#fff;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.TasksPage.uploadTaskEvidence('${taskIdStr}')" style="background:#2563eb;color:#fff;border:none;padding:8px 14px;border-radius:6px;font-weight:600;margin-top:4px;cursor:pointer">Upload Evidence File</button>
          </div>
        </div>
      </div>

      <div style="padding:20px 24px;border-top:1px solid #e2e8f0;background:#fff;display:flex;gap:12px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="window.TasksPage.closeEdit()" style="padding:10px 20px;border-radius:8px;border-color:#e2e8f0;color:#475569">Cancel</button>
        <button class="btn btn-primary" onclick="window.TasksPage.submitEdit('${taskIdStr}')" style="padding:10px 24px;border-radius:8px;background:#2563eb">Save Updates</button>
      </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", panelHTML);
    void document.getElementById("task-side-panel").offsetWidth;
    document.getElementById("task-side-panel-overlay").style.opacity = "1";
    document.getElementById("task-side-panel").style.right = "0";
  },

  closeEdit() {
    const overlay = document.getElementById("task-side-panel-overlay");
    const panel = document.getElementById("task-side-panel");
    if (overlay) overlay.style.opacity = "0";
    if (panel) panel.style.right = "-500px";
    setTimeout(() => {
      if (overlay) overlay.remove();
      if (panel) panel.remove();
    }, 300);
  },

  async submitEdit(taskId) {
    const taskIdStr = String(taskId);
    const newStatus = window.Helpers.getVal("etask-status");
    const actualHours = parseFloat(window.Helpers.getVal("etask-actual")) || 0;

    try {
      await window.Helpers.api.request(`/tasks/${taskIdStr}`, 'PATCH', { 
        status: newStatus,
        actualHours: actualHours
      });
      this.state = await window.Helpers.getState();

      window.TasksPage.closeEdit();
      window.Toast.success(
        "Task Updated",
        "Status saved successfully.",
      );
      const currentProjId = String(this.project.id || this.project.projectId);
      this.tasks = this.state.tasks.filter((t) => String(t.projectId) === currentProjId);
      this.render();
    } catch (e) {
      console.error(e);
      window.Toast.warning("Error", "Failed to update task.");
    }
  },

  async uploadTaskEvidence(taskIdStr) {
    const titleInput = document.getElementById("task-evidence-title");
    const fileInput  = document.getElementById("task-evidence-file");

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      if (window.Toast) window.Toast.warning("No File", "Please select an evidence file to upload.");
      return;
    }

    const title = (titleInput ? titleInput.value.trim() : "") || `Evidence for Task #${taskIdStr.substring(0, 8)}`;
    const file = fileInput.files[0];

    try {
      const session = window.Auth ? window.Auth.getSession() : null;
      const userId = session ? (session.id || session.userId) : null;
      const userRole = session ? (session.role || "team_member") : "team_member";
      const companyId = session ? (session.companyId || "b7744408-190c-4b83-82c5-ab0049afb6b2") : "b7744408-190c-4b83-82c5-ab0049afb6b2";

      const baseHeaders = {
        "x-user-role": userRole,
        "x-company-id": companyId,
      };
      if (userId) baseHeaders["x-user-id"] = String(userId);

      // 1. Create Evidence record in NestJS backend
      const createRes = await fetch("http://localhost:5500/evidence", {
        method: "POST",
        headers: {
          ...baseHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId || "user-1",
          task_id: taskIdStr,
          title: title,
          evidence_type: "Document",
          file_url: `/uploads/${file.name}`,
          notes: "Uploaded by actor via PM Task Dashboard"
        }),
      });

      const createData = await createRes.json();
      const createdEv = createData.data || createData;
      const evId = createdEv.id || createdEv.evidenceId;

      // 2. Upload real file via Multer endpoint POST /evidence/:id/upload
      if (evId) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch(`http://localhost:5500/evidence/${evId}/upload`, {
          method: "POST",
          headers: baseHeaders,
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.message || "File upload failed");
      }

      this.state = await window.Helpers.getState();
      if (window.Toast) window.Toast.success("Evidence Uploaded", `"${title}" attached successfully.`);
      if (titleInput) titleInput.value = "";
      if (fileInput) fileInput.value = "";
    } catch (err) {
      console.error("Task evidence upload error:", err);
      if (window.Toast) window.Toast.error("Upload Error", err.message || "Failed to upload evidence.");
    }
  },
};

document.addEventListener("DOMContentLoaded", async () => {
  window.Auth.requireRole("admin");
  window.Sidebar.render("projects");
  window.Toast.init();
  await window.TasksPage.init();
});

/**
 * Tasks page JS (Project Detailed Dashboard) — Updated to match Figma design
 */
window.TasksPage = {
  state: null,
  project: null,
  tasks: [],

  async init() {
    this.state = await window.Helpers.getState();
    const pid = parseInt(window.Helpers.getParam("project") || "1");

    // ✅ SAFETY GUARD: Prevent crash if the project database is empty
    if (!this.state.projects || this.state.projects.length === 0) {
      console.warn("No projects found in database!");
      return;
    }

    this.project =
      this.state.projects.find((p) => p.id === pid) || this.state.projects[0];

    // ✅ SAFETY GUARD: Stop rendering if project doesn't exist
    if (!this.project) return;

    this.tasks = this.state.tasks.filter(
      (t) => parseInt(t.projectId) === parseInt(this.project.id),
    );
    this.render();
    this.bindEvents();
  },
  
  render() {
    const p = this.project;
    if (!p) return;

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
              <span style="display:flex;align-items:center;gap:4px">ID: P-${p.id.toString().padStart(4, "0")}</span>
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
          (u) => parseInt(u.id) === parseInt(t.assignedUserId),
        );
        const assigneeName = assigneeObj ? assigneeObj.fullName : "Unassigned";
        const assigneeColor = assigneeObj ? assigneeObj.avatarColor : "gray";
        const assigneeInitials = assigneeObj ? assigneeObj.avatar : "?";

        const assigneeHTML = `<div style="display:flex;align-items:center;gap:8px">
        <div class="avatar avatar-sm avatar-${assigneeColor}">${assigneeInitials}</div>
        <span style="font-size:13px;font-weight:500;color:#1e293b">${assigneeName}</span>
      </div>`;

        const deadline = t.deadline
          ? t.deadline.split("-").slice(1).reverse().join("/")
          : "—";
        const dateHTML = t.overdue
          ? `<span style="color:#ef4444;font-weight:600">${deadline} &nbsp;<span title="Overdue">!</span></span>`
          : `<span style="color:#475569;font-weight:500">${deadline}</span>`;

        const subtasks = this.state.subtasks.filter((st) => st.taskId === t.id);
        const subHTML =
          subtasks.length > 0
            ? `<div style="font-size:11px;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:4px">↳ ${subtasks.filter((s) => s.status === "Completed").length}/${subtasks.length} subtasks done</div>`
            : "";

        return `<tr style="cursor:pointer" onclick="window.TasksPage.openEdit(${t.id})">
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
          <button class="btn btn-sm" style="background:#eff6ff;color:#2563eb;font-weight:600;border:none;padding:6px 14px" onclick="window.TasksPage.openEdit(${t.id})">${t.status === "Completed" ? "View" : "Review"}</button>
        </td>
      </tr>`;
      })
      .join("");
  },

  renderTeamPanel() {
    const assignedUserIds = [
      ...new Set(this.tasks.map((t) => t.assignedUserId)),
    ];
    const members = this.state.users.filter((u) =>
      assignedUserIds.includes(parseInt(u.id)) || assignedUserIds.includes(u.id),
    );

    const html =
      members.length === 0
        ? '<div class="text-muted text-sm" style="padding:16px">No team members assigned.</div>'
        : members
            .map(
              (m) => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #f1f5f9">
            <div class="avatar avatar-md avatar-${m.avatarColor}">${m.avatar}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:#0f172a">${m.fullName}</div>
              <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">${m.roleId === 4 ? "Team Leader" : "Team Member"}</div>
            </div>
            <div style="font-size:12px;font-weight:600;color:#2563eb;background:#eff6ff;padding:4px 8px;border-radius:6px;white-space:nowrap">${this.tasks.filter((t) => String(t.assignedUserId) === String(m.id)).length} tasks</div>
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

    let compItems = this.state.complianceItems.filter(
      (c) => c.projectName.toLowerCase() === this.project.name.toLowerCase(),
    );

    if (compItems.length === 0) {
      compItems = [
        {
          policy: "GDPR Verification",
          status: "at_risk",
          evidenceLabel: "Evidence pending",
        },
        {
          policy: "ISO Access Control",
          status: "clear",
          evidenceLabel: "All clear",
        },
      ];
    }

    const html = compItems
      .map((c) => {
        let icon = "";
        let subText = c.evidenceLabel || "";
        if (c.status === "violation") {
          icon = `<div style="width:24px;height:24px;border-radius:50%;background:#fef2f2;color:#ef4444;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800">!</div>`;
          subText += " · Critical";
        } else if (c.status === "at_risk") {
          icon = `<div style="width:24px;height:24px;border-radius:50%;background:#fffbeb;color:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800">·</div>`;
          subText += " · At risk";
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

  bindEvents() {
    document.addEventListener("click", (e) => {
      if (e.target.id === "btn-add-task") this.openAddModal();
    });
  },

  openAddModal() {
    const users = this.state.users.filter(
      (u) => u.roleId >= 4 && u.departmentId === this.project.departmentId,
    );
    let userOptions = users
      .map((u) => `<option value="${u.id}">${u.fullName}</option>`)
      .join("");
    if (!userOptions) {
      userOptions = this.state.users
        .map((u) => `<option value="${u.id}">${u.fullName}</option>`)
        .join("");
    }

    window.Modal.create({
      id: "modal-add-task",
      title: "+ Create Task",
      body: `
        <div class="form-group">
          <label class="form-label" for="task-name">Task Name *</label>
          <input type="text" id="task-name" class="form-input" placeholder="Enter task name">
          <span class="form-error hidden" id="task-name-error"></span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="task-assigned">Assign To *</label>
            <select id="task-assigned" class="form-select">
              <option value="">Select member</option>
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
    const assignedId = parseInt(window.Helpers.getVal("task-assigned"));

    const newTask = {
      project_id: this.project.id,
      title: window.Helpers.getVal("task-name"),
      assigned_to: assignedId,
      priority: priority,
      status: "open",
    };

    try {
      await window.Helpers.api.request('/tasks', 'POST', newTask);
      this.state = await window.Helpers.getState();
      
      if (window.AuditStore) {
        window.AuditStore.add(
          "PM",
          `Created task: "${newTask.title}" for Project ${newTask.project_id}`,
          "Info",
        );
      }

      window.Modal.close("modal-add-task");
      window.Toast.success("Task Added", `"${newTask.title}" created.`);
      this.tasks = this.state.tasks.filter((t) => parseInt(t.projectId) === parseInt(this.project.id));
      this.render();
    } catch (e) {
      console.error(e);
      window.Toast.warning("Error", "Failed to add task.");
    }
  },

  openEdit(taskId) {
    const task = this.state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const existing = document.getElementById("task-side-panel-overlay");
    if (existing) window.TasksPage.closeEdit();

    const subtasks = this.state.subtasks.filter((st) => st.taskId === taskId);
    const subHTML =
      subtasks
        .map(
          (st) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:12px">
          <input type="checkbox" ${st.status === "Completed" ? "checked" : ""} style="width:16px;height:16px;accent-color:#2563eb;cursor:pointer">
          <span style="font-weight:500;font-size:13px;color:${st.status === "Completed" ? "#94a3b8;text-decoration:line-through" : "#1e293b"}">${st.title}</span>
        </div>
        <span class="badge ${window.Helpers.statusClass(st.status)}">${st.status.replace("_", " ")}</span>
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
          <div style="font-size:12px;font-weight:600;color:#64748b;margin-top:4px;letter-spacing:0.5px">ID: T-${task.id.toString().padStart(4, "0")}</div>
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
              <option value="open"    ${task.status === "open" ? "selected" : ""}>Open</option>
              <option value="in_progress" ${task.status === "in_progress" ? "selected" : ""}>In Progress</option>
              <option value="resolved" ${task.status === "resolved" ? "selected" : ""}>Resolved</option>
              <option value="closed"  ${task.status === "closed" ? "selected" : ""}>Closed</option>
              <option value="Blocked" ${task.status === "Blocked" ? "selected" : ""}>Blocked</option>
            </select>
          </div>
          <div style="background:#f0f4f8;padding:16px;border-radius:12px">
            <label style="display:block;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">HOURS LOGGED</label>
            <input type="number" id="etask-actual" class="form-input" style="background:#fff;border-color:#e2e8f0;padding:8px 12px;font-weight:500;color:#0f172a" value="${task.actualHours || 0}" step="0.5">
          </div>
        </div>

        <div style="margin-bottom:28px">
          <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Attachments</div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:36px;height:36px;background:#eff6ff;color:#2563eb;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px">PDF</div>
              <div>
                <div style="font-size:13px;font-weight:600;color:#0f172a">Evidence_Log_v2.pdf</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px">1.4 MB</div>
              </div>
            </div>
            <button style="background:none;border:none;color:#94a3b8;cursor:pointer;display:flex;align-items:center;justify-content:center"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
          </div>
        </div>

        <div>
          <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Checklist / Subtasks</div>
          ${subHTML}
        </div>
      </div>

      <div style="padding:20px 24px;border-top:1px solid #e2e8f0;background:#fff;display:flex;gap:12px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="window.TasksPage.closeEdit()" style="padding:10px 20px;border-radius:8px;border-color:#e2e8f0;color:#475569">Cancel</button>
        <button class="btn btn-primary" onclick="window.TasksPage.submitEdit(${taskId})" style="padding:10px 24px;border-radius:8px;background:#2563eb">Save Updates</button>
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
    const idx = this.state.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return;

    const newStatus = window.Helpers.getVal("etask-status");

    try {
      await window.Helpers.api.request(`/tasks/${taskId}`, 'PATCH', { status: newStatus });
      this.state = await window.Helpers.getState();

      window.TasksPage.closeEdit();
      window.Toast.success(
        "Task Updated",
        "Status saved successfully.",
      );
      this.tasks = this.state.tasks.filter((t) => parseInt(t.projectId) === parseInt(this.project.id));
      this.render();
    } catch (e) {
      console.error(e);
      window.Toast.warning("Error", "Failed to update task.");
    }
  },
};

document.addEventListener("DOMContentLoaded", async () => {
  window.Auth.requireRole("admin");
  window.Sidebar.render("projects");
  window.Toast.init();
  await window.TasksPage.init();
});

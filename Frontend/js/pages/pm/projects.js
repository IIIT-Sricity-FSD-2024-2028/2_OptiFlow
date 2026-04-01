/**
 * Projects page JS — Full CRUD with edit/delete, filter tabs, department filter
 */
window.ProjectsPage = {

  state: null,
  filtered: [],
  activeFilter: 'all',

  init() {
    this.state = window.Helpers.getState();
    this.filtered = [...this.state.projects];
    this.renderAll();
    this.bindEvents();
  },

  renderAll() {
    this.renderProjects();
    this.updateFilterCounts();
  },

  renderProjects() {
    const container = document.getElementById('projects-grid');
    if (!container) return;

    if (this.filtered.length === 0) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        </svg>
        <div class="empty-state-text">No projects found</div>
        <div class="empty-state-sub">Try adjusting your filter or create a new project.</div>
      </div>`;
      return;
    }

    container.innerHTML = this.filtered.map(p => this.projectCard(p)).join('');
  },

  projectCard(p) {
    const projectTasks    = this.state.tasks.filter(t => t.projectId === p.id);
    const assignedUserIds = [...new Set(projectTasks.map(t => t.assignedUserId))];
    const team            = this.state.users.filter(u => assignedUserIds.includes(u.id));
    
    // Create compact overlapping avatars
    const avatars = team.slice(0, 3).map((u, i) => `<div style="width:28px;height:28px;border-radius:50%;background:var(--${u.avatarColor || 'blue'});border:2px solid #fff;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;${i>0?'margin-left:-10px':''}">${u.avatar}</div>`).join('');
    const extraAvatar = team.length > 3 ? `<div style="width:28px;height:28px;border-radius:50%;background:#94a3b8;border:2px solid #fff;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;margin-left:-10px">+${team.length - 3}</div>` : '';
    const teamHTML = `<div style="display:flex;align-items:center">${avatars}${extraAvatar}</div>`;

    let borderColor = '#94a3b8';
    let sBadgeBg = '#f1f5f9';
    let sBadgeColor = '#475569';
    let progressColor = '#94a3b8';

    if (p.status === 'Completed') {
      borderColor = '#10b981'; sBadgeBg = '#f0fdf4'; sBadgeColor = '#10b981'; progressColor = '#10b981';
    } else if (p.status === 'Planning') {
      borderColor = '#cbd5e1'; sBadgeBg = '#f1f5f9'; sBadgeColor = '#475569'; progressColor = '#94a3b8';
    } else if (p.status === 'On_Hold') {
      borderColor = '#ef4444'; sBadgeBg = '#fef2f2'; sBadgeColor = '#ef4444'; progressColor = '#ef4444';
    } else { // Active / In_Progress
      borderColor = '#3b82f6'; sBadgeBg = '#eff6ff'; sBadgeColor = '#3b82f6'; progressColor = '#3b82f6';
    }

    const isOverdue  = window.Helpers.isOverdue(p.endDate);
    const dateLabel  = p.endDate ? new Date(p.endDate).toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : '—';
    const dateHTML   = isOverdue 
      ? `<div style="font-size:12px;color:#64748b">Due <span style="color:#ef4444;font-weight:700">${dateLabel} <svg style="display:inline;margin-bottom:-2px" width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L1 21h22L12 2zm0 3.5l8.5 14h-17L12 5.5z"/><path d="M11 10h2v5h-2zM11 16h2v2h-2z"/></svg></span></div>` 
      : `<div style="font-size:12px;color:#64748b">Due <span style="color:#0f172a;font-weight:600">${dateLabel}</span></div>`;

    const overdueCount = projectTasks.filter(t => t.overdue).length;

    // Footer SVGs
    const pathCheck = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const pathClock = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    const pathShield = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;

    const badgeTasks = `<div style="font-size:11px;font-weight:500;color:#64748b;display:flex;align-items:center"><span style="color:#94a3b8">${pathCheck}</span> ${p.totalTasks} tasks</div>`;
    const badgeEscalations = overdueCount > 0 
      ? `<div style="font-size:11px;font-weight:600;color:#ef4444;display:flex;align-items:center">${pathClock} ${overdueCount} escalation${overdueCount > 1 ? 's' : ''}</div>` 
      : `<div style="font-size:11px;font-weight:500;color:#94a3b8;display:flex;align-items:center">${pathClock} 0 escalations</div>`;
    
    // Simulate a compliance flag based on department or status
    let compText, compColor;
    if (p.departmentId === 1) { compText = 'GDPR flag'; compColor = '#f59e0b'; }
    else if (p.status === 'On_Hold') { compText = 'SOX violation'; compColor = '#ef4444'; }
    else { compText = 'ISO clear'; compColor = '#10b981'; }
    const badgeCompliance = `<div style="font-size:11px;font-weight:600;color:${compColor};display:flex;align-items:center">${pathShield} ${compText}</div>`;

    return `
      <div style="background:#fff;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);border-top:5px solid ${borderColor};padding:24px;display:flex;flex-direction:column;gap:12px;cursor:pointer;position:relative;border-left:1px solid #f1f5f9;border-right:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9" onclick="window.location.href='tasks.html?project=${p.id}'" class="hover-elevate">

        <!-- Top Row -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <h3 style="margin:0;font-size:15px;font-weight:800;color:#0f172a;line-height:1.2;letter-spacing:-0.2px">${p.name}</h3>
          <div style="background:${sBadgeBg};color:${sBadgeColor};padding:4px 10px;border-radius:12px;font-size:10px;font-weight:600;white-space:nowrap">${p.statusLabel}</div>
        </div>

        <!-- Description -->
        <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${p.description}</p>

        <!-- Progress -->
        <div style="margin-top:4px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:11px;font-weight:500;color:#64748b">Progress</span>
            <span style="font-size:11px;font-weight:600;color:#64748b">${p.progress}%</span>
          </div>
          <div style="width:100%;height:4px;background:#f1f5f9;overflow:hidden">
            <div style="width:${p.progress}%;height:100%;background:${progressColor}"></div>
          </div>
        </div>

        <!-- Team & Date -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
          ${teamHTML}
          ${dateHTML}
        </div>

        <!-- Footer -->
        <div style="margin-top:8px;border-top:1px solid #f1f5f9;padding-top:16px;display:flex;justify-content:space-between;align-items:center;background:#fff">
          ${badgeTasks}
          ${badgeEscalations}
          ${badgeCompliance}
        </div>
      </div>
    `;
  },

  toggleMenu(event, id) {
    event.stopPropagation();
    // Close all other open menus
    document.querySelectorAll('.proj-dropdown').forEach(d => {
      if (d.id !== `proj-menu-${id}`) d.classList.add('hidden');
    });
    document.getElementById(`proj-menu-${id}`)?.classList.toggle('hidden');
  },

  updateFilterCounts() {
    const projects = this.state.projects;
    const counts = {
      all:       projects.length,
      active:    projects.filter(p => p.status === 'Active').length,
      on_hold:   projects.filter(p => p.status === 'On_Hold').length,
      completed: projects.filter(p => p.status === 'Completed').length
    };
    document.querySelectorAll('.filter-tab').forEach(tab => {
      const f = tab.dataset.filter;
      const c = f === 'all' ? counts.all : (counts[f] || 0);
      const label = tab.dataset.label;
      tab.textContent = `${label} (${c})`;
    });
  },

  bindEvents() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeFilter = tab.dataset.filter;
        this.applyFilter();
      });
    });

    const searchEl = document.getElementById('project-search');
    if (searchEl) searchEl.addEventListener('input', () => this.applyFilter());

    const deptEl = document.getElementById('dept-filter');
    if (deptEl) deptEl.addEventListener('change', () => this.applyFilter());

    const addBtn = document.getElementById('btn-add-project');
    if (addBtn) addBtn.addEventListener('click', () => this.openAddModal());

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      document.querySelectorAll('.proj-dropdown').forEach(d => d.classList.add('hidden'));
    });
  },

  applyFilter() {
    const query    = (document.getElementById('project-search')?.value || '').toLowerCase();
    const filter   = this.activeFilter;
    const deptName = (document.getElementById('dept-filter')?.value || '').toLowerCase();

    this.filtered = this.state.projects.filter(p => {
      const matchStatus =
        filter === 'all' ||
        (filter === 'active'    && p.status === 'Active') ||
        (filter === 'on_hold'   && p.status === 'On_Hold') ||
        (filter === 'completed' && p.status === 'Completed');

      const dept = this.state.departments.find(d => d.id === p.departmentId);
      const matchDept = !deptName || (dept && dept.name.toLowerCase().includes(deptName));

      const matchQuery = !query ||
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query);

      return matchStatus && matchQuery && matchDept;
    });
    this.renderProjects();
  },

  /* ── Add Modal ── */
  openAddModal() {
    const depts = this.state.departments;
    const deptOptions = depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

    window.Modal.create({
      id: 'modal-add-project',
      title: '+ New Project',
      body: `
        <div class="form-group">
          <label class="form-label" for="proj-name">Project Name *</label>
          <input type="text" id="proj-name" class="form-input" placeholder="e.g. Q1 Compliance Review">
          <span class="form-error hidden" id="proj-name-error"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="proj-desc">Description *</label>
          <textarea id="proj-desc" class="form-textarea" placeholder="Brief project description..."></textarea>
          <span class="form-error hidden" id="proj-desc-error"></span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="proj-dept">Department *</label>
            <select id="proj-dept" class="form-select">
              <option value="">Select department</option>
              ${deptOptions}
            </select>
            <span class="form-error hidden" id="proj-dept-error"></span>
          </div>
          <div class="form-group">
            <label class="form-label" for="proj-due">End Date *</label>
            <input type="date" id="proj-due" class="form-input">
            <span class="form-error hidden" id="proj-due-error"></span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="proj-status">Status</label>
          <select id="proj-status" class="form-select">
            <option value="Active">Active</option>
            <option value="Planning">Planning</option>
            <option value="On_Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>
        </div>`,
      footerHTML: `
        <button class="btn btn-secondary btn-sm" onclick="window.Modal.close('modal-add-project')">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="window.ProjectsPage.submitAdd()">Create Project</button>`
    });

    window.Validator.attachLive('proj-name', { required: true, minLength: 3 });
    window.Validator.attachLive('proj-desc', { required: true, minLength: 10 });
    window.Validator.attachLive('proj-dept', { required: true });
    window.Validator.attachLive('proj-due',  { required: true });
  },

  submitAdd() {
    const result = window.Validator.validateForm({
      'proj-name': { required: true, minLength: 3 },
      'proj-desc': { required: true, minLength: 10 },
      'proj-dept': { required: true },
      'proj-due':  { required: true }
    });
    if (!result.valid) return;

    const session   = window.Auth.getSession();
    const statusVal = window.Helpers.getVal('proj-status') || 'Active';
    const deptId    = parseInt(window.Helpers.getVal('proj-dept'));
    const labelMap  = { Active: 'Active', Planning: 'Planning', On_Hold: 'On Hold', Completed: 'Completed' };

    const newProject = {
      id:           window.Helpers.nextId(this.state.projects),
      name:         window.Helpers.getVal('proj-name'),
      description:  window.Helpers.getVal('proj-desc'),
      departmentId: deptId,
      status:       statusVal,
      statusLabel:  labelMap[statusVal] || statusVal,
      startDate:    new Date().toISOString().split('T')[0],
      endDate:      window.Helpers.getVal('proj-due'),
      createdBy:    session.id,
      progress:     0,
      totalTasks: 0, inProgress: 0, completed: 0, overdue: 0
    };

    this.state.projects.push(newProject);
    window.Helpers.saveState(this.state);
    window.Helpers.log('CREATE', 'Project', newProject.id, null, newProject, 'project:create');
    window.Modal.close('modal-add-project');
    window.Toast.success('Project Created', `"${newProject.name}" has been created.`);
    this.filtered = [...this.state.projects];
    this.renderAll();
  },

  /* ── Edit Modal ── */
  openEditModal(id) {
    // Close any open dropdown
    document.querySelectorAll('.proj-dropdown').forEach(d => d.classList.add('hidden'));

    const p     = this.state.projects.find(x => x.id === id);
    if (!p) return;
    const depts = this.state.departments;
    const deptOptions = depts.map(d =>
      `<option value="${d.id}" ${d.id === p.departmentId ? 'selected' : ''}>${d.name}</option>`
    ).join('');

    window.Modal.create({
      id: 'modal-edit-project',
      title: 'Edit Project',
      body: `
        <div class="form-group">
          <label class="form-label" for="edit-proj-name">Project Name *</label>
          <input type="text" id="edit-proj-name" class="form-input" value="${p.name}">
          <span class="form-error hidden" id="edit-proj-name-error"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-proj-desc">Description *</label>
          <textarea id="edit-proj-desc" class="form-textarea">${p.description}</textarea>
          <span class="form-error hidden" id="edit-proj-desc-error"></span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="edit-proj-dept">Department</label>
            <select id="edit-proj-dept" class="form-select">
              ${deptOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-proj-due">End Date</label>
            <input type="date" id="edit-proj-due" class="form-input" value="${p.endDate || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="edit-proj-status">Status</label>
            <select id="edit-proj-status" class="form-select">
              <option value="Active"    ${p.status === 'Active'    ? 'selected' : ''}>Active</option>
              <option value="Planning"  ${p.status === 'Planning'  ? 'selected' : ''}>Planning</option>
              <option value="On_Hold"   ${p.status === 'On_Hold'   ? 'selected' : ''}>On Hold</option>
              <option value="Completed" ${p.status === 'Completed' ? 'selected' : ''}>Completed</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-proj-progress">Progress (%)</label>
            <input type="number" id="edit-proj-progress" class="form-input" value="${p.progress}" min="0" max="100">
          </div>
        </div>`,
      footerHTML: `
        <button class="btn btn-secondary btn-sm" onclick="window.Modal.close('modal-edit-project')">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="window.ProjectsPage.submitEdit(${id})">Save Changes</button>`
    });

    window.Validator.attachLive('edit-proj-name', { required: true, minLength: 3 });
    window.Validator.attachLive('edit-proj-desc', { required: true, minLength: 10 });
  },

  submitEdit(id) {
    const result = window.Validator.validateForm({
      'edit-proj-name': { required: true, minLength: 3 },
      'edit-proj-desc': { required: true, minLength: 10 }
    });
    if (!result.valid) return;

    const idx = this.state.projects.findIndex(x => x.id === id);
    if (idx === -1) return;

    const old        = { ...this.state.projects[idx] };
    const statusVal  = window.Helpers.getVal('edit-proj-status');
    const labelMap   = { Active: 'Active', Planning: 'Planning', On_Hold: 'On Hold', Completed: 'Completed' };
    const progress   = Math.min(100, Math.max(0, parseInt(window.Helpers.getVal('edit-proj-progress')) || 0));

    this.state.projects[idx] = {
      ...this.state.projects[idx],
      name:         window.Helpers.getVal('edit-proj-name'),
      description:  window.Helpers.getVal('edit-proj-desc'),
      departmentId: parseInt(window.Helpers.getVal('edit-proj-dept')),
      endDate:      window.Helpers.getVal('edit-proj-due') || this.state.projects[idx].endDate,
      status:       statusVal,
      statusLabel:  labelMap[statusVal] || statusVal,
      progress:     progress
    };

    window.Helpers.saveState(this.state);
    window.Helpers.log('UPDATE', 'Project', id, old, this.state.projects[idx], 'project:update');
    window.Modal.close('modal-edit-project');
    window.Toast.success('Project Updated', 'Changes saved successfully.');
    this.filtered = this.state.projects.filter(p => {
      if (this.activeFilter === 'all')       return true;
      if (this.activeFilter === 'active')    return p.status === 'Active';
      if (this.activeFilter === 'on_hold')   return p.status === 'On_Hold';
      if (this.activeFilter === 'completed') return p.status === 'Completed';
      return true;
    });
    this.renderAll();
  },

  /* ── Delete ── */
  confirmDelete(id) {
    document.querySelectorAll('.proj-dropdown').forEach(d => d.classList.add('hidden'));
    const p = this.state.projects.find(x => x.id === id);
    if (!p) return;

    window.Modal.confirm({
      title:        'Delete Project',
      message:      `Are you sure you want to delete "${p.name}"? This cannot be undone.`,
      confirmLabel: 'Delete Project',
      onConfirm:    () => {
        this.state.projects = this.state.projects.filter(x => x.id !== id);
        window.Helpers.saveState(this.state);
        window.Helpers.log('DELETE', 'Project', id, p, null, 'project:delete');
        window.Toast.warning('Deleted', `"${p.name}" was deleted.`);
        this.filtered = [...this.state.projects];
        this.renderAll();
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.Auth !== 'undefined') {
    window.Auth.requireRole('admin');
    window.Sidebar.render('projects');
    window.Toast.init();
    window.ProjectsPage.init();
  }
});

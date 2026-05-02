/**
 * Users page JS — SuperUser CRUD for users (SQL Schema Consistent)
 */
window.UsersPage = {

  state: null,
  filtered: [],
  activeFilter: 'all',

  async init() {
    this.state    = await window.Helpers.getState();
    this.filtered = [...(this.state.users || [])];
    this.renderTable();
    this.bindEvents();
  },

  renderTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    if (this.filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-text">No users found</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = this.filtered.map(u => {
      const role = this.state.roles.find(r => r.id === u.roleId) || {};
      const dept = this.state.departments.find(d => d.id === u.departmentId) || {};
      const manager = this.state.users.find(x => x.id === u.managerId);
      
      const roleBadgeCls = u.roleId === 1 ? 'purple' : u.roleId === 2 ? 'blue' : 'gray';

      return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar avatar-sm avatar-${u.avatarColor}">${u.avatar}</div>
            <div>
              <div class="td-label">${u.fullName}</div>
              <div class="td-sub">${u.email}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge badge-${roleBadgeCls}">
            ${role.name ? role.name.replace('_', ' ') : 'Unknown'}
          </span>
        </td>
        <td>${dept.name || '—'}</td>
        <td>${manager ? manager.fullName : '—'}</td>
        <td><span class="badge ${window.Helpers.statusClass(u.status === 'active' ? 'Active' : 'Inactive')}">${u.status}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-sm" onclick="window.UsersPage.openEdit(${u.id})">Edit</button>
            ${u.roleId !== 1 ? `<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="window.UsersPage.toggleStatus(${u.id})">${u.status === 'active' ? 'Deactivate' : 'Activate'}</button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  bindEvents() {
    document.getElementById('btn-add-user')?.addEventListener('click', () => this.openAddModal());
    document.getElementById('user-search')?.addEventListener('input', () => this.applyFilter());
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeFilter = tab.dataset.filter;
        this.applyFilter();
      });
    });
  },

  applyFilter() {
    const query = (document.getElementById('user-search')?.value || '').toLowerCase();
    const filter = this.activeFilter;

    this.filtered = this.state.users.filter(u => {
      const matchRole = filter === 'all' || (
        filter === 'superuser' && u.roleId === 1) ||
        (filter === 'admin' && u.roleId === 2) ||
        (filter === 'enduser' && u.roleId >= 3
      );
      const matchQ = !query || u.fullName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
      return matchRole && matchQ;
    });
    this.renderTable();
  },

  openAddModal() {
    const roles = this.state.roles;
    const depts = this.state.departments;
    const managers = this.state.users.filter(u => u.roleId <= 4); // Managers can be PMs or TLs

    window.Modal.create({
      id: 'modal-add-user',
      title: 'Add New User',
      body: `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="u-name">Full Name *</label>
            <input type="text" id="u-name" class="form-input" placeholder="John Doe">
            <span class="form-error hidden" id="u-name-error"></span>
          </div>
          <div class="form-group">
            <label class="form-label" for="u-email">Email *</label>
            <input type="email" id="u-email" class="form-input" placeholder="user@officesync.com">
            <span class="form-error hidden" id="u-email-error"></span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="u-role">Role *</label>
            <select id="u-role" class="form-select">
              <option value="">Select role</option>
              ${roles.map(r => `<option value="${r.id}">${r.name.replace('_', ' ')}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="u-dept">Department *</label>
            <select id="u-dept" class="form-select">
              <option value="">Select department</option>
              ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="u-manager">Reporting Manager</label>
          <select id="u-manager" class="form-select">
            <option value="">None / Top Level</option>
            ${managers.map(m => `<option value="${m.id}">${m.fullName}</option>`).join('')}
          </select>
        </div>`,
      footerHTML: `
        <button class="btn btn-secondary btn-sm" onclick="window.Modal.close('modal-add-user')">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="window.UsersPage.submitAdd()">Add User</button>`
    });
  },

  async submitAdd() {
    const name = window.Helpers.getVal('u-name');
    const email = window.Helpers.getVal('u-email');
    const roleId = parseInt(window.Helpers.getVal('u-role'));
    const deptId = parseInt(window.Helpers.getVal('u-dept'));
    const managerId = parseInt(window.Helpers.getVal('u-manager')) || null;

    if (!name || !email || !roleId || !deptId) {
      window.Toast.error('Validation Error', 'Please fill all required fields.');
      return;
    }

    const newUser = {
      full_name:     name,
      email:         email,
      password_hash: 'changeme_' + Date.now(),
      department_id: deptId,
      manager_id:    managerId,
      is_active:     true,
    };

    try {
      await window.Helpers.api.request('/users', 'POST', newUser);
      this.state = await window.Helpers.getState();
      window.Modal.close('modal-add-user');
      window.Toast.success('User Added', `${name} created.`);
      this.filtered = [...this.state.users];
      this.renderTable();
    } catch (e) {
      console.error(e);
      window.Toast.error('Error', 'Failed to create user.');
    }
  },

  openEdit(userId) {
    const u = this.state.users.find(x => x.id === userId);
    if (!u) return;
    
    const managers = this.state.users.filter(x => x.id !== userId && x.roleId <= 4);

    window.Modal.create({
      id: 'modal-edit-user',
      title: 'Edit User',
      body: `
        <div class="form-group">
          <label class="form-label" for="eu-name">Full Name *</label>
          <input type="text" id="eu-name" class="form-input" value="${u.fullName}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="eu-role">Role</label>
            <select id="eu-role" class="form-select">
              ${this.state.roles.map(r => `<option value="${r.id}" ${u.roleId===r.id?'selected':''}>${r.name.replace('_', ' ')}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="eu-dept">Department</label>
            <select id="eu-dept" class="form-select">
              ${this.state.departments.map(d => `<option value="${d.id}" ${u.departmentId===d.id?'selected':''}>${d.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="eu-manager">Reporting Manager</label>
          <select id="eu-manager" class="form-select">
            <option value="">None</option>
            ${managers.map(m => `<option value="${m.id}" ${u.managerId===m.id?'selected':''}>${m.fullName}</option>`).join('')}
          </select>
        </div>`,
      footerHTML: `
        <button class="btn btn-secondary btn-sm" onclick="window.Modal.close('modal-edit-user')">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="window.UsersPage.submitEdit(${userId})">Save Changes</button>`
    });
  },

  async submitEdit(userId) {
    const numericId = parseInt(String(userId).replace(/[^0-9]/g, ''), 10);
    const idx = this.state.users.findIndex(u => u.userId === numericId || String(u.userId) === String(userId));
    if (idx === -1) return;

    const patch = {
      department_id: parseInt(window.Helpers.getVal('eu-dept')) || undefined,
      manager_id:    parseInt(window.Helpers.getVal('eu-manager')) || null,
    };
    const newName = window.Helpers.getVal('eu-name');
    if (newName) patch.full_name = newName;

    try {
      await window.Helpers.api.request(`/users/${numericId}`, 'PATCH', patch);
      this.state = await window.Helpers.getState();
      window.Modal.close('modal-edit-user');
      window.Toast.success('User Updated', 'Changes saved.');
      this.filtered = [...this.state.users];
      this.renderTable();
    } catch (e) {
      console.error(e);
      window.Toast.error('Error', 'Failed to update user.');
    }
  },

  async toggleStatus(userId) {
    const numericId = parseInt(String(userId).replace(/[^0-9]/g, ''), 10);
    const u = this.state.users.find(x => x.userId === numericId || String(x.userId) === String(userId));
    if (!u) return;
    const newStatus = u.isActive === false ? true : false; // toggle
    try {
      await window.Helpers.api.request(`/users/${numericId}`, 'PATCH', { is_active: newStatus });
      this.state = await window.Helpers.getState();
      window.Toast.info('Status Updated', 'User status changed.');
      this.filtered = [...this.state.users];
      this.renderTable();
    } catch (e) {
      console.error(e);
      window.Toast.error('Error', 'Failed to update user status.');
    }
  }
};

document.addEventListener('DOMContentLoaded', async () => {
    window.Auth.requireRole('superuser');
    window.Sidebar.render('users');
    window.Toast.init();
    await window.UsersPage.init();
});

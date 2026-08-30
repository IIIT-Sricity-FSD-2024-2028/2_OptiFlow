let companyRoles = [];
let companyBranches = [];

const roleLabelMap = {
  company_owner: 'Company Owner',
  branch_manager: 'Branch Manager',
  superuser: 'Process Admin',
  hr_manager: 'Access Governance',
  compliance_officer: 'Compliance Officer',
  project_manager: 'Project Manager',
  team_leader: 'Team Lead',
  enduser: 'Team Member',
};

document.addEventListener('DOMContentLoaded', async () => {
  const session = await AdminConsoleShell.init({
    activeNav: 'governance',
    pageTitle: 'User Governance',
    subtitle: 'Invite CEOs, Branch Managers, and team members',
  });
  if (!session) return;

  try {
    const rawRoles = await window.Helpers.api.request('/roles');
    companyRoles = Array.isArray(rawRoles) ? rawRoles : (rawRoles.data || []);
  } catch (e) {
    console.error('Failed to load roles', e);
  }

  try {
    const rawBranches = await window.Helpers.api.request('/branches');
    companyBranches = Array.isArray(rawBranches) ? rawBranches : (rawBranches.data || []);
    populateBranchDropdown();
  } catch (e) {
    console.error('Failed to load branches', e);
  }

  await refreshUsers();

  document.getElementById('inviteModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeInviteModal();
  });
});

function populateBranchDropdown() {
  const select = document.getElementById('inviteBranch');
  if (!select) return;
  select.innerHTML =
    '<option value="">Select branch…</option>' +
    companyBranches.map((b) => `<option value="${b.id}">${b.name}</option>`).join('');
}

function toggleBranchField() {
  const role = document.getElementById('inviteRole')?.value;
  const group = document.getElementById('inviteBranchGroup');
  if (group) group.style.display = role === 'branch_manager' ? 'block' : 'none';
}

async function refreshUsers() {
  const tbody = document.getElementById('userTableBody');
  try {
    const raw = await window.Helpers.api.request('/governance/users');
    const users = Array.isArray(raw) ? raw : (raw.data || []);

    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">No users yet.</td></tr>';
      return;
    }

    tbody.innerHTML = users
      .map((u) => {
        const roleLabel =
          u.roleAssignments?.[0]?.role?.label || 'Team Member';
        return `
        <tr>
          <td><div style="font-weight:600;">${u.fullName}</div><div style="font-size:12px;color:var(--text-muted);">${u.email}</div></td>
          <td>${roleLabel}</td>
          <td><span class="badge badge-green">Active</span></td>
        </tr>`;
      })
      .join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#ef4444;">Failed to load users.</td></tr>';
  }
}

function openInviteModal() {
  document.getElementById('invite-error').style.display = 'none';
  document.getElementById('inviteName').value = '';
  document.getElementById('inviteEmail').value = '';
  document.getElementById('inviteRole').value = 'company_owner';
  toggleBranchField();
  const modal = document.getElementById('inviteModal');
  modal.style.display = 'flex';
  modal.classList.add('active');
}

function closeInviteModal() {
  const modal = document.getElementById('inviteModal');
  modal.classList.remove('active');
  modal.style.display = 'none';
}

async function submitInvite() {
  const name = document.getElementById('inviteName').value.trim();
  const email = document.getElementById('inviteEmail').value.trim();
  const rawRole = document.getElementById('inviteRole').value;
  const branchId = document.getElementById('inviteBranch')?.value || '';
  const errDiv = document.getElementById('invite-error');
  if (errDiv) errDiv.style.display = 'none';

  if (!name || !email) {
    if (errDiv) {
      errDiv.textContent = 'Name and email are required.';
      errDiv.style.display = 'block';
    }
    return;
  }

  if (rawRole === 'branch_manager' && !branchId) {
    if (errDiv) {
      errDiv.textContent = 'Please select a branch for the Branch Manager.';
      errDiv.style.display = 'block';
    }
    return;
  }

  const targetLabel = roleLabelMap[rawRole] || rawRole;
  const matchedRole = companyRoles.find(
    (r) =>
      r.label.toLowerCase() === targetLabel.toLowerCase() ||
      r.label.toLowerCase().includes(targetLabel.toLowerCase()),
  );
  const roleId = matchedRole?.id || companyRoles[0]?.id;

  const payload = { email, name, roleId };
  if (rawRole === 'branch_manager' && branchId) payload.branchId = branchId;

  try {
    await window.Helpers.api.request('/governance/invite', 'POST', payload);
    closeInviteModal();
    await refreshUsers();
  } catch (e) {
    if (errDiv) {
      errDiv.textContent = e.message || 'Invite failed.';
      errDiv.style.display = 'block';
    }
  }
}

window.openInviteModal = openInviteModal;
window.closeInviteModal = closeInviteModal;
window.submitInvite = submitInvite;
window.toggleBranchField = toggleBranchField;

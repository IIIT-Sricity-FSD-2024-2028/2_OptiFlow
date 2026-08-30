document.addEventListener('DOMContentLoaded', async () => {
  const session = await AdminConsoleShell.init({
    activeNav: 'organization',
    pageTitle: 'Organization',
    subtitle: 'Manage branches and teams',
  });
  if (!session) return;

  await refreshBranchTable();

  document.getElementById('BranchModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeBranchModal();
  });
  document.getElementById('TeamModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeTeamModal();
  });
});

async function refreshBranchTable() {
  const branches = await getBranches();
  const tbody = document.getElementById('BranchTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!branches.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="ac-empty-cell">No branches yet. Click "+ Add Branch" to create one.</td></tr>';
  } else {
    branches.forEach((b) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${b.name}</strong></td>
        <td><span class="badge badge-green">${b.status || 'Active'}</span></td>
        <td>
          <button class="action-btn edit" onclick="openBranchModal('${b.id}')">Edit</button>
          <button class="action-btn delete" onclick="handleDeleteBranch('${b.id}')">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  const select = document.getElementById('branchSelectForTeams');
  if (select) {
    const current = select.value;
    select.innerHTML = '<option value="">Select a Branch…</option>' +
      branches.map((b) => `<option value="${b.id}">${b.name}</option>`).join('');
    if (branches.some((b) => b.id === current)) select.value = current;
  }
  refreshTeamsTable();
}

async function refreshTeamsTable() {
  const branchId = document.getElementById('branchSelectForTeams')?.value;
  const tbody = document.getElementById('TeamTableBody');
  const addBtn = document.getElementById('addTeamBtn');
  if (!tbody) return;

  if (!branchId) {
    tbody.innerHTML = '<tr><td colspan="3" class="ac-empty-cell">Select a branch to view teams.</td></tr>';
    if (addBtn) addBtn.disabled = true;
    return;
  }
  if (addBtn) addBtn.disabled = false;

  try {
    const raw = await window.Helpers.api.request('/teams', 'GET');
    const teams = Array.isArray(raw) ? raw : (raw.data || []);
    const filtered = teams.filter(
      (t) => t.branchId === branchId || t.branch?.id === branchId,
    );

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="ac-empty-cell">No teams in this branch.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered
      .map(
        (t) => `
      <tr>
        <td><strong>${t.name}</strong></td>
        <td>${t.branch?.name || '—'}</td>
        <td><button class="action-btn delete" onclick="handleDeleteTeam('${t.id}')">Delete</button></td>
      </tr>`,
      )
      .join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#ef4444;">Failed to load teams.</td></tr>';
  }
}

async function openBranchModal(id = null) {
  const modal = document.getElementById('BranchModal');
  const errDiv = document.getElementById('modal-global-error');
  if (errDiv) errDiv.style.display = 'none';

  if (id) {
    const branches = await getBranches();
    const b = branches.find((x) => String(x.id) === String(id));
    if (b) {
      document.getElementById('BranchId').value = b.id;
      document.getElementById('BranchName').value = b.name;
      document.getElementById('modalTitle').textContent = 'Edit Branch';
    }
  } else {
    document.getElementById('BranchForm').reset();
    document.getElementById('BranchId').value = '';
    document.getElementById('modalTitle').textContent = 'Add New Branch';
  }

  modal.style.display = 'flex';
  modal.classList.add('active');
}

function closeBranchModal() {
  const modal = document.getElementById('BranchModal');
  modal.classList.remove('active');
  modal.style.display = 'none';
}

async function saveBranch() {
  const id = document.getElementById('BranchId').value;
  const name = document.getElementById('BranchName').value.trim();
  const errDiv = document.getElementById('modal-global-error');
  if (errDiv) errDiv.style.display = 'none';

  if (!name) {
    if (errDiv) {
      errDiv.textContent = 'Branch name is required.';
      errDiv.style.display = 'block';
    }
    return;
  }

  try {
    if (id) {
      await window.Helpers.api.request(`/branches/${id}`, 'PATCH', { name });
    } else {
      await window.Helpers.api.request('/branches', 'POST', { name });
    }
    closeBranchModal();
    await refreshBranchTable();
  } catch (e) {
    if (errDiv) {
      errDiv.textContent =
        e.message || 'Plan limit reached. Please upgrade your subscription.';
      errDiv.style.display = 'block';
    }
  }
}

async function handleDeleteBranch(id) {
  if (!confirm('Delete this branch?')) return;
  await deleteBranch(id);
  await refreshBranchTable();
}

function openTeamModal() {
  document.getElementById('team-modal-global-error').style.display = 'none';
  document.getElementById('TeamName').value = '';
  const modal = document.getElementById('TeamModal');
  modal.style.display = 'flex';
  modal.classList.add('active');
}

function closeTeamModal() {
  const modal = document.getElementById('TeamModal');
  modal.classList.remove('active');
  modal.style.display = 'none';
}

async function saveTeam() {
  const branchId = document.getElementById('branchSelectForTeams').value;
  const name = document.getElementById('TeamName').value.trim();
  const errDiv = document.getElementById('team-modal-global-error');
  if (errDiv) errDiv.style.display = 'none';

  if (!name || !branchId) {
    if (errDiv) {
      errDiv.textContent = 'Select a branch and enter a team name.';
      errDiv.style.display = 'block';
    }
    return;
  }

  try {
    await window.Helpers.api.request('/teams', 'POST', { team_name: name, branchId });
    closeTeamModal();
    await refreshTeamsTable();
  } catch (e) {
    if (errDiv) {
      errDiv.textContent = e.message || 'Failed to create team.';
      errDiv.style.display = 'block';
    }
  }
}

async function handleDeleteTeam(id) {
  if (!confirm('Delete this team?')) return;
  await window.Helpers.api.request(`/teams/${id}`, 'DELETE');
  await refreshTeamsTable();
}

window.openBranchModal = openBranchModal;
window.closeBranchModal = closeBranchModal;
window.saveBranch = saveBranch;
window.handleDeleteBranch = handleDeleteBranch;
window.openTeamModal = openTeamModal;
window.closeTeamModal = closeTeamModal;
window.saveTeam = saveTeam;
window.handleDeleteTeam = handleDeleteTeam;
window.refreshTeamsTable = refreshTeamsTable;

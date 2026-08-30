// js/pages/superuser/branches.js
function isSystemAdminSession(session) {
  const role = String(session?.role || '').toLowerCase();
  const label = String(session?.roleLabel || session?.assignedRole || '').toLowerCase();
  return role === 'system_admin' || label.includes('system admin');
}

document.addEventListener("DOMContentLoaded", async () => {
  const sessionRaw = sessionStorage.getItem('currentUser');
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw);
      if (!isSystemAdminSession(session)) {
        window.location.href = 'dashboard.html';
        return;
      }
    } catch { /* ignore */ }
  }

  if (window.Sidebar) {
    window.Sidebar.render("branches");
  }

  if (window.location.hash === '#teams') {
    const teamsSection = document.getElementById('teams-section');
    if (teamsSection) teamsSection.scrollIntoView({ behavior: 'smooth' });
  }

  await refreshBranchTable();

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", refreshBranchTable);
  }

  const modal = document.getElementById("BranchModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeBranchModal();
    });
  }

  const teamModal = document.getElementById("TeamModal");
  if (teamModal) {
    teamModal.addEventListener("click", (e) => {
      if (e.target === teamModal) closeTeamModal();
    });
  }
});

async function refreshBranchTable() {
  let branches = await getBranches();
  const searchInput = document.getElementById("searchInput");
  const search = searchInput ? searchInput.value.toLowerCase() : "";

  if (search) {
    branches = branches.filter(
      (b) =>
        (b.name && b.name.toLowerCase().includes(search)) ||
        (b.head && b.head.toLowerCase().includes(search)),
    );
  }

  renderBranchTable(branches);
  populateBranchDropdown(branches);
}

function renderBranchTable(data) {
  const tbody = document.getElementById("BranchTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!data || data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No branches found</td></tr>';
    return;
  }

  data.forEach((b) => {
    const tr = document.createElement("tr");
    const statusBadge = b.status === "Active" ? "badge-green" : "badge-gray";

    tr.innerHTML = `
      <td><div class="td-title" style="font-weight:600; color: var(--text-primary);">${b.name}</div></td>
      <td>${b.head || "Sarah Jenkins"}</td>
      <td><span class="badge badge-gray">${b.users || 0} users</span></td>
      <td>${b.processes || 0} Active</td>
      <td><span class="badge ${statusBadge}">${b.status || 'Active'}</span></td>
      <td>
        <button class="action-btn edit" onclick="openBranchModal('${b.id}')" style="margin-right: 6px;">Edit</button>
        <button class="action-btn delete" onclick="handleDeleteBranch('${b.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function populateBranchDropdown(branches) {
  const select = document.getElementById("branchSelectForTeams");
  if (!select) return;
  
  const currentVal = select.value;
  select.innerHTML = '<option value="">Select a Branch...</option>' + 
    branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  
  // Restore selected value if valid
  if (branches.some(b => b.id === currentVal)) {
    select.value = currentVal;
  } else {
    select.value = "";
    const addBtn = document.getElementById("addTeamBtn");
    if (addBtn) addBtn.disabled = true;
  }
  refreshTeamsTable();
}

async function refreshTeamsTable() {
  const branchSelect = document.getElementById("branchSelectForTeams");
  const tbody = document.getElementById("TeamTableBody");
  const addBtn = document.getElementById("addTeamBtn");
  
  if (!branchSelect || !tbody) return;
  
  const branchId = branchSelect.value;
  if (!branchId) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Please select a branch to view teams.</td></tr>';
    if (addBtn) addBtn.disabled = true;
    return;
  }
  
  if (addBtn) addBtn.disabled = false;
  
  try {
    const rawTeams = await window.Helpers.api.request('/teams', 'GET');
    const teams = Array.isArray(rawTeams) ? rawTeams : (rawTeams.data || []);
    const filteredTeams = teams.filter(t => t.branchId === branchId || (t.branch && t.branch.id === branchId));
    
    tbody.innerHTML = "";
    if (filteredTeams.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No teams in this branch. Click "+ Add Team" to create one.</td></tr>';
      return;
    }
    
    filteredTeams.forEach(t => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><div style="font-weight:600; color: var(--text-primary);">${t.name}</div></td>
        <td>${t.branch ? t.branch.name : 'Unknown Branch'}</td>
        <td><span class="badge badge-gray">${t.projects ? t.projects.length : 0} projects</span></td>
        <td>
          <button class="action-btn delete" onclick="handleDeleteTeam('${t.id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #ef4444; padding: 20px;">Failed to load teams.</td></tr>';
  }
}

async function openBranchModal(id = null) {
  const modal = document.getElementById("BranchModal");
  if (!modal) return;
  
  const title = document.getElementById("modalTitle");
  const errDiv = document.getElementById("modal-global-error");
  if (errDiv) errDiv.style.display = "none";

  if (id) {
    const branches = await getBranches();
    const b = branches.find((x) => String(x.id) === String(id));
    if (b) {
      document.getElementById("BranchId").value = b.id;
      document.getElementById("BranchName").value = b.name;
      if (document.getElementById("BranchHead")) document.getElementById("BranchHead").value = b.head || "";
      if (document.getElementById("BranchStatus")) document.getElementById("BranchStatus").value = b.status || "Active";
      if (title) title.innerText = "Edit Branch";
    }
  } else {
    const form = document.getElementById("BranchForm");
    if (form) form.reset();
    document.getElementById("BranchId").value = "";
    if (title) title.innerText = "Add New Branch";
  }

  modal.classList.add("active");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeBranchModal() {
  const modal = document.getElementById("BranchModal");
  if (!modal) return;
  modal.classList.remove("active");
  modal.style.display = "none";
  document.body.style.overflow = "";
}

async function saveBranchHandler() {
  const id = document.getElementById("BranchId").value;
  const nameInput = document.getElementById("BranchName");
  const name = nameInput ? nameInput.value.trim() : "";
  const headInput = document.getElementById("BranchHead");
  const head = headInput ? headInput.value.trim() : "Branch Manager";
  const statusInput = document.getElementById("BranchStatus");
  const status = statusInput ? statusInput.value : "Active";
  
  const errDiv = document.getElementById("modal-global-error");
  if (errDiv) errDiv.style.display = "none";

  if (!name) {
    if (errDiv) {
      errDiv.textContent = "Branch Name is required.";
      errDiv.style.display = "block";
    } else {
      alert("Branch Name is required!");
    }
    return;
  }

  try {
    await saveBranch({ id, name, head, status });
    closeBranchModal();
    await refreshBranchTable();
  } catch (e) {
    if (errDiv) {
      errDiv.textContent = e.message || 'Plan limit reached. Please upgrade your subscription.';
      errDiv.style.display = "block";
    } else {
      alert(e.message || 'Plan limit reached. Please upgrade to add more branches.');
    }
  }
}
window.saveBranch = saveBranchHandler;
window.openBranchModal = openBranchModal;
window.closeBranchModal = closeBranchModal;

async function handleDeleteBranch(id) {
  if (confirm("Are you sure you want to delete this branch?")) {
    await deleteBranch(id);
    await refreshBranchTable();
  }
}
window.handleDeleteBranch = handleDeleteBranch;

// Team Modal Actions
function openTeamModal() {
  const modal = document.getElementById("TeamModal");
  if (!modal) return;
  
  const errDiv = document.getElementById("team-modal-global-error");
  if (errDiv) errDiv.style.display = "none";
  
  const form = document.getElementById("TeamForm");
  if (form) form.reset();
  document.getElementById("TeamId").value = "";
  
  modal.classList.add("active");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeTeamModal() {
  const modal = document.getElementById("TeamModal");
  if (!modal) return;
  modal.classList.remove("active");
  modal.style.display = "none";
  document.body.style.overflow = "";
}

async function saveTeamHandler() {
  const branchSelect = document.getElementById("branchSelectForTeams");
  const nameInput = document.getElementById("TeamName");
  const name = nameInput ? nameInput.value.trim() : "";
  const branchId = branchSelect ? branchSelect.value : "";
  
  const errDiv = document.getElementById("team-modal-global-error");
  if (errDiv) errDiv.style.display = "none";
  
  if (!name) {
    if (errDiv) {
      errDiv.textContent = "Team name is required.";
      errDiv.style.display = "block";
    }
    return;
  }
  
  try {
    await window.Helpers.api.request('/teams', 'POST', { team_name: name, branchId });
    closeTeamModal();
    await refreshTeamsTable();
  } catch (e) {
    if (errDiv) {
      errDiv.textContent = e.message || 'Failed to save team.';
      errDiv.style.display = "block";
    } else {
      alert(e.message || 'Failed to save team.');
    }
  }
}
window.saveTeam = saveTeamHandler;
window.openTeamModal = openTeamModal;
window.closeTeamModal = closeTeamModal;

async function handleDeleteTeam(id) {
  if (confirm("Are you sure you want to delete this team?")) {
    try {
      await window.Helpers.api.request(`/teams/${id}`, 'DELETE');
      await refreshTeamsTable();
    } catch (e) {
      alert("Failed to delete team.");
    }
  }
}
window.handleDeleteTeam = handleDeleteTeam;
window.refreshTeamsTable = refreshTeamsTable;

// dashboard.js – HR Dashboard logic
// All data comes from HRStore (hr-data-store.js).
// No employee names, counts, or details are hardcoded here.
// ─────────────────────────────────────────
// SECURITY GUARD: Prevent Back-Button Access
// ─────────────────────────────────────────
function enforceSecurity() {
  if (!sessionStorage.getItem("currentUser")) {
    window.location.replace("../../login.html");
  }
}

enforceSecurity();

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    enforceSecurity();
  }
});
// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function roleBadgeClass(role) {
  const r = (role || "").toLowerCase();
  if (r.includes("project manager")) return "pm";
  if (r.includes("team leader")) return "tl";
  if (r.includes("team member")) return "tm";
  if (r.includes("compliance officer")) return "co";
  if (r.includes("process admin")) return "pa";
  if (r.includes("hr")) return "pm";
  return "tm";
}

async function renderMetrics() {
  const stats = await HRStore.getStats();
  document.getElementById("metricTotal").textContent = stats.totalMembers;
  document.getElementById("metricActive").textContent = stats.activeNow;
  document.getElementById("metricTeams").textContent = stats.activeTeams;
  document.getElementById("metricPending").textContent = stats.pendingSlots;
}

function renderRows(data) {
  const tbody = document.getElementById("employeeTableBody");
  const noResults = document.getElementById("noResults");
  const countEl = document.getElementById("employeeCount");

  tbody.innerHTML = "";

  if (data.length === 0) {
    noResults.style.display = "block";
    countEl.textContent = "0 results";
    return;
  }

  noResults.style.display = "none";
  countEl.textContent = `${data.length} total`;

  data.forEach((emp) => {
    const isPending = emp.status === "pending";
    const teamDisplay = emp.team || "—";
    const actionBtn = isPending
      ? `<button class="action-btn provision" onclick="goToEmployee('${emp.id}')">Provision</button>`
      : `<button class="action-btn view" onclick="goToEmployee('${emp.id}')">View</button>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div class="emp-cell">
          <div class="emp-avatar" style="background:${emp.color};">${emp.initials}</div>
          <div>
            <div class="td-title">${emp.name}</div>
            <div class="td-subtitle">${emp.id}</div>
          </div>
        </div>
      </td>
      <td><span class="role-badge ${roleBadgeClass(emp.role)}">${emp.role}</span></td>
      <td style="color:var(--text-main);font-size:14px;">${teamDisplay}</td>
      <td><span class="status-badge ${emp.status}">${emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}</span></td>
      <td style="color:var(--text-muted);font-size:13px;">${emp.joined}</td>
      <td style="text-align:right;">${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ─────────────────────────────────────────
// Filter + Search (reads live from store)
// ─────────────────────────────────────────
async function filterEmployees() {
  const search = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();
  const team = document.getElementById("teamFilter").value;
  const role = document.getElementById("roleFilter").value;

  const employees = await HRStore.getAll();
  const filtered = employees.filter((emp) => {
    const matchSearch =
      !search ||
      emp.name.toLowerCase().includes(search) ||
      emp.id.toLowerCase().includes(search);
    const matchTeam = !team || (emp.team || "") === team;
    const matchRole = !role || emp.role === role;
    return matchSearch && matchTeam && matchRole;
  });

  renderRows(filtered);
}

// ─────────────────────────────────────────
// Populate filter dropdowns from store
// ─────────────────────────────────────────
async function populateFilters() {
  const employees = await HRStore.getAll();

  const teamSel = document.getElementById("teamFilter");
  teamSel.innerHTML = '<option value="">All Teams</option>';
  const teams = await HRStore.getTeams();
  teams.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    teamSel.appendChild(opt);
  });

  const roleSel = document.getElementById("roleFilter");
  const roles = [...new Set(employees.map((e) => e.role))].sort();
  roleSel.innerHTML = '<option value="">All Roles</option>';
  roles.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    roleSel.appendChild(opt);
  });
}

// ─────────────────────────────────────────
// Navigation helpers
// ─────────────────────────────────────────
function goToEmployee(empId) {
  window.location.href = `employee-detail.html?id=${empId}`;
}

function goToProvision(empId) {
  window.location.href = `new-employee.html?provision=${empId}`;
}

// ─────────────────────────────────────────
// Modal helpers
// ─────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add("active");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

function setupNotifications() {
  const btn = document.getElementById("notifBtn");
  if (!btn) return;
  const panel = document.getElementById("notifPanel");
  const backdrop = document.getElementById("notifBackdrop");
  const closeBtn = document.getElementById("closeNotif");

  const open = () => {
    panel.classList.add("open");
    backdrop.classList.add("open");
  };
  const close = () => {
    panel.classList.remove("open");
    backdrop.classList.remove("open");
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.contains("open") ? close() : open();
  });
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
}


// ─────────────────────────────────────────
// Init
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  if (typeof HRStore !== "undefined" && HRStore.syncWithMaster) {
    await HRStore.syncWithMaster();
  }

  await renderMetrics();
  await populateFilters();
  renderRows(await HRStore.getAll());
  setupNotifications();
// --- DYNAMIC SIDEBAR UPDATER ---
  // Fetch the live, mapped user from the backend
  const currentUser = await HRStore.getCurrentUser();
  if (currentUser) {
    // We cast a wide net to catch whatever CSS class your HTML is using
    const nameEls = document.querySelectorAll(".sidebar-user-name, .user-info h4, .profile-name, .name, .user-name");
    const roleEls = document.querySelectorAll(".sidebar-user-role, .user-info p, .profile-role, .role, .user-role");
    const avatarEls = document.querySelectorAll(".sidebar-avatar, .user-avatar, .avatar, .profile-avatar");

    // Update all matching elements on the page
    nameEls.forEach(el => el.textContent = currentUser.name);
    roleEls.forEach(el => el.textContent = currentUser.role);
    avatarEls.forEach(el => {
      el.textContent = currentUser.initials;
      el.style.backgroundColor = currentUser.color;
    });
  }
  // -------------------------------
  document
    .getElementById("searchInput")
    .addEventListener("input", filterEmployees);
  document
    .getElementById("teamFilter")
    .addEventListener("change", filterEmployees);
  document
    .getElementById("roleFilter")
    .addEventListener("change", filterEmployees);

  document.getElementById("newEmployeeBtn").addEventListener("click", () => {
    window.location.href = "new-employee.html";
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => openModal("logoutModal"));
    document
      .getElementById("closeLogoutModal")
      .addEventListener("click", () => closeModal("logoutModal"));
    document
      .getElementById("cancelLogout")
      .addEventListener("click", () => closeModal("logoutModal"));
    document.getElementById("confirmLogout").addEventListener("click", () => {
      sessionStorage.removeItem("currentUser");
      closeModal("logoutModal");
      window.location.href = "../../login.html";
    });
    document.getElementById("logoutModal").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeModal("logoutModal");
    });
  }

  const currentPage =
    window.location.pathname.split("/").pop() || "dashboard.html";
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    if ((item.getAttribute("href") || "") === currentPage)
      item.classList.add("active");
  });
});

// ─────────────────────────────────────────
// API Integration: Invite & Custom Roles
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const currentUserStr = sessionStorage.getItem('currentUser');
  if (!currentUserStr) return;
  const currentUser = JSON.parse(currentUserStr);

  const headers = {
      'Content-Type': 'application/json',
      'x-user-role': currentUser.roleId || currentUser.roleSlug || currentUser.assignedRole || "Access Governance",
      'x-user-email': currentUser.email,
      'x-company-id': currentUser.companyId
  };

  let allRoles = [];

  // Override the New Employee button to open our API modal instead of redirecting
  const newEmpBtn = document.getElementById("newEmployeeBtn");
  if (newEmpBtn) {
      // Remove old listeners by cloning
      const newBtnClone = newEmpBtn.cloneNode(true);
      newEmpBtn.parentNode.replaceChild(newBtnClone, newEmpBtn);
      
      newBtnClone.addEventListener("click", () => {
          document.getElementById('inviteModal').style.display = 'block';
      });
  }

  const customRoleBtn = document.getElementById("customRoleBtn");
  if (customRoleBtn) {
      customRoleBtn.addEventListener("click", () => {
          document.getElementById('customRoleModal').style.display = 'block';
      });
  }

  // Load Roles for dropdowns
  async function loadRolesForAPI() {
      try {
          const res = await fetch('http://localhost:3000/governance/roles', { headers });
          if (!res.ok) return;
          const data = await res.json();
          allRoles = data.data || data;
          
          const inviteSelect = document.getElementById('inviteRoleSelect');
          const baseSelect = document.getElementById('baseRoleSelect');
          
          if (inviteSelect && baseSelect) {
              inviteSelect.innerHTML = '';
              baseSelect.innerHTML = '<option value="">Select a base role...</option>';
              
              allRoles.forEach(r => {
                  inviteSelect.innerHTML += `<option value="${r.id}">${r.label}</option>`;
                  baseSelect.innerHTML += `<option value="${r.id}">${r.label}</option>`;
              });
          }
      } catch (err) {
          console.error("Failed to load roles for API", err);
      }
  }

  const baseSelect = document.getElementById('baseRoleSelect');
  if (baseSelect) {
      baseSelect.addEventListener('change', (e) => {
          const role = allRoles.find(r => r.id === e.target.value);
          const grid = document.getElementById('permissionsGrid');
          grid.innerHTML = '';
          
          if (role && role.roleTemplate && role.roleTemplate.permissions) {
              role.roleTemplate.permissions.forEach(rp => {
                  const p = rp.permission;
                  grid.innerHTML += `
                      <label style="display:flex; align-items:center; gap:5px; font-size:13px;">
                          <input type="checkbox" name="permissions" value="${p.id}" checked>
                          ${p.name}
                      </label>
                  `;
              });
          }
      });
  }

  const inviteForm = document.getElementById('inviteForm');
  if (inviteForm) {
      inviteForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const payload = {
              name: document.getElementById('inviteName').value,
              email: document.getElementById('inviteEmail').value,
              roleId: document.getElementById('inviteRoleSelect').value
          };
          try {
              const res = await fetch('http://localhost:3000/governance/invite', {
                  method: 'POST', headers, body: JSON.stringify(payload)
              });
              if (res.ok) {
                  document.getElementById('inviteModal').style.display = 'none';
                  inviteForm.reset();
                  alert("Employee invited successfully!");
                  // Refresh old dashboard table (it reads from HRStore, so ideally we sync here, but reload is easiest)
                  window.location.reload();
              } else {
                  alert("Failed to invite employee");
              }
          } catch(err) {
              console.error(err);
          }
      });
  }

  const customRoleForm = document.getElementById('customRoleForm');
  if (customRoleForm) {
      customRoleForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const checkboxes = document.querySelectorAll('input[name="permissions"]:checked');
          const permissionIds = Array.from(checkboxes).map(cb => cb.value);
          
          const payload = {
              sourceRoleId: document.getElementById('baseRoleSelect').value,
              newName: document.getElementById('newRoleName').value,
              permissionIds
          };
          
          try {
              const res = await fetch('http://localhost:3000/governance/roles/clone', {
                  method: 'POST', headers, body: JSON.stringify(payload)
              });
              if (res.ok) {
                  customRoleForm.reset();
                  document.getElementById('permissionsGrid').innerHTML = '';
                  document.getElementById('customRoleModal').style.display = 'none';
                  alert("Custom role created successfully!");
                  loadRolesForAPI();
              } else {
                  alert("Failed to create custom role");
              }
          } catch(err) {
              console.error(err);
          }
      });
  }

  loadRolesForAPI();
});

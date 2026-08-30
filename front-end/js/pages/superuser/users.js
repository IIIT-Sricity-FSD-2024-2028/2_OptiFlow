// js/pages/superuser/users.js
let companyRoles = [];
let companyBranches = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (window.Sidebar) {
    window.Sidebar.render("users");
  }
  try {
    const rawRoles = await window.Helpers.api.request('/roles');
    companyRoles = Array.isArray(rawRoles) ? rawRoles : (rawRoles.data || []);
  } catch (e) {
    console.error("Failed to load roles", e);
  }
  try {
    const rawBranches = await window.Helpers.api.request('/branches');
    companyBranches = Array.isArray(rawBranches) ? rawBranches : (rawBranches.data || []);
    populateBranchDropdown();
  } catch (e) {
    console.error("Failed to load branches", e);
  }
  refreshTable();

  document
    .getElementById("searchInput")
    .addEventListener("input", refreshTable);
  document
    .getElementById("roleFilter")
    .addEventListener("change", refreshTable);

  const roleSelect = document.getElementById("userRole");
  if (roleSelect) {
    roleSelect.addEventListener("change", toggleBranchAssignment);
  }

  // Outside click to close
  document.getElementById("userModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeUserModal();
  });
});

function populateBranchDropdown() {
  const select = document.getElementById("userAssignBranch");
  if (!select) return;
  select.innerHTML = '<option value="">Select branch…</option>';
  companyBranches.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.name;
    select.appendChild(opt);
  });
}

function toggleBranchAssignment() {
  const role = document.getElementById("userRole")?.value;
  const group = document.getElementById("assignBranchGroup");
  if (!group) return;
  group.style.display = role === "branch_manager" ? "block" : "none";
}

async function refreshTable() {
  // Ensure HRStore and Master users stay synchronized
  if (typeof HRStore !== "undefined" && HRStore.syncWithMaster) {
    try { await HRStore.syncWithMaster(); } catch(e) {}
  }

  let users = await getUsers(); // NOW ASYNC — must await
  const search = document.getElementById("searchInput").value.toLowerCase();
  const role = document.getElementById("roleFilter").value;

  if (search) {
    users = users.filter(
      (u) =>
        (u.name || u.fullName || '').toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search),
    );
  }
  if (role) {
    users = users.filter((u) => u.role === role);
  }

  renderUserTable(users);
}

function pushNotificationToRole(targetRole, { title, message, type }) {
  try {
    const users = getUsers();
    const targets = users.filter((u) => String(u.role) === String(targetRole));
    if (targets.length === 0) return;

    let notifications = JSON.parse(localStorage.getItem("system_notifications")) || [];
    const baseId = Date.now();
    targets.forEach((t, i) => {
      notifications.push({
        id: baseId + i,
        targetUserId: String(t.id),
        title: title || "Notification",
        message: message || "",
        type: type || "info",
        date: "Just now",
        read: false,
      });
    });
    localStorage.setItem("system_notifications", JSON.stringify(notifications));
  } catch (e) {
    console.warn("Notification hook failed.", e);
  }
}

async function upsertEmployeeFromAuthUser(authUser) {
  if (typeof HRStore === "undefined") return;
  if (!authUser || !authUser.email) return;

  const email = authUser.email.trim().toLowerCase();
  const emps = await HRStore.getAll();
  const existing = emps.find((e) => String(e.email || "").trim().toLowerCase() === email);

  // Map auth role to HR display role
  const roleMap = {
    superuser: "Process Admin",
    hr_manager: "HR Manager",
    hr_ops: "HR Ops",
    project_manager: "Project Manager",
    team_leader: "Team Leader",
    team_member: "Team Member",
    compliance_officer: "Compliance Officer",
    enduser: "Team Member",
  };
  const hrRole = roleMap[String(authUser.role || "").toLowerCase()] || authUser.role;
  const hrStatus =
    String(authUser.status || "Active").toLowerCase() === "inactive" ? "inactive" : "active";

  if (existing) {
    await HRStore.update(existing.id, {
      name: authUser.name || existing.name,
      email: authUser.email,
      phone: existing.phone || "+91 00000 00000",
      department: authUser.department || existing.department,
      team: existing.team || null,
      role: hrRole,
      parentId: existing.parentId || null,
      joinDateRaw: existing.joinDateRaw || "",
      joined: existing.joined || authUser.joined || existing.joined,
      status: existing.status, // status handled via setStatus
    });
    await HRStore.setStatus(existing.id, hrStatus);
  } else {
    // Create a minimal HR profile so HR dashboards and superuser users list stay aligned
    const joined =
      authUser.joined ||
      new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    await HRStore.add({
      name: authUser.name || authUser.email,
      initials: (authUser.name || authUser.email)
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2) || "??",
      color: "#2563eb",
      role: hrRole,
      department: authUser.department || "Operations",
      team: null,
      parentId: null,
      status: hrStatus,
      joined,
      email: authUser.email,
      phone: "+91 00000 00000",
      joinDateRaw: "",
    });
  }
}

function renderUserTable(data) {
  const tbody = document.getElementById("userTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!data || data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No users found</td></tr>';
    return;
  }

  const roleMap = {
    superuser:          { name: "Process Admin",        color: "purple" },
    hr_manager:         { name: "HR Manager",           color: "blue"   },
    compliance_officer: { name: "Compliance Officer",   color: "red"    },
    project_manager:    { name: "Project Manager",      color: "blue"   },
    team_leader:        { name: "Team Leader",          color: "yellow" },
    team_member:        { name: "Team Member",          color: "gray"   },
    company_owner:      { name: "Company Owner",        color: "purple" },
    branch_manager:     { name: "Branch Manager",       color: "blue"   },
    system_admin:       { name: "System Admin",         color: "red"    },
  };

  data.forEach((u) => {
    const tr = document.createElement("tr");
    const roleData = roleMap[u.role] || { name: u.role, color: "gray" };
    const readableRole = u.displayRole || roleData.name;
    const roleBadge = roleData.color;
    const statusBadge = u.status === "Active" ? "green" : "gray";
    const displayName = u.name || u.fullName || "Unknown";
    const dept = u.department || "—";
    const joined = u.joined || "—";

    tr.innerHTML = `
            <td>
                <div class="td-title">${displayName}</div>
                <div class="td-subtitle">${u.email}</div>
            </td>
            <td><span class="badge ${roleBadge}">${readableRole}</span></td>
            <td>${dept}</td>
            <td><span class="badge ${statusBadge}">${u.status}</span></td>
            <td style="color: var(--text-muted);">${joined}</td>
            <td>
                <button class="action-btn edit" onclick="openUserModal('${u.id}')">Edit</button>
                <button class="action-btn delete" onclick="deleteUser('${u.id}')">Delete</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}
async function openUserModal(id = null) {
  const modal = document.getElementById("userModal");
  const title = document.getElementById("modalTitle");

  const content = modal.querySelector(".modal-body");
  if (content) content.scrollTop = 0;

  showError("userName", true);
  showError("userEmail", true);

  if (id) {
    const users = await getUsers();
    const u = users.find((x) => x.id === id);
    if (u) {
      document.getElementById("userId").value = u.id;
      document.getElementById("userName").value = u.name;
      document.getElementById("userEmail").value = u.email;

      // ✅ This perfectly matches the <option value="hr_manager"> in your HTML
      document.getElementById("userRole").value = u.role;

      document.getElementById("userDept").value = u.department;
      document.getElementById("userTeams").value = u.teams || "";
      document.getElementById("userResp").value = u.responsibilities || "";
      document.getElementById("userTasks").value = u.tasks || 0;
      document.getElementById("userProcesses").value = u.processes || 0;

      title.innerText = "Edit User";
    }
  } else {
    document.getElementById("userForm").reset();
    document.getElementById("userId").value = "";
    document.getElementById("userTasks").value = "0";
    document.getElementById("userProcesses").value = "0";
    title.innerText = "Add New User";
  }

  toggleBranchAssignment();
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeUserModal() {
  document.getElementById("userModal").classList.remove("active");
  document.body.style.overflow = "";
}

async function saveUser() {
  const id = document.getElementById("userId").value;
  const name = document.getElementById("userName").value;
  const email = document.getElementById("userEmail").value;
  const rawRole = document.getElementById("userRole").value; // e.g. "hr_manager"
  const dept = document.getElementById("userDept").value;

  const isNameValid = showError("userName", validateRequired(name));
  const isEmailValid = showError("userEmail", validateEmail(email));

  if (!isNameValid || !isEmailValid) return;

  const errDiv = document.getElementById("user-modal-global-error");
  if (errDiv) errDiv.style.display = "none";

  // Map rawRole to matching role template label in database
  const roleLabelMap = {
    company_owner: 'Company Owner',
    branch_manager: 'Branch Manager',
    superuser: 'Process Admin',
    hr_manager: 'Access Governance',
    compliance_officer: 'Compliance Officer',
    project_manager: 'Project Manager',
    team_leader: 'Team Lead',
    enduser: 'Team Member'
  };

  const targetLabel = roleLabelMap[rawRole] || rawRole;
  let matchedRole = companyRoles.find(r => 
    r.label.toLowerCase() === targetLabel.toLowerCase() ||
    r.label.toLowerCase().includes(targetLabel.toLowerCase())
  );

  const roleId = matchedRole ? matchedRole.id : (companyRoles[0] ? companyRoles[0].id : '');
  const branchId = document.getElementById("userAssignBranch")?.value || '';

  if (rawRole === 'branch_manager' && !branchId) {
    if (errDiv) {
      errDiv.textContent = 'Please select a branch for the Branch Manager role.';
      errDiv.style.display = "block";
    } else {
      alert('Please select a branch for the Branch Manager role.');
    }
    return;
  }

  try {
    if (id) {
      // For editing, let's update user info via API
      const numericId = id.startsWith('u') ? id.substring(1) : id;
      await window.Helpers.api.request(`/users/${numericId}`, 'PATCH', { fullName: name, email });
    } else {
      const payload = { email, name, roleId };
      if (rawRole === 'branch_manager' && branchId) {
        payload.branchId = branchId;
      }
      await window.Helpers.api.request('/governance/invite', 'POST', payload);
    }
    closeUserModal();
    refreshTable();
  } catch (e) {
    if (errDiv) {
      errDiv.textContent = e.message || 'Plan limit reached. Please upgrade to add more users.';
      errDiv.style.display = "block";
    } else {
      alert(e.message || 'Plan limit reached. Please upgrade to add more users.');
    }
  }
}

async function deleteUser(id) {
  if (
    confirm(
      "Are you sure you want to deactivate this user? They will be unable to log in, and their HR profile will be marked inactive.",
    )
  ) {
    const users = await getUsers(); // Get master db list

    // 1. Find the user so we know their email/details before deleting
    const userToDelete = users.find((u) => u.id === id);

    if (userToDelete) {
      // 2. REVERSE INTEGRATION HOOK: Tell HRStore to deactivate this person
      // We look them up by email in the HR store, since the IDs might not match perfectly
      if (typeof HRStore !== "undefined") {
        const hrEmps = await HRStore.getAll();
        const hrProfile = hrEmps.find(
          (e) => e.email.toLowerCase() === userToDelete.email.toLowerCase(),
        );

        if (hrProfile) {
          await HRStore.setStatus(hrProfile.id, "inactive");
          console.log(`[HR Sync] Deactivated ${hrProfile.email} in HR system.`);
        }
      }

      // 3. Deactivate in the Master Login DB (do NOT delete; keeps sync consistent)
      const idx = users.findIndex((u) => u.id === id);
      if (idx > -1) {
        users[idx] = { ...users[idx], status: "Inactive" };
      }
      saveUsers(users);

      // Rule A: notify HR Manager
      pushNotificationToRole("hr_manager", {
        title: "User Deactivated",
        message: `Superuser deactivated ${userToDelete.name} (${userToDelete.email}).`,
        type: "error",
      });


      refreshTable();
    }
  }
}

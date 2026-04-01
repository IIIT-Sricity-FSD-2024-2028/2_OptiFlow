// js/pages/superuser/users.js

document.addEventListener("DOMContentLoaded", () => {
  refreshTable();

  document
    .getElementById("searchInput")
    .addEventListener("input", refreshTable);
  document
    .getElementById("roleFilter")
    .addEventListener("change", refreshTable);

  // Outside click to close
  document.getElementById("userModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeUserModal();
  });
});

function refreshTable() {
  let users = getUsers(); // Pulls from master db.js
  const search = document.getElementById("searchInput").value.toLowerCase();
  const role = document.getElementById("roleFilter").value; // e.g., "hr_manager"

  if (search) {
    users = users.filter(
      (u) =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search),
    );
  }
  if (role) {
    users = users.filter((u) => u.role === role);
  }

  renderUserTable(users);
}

function renderUserTable(data) {
  const tbody = document.getElementById("userTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No users found</td></tr>';
    return;
  }

  // ✅ 1. The Perfect Dictionary Map
  // This forces the exact text you want and strictly uses safe CSS colors
  const roleMap = {
    superuser: { name: "Process Admin", color: "purple" },
    hr_manager: { name: "HR Manager", color: "blue" },
    compliance_officer: { name: "Compliance Officer", color: "red" },
    project_manager: { name: "Project Manager", color: "blue" },
    team_leader: { name: "Team Leader", color: "yellow" },
    team_member: { name: "Team Member", color: "gray" },
  };

  data.forEach((u) => {
    const tr = document.createElement("tr");

    // 2. Look up the role in our dictionary (fallback to gray if it's something weird)
    const roleData = roleMap[u.role] || { name: u.role, color: "gray" };

    // 3. Set the variables for the HTML
    const readableRole = u.displayRole || roleData.name;
    const roleBadge = roleData.color;
    const statusBadge = u.status === "Active" ? "green" : "gray";

    tr.innerHTML = `
            <td>
                <div class="td-title">${u.name}</div>
                <div class="td-subtitle">${u.email}</div>
            </td>
            <td><span class="badge ${roleBadge}">${readableRole}</span></td>
            <td>${u.department}</td>
            <td><span class="badge ${statusBadge}">${u.status}</span></td>
            <td style="color: var(--text-muted);">${u.joined}</td>
            <td>
                <button class="action-btn edit" onclick="openUserModal('${u.id}')">Edit</button>
                <button class="action-btn delete" onclick="deleteUser('${u.id}')">Delete</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}
function openUserModal(id = null) {
  const modal = document.getElementById("userModal");
  const title = document.getElementById("modalTitle");

  const content = modal.querySelector(".modal-body");
  if (content) content.scrollTop = 0;

  showError("userName", true);
  showError("userEmail", true);

  if (id) {
    const users = getUsers();
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

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeUserModal() {
  document.getElementById("userModal").classList.remove("active");
  document.body.style.overflow = "";
}

function saveUser() {
  const id = document.getElementById("userId").value;
  const name = document.getElementById("userName").value;
  const email = document.getElementById("userEmail").value;
  const rawRole = document.getElementById("userRole").value; // e.g. "hr_manager"
  const dept = document.getElementById("userDept").value;

  const teams = document.getElementById("userTeams").value;
  const responsibilities = document.getElementById("userResp").value;
  const tasks = document.getElementById("userTasks").value;
  const processes = document.getElementById("userProcesses").value;

  const isNameValid = showError("userName", validateRequired(name));
  const isEmailValid = showError("userEmail", validateEmail(email));

  if (!isNameValid || !isEmailValid) return;

  const users = getUsers();

  // Grab the human-readable text from the dropdown (e.g. "HR Manager")
  const roleSelect = document.getElementById("userRole");
  const displayRole = roleSelect.options[roleSelect.selectedIndex].text;

  if (id) {
    const idx = users.findIndex((u) => u.id === id);
    if (idx > -1) {
      const oldName = users[idx].name;
      users[idx] = {
        ...users[idx],
        name,
        email,
        role: rawRole, // e.g. "hr_manager"
        displayRole: displayRole, // e.g. "HR Manager"
        department: dept,
        teams,
        responsibilities,
        tasks,
        processes,
      };
      if (typeof AuditStore !== "undefined") {
        AuditStore.add("User Management", `Updated user: ${name} (${rawRole})`, "Info");
      }
    }
  } else {
    const newDate = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const newUser = {
      id: "u" + Date.now(),
      name,
      email,
      password: "123", // ✅ DEFAULT PASSWORD
      role: rawRole,
      displayRole: displayRole,
      department: dept,
      status: "Active",
      joined: newDate,
      teams,
      responsibilities,
      tasks,
      processes,
    };
    users.push(newUser);
    if (typeof AuditStore !== "undefined") {
      AuditStore.add("User Management", `Created new user: ${name} (${rawRole})`, "Info");
    }
  }

  saveUsers(users); // Saves to master db.js
  closeUserModal();
  refreshTable();
}

function deleteUser(id) {
  if (
    confirm(
      "Are you sure you want to deactivate this user? They will be unable to log in, and their HR profile will be marked inactive.",
    )
  ) {
    let users = getUsers(); // Get master db list

    // 1. Find the user so we know their email/details before deleting
    const userToDelete = users.find((u) => u.id === id);

    if (userToDelete) {
      // 2. REVERSE INTEGRATION HOOK: Tell HRStore to deactivate this person
      // We look them up by email in the HR store, since the IDs might not match perfectly
      if (typeof HRStore !== "undefined") {
        const hrEmps = HRStore.getAll();
        const hrProfile = hrEmps.find(
          (e) => e.email.toLowerCase() === userToDelete.email.toLowerCase(),
        );

        if (hrProfile) {
          HRStore.setStatus(hrProfile.id, "inactive");
          console.log(`[HR Sync] Deactivated ${hrProfile.email} in HR system.`);
        }
      }

      if (typeof AuditStore !== "undefined") {
        AuditStore.add("User Management", `Deactivated user: ${userToDelete.name} (${userToDelete.email})`, "Medium");
      }

      // 3. Remove them from the Master Login DB
      users = users.filter((u) => u.id !== id);
      saveUsers(users);
      refreshTable();
    }
  }
}

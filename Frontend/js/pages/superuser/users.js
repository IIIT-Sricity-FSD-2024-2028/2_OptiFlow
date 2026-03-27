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
  let users = getUsers();
  const search = document.getElementById("searchInput").value.toLowerCase();
  const role = document.getElementById("roleFilter").value;

  if (search) {
    users = users.filter(
      (u) =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search),
    );
  }
  if (role) {
    // ✅ FIX: Ensure the filter matches exactly. If roleFilter value is "Admin",
    // but db is "admin", we need to convert to lowercase for the check.
    users = users.filter((u) => u.role.toLowerCase() === role.toLowerCase());
  }

  renderUserTable(users);
}
// This translates ugly backend code into pretty UI text
function formatRoleName(roleKey) {
  // Super Users
  if (roleKey === "superuser") return "Process Admin";

  // Admins
  if (
    roleKey === "admin" ||
    roleKey === "pm" ||
    roleKey === "hr_admin" ||
    roleKey === "compliance"
  )
    return "Department Admin";

  // End Users
  if (roleKey === "team_leader") return "Team Leader";
  if (roleKey === "enduser" || roleKey === "member") return "Team Member";

  // Fallback just in case
  return roleKey;
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

  data.forEach((u) => {
    const tr = document.createElement("tr");

    // ✅ FIX: Updated to match db.js lowercase role names
    let roleBadge = "gray"; // Default for members/endusers
    if (u.role === "superuser") roleBadge = "purple";
    if (u.role === "admin" || u.role === "pm" || u.role === "hr_admin")
      roleBadge = "blue";
    if (u.role === "team_leader") roleBadge = "yellow";

    const statusBadge = u.status === "Active" ? "green" : "gray";

    tr.innerHTML = `
            <td>
                <div class="td-title">${u.name}</div>
                <div class="td-subtitle">${u.email}</div>
            </td>
            <td><span class="badge ${roleBadge}">${formatRoleName(u.role)}</span></td>
            <td>${u.department || "N/A"}</td>
            <td><span class="badge ${statusBadge}">${u.status || "Active"}</span></td>
            <td style="color: var(--text-muted);">${u.joined || "N/A"}</td>
            <td>
                <button class="action-btn edit" onclick="openUserModal('${u.id}')">Edit</button>
                <button class="action-btn" style="color: #DC2626; border: 1px solid #DC2626;" onclick="deleteUser('${u.id}')">Delete</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

function openUserModal(id = null) {
  const modal = document.getElementById("userModal");
  const title = document.getElementById("modalTitle");

  // Reset scroll
  const content = modal.querySelector(".modal-body");
  if (content) content.scrollTop = 0;

  // Clear validation
  if (typeof showError === "function") {
    showError("userName", true);
    showError("userEmail", true);
  }

  if (id) {
    const users = getUsers();
    // ✅ FIX: Use loose equality (==) just in case ID is a number in DB but string in HTML
    const u = users.find((x) => x.id == id);
    if (u) {
      document.getElementById("userId").value = u.id;
      document.getElementById("userName").value = u.name;
      document.getElementById("userEmail").value = u.email;
      document.getElementById("userRole").value = u.role;
      document.getElementById("userDept").value = u.department || "";

      // Advanced Preview
      if (document.getElementById("userTeams"))
        document.getElementById("userTeams").value = u.teams || "";
      if (document.getElementById("userResp"))
        document.getElementById("userResp").value = u.responsibilities || "";
      if (document.getElementById("userTasks"))
        document.getElementById("userTasks").value = u.tasks || 0;
      if (document.getElementById("userProcesses"))
        document.getElementById("userProcesses").value = u.processes || 0;

      title.innerText = "Edit User";
    }
  } else {
    document.getElementById("userForm").reset();
    document.getElementById("userId").value = "";
    if (document.getElementById("userTasks"))
      document.getElementById("userTasks").value = "0";
    if (document.getElementById("userProcesses"))
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
  // 🛑 REQUIREMENT 4: Prevent page reload!
  // Make sure your HTML form has onsubmit="event.preventDefault(); saveUser();"

  const id = document.getElementById("userId").value;
  const name = document.getElementById("userName").value;
  const email = document.getElementById("userEmail").value;
  const role = document.getElementById("userRole").value;
  const dept = document.getElementById("userDept").value;

  // Advanced fields
  const teams = document.getElementById("userTeams")
    ? document.getElementById("userTeams").value
    : "";
  const responsibilities = document.getElementById("userResp")
    ? document.getElementById("userResp").value
    : "";
  const tasks = document.getElementById("userTasks")
    ? document.getElementById("userTasks").value
    : 0;
  const processes = document.getElementById("userProcesses")
    ? document.getElementById("userProcesses").value
    : 0;

  // Validate
  if (
    typeof showError === "function" &&
    typeof validateRequired === "function" &&
    typeof validateEmail === "function"
  ) {
    const isNameValid = showError("userName", validateRequired(name));
    const isEmailValid = showError("userEmail", validateEmail(email));
    if (!isNameValid || !isEmailValid) return;
  }

  const users = getUsers();

  if (id) {
    // ✅ FIX: Loose equality again
    const idx = users.findIndex((u) => u.id == id);
    if (idx > -1) {
      // We use spread operator ...users[idx] to keep their existing password!
      users[idx] = {
        ...users[idx],
        name,
        email,
        role,
        department: dept,
        teams,
        responsibilities,
        tasks,
        processes,
      };
    }
  } else {
    const newDate = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    users.push({
      id: "u" + Date.now(),
      name,
      email,
      password: "123", // ✅ FIX: Give new users a default password so they can log in!
      role,
      department: dept,
      status: "Active",
      joined: newDate,
      teams,
      responsibilities,
      tasks,
      processes,
    });
  }

  saveUsers(users);
  closeUserModal();
  refreshTable();
}

function deleteUser(id) {
  if (confirm("Are you sure you want to delete this user?")) {
    let users = getUsers();
    // ✅ FIX: Loose equality to handle ID types
    users = users.filter((u) => u.id != id);
    saveUsers(users);
    refreshTable();
  }
}

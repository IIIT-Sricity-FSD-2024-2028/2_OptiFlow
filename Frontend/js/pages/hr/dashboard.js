// dashboard.js – HR Dashboard logic
// All data comes from HRStore (hr-data-store.js).
// No employee names, counts, or details are hardcoded here.
// ─────────────────────────────────────────
// SECURITY GUARD: Prevent Back-Button Access
// ─────────────────────────────────────────
function enforceSecurity() {
  if (!sessionStorage.getItem("currentUser")) {
    // .replace() is used instead of .href so they can't get stuck in a back-button loop
    window.location.replace("../../login.html");
  }
}

// Run immediately on normal load
enforceSecurity();

// Run specifically when the user clicks the "Back" button (pageshow event)
window.addEventListener("pageshow", (event) => {
  // event.persisted is true if the browser loaded the page from the Back-Forward cache
  if (event.persisted) {
    enforceSecurity();
  }
});
// ─────────────────────────────────────────
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

function renderMetrics() {
  const stats = HRStore.getStats();
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
    const deptDisplay = emp.department || "—";
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
      <td style="color:var(--text-main);font-size:14px;">${deptDisplay}</td>
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
function filterEmployees() {
  const search = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();
  const dept = document.getElementById("deptFilter").value;
  const role = document.getElementById("roleFilter").value;

  const filtered = HRStore.getAll().filter((emp) => {
    const matchSearch =
      !search ||
      emp.name.toLowerCase().includes(search) ||
      emp.id.toLowerCase().includes(search);
    const matchDept = !dept || (emp.department || "") === dept;
    const matchRole = !role || emp.role === role;
    return matchSearch && matchDept && matchRole;
  });

  renderRows(filtered);
}

// ─────────────────────────────────────────
// Populate filter dropdowns from store
// (auto-includes newly added roles/depts)
// ─────────────────────────────────────────
function populateFilters() {
  const employees = HRStore.getAll();

  // Departments
  const deptSel = document.getElementById("deptFilter");
  deptSel.innerHTML = '<option value="">All Departments</option>';
  HRStore.getDepartments().forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    deptSel.appendChild(opt);
  });

  // Roles — derived dynamically so new roles appear automatically
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


// ─── 9. NOTIFICATION PANEL ───────────────────────────────
function setupNotifications() {
  const btn = document.getElementById("notifBtn");
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
document.addEventListener("DOMContentLoaded",async () => {
  // Read from store — nothing hardcoded
  renderMetrics();
  populateFilters();
  renderRows(HRStore.getAll());
  setupNotifications();

  // Live search & filter
  document
    .getElementById("searchInput")
    .addEventListener("input", filterEmployees);
  document
    .getElementById("deptFilter")
    .addEventListener("change", filterEmployees);
  document
    .getElementById("roleFilter")
    .addEventListener("change", filterEmployees);

  // New Employee
  document.getElementById("newEmployeeBtn").addEventListener("click", () => {
    window.location.href = "new-employee.html";
  });

  // Logout
  document
    .getElementById("logoutBtn")
    .addEventListener("click", () => openModal("logoutModal"));
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

  // Sidebar active state
  const currentPage =
    window.location.pathname.split("/").pop() || "dashboard.html";
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    if ((item.getAttribute("href") || "") === currentPage)
      item.classList.add("active");
  });
});


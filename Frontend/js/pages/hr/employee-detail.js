// employee-detail.js
// ═══════════════════════════════════════════════════════════════
// Reads/writes from HRStore (localStorage-backed).
// Reads permissions from RolesStore.
// CRUD access restricted to HR roles via HRStore.canEdit().
// ═══════════════════════════════════════════════════════════════

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

// ─── State ───────────────────────────────────────────────────
let emp = null; // current employee object
let empId = null;
let canEdit = false;

// ─── Helpers ────────────────────────────────────────────────

function getEmpId() {
  return new URLSearchParams(window.location.search).get("id");
}

function showToast(msg, isError = false) {
  const el = document.getElementById("edToast");
  const msg_ = document.getElementById("edToastMsg");
  msg_.textContent = msg;
  el.style.background = isError ? "#991b1b" : "#166534";
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

function openModal(id) {
  document.getElementById(id).classList.add("active");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

function roleBadgeClass(role) {
  const r = (role || "").toLowerCase();
  if (r.includes("project manager")) return "pm";
  if (r.includes("team leader")) return "tl";
  if (r.includes("team member")) return "tm";
  if (r.includes("compliance officer")) return "co";
  if (r.includes("process admin")) return "pa";
  if (r.includes("hr")) return "hr";
  return "def";
}

// Format ISO date → "January 10, 2022"
function fmtDateLong(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Readable permission label → tag colour
function permTagColor(permId) {
  if (permId.includes("create") || permId.includes("crud")) return "pm";
  if (permId.includes("manage") || permId.includes("approve")) return "purple";
  if (permId.includes("view")) return ""; // default blue
  if (permId.includes("submit") || permId.includes("review")) return "green";
  return "orange";
}

// Convert a permission id → readable label for display
function permLabel(permId) {
  return permId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Render Header buttons ────────────────────────────────────
function renderHeaderActions() {
  const container = document.getElementById("headerActions");
  const isActive = emp.status === "active";
  const isInactive = emp.status === "inactive";

  let buttonsHtml = `<button class="btn-icon" title="Notifications"><i class="ri-notification-3-line"></i></button>`;

  if (canEdit) {
    if (isActive) {
      buttonsHtml += `
        <button class="btn-deactivate" id="statusBtn">
          <i class="ri-forbid-line"></i> Deactivate
        </button>`;
    } else if (isInactive) {
      buttonsHtml += `
        <button class="btn-deactivate activate" id="statusBtn">
          <i class="ri-checkbox-circle-line"></i> Activate
        </button>`;
    }
    buttonsHtml += `
      <button class="btn btn-secondary" id="editBtn" style="font-size:13px;">
        <i class="ri-edit-line"></i> Edit Profile
      </button>`;
  }

  container.innerHTML = buttonsHtml;

  if (canEdit) {
    document
      .getElementById("editBtn")
      ?.addEventListener("click", openEditModal);
    document
      .getElementById("statusBtn")
      ?.addEventListener("click", openStatusModal);
  }
}

// ─── Render Hero card ─────────────────────────────────────────
function renderHero() {
  const manager = emp.parentId ? HRStore.getById(emp.parentId) : null;

  return `
    <div class="ed-hero${emp.status === "inactive" ? " inactive-emp" : ""}">
      <div class="ed-hero-avatar" style="background:${emp.color};">${emp.initials}</div>
      <div class="ed-hero-info">
        <div class="ed-hero-name">${emp.name}</div>
        <div class="ed-hero-meta">
          <span class="ed-role-badge ${roleBadgeClass(emp.role)}">${emp.role}</span>
          <span class="sep">·</span>
          <span>${emp.id}</span>
          <span class="sep">·</span>
          <span>${emp.department} Dept</span>
          ${emp.team ? `<span class="sep">·</span><span>${emp.team}</span>` : ""}
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <span class="ed-status-badge ${emp.status}">${emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}</span>
          <span style="font-size:13px;color:var(--text-muted);">Joined ${emp.joined} · <a href="mailto:${emp.email}" style="color:var(--primary-color);">${emp.email}</a></span>
        </div>
      </div>
    </div>
  `;
}

// ─── Render Personal Details card ────────────────────────────
function renderPersonalDetails() {
  const manager = emp.parentId ? HRStore.getById(emp.parentId) : null;
  const managerDisplay = manager
    ? `${manager.name} (${manager.role.replace("Project Manager", "PM").replace("Team Leader", "TL").replace("HR Manager", "HR")})`
    : "—";

  const joinDateDisplay = emp.joinDateRaw
    ? fmtDateLong(emp.joinDateRaw)
    : emp.joined || "—";

  const statusHtml = `<span class="ed-status-badge ${emp.status}" style="display:inline-flex;">
    ${emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
  </span>`;

  const fields = [
    { label: "Full Name", value: emp.name },
    { label: "Employee ID", value: emp.id },
    {
      label: "Email",
      value: `<a href="mailto:${emp.email}" style="color:var(--primary-color);">${emp.email}</a>`,
    },
    { label: "Phone", value: emp.phone || "—" },
    { label: "Department", value: emp.department },
    { label: "Team", value: emp.team || "—" },
    {
      label: "System Role",
      value: `<span class="ed-role-badge ${roleBadgeClass(emp.role)}">${emp.role}</span>`,
    },
    { label: "Reports To", value: managerDisplay },
    { label: "Join Date", value: joinDateDisplay },
    { label: "Account Status", value: statusHtml },
  ];

  const fieldsHtml = fields
    .map(
      (f) => `
    <div class="ed-detail-field">
      <div class="ed-detail-label">${f.label}</div>
      <div class="ed-detail-value">${f.value}</div>
    </div>
  `,
    )
    .join("");

  const editLink = canEdit
    ? `<a class="ed-card-link" id="editLinkCard"><i class="ri-edit-line"></i> Edit</a>`
    : "";

  return `
    <div class="ed-card">
      <div class="ed-card-header">
        <span class="ed-card-title">Personal Details</span>
        ${editLink}
      </div>
      <div class="ed-details-grid">${fieldsHtml}</div>
    </div>
  `;
}

// ─── Render Role & Permissions card ──────────────────────────
function renderRolePermissions() {
  const groups = RolesStore.getPermissionGroups();
  const effective = RolesStore.getEmployeePermissions(emp.id, emp.role);

  // Collect enabled permission labels
  const enabledPerms = [];
  groups.forEach((g) => {
    const items = g.type === "checkbox" ? g.columns.flat() : g.items;
    items.forEach((p) => {
      if (effective[p.id]) enabledPerms.push({ id: p.id, label: p.label });
    });
  });

  const tagColors = ["", "green", "purple", "orange", "red"];
  const tagsHtml = enabledPerms.length
    ? enabledPerms
        .map(
          (p, i) =>
            `<span class="ed-perm-tag ${tagColors[i % tagColors.length]}">${p.label}</span>`,
        )
        .join("")
    : `<span style="font-size:13px;color:var(--text-muted);">No permissions assigned.</span>`;

  const hasOverride = !!RolesStore.getEmployeeOverrides(emp.id);
  const overrideBadge = hasOverride
    ? `<span style="font-size:11px;background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:8px;font-weight:500;">Custom</span>`
    : "";

  const manageLink = canEdit
    ? `<a href="roles-individual.html?emp=${emp.id}" class="ed-card-link"><i class="ri-user-settings-line"></i> Manage</a>`
    : "";

  return `
    <div class="ed-card">
      <div class="ed-card-header">
        <span class="ed-card-title">Role &amp; Permissions ${overrideBadge}</span>
        ${manageLink}
      </div>
      <div class="ed-perms-body">
        <div class="ed-perms-row">
          <div>
            <div class="ed-perms-label">System Role</div>
            <div class="ed-perms-value">${emp.role}</div>
          </div>
          <div>
            <div class="ed-perms-label">Team</div>
            <div class="ed-perms-value">${emp.team || "—"}</div>
          </div>
        </div>
        <div>
          <div class="ed-perms-label" style="margin-bottom:8px;">Permissions</div>
          <div class="ed-perm-tags">${tagsHtml}</div>
        </div>
      </div>
    </div>
  `;
}

// ─── Render Activity card ─────────────────────────────────────
function renderActivity() {
  const activities = HRStore.getActivity(emp.id);
  const itemsHtml = activities.length
    ? activities
        .map(
          (a) => `
        <div class="ed-activity-item">
          <div class="ed-activity-dot"></div>
          <div>
            <div class="ed-activity-text">${a.text}</div>
            <div class="ed-activity-date">${a.date}</div>
          </div>
        </div>
      `,
        )
        .join("")
    : `<div class="ed-activity-empty">No activity recorded yet.</div>`;

  return `
    <div class="ed-card">
      <div class="ed-card-header">
        <span class="ed-card-title">Activity</span>
      </div>
      <div class="ed-activity-body">${itemsHtml}</div>
    </div>
  `;
}

// ─── Full Page Render ─────────────────────────────────────────
function renderPage() {
  document.getElementById("headerName").textContent = emp.name;
  document.title = `${emp.name} — OfficeSync`;
  renderHeaderActions();

  const content = document.getElementById("pageContent");
  content.innerHTML = `
    ${renderHero()}
    <div class="ed-grid">
      <div id="leftCol">${renderPersonalDetails()}</div>
      <div class="ed-right-col">
        ${renderRolePermissions()}
        ${renderActivity()}
      </div>
    </div>
  `;

  // Wire up edit link inside card
  document
    .getElementById("editLinkCard")
    ?.addEventListener("click", openEditModal);
}

// ─── Edit Modal ───────────────────────────────────────────────
function openEditModal() {
  const managers = HRStore.getManagers(emp.id);
  const depts = HRStore.getDepartments();
  const teams = HRStore.getTeamsForDept(emp.department);
  const roles = [
    "Project Manager",
    "Team Leader",
    "Team Member",
    "Compliance Officer",
    "Process Admin",
    "HR Manager",
    "HR Ops",
  ];

  const deptOpts = depts
    .map(
      (d) =>
        `<option value="${d}" ${d === emp.department ? "selected" : ""}>${d}</option>`,
    )
    .join("");
  const teamOpts =
    `<option value="">— No Team —</option>` +
    teams
      .map(
        (t) =>
          `<option value="${t}" ${t === emp.team ? "selected" : ""}>${t}</option>`,
      )
      .join("");
  const roleOpts = roles
    .map(
      (r) =>
        `<option value="${r}" ${r === emp.role ? "selected" : ""}>${r}</option>`,
    )
    .join("");
  const mgrOpts =
    `<option value="">— None —</option>` +
    managers
      .map(
        (m) =>
          `<option value="${m.id}" ${m.id === emp.parentId ? "selected" : ""}>${m.name} (${m.role})</option>`,
      )
      .join("");

  document.getElementById("editFormBody").innerHTML = `
    <form id="editForm" novalidate autocomplete="off">
      <div class="ed-form-row">
        <div class="ed-form-group">
          <label class="ed-form-label" for="ef_firstName">First Name</label>
          <input class="ed-form-control" id="ef_firstName" type="text" value="${emp.name.split(" ")[0]}" maxlength="50"/>
          <div class="ed-form-error" id="err_name">Please enter a valid name.</div>
        </div>
        <div class="ed-form-group">
          <label class="ed-form-label" for="ef_lastName">Last Name</label>
          <input class="ed-form-control" id="ef_lastName" type="text" value="${emp.name.split(" ").slice(1).join(" ")}" maxlength="50"/>
        </div>
      </div>
      <div class="ed-form-row">
        <div class="ed-form-group">
          <label class="ed-form-label" for="ef_email">Work Email</label>
          <input class="ed-form-control" id="ef_email" type="email" value="${emp.email}" maxlength="100"/>
          <div class="ed-form-error" id="err_email">Invalid or duplicate email.</div>
        </div>
        <div class="ed-form-group">
          <label class="ed-form-label" for="ef_phone">Phone</label>
          <input class="ed-form-control" id="ef_phone" type="tel" value="${emp.phone}" maxlength="20"/>
          <div class="ed-form-error" id="err_phone">Invalid phone number.</div>
        </div>
      </div>
      <div class="ed-form-row">
        <div class="ed-form-group">
          <label class="ed-form-label" for="ef_dept">Department</label>
          <select class="ed-form-control" id="ef_dept">${deptOpts}</select>
          <div class="ed-form-error" id="err_department">Required.</div>
        </div>
        <div class="ed-form-group">
          <label class="ed-form-label" for="ef_team">Team</label>
          <select class="ed-form-control" id="ef_team">${teamOpts}</select>
        </div>
      </div>
      <div class="ed-form-row">
        <div class="ed-form-group">
          <label class="ed-form-label" for="ef_role">System Role</label>
          <select class="ed-form-control" id="ef_role">${roleOpts}</select>
          <div class="ed-form-error" id="err_role">Required.</div>
        </div>
        <div class="ed-form-group">
          <label class="ed-form-label" for="ef_mgr">Reports To</label>
          <select class="ed-form-control" id="ef_mgr">${mgrOpts}</select>
        </div>
      </div>
      <div class="ed-form-row">
        <div class="ed-form-group">
          <label class="ed-form-label" for="ef_joinDate">Join Date</label>
          <input class="ed-form-control" id="ef_joinDate" type="date" value="${emp.joinDateRaw || ""}"/>
          <div class="ed-form-error" id="err_joined">Required.</div>
        </div>
        <div class="ed-form-group">
          <label class="ed-form-label" for="ef_status">Account Status</label>
          <select class="ed-form-control" id="ef_status">
            <option value="active"   ${emp.status === "active" ? "selected" : ""}>Active</option>
            <option value="pending"  ${emp.status === "pending" ? "selected" : ""}>Pending</option>
            <option value="inactive" ${emp.status === "inactive" ? "selected" : ""}>Inactive</option>
          </select>
        </div>
      </div>
    </form>
  `;

  // Department → team cascade
  document.getElementById("ef_dept").addEventListener("change", function () {
    const newTeams = HRStore.getTeamsForDept(this.value);
    const sel = document.getElementById("ef_team");
    sel.innerHTML =
      `<option value="">— No Team —</option>` +
      newTeams.map((t) => `<option value="${t}">${t}</option>`).join("");
  });

  openModal("editModal");
}

// ─── Edit form validation ─────────────────────────────────────
function validateEditForm() {
  let ok = true;

  const setErr = (fieldId, errId, condition, msg) => {
    const input = document.getElementById(fieldId);
    const err = document.getElementById(errId);
    if (condition) {
      input?.classList.add("is-invalid");
      if (err) {
        err.textContent = msg;
        err.style.display = "block";
      }
      ok = false;
    } else {
      input?.classList.remove("is-invalid");
      if (err) err.style.display = "none";
    }
  };

  const firstName = document.getElementById("ef_firstName").value.trim();
  const lastName = document.getElementById("ef_lastName").value.trim();
  const fullName = `${firstName} ${lastName}`.trim();
  setErr(
    "ef_firstName",
    "err_name",
    !/^[A-Za-z\s'\-]{2,100}$/.test(fullName),
    "Valid name required.",
  );

  const email = document.getElementById("ef_email").value.trim();
  setErr(
    "ef_email",
    "err_email",
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email),
    "Valid email required.",
  );

  const phone = document.getElementById("ef_phone").value.trim();
  const digits = phone.replace(/[\s\+\-\(\)]/g, "");
  setErr(
    "ef_phone",
    "err_phone",
    !/^\d{8,15}$/.test(digits),
    "Valid phone (8–15 digits) required.",
  );

  const dept = document.getElementById("ef_dept").value;
  setErr("ef_dept", "err_department", !dept, "Department required.");

  const role = document.getElementById("ef_role").value;
  setErr("ef_role", "err_role", !role, "Role required.");

  const jDate = document.getElementById("ef_joinDate").value;
  setErr("ef_joinDate", "err_joined", !jDate, "Join date required.");

  return ok;
}

// ─── Save edit ────────────────────────────────────────────────
function saveEdit() {
  if (!validateEditForm()) {
    document
      .querySelector(".ed-form-control.is-invalid")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const firstName = document.getElementById("ef_firstName").value.trim();
  const lastName = document.getElementById("ef_lastName").value.trim();
  const statusVal = document.getElementById("ef_status").value;

  const payload = {
    name: `${firstName} ${lastName}`.trim(),
    email: document.getElementById("ef_email").value.trim(),
    phone: document.getElementById("ef_phone").value.trim(),
    department: document.getElementById("ef_dept").value,
    team: document.getElementById("ef_team").value || null,
    role: document.getElementById("ef_role").value,
    parentId: document.getElementById("ef_mgr").value || null,
    joinDateRaw: document.getElementById("ef_joinDate").value,
    joined: (() => {
      const d = new Date(document.getElementById("ef_joinDate").value);
      return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    })(),
  };

  const result = HRStore.update(emp.id, payload);

  if (!result.ok) {
    const fieldMap = {
      name: ["ef_firstName"],
      email: ["ef_email"],
      phone: ["ef_phone"],
      department: ["ef_dept"],
      role: ["ef_role"],
      joined: ["ef_joinDate"],
    };
    Object.entries(result.errors).forEach(([k, msg]) => {
      (fieldMap[k] || [k]).forEach((fid) => {
        document.getElementById(fid)?.classList.add("is-invalid");
      });
    });
    showToast("Please fix validation errors.", true);
    return;
  }

  // Status may have changed via the dropdown
  if (statusVal !== result.employee.status) {
    HRStore.setStatus(emp.id, statusVal);
  }

  emp = HRStore.getById(emp.id); // reload fresh
  closeModal("editModal");
  renderPage();
  showToast(`${emp.name}'s profile updated.`);
}

// ─── Status modal (Activate / Deactivate) ────────────────────
function openStatusModal() {
  const isActive = emp.status === "active";
  const action = isActive ? "Deactivate" : "Activate";
  const newStatus = isActive ? "inactive" : "active";

  document.getElementById("statusModalTitle").innerHTML =
    `<i class="ri-${isActive ? "forbid" : "checkbox-circle"}-line" style="margin-right:8px;color:${isActive ? "#ef4444" : "#16a34a"};"></i>${action} Account`;
  document.getElementById("statusModalBody").textContent =
    `Are you sure you want to ${action.toLowerCase()} ${emp.name}'s account? ` +
    (isActive
      ? "They will lose system access."
      : "They will regain system access.");

  const confirmBtn = document.getElementById("confirmStatus");
  confirmBtn.textContent = action;
  confirmBtn.style.background = isActive ? "#ef4444" : "#16a34a";
  confirmBtn.style.color = "white";
  confirmBtn.style.borderColor = isActive ? "#ef4444" : "#16a34a";

  confirmBtn.onclick = () => {
    HRStore.setStatus(emp.id, newStatus);
    emp = HRStore.getById(emp.id);
    closeModal("statusModal");
    renderPage();
    showToast(
      `${emp.name} ${newStatus === "active" ? "activated" : "deactivated"}.`,
    );
  };

  openModal("statusModal");
}

// ─── Logout setup ────────────────────────────────────────────
function setupLogout() {
  const modal = document.getElementById("logoutModal");
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
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal("logoutModal");
  });
}

// ─── Modal wire-up ───────────────────────────────────────────
function setupModals() {
  // Edit modal
  document
    .getElementById("closeEditModal")
    .addEventListener("click", () => closeModal("editModal"));
  document
    .getElementById("cancelEdit")
    .addEventListener("click", () => closeModal("editModal"));
  document.getElementById("saveEdit").addEventListener("click", saveEdit);
  document.getElementById("editModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("editModal"))
      closeModal("editModal");
  });

  // Status modal
  document
    .getElementById("closeStatusModal")
    .addEventListener("click", () => closeModal("statusModal"));
  document
    .getElementById("cancelStatus")
    .addEventListener("click", () => closeModal("statusModal"));
  document.getElementById("statusModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("statusModal"))
      closeModal("statusModal");
  });
}

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  empId = getEmpId();
  canEdit = HRStore.canEdit();

  if (!empId) {
    document.getElementById("pageContent").innerHTML = `
      <div class="ed-loading" style="flex-direction:column;gap:12px;">
        <i class="ri-error-warning-line" style="font-size:40px;color:#ef4444;"></i>
        <p>No employee ID specified. <a href="dashboard.html" style="color:var(--primary-color);">Go to Dashboard</a></p>
      </div>`;
    return;
  }

  emp = HRStore.getById(empId);
  if (!emp) {
    document.getElementById("pageContent").innerHTML = `
      <div class="ed-loading" style="flex-direction:column;gap:12px;">
        <i class="ri-user-unfollow-line" style="font-size:40px;color:#ef4444;"></i>
        <p>Employee <strong>${empId}</strong> not found. <a href="dashboard.html" style="color:var(--primary-color);">Go to Dashboard</a></p>
      </div>`;
    return;
  }

  // Show view-only banner for non-HR users
  if (!canEdit) {
    document.getElementById("viewonlyBanner").style.display = "flex";
    // Offset content to not sit under banner
    document.querySelector(".main-content").style.paddingTop = "42px";
  }

  setupLogout();
  setupModals();
  renderPage();
});

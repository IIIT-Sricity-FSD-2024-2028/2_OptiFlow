// roles-system.js
// Manages the System Roles page.
// Reads all data from HRStore (employees) + RolesStore (API-backed).
// Saves to RolesStore which persists to remote API.

let activeRoleKey = null; // currently selected role
let currentPerms = {}; // live permission state in the editor
let originalPerms = {}; // snapshot on role select (for discard)
let isDirty = false;
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
// ─── Helpers ─────────────────────────────────────────────
function showToast(msg) {
  const el = document.getElementById("rolestoast");
  document.getElementById("toastMsg").textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2800);
}

function setDirty(val) {
  isDirty = val;
  document.getElementById("savebar").style.display = val ? "flex" : "none";
}

// ─── Left panel: role list ────────────────────────────────
async function renderRoleList(activeKey) {
  const allEmployees = await HRStore.getAll();
  const allRoles = await RolesStore.getAllSystemRoles();
  const container = document.getElementById("roleListContainer");
  container.innerHTML = "";

  allRoles.forEach((role) => {
    const empCount = allEmployees.filter((e) => e.role === role.key).length;
    const item = document.createElement("div");
    item.className = `role-list-item${role.key === activeKey ? " active" : ""}`;
    item.dataset.roleKey = role.key;
    item.innerHTML = `
      <div class="role-dot" style="background:${role.dotColor};"></div>
      <div class="role-list-name">
        ${role.key}
        <span class="sub">${empCount} employee${empCount !== 1 ? "s" : ""}</span>
      </div>
      <div class="role-emp-count">${empCount}</div>
    `;
    item.addEventListener("click", async () => {
      if (isDirty) {
        if (!confirm("You have unsaved changes. Discard and switch role?"))
          return;
        setDirty(false);
      }
      await selectRole(role.key);
    });
    container.appendChild(item);
  });
}

// ─── Center panel: permission groups ─────────────────────
function buildPermissionsUI(roleKey, permissions) {
  const groups = RolesStore.getPermissionGroups();
  const container = document.getElementById("permissionsContainer");
  container.innerHTML = "";

  groups.forEach((group) => {
    const section = document.createElement("div");
    section.className = "perm-section";

    const label = document.createElement("div");
    label.className = "perm-section-label";
    label.textContent = group.label;
    section.appendChild(label);

    if (group.type === "checkbox") {
      const grid = document.createElement("div");
      grid.className = "perm-grid";

      group.columns.forEach((col) => {
        const colEl = document.createElement("div");
        col.forEach((perm) => {
          const item = document.createElement("div");
          item.className = "perm-item";

          const cbId = `perm_${roleKey}_${perm.id}`;
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.className = "perm-checkbox";
          cb.id = cbId;
          cb.checked = !!permissions[perm.id];
          cb.dataset.permId = perm.id;
          cb.addEventListener("change", onPermChange);

          const lbl = document.createElement("label");
          lbl.className = "perm-label";
          lbl.htmlFor = cbId;
          lbl.textContent = perm.label;

          item.appendChild(cb);
          item.appendChild(lbl);
          colEl.appendChild(item);
        });
        grid.appendChild(colEl);
      });

      section.appendChild(grid);
    } else if (group.type === "toggle") {
      const list = document.createElement("div");
      list.className = "perm-toggle-list";

      group.items.forEach((perm) => {
        const item = document.createElement("div");
        item.className = "perm-toggle-item";

        const lbl = document.createElement("label");
        lbl.className = "perm-label";
        lbl.htmlFor = `toggle_${roleKey}_${perm.id}`;
        lbl.textContent = perm.label;

        const sw = document.createElement("label");
        sw.className = "toggle-switch";

        const inp = document.createElement("input");
        inp.type = "checkbox";
        inp.id = `toggle_${roleKey}_${perm.id}`;
        inp.checked = !!permissions[perm.id];
        inp.dataset.permId = perm.id;
        inp.addEventListener("change", onPermChange);

        const track = document.createElement("span");
        track.className = "toggle-track";

        sw.appendChild(inp);
        sw.appendChild(track);

        item.appendChild(lbl);
        item.appendChild(sw);
        list.appendChild(item);
      });

      section.appendChild(list);
    }

    container.appendChild(section);
  });
}

function onPermChange(e) {
  const permId = e.target.dataset.permId;
  currentPerms[permId] = e.target.checked;
  setDirty(true);
}

// ─── Right panel: employees ───────────────────────────────
async function renderEmployeesPanel(roleKey) {
  const hrUsers = await HRStore.getAll();
  const employees = hrUsers.filter((e) => e.role === roleKey);
  const container = document.getElementById("empListContainer");
  const countEl = document.getElementById("empCount");
  countEl.textContent = employees.length;
  container.innerHTML = "";

  if (employees.length === 0) {
    container.innerHTML = `<div class="roles-empty"><i class="ri-user-line"></i><p>No employees in this role.</p></div>`;
    return;
  }

  employees.forEach((emp) => {
    const row = document.createElement("div");
    row.className = "role-emp-row";
    row.title = `View ${emp.name}'s profile`;
    row.innerHTML = `
      <div class="role-emp-avatar" style="background:${emp.color};">${emp.initials}</div>
      <div class="role-emp-info">
        <div class="role-emp-name">${emp.name}</div>
        <div class="role-emp-meta">${emp.team || emp.department} · ${emp.id}</div>
      </div>
      <span class="role-emp-status ${emp.status}">${emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}</span>
    `;
    row.addEventListener("click", () => {
      window.location.href = `employee-detail.html?id=${encodeURIComponent(emp.id)}`;
    });
    container.appendChild(row);
  });
}

// ─── Select a role ────────────────────────────────────────
async function selectRole(roleKey) {
  activeRoleKey = roleKey;
  const roleConf = await RolesStore.getSystemRole(roleKey);
  originalPerms = { ...roleConf.permissions };
  currentPerms = { ...roleConf.permissions };

  const hrUsers = await HRStore.getAll();
  const empCount = hrUsers.filter((e) => e.role === roleKey).length;
  document.getElementById("centerTitle").textContent = roleKey;
  document.getElementById("centerBadge").textContent = `${empCount} employees`;

  buildPermissionsUI(roleKey, currentPerms);
  await renderEmployeesPanel(roleKey);
  await renderRoleList(roleKey);
  setDirty(false);
}

// ─── Save / Discard ───────────────────────────────────────
async function saveChanges() {
  await RolesStore.saveSystemRole(activeRoleKey, currentPerms);
  originalPerms = { ...currentPerms };
  setDirty(false);
  showToast(`"${activeRoleKey}" permissions saved.`);
}

function discardChanges() {
  currentPerms = { ...originalPerms };
  buildPermissionsUI(activeRoleKey, currentPerms);
  setDirty(false);
}

// ─── Logout ───────────────────────────────────────────────
function setupLogout() {
  const modal = document.getElementById("logoutModal");
  document
    .getElementById("logoutBtn")
    .addEventListener("click", () => modal.classList.add("active"));
  document
    .getElementById("closeLogoutModal")
    .addEventListener("click", () => modal.classList.remove("active"));
  document
    .getElementById("cancelLogout")
    .addEventListener("click", () => modal.classList.remove("active"));
  document.getElementById("confirmLogout").addEventListener("click", () => {
    sessionStorage.removeItem("currentUser");
    modal.classList.remove("active");
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });
}

// ─── 9. NOTIFICATION PANEL ───────────────────────────────
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

// ─── Init ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  setupLogout();
  await renderRoleList(null);
  setupNotifications();

  // Auto-select first role
  const roles = await RolesStore.getAllSystemRoles();
  const firstRole = roles[0];
  if (firstRole) await selectRole(firstRole.key);

  document.getElementById("saveBtn").addEventListener("click", saveChanges);
  document
    .getElementById("discardBtn")
    .addEventListener("click", discardChanges);
});

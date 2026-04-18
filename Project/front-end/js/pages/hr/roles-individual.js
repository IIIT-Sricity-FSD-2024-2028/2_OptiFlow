// roles-individual.js
// Individual employee permission overrides.
// Reads employees from HRStore, permissions from RolesStore (API-backed).

let activeEmpId = null;
let activeEmp = null;
let currentPerms = {}; // current state in editor (effective)
let basePerms = {}; // role defaults (no overrides)
let originalPerms = {}; // snapshot on employee select (for discard)
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
  document.getElementById("indSavebar").style.display = val ? "flex" : "none";
}

function countOverrides(empPerms, base) {
  return Object.keys(empPerms).filter((k) => !!empPerms[k] !== !!base[k])
    .length;
}

// ─── Left panel: employee list ────────────────────────────
async function renderEmpList() {
  const dept = document.getElementById("deptFilterInd").value;
  const search = document
    .getElementById("empSearch")
    .value.toLowerCase()
    .trim();
  let employees = await HRStore.getAll();

  if (dept) employees = employees.filter((e) => e.department === dept);
  if (search)
    employees = employees.filter(
      (e) =>
        e.name.toLowerCase().includes(search) ||
        e.id.toLowerCase().includes(search),
    );

  const container = document.getElementById("indEmpList");
  document.getElementById("empTotalCount").textContent =
    `(${employees.length})`;
  container.innerHTML = "";

  if (employees.length === 0) {
    container.innerHTML = `<div class="roles-empty" style="padding:32px 16px;">
      <i class="ri-search-line"></i><p>No employees match.</p></div>`;
    return;
  }

  for (const emp of employees) {
    const overrides = await RolesStore.getEmployeeOverrides(emp.id);
    const hasOverride = !!overrides;
    
    let overrideCount = 0;
    if (hasOverride) {
      const empPerms = await RolesStore.getEmployeePermissions(emp.id, emp.role);
      const roleObj = await RolesStore.getSystemRole(emp.role);
      overrideCount = countOverrides(empPerms, roleObj.permissions);
    }

    const row = document.createElement("div");
    row.className = `ind-emp-row${emp.id === activeEmpId ? " active" : ""}${hasOverride ? " has-override" : ""}`;
    row.dataset.empId = emp.id;
    row.innerHTML = `
      <div class="ind-emp-avatar" style="background:${emp.color};">${emp.initials}</div>
      <div class="ind-emp-info">
        <div class="ind-emp-name">${emp.name}</div>
        <div class="ind-emp-role">${emp.role} · ${emp.department}</div>
      </div>
      <div class="ind-override-dot" title="${overrideCount} custom permission${overrideCount !== 1 ? "s" : ""}"></div>
    `;
    row.addEventListener("click", async () => {
      if (isDirty) {
        if (!confirm("Unsaved changes will be lost. Continue?")) return;
        setDirty(false);
      }
      await selectEmployee(emp.id);
    });
    container.appendChild(row);
  }
}

// ─── Right panel: employee info card ─────────────────────
async function renderEmpInfo(emp) {
  const container = document.getElementById("indEmpInfo");
  const overrides = await RolesStore.getEmployeeOverrides(emp.id);
  const effective = await RolesStore.getEmployeePermissions(emp.id, emp.role);
  const sysRole = await RolesStore.getSystemRole(emp.role);
  const base = sysRole.permissions;
  const granted = Object.keys(effective).filter(
    (k) => !!effective[k] && !base[k],
  ).length;
  const revoked = Object.keys(effective).filter(
    (k) => !effective[k] && !!base[k],
  ).length;

  container.innerHTML = `
    <div style="padding:16px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:48px;height:48px;border-radius:10px;background:${emp.color};display:flex;
          align-items:center;justify-content:center;font-size:16px;font-weight:700;color:white;">
          ${emp.initials}
        </div>
        <div>
          <div style="font-size:15px;font-weight:600;color:var(--text-main);">${emp.name}</div>
          <div style="font-size:12px;color:var(--text-muted);">${emp.id}</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
        <div class="info-row"><span class="info-label">Role</span><span class="info-val">${emp.role}</span></div>
        <div class="info-row"><span class="info-label">Department</span><span class="info-val">${emp.department}</span></div>
        <div class="info-row"><span class="info-label">Team</span><span class="info-val">${emp.team || "—"}</span></div>
        <div class="info-row"><span class="info-label">Status</span>
          <span class="role-emp-status ${emp.status}" style="font-size:11px;">
            ${emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
          </span>
        </div>
        <div class="info-row"><span class="info-label">Joined</span><span class="info-val">${emp.joined}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span class="info-val" style="word-break:break-all;font-size:12px;">${emp.email}</span></div>
      </div>

      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border-color);">
        <div style="font-size:11px;font-weight:600;letter-spacing:.5px;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px;">Override Summary</div>
        ${
          overrides
            ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">
              <span style="background:#dcfce7;color:#166534;font-size:12px;padding:3px 10px;border-radius:10px;font-weight:500;">
                +${granted} granted
              </span>
              <span style="background:#fee2e2;color:#991b1b;font-size:12px;padding:3px 10px;border-radius:10px;font-weight:500;">
                −${revoked} revoked
              </span>
             </div>`
            : `<div style="font-size:12px;color:var(--text-muted);">No individual overrides. Using role defaults.</div>`
        }
      </div>

      <div style="margin-top:16px;">
        <a href="employee-detail.html?id=${encodeURIComponent(emp.id)}"
           style="font-size:13px;color:var(--primary-color);display:flex;align-items:center;gap:5px;">
          <i class="ri-external-link-line"></i> View Full Profile
        </a>
      </div>
    </div>
  `;
}

// ─── Center panel: permission editor ─────────────────────
async function buildIndPermissionsUI(emp, effective, base) {
  const groups = RolesStore.getPermissionGroups();
  const container = document.getElementById("indPermContainer");
  container.innerHTML = "";

  const hierarchy = RolesStore.getDeptHierarchy()[emp.department] || [];
  const empRoleIdx = hierarchy.indexOf(emp.role);
  const superiorRoles = hierarchy.slice(0, empRoleIdx);
  const grantableFromAbove = new Set();
  
  for (const r of superiorRoles) {
    const sr = await RolesStore.getSystemRole(r);
    const rp = sr.permissions;
    Object.keys(rp).forEach((k) => {
      if (rp[k]) grantableFromAbove.add(k);
    });
  }

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
          const isBase = !!base[perm.id];
          const isCurrent = !!effective[perm.id];
          const isGranted = isCurrent && !isBase;
          const isRevoked = !isCurrent && isBase;
          const isGrantable = isBase || grantableFromAbove.has(perm.id);

          const item = document.createElement("div");
          item.className = `perm-item${isGranted ? " added" : ""}${isRevoked ? " removed" : ""}`;

          const cbId = `iperm_${emp.id}_${perm.id}`;
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.className = "perm-checkbox";
          cb.id = cbId;
          cb.checked = isCurrent;
          cb.disabled = !isGrantable;
          cb.dataset.permId = perm.id;
          cb.addEventListener("change", onIndPermChange);

          const lbl = document.createElement("label");
          lbl.className = "perm-label";
          lbl.htmlFor = cbId;
          lbl.textContent = perm.label;
          if (!isGrantable) lbl.style.opacity = "0.4";

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
        const isBase = !!base[perm.id];
        const isCurrent = !!effective[perm.id];
        const isGranted = isCurrent && !isBase;
        const isRevoked = !isCurrent && isBase;
        const isGrantable = isBase || grantableFromAbove.has(perm.id);

        const item = document.createElement("div");
        item.className = `perm-toggle-item${isGranted ? " added" : ""}${isRevoked ? " removed" : ""}`;

        const lbl = document.createElement("label");
        lbl.className = "perm-label";
        lbl.htmlFor = `itoggle_${emp.id}_${perm.id}`;
        lbl.textContent = perm.label;
        if (!isGrantable) lbl.style.opacity = "0.4";

        const sw = document.createElement("label");
        sw.className = "toggle-switch";

        const inp = document.createElement("input");
        inp.type = "checkbox";
        inp.id = `itoggle_${emp.id}_${perm.id}`;
        inp.checked = isCurrent;
        inp.disabled = !isGrantable;
        inp.dataset.permId = perm.id;
        inp.addEventListener("change", onIndPermChange);

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

function onIndPermChange(e) {
  const permId = e.target.dataset.permId;
  currentPerms[permId] = e.target.checked;

  const overrideCount = countOverrides(currentPerms, basePerms);
  updateOverrideNote(overrideCount);
  rebuildDiffHighlight();
  setDirty(true);
}

function rebuildDiffHighlight() {
  document.querySelectorAll(".perm-item, .perm-toggle-item").forEach((item) => {
    const inp = item.querySelector("input");
    if (!inp || !inp.dataset.permId) return;
    const pid = inp.dataset.permId;
    const isCurrent = !!currentPerms[pid];
    const isBase = !!basePerms[pid];
    item.classList.remove("added", "removed");
    if (isCurrent && !isBase) item.classList.add("added");
    if (!isCurrent && isBase) item.classList.add("removed");
  });
}

function updateOverrideNote(count) {
  const el = document.getElementById("overrideNote");
  if (!el) return;
  el.textContent =
    count > 0
      ? `${count} individual override${count !== 1 ? "s" : ""} from role default.`
      : "No individual overrides.";
}

// ─── Select an employee ───────────────────────────────────
async function selectEmployee(empId) {
  activeEmpId = empId;
  activeEmp = await HRStore.getById(empId);
  if (!activeEmp) return;

  const roleConf = await RolesStore.getSystemRole(activeEmp.role);
  basePerms = { ...roleConf.permissions };
  const effective = await RolesStore.getEmployeePermissions(empId, activeEmp.role);
  currentPerms = { ...effective };
  originalPerms = { ...effective };

  const avatarEl = document.getElementById("indEmpAvatar");
  avatarEl.style.background = activeEmp.color;
  avatarEl.textContent = activeEmp.initials;
  document.getElementById("indCenterTitle").textContent = activeEmp.name;
  document.getElementById("indCenterSub").textContent =
    `${activeEmp.role} · ${activeEmp.department}${activeEmp.team ? " · " + activeEmp.team : ""}`;

  const hasOverrides = await RolesStore.getEmployeeOverrides(empId);
  const resetBtn = document.getElementById("resetBtn");
  resetBtn.style.display = hasOverrides ? "inline-flex" : "none";

  document.getElementById("overrideLegend").style.display = "flex";
  const overrideCount = countOverrides(currentPerms, basePerms);
  updateOverrideNote(overrideCount);

  await buildIndPermissionsUI(activeEmp, currentPerms, basePerms);
  await renderEmpInfo(activeEmp);
  await renderEmpList(); 
  setDirty(false);
}

// ─── Save / Discard / Reset ───────────────────────────────
async function saveIndividual() {
  const isDifferentFromBase = Object.keys(currentPerms).some(
    (k) => !!currentPerms[k] !== !!basePerms[k],
  );

  if (isDifferentFromBase) {
    await RolesStore.saveEmployeeOverrides(activeEmpId, currentPerms);
  } else {
    await RolesStore.saveEmployeeOverrides(activeEmpId, null);
  }

  originalPerms = { ...currentPerms };
  setDirty(false);

  const hasOverrides = await RolesStore.getEmployeeOverrides(activeEmpId);
  document.getElementById("resetBtn").style.display = hasOverrides ? "inline-flex" : "none";

  await renderEmpInfo(activeEmp);
  await renderEmpList();
  showToast(`Permissions saved for ${activeEmp.name}.`);
}

async function discardIndividual() {
  currentPerms = { ...originalPerms };
  await buildIndPermissionsUI(activeEmp, currentPerms, basePerms);
  const overrideCount = countOverrides(currentPerms, basePerms);
  updateOverrideNote(overrideCount);
  setDirty(false);
}

async function resetToDefault() {
  if (
    !confirm(
      `Reset ${activeEmp.name}'s permissions to their "${activeEmp.role}" role defaults?`,
    )
  )
    return;
  await RolesStore.resetEmployee(activeEmpId);
  currentPerms = { ...basePerms };
  originalPerms = { ...basePerms };
  await buildIndPermissionsUI(activeEmp, currentPerms, basePerms);
  updateOverrideNote(0);
  document.getElementById("resetBtn").style.display = "none";
  await renderEmpInfo(activeEmp);
  await renderEmpList();
  setDirty(false);
  showToast(`${activeEmp.name} reset to role default.`);
}

function populateDeptFilter() {
  const sel = document.getElementById("deptFilterInd");
  const deps = HRStore.getDepartments();
  sel.innerHTML = '<option value="">All Departments</option>';
  deps.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    sel.appendChild(opt);
  });
}

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

function setupNotifications() {
  const btn = document.getElementById("notifBtn");
  if(!btn) return;
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
  const style = document.createElement("style");
  style.textContent = `
    .info-row{display:flex;justify-content:space-between;align-items:flex-start;padding:5px 0;border-bottom:1px solid #f1f5f9;}
    .info-row:last-child{border-bottom:none;}
    .info-label{font-size:12px;color:var(--text-muted);font-weight:500;}
    .info-val{font-size:12px;color:var(--text-main);text-align:right;max-width:58%;}
  `;
  document.head.appendChild(style);

  setupLogout();
  populateDeptFilter();
  await renderEmpList();
  setupNotifications();

  document
    .getElementById("deptFilterInd")
    .addEventListener("change", renderEmpList);
  document.getElementById("empSearch").addEventListener("input", renderEmpList);

  document
    .getElementById("indSaveBtn")
    .addEventListener("click", saveIndividual);
  document
    .getElementById("indDiscardBtn")
    .addEventListener("click", discardIndividual);
  document.getElementById("resetBtn").addEventListener("click", resetToDefault);

  const urlEmpId = new URLSearchParams(window.location.search).get("emp");
  if (urlEmpId) {
    const found = await HRStore.getById(urlEmpId);
    if (found) {
      await selectEmployee(urlEmpId);
    }
  }
});

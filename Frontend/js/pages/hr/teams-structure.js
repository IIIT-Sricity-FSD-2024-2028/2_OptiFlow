// teams-structure.js
// All data comes from HRStore (hr-data-store.js).
// No employee names or details are hardcoded here.

let ALL_EMPLOYEES = [];
let DEPARTMENTS = [];
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
// ─── 1. LOAD FROM STORE ──────────────────────────────────
// HRStore.getAll() reads from sessionStorage (or seed data).
// Wraps in a microtask to keep the async pattern intact so
// this file can be swapped with a real fetch() later.
async function loadData() {
  try {
    if (HRStore && HRStore.syncWithMaster) HRStore.syncWithMaster();
    ALL_EMPLOYEES = HRStore.getAll();
    DEPARTMENTS = ["All Departments", ...HRStore.getDepartments()];
    return true;
  } catch (err) {
    console.error("HRStore read failed:", err);
    return false;
  }
}

// ─── 2. STATS DISPLAY ────────────────────────────────────
function renderStats(employees) {
  const active = employees.filter((e) => e.status === "active").length;
  const pending = employees.filter((e) => e.status === "pending").length;
  const teams = new Set(employees.map((e) => e.team).filter(Boolean)).size;

  document.getElementById("statTotal").textContent = employees.length;
  document.getElementById("statTeams").textContent = teams;
  document.getElementById("statActive").textContent = active;
  document.getElementById("statPending").textContent = pending;
}

// ─── 3. DEPARTMENT FILTER ────────────────────────────────
function populateDeptFilter() {
  const sel = document.getElementById("deptFilter");
  sel.innerHTML = "";
  DEPARTMENTS.forEach((dept) => {
    const opt = document.createElement("option");
    opt.value = dept === "All Departments" ? "" : dept;
    opt.textContent = dept;
    sel.appendChild(opt);
  });
}

// ─── 4. TREE BUILDING ────────────────────────────────────
function normEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function resolveManagerEmpId(emp, ctx) {
  // ctx: { hrByEmail, hrById, userById }
  if (!emp) return null;

  const raw = emp.parentId || emp.reportsTo || null;
  if (!raw) return null;

  const ref = String(raw);
  // Already an HR employee id
  if (ref.startsWith("EMP-")) return ref;

  // Sometimes HR parentId got polluted with auth ids ("uX")
  if (ref.startsWith("u")) {
    const u = ctx.userById.get(ref);
    if (!u) return null;
    const mgrEmp = ctx.hrByEmail.get(normEmail(u.email));
    return mgrEmp ? mgrEmp.id : null;
  }

  // Unknown format
  return null;
}

function buildTree(employees) {
  const map = new Map();
  const idSet = new Set(employees.map((e) => e.id));

  // Build cross-reference maps for robust parentId/reportsTo mapping
  const hrByEmail = new Map();
  const hrById = new Map();
  employees.forEach((e) => {
    hrById.set(String(e.id), e);
    const em = normEmail(e.email);
    if (em) hrByEmail.set(em, e);
  });

  const masterUsers =
    typeof getUsers === "function"
      ? getUsers()
      : JSON.parse(localStorage.getItem("users")) || [];
  const userById = new Map(masterUsers.map((u) => [String(u.id), u]));
  const ctx = { hrByEmail, hrById, userById };

  employees.forEach((emp) => map.set(emp.id, { ...emp, children: [] }));

  const topLevelNodes = [];

  employees.forEach((emp) => {
    const node = map.get(emp.id);
    const managerId = resolveManagerEmpId(emp, ctx);

    if (managerId && map.has(managerId) && managerId !== emp.id) {
      map.get(managerId).children.push(node);
    } else {
      topLevelNodes.push(node);
    }
  });

  // Circular reference guard
  function detectCycle(node, ancestors = new Set()) {
    if (ancestors.has(node.id)) {
      console.warn(`Circular ref at ${node.id} — breaking link.`);
      return true;
    }
    ancestors.add(node.id);
    node.children = node.children.filter(
      (c) => !detectCycle(c, new Set(ancestors)),
    );
    return false;
  }
  topLevelNodes.forEach((r) => detectCycle(r));

  const roots = [];
  const independents = [];

  topLevelNodes.forEach((node) => {
    if (node.children.length > 0) {
      roots.push(node);
    } else {
      independents.push(node);
    }
  });

  return { roots, independents };
}

// ─── 5. ROLE → CSS CLASS ─────────────────────────────────
function roleClass(role = "", status = "") {
  if (status === "pending") return "role-pend";
  const r = role.toLowerCase();
  if (r.includes("project manager")) return "role-pm";
  if (r.includes("team leader")) return "role-tl";
  if (r.includes("team member")) return "role-tm";
  if (r.includes("compliance")) return "role-co";
  if (r.includes("process")) return "role-pa";
  if (r.includes("hr")) return "role-hr";
  return "role-def";
}

// ─── 6. RECURSIVE NODE RENDERER ──────────────────────────
function renderNode(node, isRoot = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "tree-node";

  const cardWrap = document.createElement("div");
  cardWrap.className = "node-card-wrap";

  const card = document.createElement("div");
  card.className = `emp-card${isRoot ? " root" : ""}${node.status === "pending" ? " pending" : ""}`;
  card.title = `View ${node.name}'s profile`;
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");

  card.innerHTML = `
    <div class="card-avatar" style="background:${node.color};">${node.initials}</div>
    <div class="card-name">${node.name}</div>
    <div class="card-team">${node.team || node.department || ""}</div>
    <span class="card-role-badge ${roleClass(node.role, node.status)}">${node.role}</span>
  `;

  function navigate() {
    window.location.href = `employee-detail.html?id=${encodeURIComponent(node.id)}`;
  }
  card.addEventListener("click", navigate);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") navigate();
  });

  cardWrap.appendChild(card);
  wrapper.appendChild(cardWrap);

  if (node.children && node.children.length > 0) {
    const ul = document.createElement("ul");
    ul.className = "tree-children";
    node.children.forEach((child) => {
      const li = document.createElement("li");
      li.appendChild(renderNode(child, false));
      ul.appendChild(li);
    });
    wrapper.appendChild(ul);
  }

  return wrapper;
}

// ─── 7. MAIN RENDER ──────────────────────────────────────
function renderTree(employees) {
  const loader = document.getElementById("treeLoader");
  const container = document.getElementById("treeContainer");
  const treeRoot = document.getElementById("treeRoot");
  const indieSection = document.getElementById("independentSection");
  const indieGrid = document.getElementById("indieGrid");

  treeRoot.innerHTML = "";
  indieGrid.innerHTML = "";
  indieSection.style.display = "none";

  if (employees.length === 0) {
    loader.innerHTML = `<div class="tree-empty"><i class="ri-team-line"></i><p>No employees found for this department.</p></div>`;
    loader.style.display = "flex";
    container.style.display = "none";
    return;
  }

  loader.style.display = "none";
  container.style.display = "block";

  const { roots, independents } = buildTree(employees);

  if (roots.length === 0 && independents.length === 0) {
    treeRoot.innerHTML = `<div class="tree-empty"><i class="ri-search-line"></i><p>Could not build a tree for this selection.</p></div>`;
  }

  roots.forEach((root) => treeRoot.appendChild(renderNode(root, true)));

  if (independents.length > 0) {
    indieSection.style.display = "block";
    independents.forEach((emp) => {
      const card = document.createElement("div");
      card.className = `emp-card${emp.status === "pending" ? " pending" : ""}`;
      card.title = `View ${emp.name}'s profile`;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.innerHTML = `
        <div class="card-avatar" style="background:${emp.color};">${emp.initials}</div>
        <div class="card-name">${emp.name}</div>
        <div class="card-team">${emp.department || ""}</div>
        <span class="card-role-badge ${roleClass(emp.role, emp.status)}">${emp.role}</span>
      `;
      function navigate() {
        window.location.href = `employee-detail.html?id=${encodeURIComponent(emp.id)}`;
      }
      card.addEventListener("click", navigate);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") navigate();
      });
      indieGrid.appendChild(card);
    });
  }
}

// ─── 8. FILTER HANDLER ───────────────────────────────────
function applyFilter() {
  const dept = document.getElementById("deptFilter").value;

  let subset;
  if (!dept) {
    subset = ALL_EMPLOYEES;
  } else {
    const deptSet = new Set(
      ALL_EMPLOYEES.filter((e) => e.department === dept).map((e) => e.id),
    );

    // Build cross-reference context using ALL_EMPLOYEES for ancestor walking
    const hrByEmail = new Map();
    ALL_EMPLOYEES.forEach((e) => {
      const em = normEmail(e.email);
      if (em) hrByEmail.set(em, e);
    });
    const masterUsers =
      typeof getUsers === "function"
        ? getUsers()
        : JSON.parse(localStorage.getItem("users")) || [];
    const userById = new Map(masterUsers.map((u) => [String(u.id), u]));
    const ctx = { hrByEmail, hrById: new Map(), userById };

    // Walk up parent chain to include hierarchy ancestors
    function addAncestors(id) {
      const emp = ALL_EMPLOYEES.find((e) => e.id === id);
      if (!emp || deptSet.has(emp.id)) return;
      deptSet.add(emp.id);
      const managerId = resolveManagerEmpId(emp, ctx);
      if (managerId) addAncestors(managerId);
    }
    ALL_EMPLOYEES.filter((e) => e.department === dept).forEach((e) => {
      const managerId = resolveManagerEmpId(e, ctx);
      if (managerId) addAncestors(managerId);
    });
    subset = ALL_EMPLOYEES.filter((e) => deptSet.has(e.id));
  }

  renderStats(subset);
  renderTree(subset);
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

// ─── 10. LOGOUT MODAL ────────────────────────────────────
function setupLogout() {
  const modal = document.getElementById("logoutModal");
  const open = () => modal.classList.add("active");
  const close = () => modal.classList.remove("active");

  document.getElementById("logoutBtn").addEventListener("click", open);
  document.getElementById("closeLogoutModal").addEventListener("click", close);
  document.getElementById("cancelLogout").addEventListener("click", close);
  document.getElementById("confirmLogout").addEventListener("click", () => {
    sessionStorage.removeItem("currentUser");
    close();
    window.location.href = "../../login.html";
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
}

// ─── 11. INIT ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  setupNotifications();
  setupLogout();

  document.getElementById("addMemberBtn").addEventListener("click", () => {
    window.location.href = "new-employee.html?returnTo=teams-structure.html";
  });

  document.getElementById("deptFilter").addEventListener("change", applyFilter);
  document.getElementById("treeLoader").style.display = "flex";

  const ok = await loadData();
  if (!ok) {
    document.getElementById("treeLoader").innerHTML = `
      <div class="tree-empty">
        <i class="ri-error-warning-line"></i>
        <p>Failed to load team data. Please refresh.</p>
      </div>`;
    return;
  }

  populateDeptFilter();
  renderStats(ALL_EMPLOYEES);
  renderTree(ALL_EMPLOYEES);
});

// new-employee.js
// All data is read from and written to HRStore (API-backed).
// No employee names, departments, or roles are hardcoded here.
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
  if (event.persisted) enforceSecurity();
});
// ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function getReturnTo() {
  const params = new URLSearchParams(window.location.search);
  return params.get("returnTo") || "dashboard.html";
}

function formatJoinDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function getInitials(first, last) {
  return ((first[0] || "") + (last[0] || "")).toUpperCase();
}

const AVATAR_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#0d9488",
  "#d97706",
  "#e11d48",
  "#16a34a",
  "#0891b2",
  "#6d28d9",
  "#b45309",
  "#0369a1",
];
function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// ═══════════════════════════════════════════════════════
// CLIENT-SIDE VALIDATION
// ═══════════════════════════════════════════════════════
const RULES = {
  firstName: {
    test: (v) => /^[A-Za-z\s'\-]{2,50}$/.test(v.trim()),
    msg: "Please enter a valid first name (letters only, 2–50 chars).",
  },
  lastName: {
    test: (v) => /^[A-Za-z\s'\-]{1,50}$/.test(v.trim()),
    msg: "Please enter a valid last name (letters only).",
  },
  workEmail: {
    test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    msg: "Please enter a valid work email address.",
  },
  department: {
    test: (v) => v.trim() !== "",
    msg: "Please select a department.",
  },
  team: {
    test: (v) => v.trim() !== "",
    msg: "Please select a team.",
  },
  systemRole: {
    test: (v) => v.trim() !== "",
    msg: "Please select a system role.",
  },
  phone: {
    test: (v) => {
      const digits = v.replace(/[\s\+\-\(\)]/g, "");
      return digits.length >= 8 && digits.length <= 15 && /^\d+$/.test(digits);
    },
    msg: "Enter a valid phone number (8–15 digits, e.g. +91 98765 43210).",
  },
  joinDate: {
    test: (v) => v.trim() !== "",
    msg: "Please select a join date.",
  },
};

function setError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const err = document.getElementById(`err-${fieldId}`);
  if (!input) return;
  input.classList.add("is-invalid");
  if (err) {
    err.textContent = message;
    err.style.display = "block";
  }
}

function clearError(fieldId) {
  const input = document.getElementById(fieldId);
  const err = document.getElementById(`err-${fieldId}`);
  if (!input) return;
  input.classList.remove("is-invalid");
  if (err) err.style.display = "none";
}

function validateField(fieldId) {
  const rule = RULES[fieldId];
  if (!rule) return true;
  const input = document.getElementById(fieldId);
  if (!input) return true;
  if (rule.test(input.value)) {
    clearError(fieldId);
    return true;
  }
  setError(fieldId, rule.msg);
  return false;
}

async function validateAll() {
  let valid = true;
  Object.keys(RULES).forEach((f) => {
    if (!validateField(f)) valid = false;
  });

  const emailEl = document.getElementById("workEmail");
  if (emailEl && !emailEl.classList.contains("is-invalid")) {
    const emailVal = emailEl.value.trim().toLowerCase();
    const allEmps = await HRStore.getAll();
    if (allEmps.some((e) => e.email.toLowerCase() === emailVal)) {
      setError("workEmail", "This email is already registered in the system.");
      valid = false;
    }
  }
  return valid;
}

// ═══════════════════════════════════════════════════════
// DYNAMIC DROPDOWNS — all populated from HRStore
// ═══════════════════════════════════════════════════════

function populateDepartments() {
  const sel = document.getElementById("department");
  const deps = HRStore.getDepartments();
  sel.innerHTML = '<option value="">— Select Department —</option>';
  deps.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    sel.appendChild(opt);
  });
}

function populateTeams(dept) {
  const sel = document.getElementById("team");
  const teams = HRStore.getTeamsForDept(dept);
  sel.innerHTML = '<option value="">— Select Team —</option>';
  teams.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
}

async function populateSystemRoles() {
  const sel = document.getElementById("systemRole");
  const allEmps = await HRStore.getAll();
  const roles = [...new Set(allEmps.map((e) => e.role))].sort();
  const canonical = [
    "Project Manager",
    "Team Leader",
    "Team Member",
    "Compliance Officer",
    "Process Admin",
    "HR Manager",
    "HR Ops",
  ];
  const merged = [...new Set([...canonical, ...roles])].sort();
  sel.innerHTML = '<option value="">— Select Role —</option>';
  merged.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    sel.appendChild(opt);
  });
}

async function populateReportsTo() {
  const managers = await HRStore.getManagers();
  const sel = document.getElementById("reportsTo");
  sel.innerHTML = '<option value="">— Select Manager (optional) —</option>';
  managers.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.id;
    const short = (m.role || "")
      .replace("Project Manager", "PM")
      .replace("Team Leader", "TL");
    opt.textContent = `${m.name} (${short})`;
    sel.appendChild(opt);
  });
}

// ─── Live credential preview ──────────────────────────────
function updatePreview() {
  const first = document
    .getElementById("firstName")
    .value.trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const last = document
    .getElementById("lastName")
    .value.trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const role = document.getElementById("systemRole").value;
  document.getElementById("previewUsername").textContent =
    (first || "firstname") + "." + (last || "lastname");
  document.getElementById("previewAccess").textContent = role
    ? `${role} — Level assigned`
    : "Based on role assigned";
}

// ═══════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════
function showToast(name) {
  const toast = document.getElementById("successToast");
  document.getElementById("toastName").textContent = `${name} created`;
  document.getElementById("toastMsg").textContent =
    "Account provisioned & store updated.";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

// ─── Error banner ─────────────────────────────────────────
function showBanner(msg) {
  let banner = document.getElementById("storeBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "storeBanner";
    banner.style.cssText = [
      "background:#fef2f2",
      "border:1px solid #fca5a5",
      "border-radius:8px",
      "padding:12px 16px",
      "margin-bottom:16px",
      "font-size:13px",
      "color:#991b1b",
      "display:flex",
      "align-items:center",
      "gap:10px",
    ].join(";");
    document.getElementById("newEmployeeForm").prepend(banner);
  }
  banner.innerHTML = `<i class="ri-error-warning-line" style="font-size:18px;flex-shrink:0;"></i><span>${msg}</span>`;
}
function hideBanner() {
  const b = document.getElementById("storeBanner");
  if (b) b.remove();
}

// ═══════════════════════════════════════════════════════
// SUBMIT — writes to HRStore (API Backend)
// ═══════════════════════════════════════════════════════
async function handleSubmit() {
  hideBanner();
  const isValid = await validateAll();
  if (!isValid) {
    const firstInvalid = document.querySelector(".form-control.is-invalid");
    if (firstInvalid)
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.classList.add("loading");
  btn.innerHTML = '<i class="ri-loader-4-line"></i> Provisioning…';

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const workEmail = document.getElementById("workEmail").value.trim();
  const department = document.getElementById("department").value;
  const team = document.getElementById("team").value;
  const systemRole = document.getElementById("systemRole").value;
  const reportsTo = document.getElementById("reportsTo").value || null;
  const phone = document.getElementById("phone").value.trim();
  const joinDate = document.getElementById("joinDate").value;

  const payload = {
    name: `${firstName} ${lastName}`,
    initials: getInitials(firstName, lastName),
    color: randomColor(),
    role: systemRole,
    department,
    team: team || null,
    parentId: reportsTo,
    status: "active",
    joined: formatJoinDate(joinDate),
    email: workEmail,
    phone,
    joinDateRaw: joinDate,
  };

  const result = await HRStore.add(payload);

  btn.classList.remove("loading");
  btn.innerHTML = '<i class="ri-check-line"></i> Create & Provision Account';

  if (!result.ok) {
    const fieldMap = {
      name: ["firstName", "lastName"],
      email: ["workEmail"],
      department: ["department"],
      role: ["systemRole"],
      phone: ["phone"],
      joined: ["joinDate"],
    };
    Object.entries(result.errors || {}).forEach(([key, msg]) => {
      (fieldMap[key] || [key]).forEach((id) => setError(id, msg));
    });
    const firstInvalid = document.querySelector(".form-control.is-invalid");
    if (firstInvalid)
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  console.log("Employee added to HRStore:", result.employee);
  console.log("Updated stats:", result.stats);

  showToast(`${firstName} ${lastName}`);
  setTimeout(() => {
    window.location.href = getReturnTo();
  }, 1800);
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  const returnTo = getReturnTo();
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    if ((item.getAttribute("href") || "") === returnTo)
      item.classList.add("active");
  });
  if (["dashboard.html", "employees.html"].includes(returnTo)) {
    document.getElementById("sidebarDashboard")?.classList.add("active");
  }

  document.getElementById("joinDate").value = new Date()
    .toISOString()
    .split("T")[0];

  populateDepartments();
  await populateSystemRoles();
  await populateReportsTo();

  document.getElementById("department").addEventListener("change", function () {
    populateTeams(this.value);
    clearError("department");
    clearError("team");
  });

  ["firstName", "lastName"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updatePreview);
  });
  document
    .getElementById("systemRole")
    .addEventListener("change", updatePreview);

  Object.keys(RULES).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("blur", () => validateField(id));
    el.addEventListener("input", () => {
      if (el.classList.contains("is-invalid")) validateField(id);
    });
    el.addEventListener("change", () => {
      if (el.classList.contains("is-invalid")) validateField(id);
    });
  });

  const goBack = () => {
    window.location.href = getReturnTo();
  };
  document.getElementById("cancelBtn").addEventListener("click", goBack);
  document.getElementById("closeModal").addEventListener("click", goBack);

  document.getElementById("submitBtn").addEventListener("click", handleSubmit);
  document
    .getElementById("newEmployeeForm")
    .addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        await handleSubmit();
      }
    });
});

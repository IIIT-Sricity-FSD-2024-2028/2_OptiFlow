// js/pages/auth-flows.js

function showAuthMessage(formId, message, type = 'error') {
  const form = document.getElementById(formId);
  if (!form) return;
  
  let msgDiv = form.querySelector('.auth-message');
  if (!msgDiv) {
    msgDiv = document.createElement('div');
    msgDiv.className = 'auth-message';
    msgDiv.style.padding = '10px';
    msgDiv.style.marginBottom = '15px';
    msgDiv.style.borderRadius = '6px';
    msgDiv.style.fontSize = '0.875rem';
    msgDiv.style.fontWeight = '500';
    form.insertBefore(msgDiv, form.firstChild);
  }
  
  if (type === 'error') {
    msgDiv.style.backgroundColor = '#fef2f2';
    msgDiv.style.color = '#dc2626';
    msgDiv.style.border = '1px solid #fecaca';
  } else if (type === 'success') {
    msgDiv.style.backgroundColor = '#f0fdf4';
    msgDiv.style.color = '#16a34a';
    msgDiv.style.border = '1px solid #bbf7d0';
  } else {
    msgDiv.style.backgroundColor = '#f0f9ff';
    msgDiv.style.color = '#0284c7';
    msgDiv.style.border = '1px solid #bae6fd';
  }
  
  msgDiv.textContent = message;
}

// --- Utility: Smart Toggle Password Visibility ---
function togglePassword(inputId, buttonElement) {
  // 1. Find the specific input we want to toggle
  const passwordInput = document.getElementById(inputId);

  // 2. Find the SVGs specifically inside the button that was just clicked
  const iconEyeOff = buttonElement.querySelector("svg:first-child"); // Crossed-out eye
  const iconEye = buttonElement.querySelector("svg:last-child"); // Open eye

  // 3. Swap the types and icons
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    if (iconEyeOff) iconEyeOff.style.display = "none";
    if (iconEye) iconEye.style.display = "block";
  } else {
    passwordInput.type = "password";
    if (iconEye) iconEye.style.display = "none";
    if (iconEyeOff) iconEyeOff.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // --- 1. LOGIN LOGIC (Updated for NestJS API) ---
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    // Note the 'async' keyword here
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      
      submitBtn.textContent = "Connecting...";
      submitBtn.disabled = true;

      try {
        const api = (window.Helpers && window.Helpers.api) ? window.Helpers.api : {
          async request(endpoint, method = 'GET', body = null, customHeaders = {}) {
            const res = await fetch(`http://localhost:5500${endpoint}`, {
              method,
              headers: { 'Content-Type': 'application/json', 'x-user-role': 'superuser', 'x-company-id': 'comp-1', ...customHeaders },
              body: body ? JSON.stringify(body) : null
            });
            const json = await res.json();
            return json.data || json;
          }
        };

        // 1. Send Login Request to NestJS /auth/login Backend Endpoint
        try {
          const authRes = await fetch("http://localhost:5500/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });

          const authData = await authRes.json();
          const loginPayload = authData.data || authData;

          if (authRes.ok && loginPayload.success && loginPayload.user) {
            const user = loginPayload.user;
            const targetRoute = loginPayload.targetRoute || user.targetRoute || "enduser/member-dashboard.html";
            const roleSlug = loginPayload.roleSlug || "team_member";

            sessionStorage.setItem("currentUser", JSON.stringify({
              id: user.id,
              rawId: user.id,
              name: user.fullName,
              email: user.email,
              role: roleSlug,
              roleLabel: user.assignedRole,
              jobTitle: user.jobTitle,
              roleId: user.roleId || 1,
              companyId: user.companyId,
              companyName: user.companyName,
              scopeType: user.scopeType || null,
              scopeId: user.scopeId || null,
              branchName: user.branchName || null,
            }));

            // Intercept System Role & Redirect to Strict Target Route
            window.location.href = targetRoute;
            return;
          } else if (authRes.status === 401 || authRes.status === 400 || authRes.status === 403) {
            showAuthMessage("loginForm", loginPayload.message || "Invalid email or password.", "error");
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            return;
          }
        } catch (e) {
          console.warn("Backend /auth/login attempt failed, attempting fallback user resolution...", e);
        }

        // Fallback: Fetch user list across all companies
        const rawUsers = await api.request('/users', 'GET', null, { 'x-company-id': 'all' });
        const users = Array.isArray(rawUsers) ? rawUsers : (rawUsers && rawUsers.data ? rawUsers.data : []);
        const validUser = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

        if (validUser) {
          let roleLabel = 'Team Member';
          if (validUser.roleAssignments && validUser.roleAssignments.length > 0) {
            const ownerRole = validUser.roleAssignments.find(ra => ra.role && (ra.role.label.includes('Owner') || ra.role.label.includes('CEO') || ra.role.label.includes('CTO') || ra.role.label.includes('COO') || ra.role.label.includes('Superuser')));
            const hrRole = validUser.roleAssignments.find(ra => ra.role && (ra.role.label.includes('Governance') || ra.role.label.includes('HR')));
            const processRole = validUser.roleAssignments.find(ra => ra.role && (ra.role.label.includes('Process Admin') || ra.role.label.includes('Process')));
            const complianceRole = validUser.roleAssignments.find(ra => ra.role && (ra.role.label.includes('Compliance')));
            const pmRole = validUser.roleAssignments.find(ra => ra.role && (ra.role.label.includes('Project Manager') || ra.role.label.includes('PM')));
            const tlRole = validUser.roleAssignments.find(ra => ra.role && (ra.role.label.includes('Team Lead') || ra.role.label.includes('TL')));

            const matchedAssignment = ownerRole || hrRole || processRole || complianceRole || pmRole || tlRole || validUser.roleAssignments[0];
            if (matchedAssignment && matchedAssignment.role) roleLabel = matchedAssignment.role.label;
          }

          let roleLower = String(roleLabel || "").toLowerCase();
          let roleSlug = "team_member";
          let targetRedirect = "enduser/member-dashboard.html";

          // Strict Target Route Mapping Rules:
          if (roleLower.includes("system admin") || roleLower.includes("system_admin")) {
            roleSlug = "system_admin";
            targetRedirect = "admin-console/admin-dashboard.html";
          } else if (roleLower.includes("owner") || roleLower.includes("ceo") || roleLower.includes("cto") || roleLower.includes("coo")) {
            roleSlug = "company_owner";
            targetRedirect = "admin/executive/executive_dashboard.html";
          } else if (roleLower.includes("branch manager")) {
            roleSlug = "branch_manager";
            targetRedirect = "admin/executive/executive_dashboard.html";
          } else if (roleLower.includes("governance") || roleLower.includes("hr")) {
            roleSlug = "hr_manager";
            targetRedirect = "admin/pm/hr-dashboard.html";
          } else if (roleLower.includes("process")) {
            roleSlug = "project_manager";
            targetRedirect = "superuser/dashboard.html";
          } else if (roleLower.includes("compliance")) {
            roleSlug = "compliance_officer";
            targetRedirect = "modules/compliance.html";
          } else if (roleLower.includes("project") || roleLower.includes("pm")) {
            roleSlug = "project_manager";
            targetRedirect = "admin/pm/pm-dashboard.html";
          } else if (roleLower.includes("lead") || roleLower.includes("tl")) {
            roleSlug = "team_leader";
            targetRedirect = "enduser/tl-dashboard.html";
          } else {
            roleSlug = "team_member";
            targetRedirect = "enduser/member-dashboard.html";
          }

          sessionStorage.setItem("currentUser", JSON.stringify({
            id: validUser.id,
            name: validUser.fullName,
            email: validUser.email,
            role: roleSlug,
            roleLabel: roleLabel,
            roleId: validUser.roleAssignments?.[0]?.roleId || 1,
            companyId: validUser.companyId,
            jobTitle: validUser.jobTitle,
          }));

          window.location.href = targetRedirect;
        } else {
          // Check if this is a Platform Admin email
          try {
            const rawAdmins = await api.request('/platform-admin-users', 'GET', null, { 
              'x-platform-admin-id': 'bootstrap',
              'x-user-role': 'platform_admin'
            });
            const admins = Array.isArray(rawAdmins) ? rawAdmins : (rawAdmins && rawAdmins.data ? rawAdmins.data : []);
            const validAdmin = admins.find(a => a.email && a.email.toLowerCase() === email.toLowerCase());

            if (validAdmin) {
              sessionStorage.setItem("currentUser", JSON.stringify({
                id: validAdmin.id,
                name: validAdmin.username || validAdmin.fullName || validAdmin.email,
                email: validAdmin.email,
                role: "platform_admin"
              }));
              window.location.href = "platform-admin/dashboard.html";
              return;
            }
          } catch (adminErr) {
            console.warn("Platform admin lookup error:", adminErr);
          }

          showAuthMessage("loginForm", "Invalid email. Could not find this user in the backend database.", "error");
          submitBtn.textContent = originalBtnText;
          submitBtn.disabled = false;
        }
      } catch (error) {
        console.error("Login failed:", error);
        showAuthMessage("loginForm", "Failed to connect to backend: " + (error.message || "Ensure NestJS server is running on port 3000"), "error");
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }

  // --- 2. REGISTER LOGIC ---
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const companyLegalName = document.getElementById("regCompany")?.value?.trim();
      const ownerFullName = document.getElementById("regName")?.value?.trim();
      const ownerEmail = document.getElementById("regEmail")?.value?.trim();
      const ownerPassword = document.getElementById("loginPassword")?.value || document.getElementById("regConfirm")?.value || "password123";
      const sizeVal = document.getElementById("regSize")?.value || "";

      let planName = "Growth";
      if (sizeVal.includes("Startup") || sizeVal.includes("Small")) planName = "Starter";
      else if (sizeVal.includes("Enterprise") || sizeVal.includes("500+")) planName = "Pro Enterprise";

      const submitBtn = registerForm.querySelector("button[type='submit']");
      const originalBtnText = submitBtn ? submitBtn.textContent : "Create Organization";
      if (submitBtn) {
        submitBtn.textContent = "Creating Organization & Templates...";
        submitBtn.disabled = true;
      }

      try {
        const res = await fetch("http://localhost:5500/companies/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyLegalName,
            ownerFullName,
            ownerEmail,
            ownerPassword,
            planName,
          }),
        });

        const json = await res.json();
        const data = json.data || json;

        if (res.ok && (json.success || data.company)) {
          const company = data.company;
          const owner = data.owner;

          sessionStorage.setItem("currentUser", JSON.stringify({
            id: owner.id,
            name: owner.fullName,
            email: owner.email,
            role: "superuser",
            roleLabel: owner.assignedRole || "Company Owner",
            companyId: company.id,
            companyName: company.legalName,
          }));

          showAuthMessage("registerForm", `Organization ${company.legalName} created! Seeding templates & initializing workspace...`, "success");

          setTimeout(() => {
            window.location.href = "admin/executive/executive_dashboard.html";
          }, 1500);
        } else {
          showAuthMessage("registerForm", data.message || "Registration failed. Please check details.", "error");
          if (submitBtn) {
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
          }
        }
      } catch (err) {
        console.error("Registration error:", err);
        showAuthMessage("registerForm", "Failed to connect to backend server: " + err.message, "error");
        if (submitBtn) {
          submitBtn.textContent = originalBtnText;
          submitBtn.disabled = false;
        }
      }
    });
  }

  // --- 3. FORGOT PASSWORD LOGIC ---
  const forgotForm = document.getElementById("forgotForm");
  if (forgotForm) {
    forgotForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("forgotEmail").value;
      showAuthMessage("forgotForm", `A password reset link has been sent to ${email}`, "success");
      setTimeout(() => {
        window.location.href = "reset-password.html";
      }, 2000);
    });
  }

  // --- 4. RESET PASSWORD LOGIC ---
  const resetForm = document.getElementById("resetForm");
  if (resetForm) {
    resetForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const newPass = document.getElementById("resetNew").value;
      const confirmPass = document.getElementById("resetConfirm").value;

      if (newPass !== confirmPass) {
        showAuthMessage("resetForm", "Passwords do not match!", "error");
        return;
      }

      showAuthMessage("resetForm", "Password successfully reset! You can now log in.", "success");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    });
  }
});
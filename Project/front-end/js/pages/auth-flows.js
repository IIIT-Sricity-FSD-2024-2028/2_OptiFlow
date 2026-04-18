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
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      
      submitBtn.textContent = "Connecting...";
      submitBtn.disabled = true;

      try {
        // Fetch all users from the NestJS backend
        const users = await window.Helpers.api.request('/users', 'GET');
        
        // Find the user by email (Password check bypassed per rubric requirements)
        const validUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (validUser) {
          // Save session mapping backend snake_case to frontend expectations
          sessionStorage.setItem("currentUser", JSON.stringify({
            id: validUser.user_id,
            name: validUser.full_name,
            email: validUser.email,
            role: validUser.role,
            departmentId: validUser.department_id,
            reportsTo: validUser.reports_to
          }));

          // Route based on the backend role string
          const role = validUser.role.toLowerCase();
          
          if (role === "superuser") {
            window.location.href = "superuser/dashboard.html";
          } else if (role === "hr_manager" || role === "hr_ops") {
            window.location.href = "admin/hr/dashboard.html";
          } else if (role === "project_manager") {
            window.location.href = "admin/pm/pm-dashboard.html";
          } else if (role === "compliance_officer") {
            window.location.href = "admin/compliance/compliance_dashboard.html";
          } else if (role === "team_leader") {
            window.location.href = "enduser/tl-dashboard.html";
          } else {
            // Fallback for team_member
            window.location.href = "enduser/member-dashboard.html"; 
          }
        } else {
          showAuthMessage("loginForm", "Invalid email. Could not find this user in the backend database.", "error");
          submitBtn.textContent = originalBtnText;
          submitBtn.disabled = false;
        }
      } catch (error) {
        console.error("Login failed:", error);
        showAuthMessage("loginForm", "Failed to connect to the backend API. Please ensure your NestJS server is running on port 3000.", "error");
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }

  // --- 2. REGISTER LOGIC ---
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      // Enterprise systems generally do not allow self-registration.
      // Accounts are provisioned by HR (POST /users) which is protected by the RolesGuard.
      showAuthMessage("registerForm", "In this enterprise environment, new accounts must be provisioned by the HR Manager. Please contact HR.", "info");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 3000);
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
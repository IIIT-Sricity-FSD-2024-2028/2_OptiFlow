// js/pages/auth-flows.js

// --- Utility: Smart Toggle Password Visibility ---
function togglePassword(inputId, buttonElement) {
  // 1. Find the specific input we want to toggle (e.g., 'resetNew' or 'resetConfirm')
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
  // --- 1. LOGIN LOGIC ---
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      // Fetch users from mock DB
      const users = JSON.parse(localStorage.getItem("users")) || [];
      const validUser = users.find(
        (u) => u.email === email && u.password === password,
      );

      if (validUser) {
        // Save session
        sessionStorage.setItem("currentUser", JSON.stringify(validUser));

        // Route based on specific role
        if (validUser.role === "superuser") {
          // Process Admin goes to superuser dashboard
          window.location.href = "superuser/dashboard.html";
        } else if (
          validUser.role === "hr_manager" ||
          validUser.role === "hr_ops"
        ) {
          // HR staff go to the HR folder
          window.location.href = "admin/hr/dashboard.html";
        } else if (validUser.role === "project_manager") {
          // PM goes to PM dashboard
          window.location.href = "admin/pm/pm-dashboard.html";
        } else if (validUser.role === "compliance_officer") {
          // Compliance Officer goes to their dashboard
          window.location.href = "admin/compliance/dashboard.html"; // Adjust this path if your CO folder is different
        } else if (validUser.role === "team_leader") {
          // Team Leader goes to their dashboard
          window.location.href = "enduser/leader/dashboard.html"; // Adjust this path if your CO folder is different
        } else {
          // Fallback for team_member, team_leader, enduser, etc.
          window.location.href = "enduser/member/dashboard.html";
        }
      } else {
        alert("Invalid email or password. Please try again.");
      }
    });
  }

  // --- 2. REGISTER LOGIC ---
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const password = document.getElementById("regPassword").value;
      const confirm = document.getElementById("regConfirm").value;

      // Front-end Validation (Requirement #5)
      if (password !== confirm) {
        alert("Passwords do not match!");
        return;
      }

      const newUser = {
        id: Date.now(), // Generate a random ID
        name: document.getElementById("regName").value,
        email: document.getElementById("regEmail").value,
        password: password,
        role: "superuser", // By default, the creator of the org is a superuser
        company: document.getElementById("regCompany").value,
      };

      // Save to mock database
      const users = JSON.parse(localStorage.getItem("users")) || [];

      // Check if email already exists
      if (users.find((u) => u.email === newUser.email)) {
        alert("This email is already registered.");
        return;
      }

      users.push(newUser);
      localStorage.setItem("users", JSON.stringify(users));

      alert("Organization created successfully! Please log in.");
      window.location.href = "login.html";
    });
  }

  // --- 3. FORGOT PASSWORD LOGIC ---
  const forgotForm = document.getElementById("forgotForm");
  if (forgotForm) {
    forgotForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("forgotEmail").value;
      // Simulate sending an email
      alert(`A password reset link has been sent to ${email}`);
      window.location.href = "reset-password.html"; // Simulate clicking the link in the email
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
        alert("Passwords do not match!");
        return;
      }

      // In a real app, we would update the DB here. For the mock, we just redirect.
      alert("Password successfully reset! You can now log in.");
      window.location.href = "login.html";
    });
  }
});

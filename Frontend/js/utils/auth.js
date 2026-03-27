// js/utils/auth.js

// Function to handle the login form submission
function handleLogin(event) {
  event.preventDefault(); // STOPS THE PAGE FROM RELOADING! (Crucial for Evaluation Req #4)

  const emailInput = document.getElementById("email").value;
  const passwordInput = document.getElementById("password").value;

  // Get users from our mock database
  const users = JSON.parse(localStorage.getItem("users"));

  // Find if a user matches the email and password
  const validUser = users.find(
    (u) => u.email === emailInput && u.password === passwordInput,
  );

  if (validUser) {
    if (validUser.status === "Inactive") {
      alert("Your account has been deactivated. Please contact HR.");
      return; // Stops the login process entirely
    }
    // Save the logged-in user to sessionStorage (clears when browser closes)
    sessionStorage.setItem("currentUser", JSON.stringify(validUser));

    // Redirect based on role (Requirement #2 & #8)
    if (validUser.role === "superuser") {
      window.location.href = "superuser/dashboard.html";
    } else if (validUser.role === "admin") {
      window.location.href = "admin/pm-dashboard.html";
    } else {
      window.location.href = "enduser/member-dashboard.html";
    }
  } else {
    alert("Invalid email or password!"); // You can replace this with your toast.js later
  }
}

// Function to protect pages. Add this to the top of EVERY dashboard/inner page.
function protectPage(allowedRoles) {
  const currentUserStr = sessionStorage.getItem("currentUser");

  // If no one is logged in, kick them to login
  if (!currentUserStr) {
    window.location.href = "../index.html";
    return;
  }

  const currentUser = JSON.parse(currentUserStr);

  // If the user's role isn't in the allowed list, kick them out
  if (!allowedRoles.includes(currentUser.role)) {
    alert("You do not have permission to view this page.");
    window.location.href = "../index.html";
  }
}

// Function to safely logout
function logout() {
  sessionStorage.removeItem("currentUser");
  window.location.href = "../index.html";
}

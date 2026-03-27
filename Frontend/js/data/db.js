// js/data/db.js

// Run this function when the app loads to seed the mock database
function initializeDatabase() {
  // 1. Check if users exist in localStorage under the master key "users"
  if (!localStorage.getItem("users")) {
    // Combined Data Structure: Everyone gets a password AND table data (department, status, etc.)
    const mockUsers = [
      // --- Your Original Users ---
      {
        id: "u1",
        email: "superuser@test.com",
        password: "123",
        role: "superuser",
        name: "Soham",
        department: "Management",
        status: "Active",
        joined: "Jan 01, 2024",
      },
      {
        id: "u2",
        email: "pm@test.com",
        password: "123",
        role: "admin",
        name: "Aishwary",
        department: "Operations",
        status: "Active",
        joined: "Jan 15, 2024",
      },
      {
        id: "u3",
        email: "hr@test.com",
        password: "123",
        role: "admin",
        name: "Uday",
        department: "HR",
        status: "Active",
        joined: "Feb 01, 2024",
      },
      {
        id: "u4",
        email: "user@test.com",
        password: "123",
        role: "enduser",
        name: "Team Member",
        department: "Engineering",
        status: "Active",
        joined: "Feb 15, 2024",
      },
      {
        id: "u5",
        email: "co@app.com",
        password: "co123",
        role: "admin",
        name: "Jason C",
        department: "Compliance",
        status: "Active",
        joined: "Mar 01, 2024",
      },

      // --- Soham's Users (Now with passwords added so they can log in!) ---
      {
        id: "u6",
        email: "vikram@officesync.com",
        password: "123",
        role: "superuser",
        name: "Vikram Patel",
        department: "IT",
        status: "Active",
        joined: "Oct 01, 2024",
      },
      {
        id: "u7",
        email: "arjun@officesync.com",
        password: "123",
        role: "team_leader",
        name: "Arjun Mehta",
        department: "Operations",
        status: "Active",
        joined: "Nov 12, 2024",
      },
      {
        id: "u8",
        email: "sunita@officesync.com",
        password: "123",
        role: "enduser",
        name: "Sunita Rao",
        department: "Finance",
        status: "Inactive",
        joined: "Dec 05, 2024",
      },
    ];

    // Save the combined list to browser storage
    localStorage.setItem("users", JSON.stringify(mockUsers));
  }

  // 2. Check if tasks exist
  if (!localStorage.getItem("tasks")) {
    const mockTasks = [
      { id: 101, title: "Design Login", status: "Done", assignedTo: "Soham" },
      {
        id: 102,
        title: "Setup LocalStorage",
        status: "In Progress",
        assignedTo: "Team",
      },
    ];
    localStorage.setItem("tasks", JSON.stringify(mockTasks));
  }
}

// --- GLOBAL HELPER FUNCTIONS (Adapted from Soham's code) ---
// The whole team can now use these functions in their page logic!

function getUsers() {
  const data = localStorage.getItem("users");
  return data ? JSON.parse(data) : [];
}

function saveUsers(usersArray) {
  localStorage.setItem("users", JSON.stringify(usersArray));
}

// Call it immediately so the database is always ready
initializeDatabase();

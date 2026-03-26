// js/data/db.js

// Run this function when the app loads to seed the mock database
function initializeDatabase() {
  // 1. Check if users exist in localStorage
  if (!localStorage.getItem("users")) {
    const mockUsers = [
      {
        id: 1,
        email: "superuser@test.com",
        password: "123",
        role: "superuser",
        name: "Soham",
      },
      {
        id: 2,
        email: "pm@test.com",
        password: "123",
        role: "admin",
        name: "Aishwary",
      },
      {
        id: 3,
        email: "hr@test.com",
        password: "123",
        role: "admin",
        name: "Uday",
      },
      {
        id: 4,
        email: "user@test.com",
        password: "123",
        role: "enduser",
        name: "Team Member",
      },
    ];
    // Convert array to string and save to browser storage
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

// Call it immediately so the database is always ready
initializeDatabase();

// js/data/db.js

const MASTER_DB_VERSION = 8; // 🚀 Bumped to 8 to establish Reporting Hierarchy!

function initializeDatabase() {
  const currentVersion = localStorage.getItem("master_db_version");
  const parsedVersion = parseInt(currentVersion, 10);
  const needsUpdate = isNaN(parsedVersion) || parsedVersion < MASTER_DB_VERSION;

  if (!localStorage.getItem("users") || needsUpdate) {
    const mockUsers = [
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
        role: "project_manager",
        name: "Aishwary",
        department: "Operations",
        status: "Active",
        joined: "Jan 15, 2024",
      },
      {
        id: "u3",
        email: "hr@test.com",
        password: "123",
        role: "hr_manager",
        name: "Uday",
        department: "HR",
        status: "Active",
        joined: "Feb 01, 2024",
      },
      {
        id: "u5",
        email: "co@test.com",
        password: "123",
        role: "compliance_officer",
        name: "Jason C",
        department: "Compliance",
        status: "Active",
        joined: "Mar 01, 2024",
      },
      {
        id: "u6",
        email: "admin@test.com",
        password: "123",
        role: "superuser",
        name: "Vikram Patel",
        department: "IT",
        status: "Active",
        joined: "Oct 01, 2024",
      },

      // THE LEADERSHIP NODE
      {
        id: "u7",
        email: "tl@test.com",
        password: "123",
        role: "team_leader",
        name: "Kiran Rao",
        department: "Operations",
        status: "Active",
        joined: "Nov 12, 2024",
        projectId: 2,
      },

      // ✅ TEAM MEMBERS NOW REPORT TO KIRAN (u7)
      {
        id: "u4",
        email: "tm1@test.com",
        password: "123",
        role: "team_member",
        name: "Ravi Kumar",
        department: "Engineering",
        status: "Active",
        joined: "Feb 15, 2024",
        projectId: 1,
        reportsTo: "u7",
      },
      {
        id: "u8",
        email: "tm2@test.com",
        password: "123",
        role: "team_member",
        name: "Priya S.",
        department: "Finance",
        status: "Active",
        joined: "Dec 05, 2024",
        projectId: 1,
        reportsTo: "u7",
      },
    ];

    localStorage.setItem("users", JSON.stringify(mockUsers));
    localStorage.setItem("master_db_version", MASTER_DB_VERSION);
  }
}

function getUsers() {
  return localStorage.getItem("users")
    ? JSON.parse(localStorage.getItem("users"))
    : [];
}
function saveUsers(usersArray) {
  localStorage.setItem("users", JSON.stringify(usersArray));
}

initializeDatabase();

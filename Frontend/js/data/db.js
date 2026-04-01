// js/data/db.js
(function (global) {
  "use strict";

  // Prevent "Identifier has already been declared" if the script is loaded twice
  if (global.__OFFICESYNC_MASTER_DB_LOADED__) return;
  global.__OFFICESYNC_MASTER_DB_LOADED__ = true;

  const MASTER_DB_VERSION = 11; // Demo Ecosystem reset (Office Ecosystem v11)

  function initializeDatabase() {
    const currentVersion = localStorage.getItem("master_db_version");
    const parsedVersion = parseInt(currentVersion, 10);
    const needsUpdate =
      isNaN(parsedVersion) || parsedVersion < MASTER_DB_VERSION;

    if (!localStorage.getItem("users") || needsUpdate) {
      // Wipe legacy demo fragments (keeps the prototype deterministic)
      localStorage.removeItem("system_notifications");

      const mockUsers = [
        // ── Leadership & Admin Layer ─────────────────────────────
        {
          id: "u1",
          email: "vikram.patel@officesync.in",
          password: "123",
          role: "superuser",
          name: "Vikram Patel",
          department: "Operations",
          status: "Active",
          joined: "Oct 01, 2024",
        },
        {
          id: "u2",
          email: "divya.nair@officesync.in",
          password: "123",
          role: "hr_manager",
          name: "Divya Nair",
          department: "HR",
          status: "Active",
          joined: "Jan 04, 2021",
        },
        {
          id: "u3",
          email: "jason.c@officesync.in",
          password: "123",
          role: "compliance_officer",
          name: "Jason C",
          department: "Compliance",
          status: "Active",
          joined: "Mar 01, 2024",
        },
        {
          id: "u4",
          email: "aishwary@officesync.in",
          password: "123",
          role: "project_manager",
          name: "Aishwary",
          department: "Operations",
          status: "Active",
          joined: "Jan 15, 2024",
        },

        // ── Team 1: Finance (reports to PM u4) ───────────────────
        {
          id: "u5",
          email: "priya.sharma@officesync.in",
          password: "123",
          role: "team_leader",
          name: "Priya Sharma",
          department: "Finance",
          status: "Active",
          joined: "Mar 15, 2022",
          reportsTo: "u4",
          projectId: 1,
        },
        {
          id: "u6",
          email: "ravi.kumar@officesync.in",
          password: "123",
          role: "team_member",
          name: "Ravi Kumar",
          department: "Finance",
          status: "Active",
          joined: "Feb 15, 2024",
          reportsTo: "u5",
          projectId: 1,
        },
        {
          id: "u7",
          email: "sonam.jain@officesync.in",
          password: "123",
          role: "team_member",
          name: "Sonam Jain",
          department: "Finance",
          status: "Active",
          joined: "Nov 20, 2022",
          reportsTo: "u5",
          projectId: 1,
        },

        // ── Team 2: IT Security (reports to PM u4) ───────────────
        {
          id: "u8",
          email: "kiran@officesync.in",
          password: "123",
          role: "team_leader",
          name: "Kiran Rao",
          department: "IT Security",
          status: "Active",
          joined: "Jun 01, 2022",
          reportsTo: "u4",
          projectId: 2,
        },
        {
          id: "u9",
          email: "neha.patil@officesync.in",
          password: "123",
          role: "team_member",
          name: "Neha Patil",
          department: "IT Security",
          status: "Active",
          joined: "Nov 01, 2023",
          reportsTo: "u8",
          projectId: 2,
        },
        {
          id: "u10",
          email: "anil.tiwari@officesync.in",
          password: "123",
          role: "team_member",
          name: "Anil Tiwari",
          department: "IT Security",
          status: "Active",
          joined: "Mar 07, 2023",
          reportsTo: "u8",
          projectId: 2,
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

  // Export functions (and keep backward-compat for existing code)
  global.initializeDatabase = global.initializeDatabase || initializeDatabase;
  global.getUsers = global.getUsers || getUsers;
  global.saveUsers = global.saveUsers || saveUsers;

  initializeDatabase();
})(window);

// js/data/db.js
(function (global) {
  "use strict";

  if (global.__OFFICESYNC_MASTER_DB_LOADED__) return;
  global.__OFFICESYNC_MASTER_DB_LOADED__ = true;

  async function getUsers() {
    try {
      const users = await window.Helpers.api.request('/users');
      return users.map(u => ({
        id: `u${u.id}`,
        email: u.email,
        password: "123", // Assuming legacy UI might still check this somewhere
        role: u.role,
        name: u.full_name,
        department: u.department_id, // Usually UI wants the string, but mapping ID for now
        status: u.status || 'Active',
        joined: new Date().toLocaleDateString(),
        reportsTo: u.reports_to ? `u${u.reports_to}` : null,
        projectId: u.project_id || null
      }));
    } catch (error) {
      console.error("Failed to fetch users", error);
      return [];
    }
  }

  async function saveUsers(usersArray) {
    console.warn("saveUsers is deprecated. Use direct API POST/PATCH via hr-data-store or UI controllers.");
  }

  global.initializeDatabase = () => { console.log("Init DB deprecated. Backend takes over via REST APIs."); };
  global.getUsers = global.getUsers || getUsers;
  global.saveUsers = global.saveUsers || saveUsers;

})(window);

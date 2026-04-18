// js/data/audit-store.js
// Frontend-only global audit log store (API-backed)
(function (global) {
  "use strict";

  function _getActor() {
    try {
      const raw = sessionStorage.getItem("currentUser");
      if (!raw) return { id: null, name: "System" };
      const u = JSON.parse(raw);
      return { id: u.id || null, name: u.name || u.email || "Unknown" };
    } catch {
      return { id: null, name: "System" };
    }
  }

  function _nowDisplay() {
    const d = new Date();
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const date = d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    return `${time}, ${date}`;
  }

  const AuditStore = {
    async add(type, description, severity = "Info", meta = {}) {
      const actor = _getActor();
      const payload = {
        type: type || "System",
        description: description || "",
        severity: severity || "Info",
        user_name: meta.user || actor.name || "System",
        ip: meta.ip || "localhost",
        module: meta.module || null,
        actor_id: meta.actorId || actor.id,
      };

      try {
        await window.Helpers.api.request('/audit-logs', 'POST', payload);
      } catch (error) {
        console.warn("AuditStore: Backend API write failed.", error);
      }
    },

    async list() {
      try {
        const logs = await window.Helpers.api.request('/audit-logs', 'GET');
        // Map backend snake_case to frontend UI expectations
        return logs.map((log) => ({
          id: log.id,
          timestampISO: log.created_at || new Date().toISOString(),
          timestamp: _nowDisplay(), // Fallback formatting, ideal to format the created_at string
          type: log.type,
          user: log.user_name,
          ip: log.ip,
          desc: log.description,
          severity: log.severity,
          module: log.module,
          actorId: log.actor_id,
        })).reverse(); // Assuming API returns oldest -> newest, reverse for UI
      } catch (error) {
        console.warn("AuditStore: Failed to fetch API logs.");
        return [];
      }
    },

    async clear() {
      try {
        await window.Helpers.api.request('/audit-logs', 'DELETE');
      } catch (error) {
        console.warn("AuditStore: Failed to clear API logs.");
      }
    },
  };

  global.AuditStore = AuditStore;
})(window);

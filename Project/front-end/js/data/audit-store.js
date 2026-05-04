// js/data/audit-store.js
// Frontend-only global audit log store (API-backed)
(function (global) {
  "use strict";

  function _getActorId() {
    try {
      const raw = sessionStorage.getItem("currentUser");
      if (!raw) return null;
      const u = JSON.parse(raw);
      return typeof u.id === "number" ? u.id : parseInt(String(u.id || "").replace(/\D/g, ""), 10) || null;
    } catch {
      return null;
    }
  }

  function _getActorName() {
    try {
      const raw = sessionStorage.getItem("currentUser");
      if (!raw) return "System";
      const u = JSON.parse(raw);
      return u.name || u.email || "System";
    } catch {
      return "System";
    }
  }

  function _formatTime(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) +
      ", " + d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  }

  const AuditStore = {
    /**
     * Write an audit log entry to the backend.
     * @param {string} action       e.g. "USER_CREATED", "USER_UPDATED", "STATUS_CHANGE"
     * @param {string} entityType   e.g. "User", "Project", "Task"
     * @param {number} entityId     numeric ID of the affected entity
     * @param {object} [opts]       { oldValue, newValue, performedBy }
     */
    async add(action, entityType, entityId, opts = {}) {
      const performedBy = opts.performedBy != null ? opts.performedBy : _getActorId();
      const payload = {
        action:       action || "SYSTEM_ACTION",
        entity_type:  entityType || "System",
        entity_id:    Number(entityId) || 0,
        performed_by: performedBy,
        old_value:    opts.oldValue  || undefined,
        new_value:    opts.newValue  || undefined,
      };

      try {
        await window.Helpers.api.request('/audit-logs', 'POST', payload);
        console.log("[AuditStore] Log written:", action, entityType, entityId);
      } catch (error) {
        console.warn("[AuditStore] Backend write failed:", error.message || error);
      }
    },

    async list() {
      try {
        const logs = await window.Helpers.api.request('/audit-logs', 'GET');
        return (Array.isArray(logs) ? logs : []).map((log) => ({
          id:           log.log_id || log.id,
          timestampISO: log.performed_at || log.created_at || new Date().toISOString(),
          timestamp:    _formatTime(log.performed_at || log.created_at),
          type:         log.entity_type  || "System",
          action:       log.action       || "",
          user:         log.performed_by != null ? `User #${log.performed_by}` : "System",
          actorId:      log.performed_by,
          entityId:     log.entity_id,
          desc:         `${log.action || ""} on ${log.entity_type || ""} #${log.entity_id || ""}`,
          oldValue:     log.old_value,
          newValue:     log.new_value,
          ip:           log.ip_address || "—",
        })).reverse();
      } catch (error) {
        console.warn("[AuditStore] Failed to fetch logs:", error.message || error);
        return [];
      }
    },

    async clear() {
      // DELETE not implemented in backend; no-op
      console.warn("[AuditStore] clear() is not supported by the backend.");
    },
  };

  global.AuditStore = AuditStore;
})(window);

// js/data/audit-store.js
// Frontend-only global audit log store (API-backed)
(function (global) {
  "use strict";

  function _getActorId() {
    try {
      const raw = sessionStorage.getItem("currentUser");
      if (!raw) return null;
      const u = JSON.parse(raw);
      return u.id ? String(u.id) : null;
    } catch {
      return null;
    }
  }

  function _formatTime(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return (
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) +
      ", " +
      d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    );
  }

  const AuditStore = {
    async add(action, entityType, entityId, opts = {}) {
      const performedBy = opts.performedBy != null ? String(opts.performedBy) : _getActorId();
      const payload = {
        action:       action || "SYSTEM_ACTION",
        entityType:   entityType || "System",
        entityId:     String(entityId || "0"),
        performedBy:  performedBy,
        oldValue:     opts.oldValue  || undefined,
        newValue:     opts.newValue  || undefined,
      };

      try {
        await window.Helpers.api.request('/audit-logs', 'POST', payload);
      } catch (error) {
        console.warn("[AuditStore] Backend write failed:", error.message || error);
      }
    },

    async list() {
      try {
        const logs = await window.Helpers.api.request('/audit-logs', 'GET');
        const rawList = Array.isArray(logs) ? logs : Array.isArray(logs.data) ? logs.data : [];
        return rawList.map((log) => ({
          id:           log.id || log.logId,
          timestampISO: log.performedAt || log.createdAt || new Date().toISOString(),
          timestamp:    _formatTime(log.performedAt || log.createdAt),
          type:         log.entityType  || "System",
          action:       log.action       || "",
          user:         log.performedBy != null ? `User #${log.performedBy}` : "System",
          actorId:      log.performedBy,
          entityId:     log.entityId,
          desc:         `${log.action || ""} on ${log.entityType || ""} #${log.entityId || ""}`,
          oldValue:     log.oldValue,
          newValue:     log.newValue,
        })).reverse();
      } catch (error) {
        console.warn("[AuditStore] Failed to fetch logs:", error.message || error);
        return [];
      }
    },

    async clear() {},
  };

  global.AuditStore = AuditStore;
})(window);

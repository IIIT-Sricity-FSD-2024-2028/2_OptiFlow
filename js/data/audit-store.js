// js/data/audit-store.js

(function (global) {
  "use strict";

  const LS_AUDIT = "officesync_audit_logs";

  const AuditStore = {
    getAll() {
      const raw = localStorage.getItem(LS_AUDIT);
      if (!raw) {
        // Seed some initial data
        const initialLogs = [
          {
            timestamp: "10:45 AM, Mar 31 2026",
            type: "System",
            user: "System",
            ip: "127.0.0.1",
            desc: "System initialization complete. All stores ready.",
            severity: "Info"
          },
          {
            timestamp: "09:30 AM, Mar 31 2026",
            type: "Process",
            user: "Vikram Patel",
            ip: "192.168.1.42",
            desc: "Published 'Finance Q4 Reporting' workflow",
            severity: "Medium"
          }
        ];
        localStorage.setItem(LS_AUDIT, JSON.stringify(initialLogs));
        return initialLogs;
      }
      return JSON.parse(raw);
    },

    /**
     * Log a new system event
     * @param {string} type - 'Process' | 'Authentication' | 'User Management' | 'System'
     * @param {string} desc - Detailed description of the action
     * @param {string} severity - 'Info' | 'Medium' | 'High'
     */
    add(type, desc, severity = "Info") {
      const logs = this.getAll();
      const sessionRaw = sessionStorage.getItem("currentUser");
      const user = sessionRaw ? JSON.parse(sessionRaw).name : "System";
      
      const now = new Date();
      const timestamp = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + 
                        ", " + now.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

      const newEntry = {
        timestamp,
        type,
        user,
        ip: "192.168.1.42", // Simulated local IP
        desc,
        severity
      };

      logs.unshift(newEntry);
      // Keep only last 100 logs for performance
      const trimmed = logs.slice(0, 100);
      localStorage.setItem(LS_AUDIT, JSON.stringify(trimmed));
      console.log(`[AuditStore] Logged: ${type} - ${desc}`);
    },

    clear() {
      localStorage.removeItem(LS_AUDIT);
    }
  };

  global.AuditStore = AuditStore;
})(window);

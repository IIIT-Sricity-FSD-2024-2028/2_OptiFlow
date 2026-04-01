// js/data/audit-store.js
// Frontend-only global audit log store (localStorage-backed)
(function (global) {
  "use strict";

  const LS_KEY = "system_audit_logs";
  const LS_VER = "system_audit_version";
  const AUDIT_DB_VERSION = 10; // Demo Ecosystem reset (Office Ecosystem v10)

  function _load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function _save(arr) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn("AuditStore: localStorage write failed.", e);
    }
  }

  function _seed() {
    // Newest-first
    return [
      {
        id: 10010,
        timestampISO: "2026-04-01T09:20:00.000Z",
        timestamp: "09:20 AM, Apr 01, 2026",
        type: "EndUser",
        user: "Sonam Jain",
        ip: "localhost",
        desc: 'Reported blocker: "Resolve access to Finance archive share" (Access / Permissions)',
        severity: "High",
        module: "enduser",
        actorId: "u7",
      },
      {
        id: 10009,
        timestampISO: "2026-04-01T08:40:00.000Z",
        timestamp: "08:40 AM, Apr 01, 2026",
        type: "Compliance",
        user: "Jason C",
        ip: "localhost",
        desc: 'Evidence rejected: "Privileged Access Review Export" (missing sign-off/scope)',
        severity: "Medium",
        module: "compliance",
        actorId: "u3",
      },
      {
        id: 10008,
        timestampISO: "2026-03-31T16:10:00.000Z",
        timestamp: "04:10 PM, Mar 31, 2026",
        type: "PM",
        user: "Aishwary",
        ip: "localhost",
        desc: 'Created task: "Run quarterly privileged access review" (ISO 27001 Certification)',
        severity: "Info",
        module: "pm",
        actorId: "u4",
      },
      {
        id: 10007,
        timestampISO: "2026-03-31T11:55:00.000Z",
        timestamp: "11:55 AM, Mar 31, 2026",
        type: "Compliance",
        user: "Jason C",
        ip: "localhost",
        desc: 'Evidence pending review: "Invoice Reconciliation Workbook" (Q4 Financial Audit)',
        severity: "Info",
        module: "compliance",
        actorId: "u3",
      },
      {
        id: 10006,
        timestampISO: "2026-03-30T14:30:00.000Z",
        timestamp: "02:30 PM, Mar 30, 2026",
        type: "HR",
        user: "Divya Nair",
        ip: "localhost",
        desc: "Onboarded Anil Tiwari (IT Security) and assigned reporting line to Kiran Rao",
        severity: "Info",
        module: "hr",
        actorId: "u2",
      },
      {
        id: 10005,
        timestampISO: "2026-03-29T10:05:00.000Z",
        timestamp: "10:05 AM, Mar 29, 2026",
        type: "Compliance",
        user: "Jason C",
        ip: "localhost",
        desc: 'Evidence approved: "SOX 404 Sign-off Packet" (Q4 Financial Audit)',
        severity: "Info",
        module: "compliance",
        actorId: "u3",
      },
      {
        id: 10004,
        timestampISO: "2026-03-28T18:15:00.000Z",
        timestamp: "06:15 PM, Mar 28, 2026",
        type: "User Management",
        user: "Vikram Patel",
        ip: "localhost",
        desc: "Enabled god-mode access across HR / PM / Compliance for Superuser",
        severity: "Info",
        module: "superuser",
        actorId: "u1",
      },
      {
        id: 10003,
        timestampISO: "2026-03-26T09:40:00.000Z",
        timestamp: "09:40 AM, Mar 26, 2026",
        type: "PM",
        user: "Aishwary",
        ip: "localhost",
        desc: 'Created project: "ISO 27001 Certification"',
        severity: "Info",
        module: "pm",
        actorId: "u4",
      },
      {
        id: 10002,
        timestampISO: "2026-03-26T09:10:00.000Z",
        timestamp: "09:10 AM, Mar 26, 2026",
        type: "PM",
        user: "Aishwary",
        ip: "localhost",
        desc: 'Created project: "Q4 Financial Audit"',
        severity: "Info",
        module: "pm",
        actorId: "u4",
      },
      {
        id: 10001,
        timestampISO: "2026-03-25T08:30:00.000Z",
        timestamp: "08:30 AM, Mar 25, 2026",
        type: "System",
        user: "System",
        ip: "localhost",
        desc: "Initialized Office Ecosystem demo dataset (3 teams, full relational integrity)",
        severity: "Info",
        module: "system",
        actorId: null,
      },
    ];
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

  const AuditStore = {
    add(type, description, severity = "Info", meta = {}) {
      const actor = _getActor();
      const logs = _load();
      logs.unshift({
        id: Date.now(),
        timestampISO: new Date().toISOString(),
        timestamp: _nowDisplay(),
        type: type || "System",
        user: meta.user || actor.name || "System",
        ip: meta.ip || "localhost",
        desc: description || "",
        severity: severity || "Info",
        module: meta.module || null,
        actorId: meta.actorId || actor.id,
      });
      _save(logs);
    },

    list() {
      return _load();
    },

    clear() {
      _save([]);
    },
  };

  global.AuditStore = AuditStore;

  // Seed on version bump
  try {
    const vRaw = localStorage.getItem(LS_VER);
    const v = parseInt(vRaw, 10);
    if (isNaN(v) || v < AUDIT_DB_VERSION) {
      _save(_seed());
      localStorage.setItem(LS_VER, String(AUDIT_DB_VERSION));
    }
  } catch {
    // ignore
  }
})(window);


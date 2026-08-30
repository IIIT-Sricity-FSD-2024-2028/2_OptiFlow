// js/pages/compliance/audit-log.js
// Audit Log Page — Live audit stream, filters, human-readable entity mapping & CSV export

let state;
let filteredLogs = [];

document.addEventListener("DOMContentLoaded", async function () {
  if (window.Sidebar) window.Sidebar.render("audit");
  state = await window.Helpers.getState();

  // Wire up search + filter controls
  const searchInput = document.getElementById("auditSearch");
  if (searchInput) searchInput.addEventListener("input", renderAuditLog);

  ["filterEventType", "filterProject", "filterPolicy", "filterDate"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", renderAuditLog);
  });

  renderAuditLog();
});

// ── User Name & Initials Resolvers ────────────────────────────────────────────
function userName(userRef) {
  if (!userRef) return "System";
  if (typeof userRef === "object") return userRef.fullName || userRef.name || "System";
  const cleanId = String(userRef);
  const u = (state.users || []).find(
    (u) => String(u.id) === cleanId || String(u.userId) === cleanId,
  );
  return u ? (u.fullName || u.name) : `User (${cleanId.substring(0, 8)})`;
}

function userInitials(userRef) {
  const name = userName(userRef);
  if (name.startsWith("System") || name.startsWith("User (")) return "SY";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
}

function fmtTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return `Today ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  if (diffDays === 1) return `Yesterday ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getEntityName(entityType, entityId) {
  if (!entityId) return entityType || "General";
  const cleanId = String(entityId);

  if (entityType === "Project") {
    const p = (state.projects || []).find(x => String(x.id) === cleanId || String(x.projectId) === cleanId);
    if (p) return p.name;
  } else if (entityType === "Task") {
    const t = (state.tasks || []).find(x => String(x.id) === cleanId || String(x.taskId) === cleanId);
    if (t) return t.title;
  } else if (entityType === "User") {
    const u = (state.users || []).find(x => String(x.id) === cleanId || String(x.userId) === cleanId);
    if (u) return u.fullName || u.name;
  } else if (entityType === "Evidence") {
    const ev = (state.evidence || []).find(x => String(x.id) === cleanId || String(x.evidenceId) === cleanId);
    if (ev) return ev.title;
  }
  return `${entityType || "Item"} (${cleanId.substring(0, 8)})`;
}

function actionToOutcome(action) {
  const map = {
    CREATE:         { badge: "outcome-approved", icon: "icon-success",   svg: '<polyline points="20 6 9 17 4 12"/>' },
    DELETE:         { badge: "outcome-violation", icon: "icon-violation", svg: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' },
    STATUS_CHANGE:  { badge: "outcome-updated",   icon: "icon-update",   svg: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
    UPDATE:         { badge: "outcome-updated",   icon: "icon-update",   svg: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
  };
  return map[action] || { badge: "outcome-pending", icon: "icon-warning", svg: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' };
}

function avatarColor(userRef) {
  const colors = ["avatar-blue", "avatar-red", "avatar-green", "avatar-purple"];
  const str = typeof userRef === "object" ? String(userRef.id || userRef.fullName || "") : String(userRef || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash += str.charCodeAt(i); }
  return colors[hash % colors.length];
}

// ── Render Audit Log ──────────────────────────────────────────────────────────
function renderAuditLog() {
  const tbody = document.getElementById("auditTableBody");
  if (!tbody) return;

  const q     = (document.getElementById("auditSearch")?.value || "").toLowerCase();
  const fType = document.getElementById("filterEventType")?.value || "";
  const fDate = parseInt(document.getElementById("filterDate")?.value || "30", 10);

  const cutoff = new Date(Date.now() - fDate * 86400000);

  let logs = (state.auditLogs || []).map((log) => {
    const outcome = actionToOutcome(log.action);
    const oldV = log.oldValue ? (typeof log.oldValue === 'object' ? JSON.stringify(log.oldValue) : String(log.oldValue)) : "";
    const newV = log.newValue ? (typeof log.newValue === 'object' ? JSON.stringify(log.newValue) : String(log.newValue)) : "";
    const changeText = oldV && newV ? `${oldV} → ${newV}` : "Audit Record";
    const entityName = getEntityName(log.entityType, log.entityId);
    const actorName  = userName(log.performedById || log.performedBy);

    return {
      timestamp:  fmtTimestamp(log.performedAt),
      rawDate:    new Date(log.performedAt || Date.now()),
      title:      `${log.entityType || 'Entity'}: ${entityName}`,
      subtitle:   `${log.action} · ${changeText.substring(0, 50)}${changeText.length > 50 ? '…' : ''}`,
      actor:      actorName,
      initials:   userInitials(log.performedById || log.performedBy),
      color:      avatarColor(log.performedById || log.performedBy),
      policy:     log.usedPermissionSlug || "System",
      project:    log.entityType || "General",
      outcome:    log.action,
      badgeClass: outcome.badge,
      iconClass:  outcome.icon,
      svg:        outcome.svg,
      rawText:    `${log.entityType} ${entityName} ${log.action} ${actorName}`.toLowerCase(),
    };
  });

  const escalations = (state.escalations || []).map((esc) => {
    const actorName = userName(esc.reportedById || esc.reportedBy);
    return {
      timestamp:  fmtTimestamp(esc.createdAt),
      rawDate:    new Date(esc.createdAt || Date.now()),
      title:      `Escalation: ${esc.title || "Compliance Breach"}`,
      subtitle:   (esc.description || "Escalation reported to compliance officer").substring(0, 60),
      actor:      actorName,
      initials:   userInitials(esc.reportedById || esc.reportedBy),
      color:      avatarColor(esc.reportedById || esc.reportedBy),
      policy:     "Escalation",
      project:    `Project ${esc.projectId ? getEntityName("Project", esc.projectId) : "General"}`,
      outcome:    esc.status || "Open",
      badgeClass: esc.status === "Resolved" ? "outcome-approved" : "outcome-violation",
      iconClass:  esc.status === "Resolved" ? "icon-success" : "icon-violation",
      svg:        esc.status === "Resolved" ? '<polyline points="20 6 9 17 4 12"/>' : '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      rawText:    `escalation ${esc.title} ${esc.status} ${actorName}`.toLowerCase(),
    };
  });

  logs = [...logs, ...escalations];

  logs = logs.filter((l) => l.rawDate >= cutoff);

  if (fType) {
    logs = logs.filter((l) => l.outcome.toLowerCase().includes(fType.toLowerCase()));
  }

  if (q) {
    logs = logs.filter((l) => l.rawText.includes(q));
  }

  logs.sort((a, b) => b.rawDate - a.rawDate);
  filteredLogs = logs;

  tbody.innerHTML =
    logs
      .map(
        (log) => `
      <tr>
        <td><span class="audit-timestamp">${log.timestamp}</span></td>
        <td>
          <div class="audit-event-cell">
            <div class="audit-event-icon ${log.iconClass}" aria-label="${log.outcome}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                ${log.svg}
              </svg>
            </div>
            <div class="audit-event-text">
              <div class="audit-event-title">${log.title}</div>
              <div class="audit-event-subtitle">${log.subtitle}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="audit-actor-cell">
            <div class="actor-avatar ${log.color}">${log.initials}</div>
            <span class="actor-name">${log.actor}</span>
          </div>
        </td>
        <td><span class="badge gray">${log.policy}</span></td>
        <td><span class="audit-project">${log.project}</span></td>
        <td><span class="badge ${log.badgeClass}">${log.outcome}</span></td>
      </tr>`,
      )
      .join("") ||
    '<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No audit events found.</td></tr>';
}

// ── Export CSV Handler ────────────────────────────────────────────────────────
window.exportAuditLog = function () {
  if (!filteredLogs || filteredLogs.length === 0) {
    if (window.Toast) window.Toast.show("warning", "No Events", "No audit log events to export.");
    return;
  }

  let csv = "Timestamp,Event,Actor,Permission,Scope,Action\n";
  filteredLogs.forEach(l => {
    const t = `"${l.timestamp.replace(/"/g, '""')}"`;
    const ev = `"${l.title.replace(/"/g, '""')}"`;
    const ac = `"${l.actor.replace(/"/g, '""')}"`;
    const p = `"${l.policy.replace(/"/g, '""')}"`;
    const s = `"${l.project.replace(/"/g, '""')}"`;
    const o = `"${l.outcome.replace(/"/g, '""')}"`;
    csv += `${t},${ev},${ac},${p},${s},${o}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `compliance_audit_log_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  if (window.Toast) window.Toast.show("success", "Export Complete", "Audit log exported to CSV.");
};

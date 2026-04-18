let state;

document.addEventListener("DOMContentLoaded", async function () {
  if (window.Sidebar) window.Sidebar.render("audit");
  state = await window.Helpers.getState();

  // Wire up search + filter controls
  document.getElementById("auditSearch").addEventListener("input", renderAuditLog);
  ["filterEventType", "filterProject", "filterPolicy", "filterDate"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", renderAuditLog);
  });

  renderAuditLog();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function userName(userId) {
  const u = (state.users || []).find(
    (u) => u.userId === userId || u.id === String(userId),
  );
  return u ? u.fullName : "System";
}

function userInitials(userId) {
  const name = userName(userId);
  return name === "System"
    ? "SY"
    : name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
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

function actionToOutcome(action) {
  const map = {
    CREATE:         { badge: "outcome-approved", icon: "icon-success",   svg: '<polyline points="20 6 9 17 4 12"/>' },
    DELETE:         { badge: "outcome-violation", icon: "icon-violation", svg: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' },
    STATUS_CHANGE:  { badge: "outcome-updated",   icon: "icon-update",   svg: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
    UPDATE:         { badge: "outcome-updated",   icon: "icon-update",   svg: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
  };
  return map[action] || { badge: "outcome-pending", icon: "icon-warning", svg: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' };
}

function avatarColor(userId) {
  const colors = ["avatar-blue", "avatar-red", "avatar-green", "avatar-purple"];
  return colors[(userId || 0) % colors.length];
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderAuditLog() {
  const tbody = document.getElementById("auditTableBody");
  if (!tbody) return;

  const q     = (document.getElementById("auditSearch")?.value || "").toLowerCase();
  const fType = document.getElementById("filterEventType")?.value || "";
  const fDate = parseInt(document.getElementById("filterDate")?.value || "30", 10);

  const cutoff = new Date(Date.now() - fDate * 86400000);

  // Build rows from state.auditLogs (the real backend data)
  let logs = (state.auditLogs || []).map((log) => {
    const outcome = actionToOutcome(log.action);
    const oldV = log.oldValue ? JSON.stringify(log.oldValue) : "";
    const newV = log.newValue ? JSON.stringify(log.newValue) : "";
    const changeText = oldV && newV ? `${oldV} → ${newV}` : "—";

    return {
      timestamp:  fmtTimestamp(log.performedAt),
      rawDate:    new Date(log.performedAt || 0),
      title:      `${log.entityType} #${log.entityId} — ${log.action}`,
      subtitle:   changeText.substring(0, 60) + (changeText.length > 60 ? "…" : ""),
      actor:      userName(log.performedBy),
      initials:   userInitials(log.performedBy),
      color:      avatarColor(log.performedBy),
      policy:     "System",
      project:    `${log.entityType}`,
      outcome:    log.action,
      badgeClass: outcome.badge,
      iconClass:  outcome.icon,
      svg:        outcome.svg,
      rawText:    `${log.entityType} ${log.entityId} ${log.action} ${userName(log.performedBy)}`.toLowerCase(),
    };
  });

  // Filter by date range
  logs = logs.filter((l) => l.rawDate >= cutoff);

  // Filter by event type (maps to action)
  if (fType) {
    logs = logs.filter((l) => l.outcome.toLowerCase().includes(fType));
  }

  // Full-text search
  if (q) {
    logs = logs.filter((l) => l.rawText.includes(q));
  }

  // Sort newest-first
  logs.sort((a, b) => b.rawDate - a.rawDate);

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
        <td><span class="badge iso">${log.policy}</span></td>
        <td><span class="audit-project">${log.project}</span></td>
        <td><span class="badge ${log.badgeClass}">${log.outcome}</span></td>
      </tr>`,
      )
      .join("") ||
    '<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No audit events found.</td></tr>';
}

// ── Export button ─────────────────────────────────────────────────────────────
document.getElementById("btn-export")?.addEventListener("click", () => {
  if (window.Toast) window.Toast.show("Exporting Audit Log as CSV…", "info");
});

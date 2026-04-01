let state;

document.addEventListener("DOMContentLoaded", function () {
  if (window.Sidebar) window.Sidebar.render("audit");
  state = window.Helpers.getState();

  // Search logic
  document
    .getElementById("auditSearch")
    .addEventListener("input", renderAuditLog);
  ["filterEventType", "filterProject", "filterPolicy", "filterDate"].forEach(
    (id) => {
      document.getElementById(id).addEventListener("change", renderAuditLog);
    },
  );

  renderAuditLog();
});

function renderAuditLog() {
  const tbody = document.getElementById("auditTableBody");
  if (!tbody) return;

  const q = document.getElementById("auditSearch").value.toLowerCase();

  let logs = [];

  // 1. Gather all Evidence events
  (state.evidence || []).forEach((e) => {
    logs.push({
      time: e.submittedOn,
      title: `Evidence ${e.statusLabel || e.status}`,
      subtitle: `Task: ${e.taskName || "General"}`,
      actor: "System",
      avatar: "SA",
      color: "avatar-blue",
      policy: e.type || "General",
      project: "Workspace",
      outcome: e.status,
      rawText: `${e.title} ${e.status}`.toLowerCase(),
    });
  });

  // 2. Gather all Violation events
  (state.complianceViolations || []).forEach((v) => {
    logs.push({
      time: "Recent", // In a real app, violations would have a timestamp
      title: `Violation Flagged`,
      subtitle: v.title,
      actor: "PM Action",
      avatar: "PM",
      color: "avatar-red",
      policy: "System Rule",
      project: v.projectName || "General",
      outcome: v.status,
      rawText: `${v.title} ${v.status}`.toLowerCase(),
    });
  });

  // 3. Filter the logs based on search
  const filteredLogs = logs.filter((log) => !q || log.rawText.includes(q));

  // 4. Render to HTML
  tbody.innerHTML =
    filteredLogs
      .map((log) => {
        // Determine badges and icons based on outcome
        let badgeClass = "outcome-pending";
        let iconClass = "icon-warning";
        let svg = `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`;

        if (log.outcome === "approved" || log.outcome === "Resolved") {
          badgeClass = "outcome-approved";
          iconClass = "icon-success";
          svg = `<polyline points="20 6 9 17 4 12"/>`;
        } else if (log.outcome === "rejected" || log.outcome === "Open") {
          badgeClass = "outcome-violation";
          iconClass = "icon-violation";
          svg = `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`;
        }

        return `
      <tr>
        <td><span class="audit-timestamp">${log.time}</span></td>
        <td>
          <div class="audit-event-cell">
            <div class="audit-event-icon ${iconClass}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">${svg}</svg></div>
            <div class="audit-event-text">
              <div class="audit-event-title">${log.title}</div>
              <div class="audit-event-subtitle">${log.subtitle}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="audit-actor-cell">
            <div class="actor-avatar ${log.color}">${log.avatar}</div>
            <span class="actor-name">${log.actor}</span>
          </div>
        </td>
        <td><span class="badge hrpol">${log.policy}</span></td>
        <td><span class="audit-project">${log.project}</span></td>
        <td><span class="badge ${badgeClass}">${log.outcome.toUpperCase()}</span></td>
      </tr>`;
      })
      .join("") ||
    '<tr><td colspan="6" style="text-align:center; padding: 20px;">No audit events found.</td></tr>';
}

document.getElementById("btn-export").addEventListener("click", () => {
  window.Toast.show("Exporting Audit Log as CSV...", "info");
});

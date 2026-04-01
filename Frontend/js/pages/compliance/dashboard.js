document.addEventListener("DOMContentLoaded", function () {
  if (window.Sidebar) window.Sidebar.render("dashboard");

  const statusBanner = document.getElementById("dashboard-status");

  function showDashboardStatus(message) {
    if (!statusBanner) return;
    statusBanner.textContent = message;
    statusBanner.hidden = false;
  }

  function hideDashboardStatus() {
    if (!statusBanner) return;
    statusBanner.hidden = true;
    statusBanner.textContent = "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getAuditVisuals(entry) {
    const outcome = String(
      entry.outcome || entry.status || entry.action || "",
    ).toLowerCase();

    if (
      outcome.includes("approved") ||
      outcome.includes("verified") ||
      outcome.includes("resolved")
    ) {
      return {
        iconClass: "icon-verified",
        ariaLabel: "Verified",
        svg: '<polyline points="20 6 9 17 4 12" />',
      };
    }

    if (
      outcome.includes("rejected") ||
      outcome.includes("violation") ||
      outcome.includes("open")
    ) {
      return {
        iconClass: "icon-rejected",
        ariaLabel: "Rejected",
        svg: '<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />',
      };
    }

    return {
      iconClass: "icon-updated",
      ariaLabel: "Updated",
      svg: '<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />',
    };
  }

  function normalizeAuditLog(entry) {
    if (!entry || typeof entry !== "object") return null;

    const title =
      entry.title ||
      entry.action?.replace(/_/g, " ") ||
      entry.entity ||
      "Audit activity updated";
    const subtitleParts = [entry.subtitle, entry.entity, entry.note].filter(
      Boolean,
    );
    const meta =
      [entry.timestamp, entry.time, entry.actor].filter(Boolean).join(" · ") ||
      "Recent activity";

    return {
      title,
      subtitle:
        subtitleParts.join(" · ") ||
        "Recent audit activity recorded for the compliance workspace.",
      meta,
      ...getAuditVisuals(entry),
    };
  }

  function renderAuditActivity(auditLog) {
    const auditList = document.getElementById("audit-list");
    const emptyState = document.getElementById("audit-empty-state");
    if (!auditList || !emptyState) return;

    const items = (Array.isArray(auditLog) ? auditLog : [])
      .map(normalizeAuditLog)
      .filter(Boolean)
      .slice()
      .reverse()
      .slice(0, 4);

    if (items.length === 0) {
      auditList.innerHTML = "";
      auditList.hidden = true;
      emptyState.hidden = false;
      return;
    }

    auditList.hidden = false;
    emptyState.hidden = true;
    auditList.innerHTML = items
      .map(
        (item, index) => `
        <li class="audit-item" id="audit-item-${index}">
          <div class="audit-icon ${item.iconClass}" aria-label="${escapeHtml(item.ariaLabel)}">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              ${item.svg}
            </svg>
          </div>
          <div class="audit-info">
            <div class="audit-title">${escapeHtml(item.title)}</div>
            <div class="audit-meta">${escapeHtml(`${item.meta} · ${item.subtitle}`)}</div>
          </div>
        </li>
      `,
      )
      .join("");
  }

  let state;
  try {
    state = window.Helpers.getState();
    hideDashboardStatus();
  } catch (_error) {
    showDashboardStatus(
      "Dashboard data could not be loaded. Refresh and try again.",
    );
    renderAuditActivity([]);
    return;
  }

  const allEvidence = state.evidence || [];
  const allViolations = state.complianceViolations || [];
  const allRules = state.complianceRules || [];
  const auditLog = state.auditLog || [];

  const pendingEvidence = allEvidence.filter(
    (e) => e.status === "pending" || e.status === "under_review",
  );
  const openViolations = allViolations.filter(
    (v) => v.status === "Open" || v.status === "Under_Review",
  );

  // 1. Update Top Metrics
  const evCard = document.getElementById("card-pending-evidence");
  if (evCard) {
    evCard.querySelector(".metric-value").textContent = pendingEvidence.length;
    evCard.addEventListener(
      "click",
      () => (window.location.href = "compliance_evidence.html"),
    );
    evCard.style.cursor = "pointer";
  }

  const violCard = document.getElementById("card-open-violations");
  if (violCard) {
    violCard.querySelector(".metric-value").textContent = openViolations.length;
    violCard.addEventListener(
      "click",
      () => (window.location.href = "compliance_violations.html"),
    );
    violCard.style.cursor = "pointer";
  }

  const rulesCard = document.getElementById("card-rules-active");
  if (rulesCard) {
    rulesCard.querySelector(".metric-value").textContent = allRules.length || 3;
    rulesCard.addEventListener(
      "click",
      () => (window.location.href = "compliance_rules.html"),
    );
    rulesCard.style.cursor = "pointer";
  }

  // 2. Populate Pending Evidence (Preserving your exact HTML layout)
  const evList = document.querySelector("#panel-evidence .evidence-list");
  if (evList) {
    evList.innerHTML =
      pendingEvidence
        .slice(0, 3)
        .map(
          (e) => `
        <li class="evidence-item" style="cursor:pointer" onclick="window.location.href='compliance_evidence.html'">
          <svg class="evidence-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <div class="evidence-info">
            <div class="evidence-title">${e.title}</div>
            <div class="evidence-meta">Task: ${e.taskName || "General"} · ${e.submittedOn}</div>
          </div>
          <span class="badge pending">Pending</span>
        </li>
      `,
        )
        .join("") ||
      '<li style="padding:24px; text-align:center; color:var(--text-muted)">Queue is clear!</li>';
  }

  // 3. Populate Open Violations (Preserving your exact HTML layout)
  const vList = document.querySelector("#panel-violations .violations-list");
  if (vList) {
    vList.innerHTML =
      openViolations
        .slice(0, 3)
        .map(
          (v) => `
        <li class="violation-item" style="cursor:pointer" onclick="window.location.href='compliance_violations.html'">
          <span class="violation-dot dot-critical"></span>
          <div class="violation-info">
            <div class="violation-title">${v.title}</div>
            <div class="violation-meta">${v.projectName || "System"} · Action Required</div>
          </div>
          <span class="badge critical">Open</span>
        </li>
      `,
        )
        .join("") ||
      '<li style="padding:24px; text-align:center; color:var(--text-muted)">No open violations!</li>';
  }

  renderAuditActivity(auditLog);
});

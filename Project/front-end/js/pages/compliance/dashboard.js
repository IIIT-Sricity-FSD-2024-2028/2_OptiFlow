document.addEventListener("DOMContentLoaded", async function () {
  if (window.Sidebar) window.Sidebar.render("dashboard");

  const state = await window.Helpers.getState();
  const allEvidence = state.evidence || [];
  const allViolations = state.complianceViolations || [];
  const allRules = state.complianceRules || [];
  const allUsers = state.users || [];

  // Pending = evidence not yet approved/rejected
  const pendingEvidence = allEvidence.filter(
    (e) => e.status === "Pending" || e.status === "Under_Review",
  );
  const openViolations = allViolations.filter(
    (v) => v.status === "Open" || v.status === "Under_Review",
  );
  const activeRules = allRules.filter((r) => r.isActive !== false);

  // Helper: resolve a user_id → display name
  function userName(userId) {
    const u = allUsers.find((u) => u.userId === userId || u.id === String(userId));
    return u ? u.fullName : "System";
  }

  // Helper: format ISO timestamp to readable string
  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  // ── 1. Metric cards ────────────────────────────────────────────────────────
  const evCard = document.getElementById("card-pending-evidence");
  if (evCard) {
    evCard.querySelector(".metric-value").textContent = pendingEvidence.length;
    evCard.addEventListener("click", () => (window.location.href = "compliance_evidence.html"));
    evCard.style.cursor = "pointer";
  }

  const violCard = document.getElementById("card-open-violations");
  if (violCard) {
    violCard.querySelector(".metric-value").textContent = openViolations.length;
    violCard.addEventListener("click", () => (window.location.href = "compliance_violations.html"));
    violCard.style.cursor = "pointer";
  }

  const rulesCard = document.getElementById("card-rules-active");
  if (rulesCard) {
    rulesCard.querySelector(".metric-value").textContent = activeRules.length;
    rulesCard.addEventListener("click", () => (window.location.href = "compliance_rules.html"));
    rulesCard.style.cursor = "pointer";
  }

  // Compliance score: resolved / total * 100, capped at 100
  const totalV = allViolations.length;
  const resolvedV = allViolations.filter((v) => v.status === "Resolved").length;
  const score = totalV === 0 ? 100 : Math.round((resolvedV / totalV) * 100);
  const scoreCard = document.getElementById("card-compliance-score");
  if (scoreCard) {
    const numEl = scoreCard.querySelector(".gauge-number");
    const subEl = scoreCard.querySelector(".score-sub");
    const valEl = scoreCard.querySelector(".score-value");
    if (numEl) numEl.textContent = score;
    if (valEl) valEl.textContent = score >= 80 ? "Good" : score >= 50 ? "Fair" : "At Risk";
    if (subEl) subEl.textContent = `${openViolations.length} open violation${openViolations.length !== 1 ? "s" : ""} dragging score`;
  }

  // ── 2. Pending Evidence panel ──────────────────────────────────────────────
  const evList = document.querySelector("#panel-evidence .evidence-list");
  if (evList) {
    evList.innerHTML =
      pendingEvidence
        .slice(0, 3)
        .map(
          (e) => `
          <li class="evidence-item" style="cursor:pointer" onclick="window.location.href='compliance_evidence.html'">
            <svg class="evidence-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <div class="evidence-info">
              <div class="evidence-title">${e.title}</div>
              <div class="evidence-meta">${e.evidenceType || "Document"} · ${userName(e.userId)} · ${fmtDate(e.submittedAt)}</div>
            </div>
            <span class="badge ${e.status === "Under_Review" ? "due-soon" : "pending"}">${e.status === "Under_Review" ? "Under Review" : "Pending"}</span>
          </li>`,
        )
        .join("") ||
      '<li style="padding:24px; text-align:center; color:var(--text-muted)">Evidence queue is clear!</li>';
  }

  // ── 3. Open Violations panel ───────────────────────────────────────────────
  const vList = document.querySelector("#panel-violations .violations-list");
  if (vList) {
    const severityDot = (s) => s === "Critical" ? "dot-critical" : "dot-warning";
    const badgeCls = (s) => s === "Critical" ? "critical" : "warning";

    vList.innerHTML =
      openViolations
        .slice(0, 3)
        .map(
          (v) => {
            // Find matching rule for severity
            const rule = allRules.find((r) => r.ruleId === v.ruleId) || {};
            const severity = rule.severity || "Medium";
            return `
            <li class="violation-item" style="cursor:pointer" onclick="window.location.href='compliance_violations.html'">
              <span class="violation-dot ${severityDot(severity)}" aria-label="${severity}"></span>
              <div class="violation-info">
                <div class="violation-title">${rule.ruleName || "Compliance Violation"} — ${v.entityType} #${v.entityId}</div>
                <div class="violation-meta">Detected ${fmtDate(v.detectedAt)} · Due ${v.dueDate || "N/A"}</div>
              </div>
              <span class="badge ${badgeCls(severity)}">${severity}</span>
            </li>`;
          },
        )
        .join("") ||
      '<li style="padding:24px; text-align:center; color:var(--text-muted)">No open violations!</li>';

    // "No further" note
    const noMore = document.querySelector(".no-more-violations");
    if (noMore) noMore.textContent = openViolations.length > 3 ? `+${openViolations.length - 3} more violations` : "No further open violations";
  }

  // ── 4. Recent Audit Activity panel ────────────────────────────────────────
  const auditList = document.querySelector("#panel-audit .audit-list");
  if (auditList) {
    const recentLogs = (state.auditLogs || []).slice(-4).reverse();

    const actionIcon = (action) => {
      if (action === "CREATE")
        return `<div class="audit-icon icon-verified"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`;
      if (action === "DELETE" || action === "STATUS_CHANGE")
        return `<div class="audit-icon icon-rejected"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>`;
      return `<div class="audit-icon icon-updated"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>`;
    };

    auditList.innerHTML =
      recentLogs
        .map(
          (log) => `
          <li class="audit-item">
            ${actionIcon(log.action)}
            <div class="audit-info">
              <div class="audit-title">${log.entityType} #${log.entityId} — ${log.action}</div>
              <div class="audit-meta">${fmtDate(log.performedAt)} · ${userName(log.performedBy)}</div>
            </div>
          </li>`,
        )
        .join("") ||
      '<li style="padding:16px; text-align:center; color:var(--text-muted)">No recent audit activity.</li>';
  }
});

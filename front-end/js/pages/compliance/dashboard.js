// js/pages/compliance/dashboard.js
// Compliance Officer Dashboard — fully dynamic, zero hardcoded values.

document.addEventListener("DOMContentLoaded", async function () {
  if (window.Sidebar) window.Sidebar.render("dashboard");

  await renderCompliance();
});

async function renderCompliance() {
  const state = await window.Helpers.getState();

  const allEvidence   = state.evidence             || [];
  const allViolations = state.complianceViolations  || [];
  const allRules      = state.complianceRules       || [];
  const allUsers      = state.users                 || [];

  // ── Derived counts ──────────────────────────────────────────────────────────
  const pendingEvidence = allEvidence.filter(
    (e) => e.status === "Pending" || e.status === "Under_Review"
  );
  const openViolations = allViolations.filter(
    (v) => v.status === "Open" || v.status === "Under_Review"
  );
  const activeRules = allRules.filter((r) => r.isActive !== false);

  // ── Local helpers ────────────────────────────────────────────────────────────
  function userName(userId) {
    const u = allUsers.find((u) => u.userId === userId || u.id === String(userId));
    return u ? (u.fullName || u.name || "Unknown") : "Unknown";
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  // ── 1. Compliance Score gauge ────────────────────────────────────────────────
  const totalV    = allViolations.length;
  const resolvedV = allViolations.filter((v) => v.status === "Resolved").length;
  const score     = totalV === 0 ? 100 : Math.round((resolvedV / totalV) * 100);

  const scoreEl = document.getElementById("comp-score");
  const labelEl = document.getElementById("comp-score-label");
  const subEl   = document.getElementById("comp-score-sub");
  const arcEl   = document.getElementById("gauge-fill-arc");

  if (scoreEl)  scoreEl.textContent  = score;
  if (labelEl)  labelEl.textContent  = score >= 80 ? "Good" : score >= 50 ? "Fair" : "At Risk";
  if (subEl)    subEl.textContent    = `${openViolations.length} open violation${openViolations.length !== 1 ? "s" : ""} dragging score`;
  if (arcEl) {
    // circumference = 2π × 33 ≈ 207.3; offset = circumference × (1 − score/100)
    const circ  = 2 * Math.PI * 33;
    const offset = circ * (1 - score / 100);
    arcEl.style.strokeDasharray  = circ.toFixed(1);
    arcEl.style.strokeDashoffset = offset.toFixed(1);
    arcEl.style.stroke = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  }

  // ── 2. Metric card numbers ───────────────────────────────────────────────────
  const pendingCountEl    = document.getElementById("pending-ev-count");
  const violCountEl       = document.getElementById("open-violations-count");
  const rulesCountEl      = document.getElementById("active-rules-count");

  if (pendingCountEl) pendingCountEl.textContent = pendingEvidence.length;
  if (violCountEl)    violCountEl.textContent    = openViolations.length;
  if (rulesCountEl)   rulesCountEl.textContent   = activeRules.length;

  // ── 3. Pending Evidence panel ────────────────────────────────────────────────
  const evList = document.getElementById("dash-evidence-list");
  if (evList) {
    evList.innerHTML = pendingEvidence.slice(0, 4).map((e) => `
      <li class="evidence-item" style="cursor:pointer" onclick="window.location.href='compliance_evidence.html'">
        <svg class="evidence-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <div class="evidence-info">
          <div class="evidence-title">${e.title || "Untitled Evidence"}</div>
          <div class="evidence-meta">${e.evidenceType || "Document"} · ${userName(e.userId)} · ${fmtDate(e.submittedAt)}</div>
        </div>
        <span class="badge ${e.status === "Under_Review" ? "due-soon" : "pending"}">
          ${e.status === "Under_Review" ? "Under Review" : "Pending"}
        </span>
      </li>`).join("") ||
      '<li style="padding:24px; text-align:center; color:var(--text-muted)">Evidence queue is clear! ✓</li>';
  }

  // ── 4. Open Violations panel ─────────────────────────────────────────────────
  const vList   = document.getElementById("dash-violations-list");
  const vFooter = document.getElementById("dash-violations-footer");

  if (vList) {
    vList.innerHTML = openViolations.slice(0, 3).map((v) => {
      const rule     = allRules.find((r) => r.ruleId === v.ruleId) || {};
      const severity = rule.severity || "Medium";
      const dotCls   = severity === "Critical" ? "dot-critical" : "dot-warning";
      const badgeCls = severity === "Critical" ? "critical"     : "warning";
      const title    = rule.ruleName
        ? `${rule.ruleName} — ${v.entityType || "Entity"} #${v.entityId || ""}`
        : `Violation #${v.violationId}`;

      return `
        <li class="violation-item" style="cursor:pointer" onclick="window.location.href='compliance_violations.html'">
          <span class="violation-dot ${dotCls}" aria-label="${severity}"></span>
          <div class="violation-info">
            <div class="violation-title">${title}</div>
            <div class="violation-meta">Detected ${fmtDate(v.detectedAt)} · Due ${v.dueDate ? new Date(v.dueDate).toLocaleDateString("en-IN", { day:"numeric", month:"short" }) : "N/A"}</div>
          </div>
          <span class="badge ${badgeCls}">${severity}</span>
        </li>`;
    }).join("") ||
    '<li style="padding:24px; text-align:center; color:var(--text-muted)">No open violations! ✓</li>';

    if (vFooter) {
      vFooter.textContent = openViolations.length > 3
        ? `+${openViolations.length - 3} more violations — view all`
        : "No further open violations";
    }
  }

  // ── 5. Recent Audit Activity panel ──────────────────────────────────────────
  const auditList = document.getElementById("dash-audit-list");
  if (auditList) {
    const recentLogs = (state.auditLogs || []).slice(-5).reverse();

    const actionIcon = (action) => {
      if (action === "CREATE")
        return `<div class="audit-icon icon-verified"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`;
      if (action === "DELETE" || action === "STATUS_CHANGE")
        return `<div class="audit-icon icon-rejected"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>`;
      return `<div class="audit-icon icon-updated"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>`;
    };

    auditList.innerHTML = recentLogs.map((log) => `
      <li class="audit-item">
        ${actionIcon(log.action)}
        <div class="audit-info">
          <div class="audit-title">${log.entityType} #${log.entityId} — ${log.action}</div>
          <div class="audit-meta">${fmtDate(log.performedAt)} · ${userName(log.performedBy)}</div>
        </div>
      </li>`).join("") ||
      '<li style="padding:16px; text-align:center; color:var(--text-muted)">No recent audit activity.</li>';
  }
}

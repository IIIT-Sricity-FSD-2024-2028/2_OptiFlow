// js/pages/compliance/dashboard.js
// Compliance Officer Dashboard — fully dynamic, zero hardcoded values, accurate compliance score.

let _eventsBound = false;

document.addEventListener("DOMContentLoaded", async function () {
  const sessionRaw = sessionStorage.getItem("currentUser");
  if (sessionRaw) {
    try {
      const s = JSON.parse(sessionRaw);
      const role = String(s.role || '').toLowerCase();
      const label = String(s.roleLabel || '').toLowerCase();
      if (role === 'company_owner' || label.includes('owner') || label.includes('ceo')) {
        window.location.href = "../admin/executive/executive_compliance.html";
        return;
      }
    } catch { /* continue */ }
  }

  if (window.Sidebar) window.Sidebar.render("dashboard");

  // Force hide any lingering modal backdrops
  document.querySelectorAll(".modal-overlay, .modal-backdrop").forEach((m) => {
    m.classList.remove("active");
    m.classList.add("hidden");
    m.style.display = "none";
  });

  await renderCompliance();

  if (!_eventsBound) {
    _eventsBound = true;
    document.getElementById("btn-refresh-dashboard")?.addEventListener("click", () => renderCompliance(true));
  }
});

async function renderCompliance(forceRefresh = false) {
  const state = await window.Helpers.getState(forceRefresh);

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
    if (!userId) return "System";
    if (typeof userId === "object") return userId.fullName || userId.name || "System";
    const cleanId = String(userId);
    const u = allUsers.find((u) => String(u.userId) === cleanId || String(u.id) === cleanId);
    return u ? (u.fullName || u.name) : `User (${cleanId.substring(0, 8)})`;
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  // ── 1. Comprehensive Compliance Health Score Gauge ───────────────────────────
  // Evaluates:
  //   • Active Enforced Rules (40% weight)
  //   • Violation Remediation & Mitigation Rate (40% weight)
  //   • Evidence Attestation & Verification Rate (20% weight)

  const totalRules = allRules.length || 1;
  const activeRulesCount = activeRules.length;
  const ruleWeight = (activeRulesCount / totalRules) * 40;

  const totalViolations = allViolations.length;
  const openViolationsCount = openViolations.length;
  const violationWeight = totalViolations === 0 ? 40 : Math.max(0, 40 - (openViolationsCount / totalViolations) * 40);

  const totalEvidence = allEvidence.length;
  const approvedEvidence = allEvidence.filter((e) => e.status === "Approved").length;
  const evidenceWeight = totalEvidence === 0 ? 20 : (approvedEvidence / totalEvidence) * 20;

  const score = Math.min(100, Math.round(ruleWeight + violationWeight + evidenceWeight));

  const scoreEl = document.getElementById("comp-score");
  const labelEl = document.getElementById("comp-score-label");
  const subEl   = document.getElementById("comp-score-sub");
  const arcEl   = document.getElementById("gauge-fill-arc");

  if (scoreEl) scoreEl.textContent = score;
  if (labelEl) labelEl.textContent = score >= 80 ? "Good" : score >= 65 ? "Fair" : "At Risk";
  if (subEl)   subEl.textContent   = openViolationsCount > 0
    ? `${openViolationsCount} open violation${openViolationsCount !== 1 ? "s" : ""} requiring resolution`
    : "All compliance policies & verifications clear";

  if (arcEl) {
    // Gauge SVG circumference = 2 * Math.PI * 33 ≈ 207.34
    const circ = 2 * Math.PI * 33;
    const offset = circ * (1 - score / 100);
    arcEl.style.strokeDasharray  = circ.toFixed(1);
    arcEl.style.strokeDashoffset = offset.toFixed(1);
    arcEl.style.stroke = score >= 80 ? "#10b981" : score >= 65 ? "#f59e0b" : "#ef4444";
  }

  // ── 2. Metric card numbers ───────────────────────────────────────────────────
  const pendingCountEl = document.getElementById("pending-ev-count");
  const violCountEl    = document.getElementById("open-violations-count");
  const rulesCountEl   = document.getElementById("active-rules-count");

  if (pendingCountEl) pendingCountEl.textContent = pendingEvidence.length;
  if (violCountEl)    violCountEl.textContent    = openViolationsCount;
  if (rulesCountEl)   rulesCountEl.textContent   = activeRules.length;

  // ── 3. Pending Evidence panel ────────────────────────────────────────────────
  const evList = document.getElementById("dash-evidence-list");
  if (evList) {
    evList.innerHTML = pendingEvidence.slice(0, 4).map((e) => `
      <li class="evidence-item" style="cursor:pointer" onclick="window.location.href='../admin/compliance/compliance_evidence.html'">
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
      const rule     = allRules.find((r) => String(r.id || r.ruleId) === String(v.ruleId)) || {};
      const severity = v.severity || rule.severity || "Medium";
      const dotCls   = severity === "Critical" ? "dot-critical" : "dot-warning";
      const badgeCls = severity === "Critical" ? "critical"     : "warning";
      const ruleName = rule.name || rule.ruleName || "Compliance Rule";
      const title    = `${ruleName} — ${v.entityType || "Entity"} #${String(v.entityId || '').substring(0, 8)}`;

      return `
        <li class="violation-item" style="cursor:pointer" onclick="window.location.href='../admin/compliance/compliance_violations.html'">
          <span class="violation-dot ${dotCls}" aria-label="${severity}"></span>
          <div class="violation-info">
            <div class="violation-title">${title}</div>
            <div class="violation-meta">Detected ${fmtDate(v.detectedAt)} · Status: ${v.status}</div>
          </div>
          <span class="badge ${badgeCls}">${severity}</span>
        </li>`;
    }).join("") ||
    '<li style="padding:24px; text-align:center; color:var(--text-muted)">No open violations! ✓</li>';

    if (vFooter) {
      vFooter.textContent = openViolationsCount > 3
        ? `+${openViolationsCount - 3} more violations — view all`
        : "No further open violations";
    }
  }
}

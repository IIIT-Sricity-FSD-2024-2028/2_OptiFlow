document.addEventListener("DOMContentLoaded", function () {
  if (window.Sidebar) window.Sidebar.render("dashboard");

  const state = window.Helpers.getState();
  const allEvidence = state.evidence || [];
  const allViolations = state.complianceViolations || [];
  const allRules = state.complianceRules || [];

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
});

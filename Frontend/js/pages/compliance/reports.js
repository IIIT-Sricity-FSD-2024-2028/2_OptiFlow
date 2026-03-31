let state;

document.addEventListener("DOMContentLoaded", function () {
  // 1. Initialize Sidebar
  if (window.Sidebar) {
    window.Sidebar.render("reports");
  }

  // 2. Load the live database state
  state = window.Helpers ? window.Helpers.getState() : {};
  if (!state.complianceReports || state.complianceReports.length === 0) {
    state.complianceReports = [
      {
        id: "rep1",
        title: "Compliance Summary — Q4 2024",
        meta: "All Projects · All Policies · Generated Dec 15 · PDF · 2.1 MB",
        iconClass: "rtic-blue",
        tags: [
          { cls: "filetype", txt: "PDF" },
          { cls: "gray", txt: "All Projects" },
        ],
      },
      {
        id: "rep2",
        title: "Violations Report — Finance Q4",
        meta: "Finance Q4 · SOX · Generated Dec 16 · PDF · 890 KB",
        iconClass: "rtic-red",
        tags: [
          { cls: "filetype", txt: "PDF" },
          { cls: "sox", txt: "SOX" },
        ],
      },
      {
        id: "rep3",
        title: "Audit Trail — Project Atlas",
        meta: "Project Atlas · GDPR · Generated Dec 12 · Excel · 1.4 MB",
        iconClass: "rtic-green",
        tags: [
          { cls: "filetype", txt: "XLSX" },
          { cls: "gdpr", txt: "GDPR" },
        ],
      },
      {
        id: "rep4",
        title: "Evidence Log — IT Security Audit",
        meta: "IT Security · ISO 27001 · Generated Dec 10 · PDF · 3.2 MB",
        iconClass: "rtic-yellow",
        tags: [
          { cls: "filetype", txt: "PDF" },
          { cls: "iso", txt: "ISO 27001" },
        ],
      },
    ];
    if (window.Helpers) window.Helpers.saveState(state);
  }

  // Render the initial list
  window.renderReports();
});

// --- RENDER FUNCTION ---
window.renderReports = function () {
  const list = document.getElementById("recentReportsList");
  if (!list) return;

  list.innerHTML = state.complianceReports
    .map(
      (rep) => `
    <article class="report-card" role="listitem">
      <div class="report-card-icon ${rep.iconClass}" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      </div>
      <div class="report-card-body">
        <div class="report-card-title">${rep.title}</div>
        <div class="report-card-meta">${rep.meta}</div>
        <div class="report-card-tags">
          ${rep.tags.map((t) => `<span class="badge ${t.cls}">${t.txt}</span>`).join("")}
        </div>
      </div>
      <button class="btn-download" onclick="window.downloadReport('${rep.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Download
      </button>
    </article>
  `,
    )
    .join("");
};

// --- GLOBALLY SCOPED FUNCTIONS FOR HTML ONCLICK ---

window.selectReportType = function (card) {
  document.querySelectorAll(".report-type-card").forEach((c) => {
    c.classList.remove("selected");
    c.setAttribute("aria-checked", "false");
  });
  card.classList.add("selected");
  card.setAttribute("aria-checked", "true");
};

window.generateReport = function () {
  const btn = document.getElementById("btn-generate");
  if (!btn) return;

  const originalText = btn.innerText;

  // 1. Visual feedback
  btn.innerText = "Generating...";
  btn.style.opacity = "0.7";
  btn.disabled = true;
  btn.style.cursor = "wait";

  if (window.Toast) window.Toast.show("Compiling report data...", "info");

  // 2. Simulate delay, then create the real data
  setTimeout(() => {
    // Restore button state
    btn.innerText = originalText;
    btn.style.opacity = "1";
    btn.disabled = false;
    btn.style.cursor = "pointer";

    // Grab the values the user selected in the UI
    const typeCard = document.querySelector(".report-type-card.selected");
    const typeName = typeCard
      ? typeCard.querySelector(".report-type-name").innerText
      : "Custom Report";

    const projectSelect = document.getElementById("rgProject");
    const project = projectSelect
      ? projectSelect.options[projectSelect.selectedIndex].text
      : "All Projects";

    const policySelect = document.getElementById("rgPolicy");
    const policy = policySelect
      ? policySelect.options[policySelect.selectedIndex].text
      : "All Policies";

    const formatSelect = document.getElementById("rgFormat");
    const format = formatSelect
      ? formatSelect.options[formatSelect.selectedIndex].text
      : "PDF";

    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    // 3. Build the new report object
    const newReport = {
      id: "rep_" + Date.now(),
      title: `${typeName} — ${project}`,
      meta: `${project} · ${policy} · Generated ${today} · ${format} · 1.2 MB`,
      iconClass: "rtic-blue",
      tags: [
        { cls: "filetype", txt: format },
        { cls: "gray", txt: policy },
      ],
    };

    // 4. Save to database and render!
    state.complianceReports.unshift(newReport); // Adds to the TOP of the list
    if (window.Helpers) window.Helpers.saveState(state);
    window.renderReports();

    if (window.Toast)
      window.Toast.show(
        "Report generated successfully! Added to Recent Reports.",
        "success",
      );
  }, 1500);
};

// --- THE REAL DOWNLOAD FUNCTION ---
window.downloadReport = function (id) {
  // 1. Show the Success UI Modal
  const modal = document.getElementById("downloadSuccessModal");
  if (modal) {
    modal.classList.add("active");
  } else if (window.Toast) {
    window.Toast.show(
      "Download Started! Check your browser downloads.",
      "success",
    );
  }

  // 2. Format a safe file name based on the report title
  let reportName = "Compliance_Report_" + id;
  if (state && state.complianceReports) {
    const rep = state.complianceReports.find((r) => r.id === id);
    if (rep) {
      // Removes spaces and special characters for a clean file name
      reportName = rep.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    }
  }

  // 3. ACTUALLY TRIGGER A REAL BROWSER DOWNLOAD
  // This creates a text file dynamically and forces your browser to download it
  const fileContent =
    "This is a simulated downloaded report for: \n" +
    reportName +
    "\n\nGenerated securely by OfficeSync.";
  const blob = new Blob([fileContent], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);

  const downloadAnchor = document.createElement("a");
  downloadAnchor.href = url;
  downloadAnchor.download = reportName + ".txt";
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click(); // Triggers the real download

  // Cleanup
  document.body.removeChild(downloadAnchor);
  window.URL.revokeObjectURL(url);
};

window.closeDownloadModal = function () {
  const modal = document.getElementById("downloadSuccessModal");
  if (modal) modal.classList.remove("active");
};

// Close modal if user presses ESC key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    window.closeDownloadModal();
  }
});

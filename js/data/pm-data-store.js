// js/data/pm-data-store.js

const PM_DB_VERSION = 6; // 🚀 Bumped to 6 to establish full Compliance Integration

function initializePMDatabase() {
  const currentVersion = localStorage.getItem("pm_db_version");
  const parsedVersion = parseInt(currentVersion, 10);
  const needsUpdate = isNaN(parsedVersion) || parsedVersion < PM_DB_VERSION;

  if (!localStorage.getItem("pm_projects") || needsUpdate) {
    // --- 1. PROJECTS ---
    const projects = [
      {
        id: 1,
        name: "Project Atlas",
        description: "Global Data audit and verification.",
        departmentId: 1,
        status: "Active",
        statusLabel: "Active",
        endDate: "2026-05-15",
        progress: 62,
        totalTasks: 8,
        inProgress: 3,
        completed: 4,
        overdue: 1,
        createdBy: "u2",
      },
      {
        id: 2,
        name: "Financial Q1 Reporting",
        description: "Quarterly financial report and SOX compliance.",
        departmentId: 1,
        status: "On_Hold",
        statusLabel: "At Risk",
        endDate: "2026-03-15",
        progress: 40,
        totalTasks: 6,
        inProgress: 2,
        completed: 2,
        overdue: 2,
        createdBy: "u2",
      },
      {
        id: 3,
        name: "IT SECURITY Audit",
        description: "Annual IT infrastructure security audit.",
        departmentId: 2,
        status: "Active",
        statusLabel: "On Track",
        endDate: "2026-06-05",
        progress: 80,
        totalTasks: 5,
        inProgress: 1,
        completed: 4,
        overdue: 0,
        createdBy: "u2",
      },
    ];

    // --- 2. TASKS ---
    const tasks = [
      {
        id: 101,
        projectId: 1,
        name: "Initial Data Audit",
        category: "Audit",
        assignedUserId: "u4",
        priority: "high",
        status: "done",
        statusLabel: "Completed",
        deadline: "2026-02-15",
      },
      {
        id: 102,
        projectId: 1,
        name: "Evidence Submission",
        category: "Compliance",
        assignedUserId: "u4",
        priority: "medium",
        status: "in_progress",
        statusLabel: "In Progress",
        deadline: "2026-04-10",
      },
      {
        id: 201,
        projectId: 2,
        name: "Q1 Variance Analysis",
        category: "Finance",
        assignedUserId: "u4",
        priority: "high",
        status: "in_progress",
        statusLabel: "In Progress",
        deadline: "2026-03-20",
        overdue: true,
      },
      {
        id: 301,
        projectId: 3,
        name: "Firewall Check",
        category: "IT",
        assignedUserId: "u7",
        priority: "critical",
        status: "done",
        statusLabel: "Completed",
        deadline: "2026-03-01",
      },
    ];

    // --- 3. COMPLIANCE RULES (Created by CO) ---
    const complianceRules = [
      {
        id: "rule1",
        name: "SOX Section 404",
        policy: "SOX",
        dept: "Finance Dept",
        evidence: "Yes",
        status: "Active",
        desc: "Internal financial controls requiring annual sign-offs on all variance reports above $50k.",
      },
      {
        id: "rule2",
        name: "GDPR Client Verification",
        policy: "GDPR",
        dept: "All dept",
        evidence: "Yes",
        status: "Active",
        desc: "Requires multi-factor verification of data subject identity before processing any data export requests.",
      },
      {
        id: "rule3",
        name: "ISO 27001 Controls",
        policy: "ISO 27001",
        dept: "IT Dept",
        evidence: "Yes",
        status: "Active",
        desc: "Enforces mandatory monthly access log reviews and server hardening audits across all production infrastructure.",
      },
    ];

    // --- 4. EVIDENCE (Submitted by TM/TL, Reviewed by CO) ---
    // Notice how these link a Task (TM) to a Rule (CO)
    const evidence = [
      {
        id: "ev1",
        title: "GDPR Data Audit Results",
        taskName: "Initial Data Audit",
        projectId: 1,
        userId: "u4", // Ravi (TM) submitted this
        type: "GDPR",
        status: "pending",
        statusLabel: "Pending",
        submittedOn: "Mar 30, 2026",
        notes: "Attached the raw logs for client data.",
        file: "audit_logs_raw.xlsx",
      },
      {
        id: "ev2",
        title: "Firewall Config Logs",
        taskName: "Firewall Check",
        projectId: 3,
        userId: "u7", // Kiran (TL) submitted this
        type: "ISO 27001",
        status: "approved",
        statusLabel: "Approved",
        submittedOn: "Mar 02, 2026",
        notes: "All ports verified against security policy.",
        file: "firewall_config_mar.pdf",
      },
    ];

    // --- 5. COMPLIANCE VIOLATIONS (Flagged by CO, fixed by PM) ---
    const complianceViolations = [
      {
        id: "viol1",
        title: "Variance Report Sign-off Missing",
        projectId: 2,
        projectName: "Financial Q1 Reporting",
        detail:
          "Overdue by 5 days. Blocks Q1 submission. Needs immediate VP approval.",
        status: "Open",
        statusLabel: "Open",
        severity: "critical",
        dateFlagged: "Mar 26, 2026",
        resolutionNotes: "",
      },
    ];

    // --- 6. COMPLIANCE REPORTS (Generated by CO) ---
    const complianceReports = [
      {
        id: "rep1",
        title: "Compliance Summary — Q1 2026",
        meta: "All Projects · All Policies · Generated Mar 25 · PDF · 2.1 MB",
        iconClass: "rtic-blue",
        tags: [
          { cls: "filetype", txt: "PDF" },
          { cls: "gray", txt: "All Projects" },
        ],
      },
    ];

    // --- 7. ESCALATIONS (Raised by TM to PM) ---
    const escalations = [
      {
        id: 1,
        from: "Ravi Kumar (TM)",
        title: "Client Data Verification — Blocked",
        description: "Awaiting IT to grant access.",
        projectId: 1,
        projectName: "Project Atlas",
        status: "open",
      },
    ];

    // Save everything to localStorage so all users share the same data
    localStorage.setItem("pm_projects", JSON.stringify(projects));
    localStorage.setItem("pm_tasks", JSON.stringify(tasks));
    localStorage.setItem("pm_escalations", JSON.stringify(escalations));
    localStorage.setItem("pm_complianceRules", JSON.stringify(complianceRules));
    localStorage.setItem("pm_evidence", JSON.stringify(evidence));
    localStorage.setItem(
      "pm_complianceViolations",
      JSON.stringify(complianceViolations),
    );
    localStorage.setItem(
      "pm_complianceReports",
      JSON.stringify(complianceReports),
    );
    localStorage.setItem("pm_db_version", PM_DB_VERSION);
  }
}

initializePMDatabase();

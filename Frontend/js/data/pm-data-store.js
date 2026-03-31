// js/data/pm-data-store.js

const PM_DB_VERSION = 5; // 🚀 Bumped to 5 to sync task assignments

function initializePMDatabase() {
  const currentVersion = localStorage.getItem("pm_db_version");
  const parsedVersion = parseInt(currentVersion, 10);
  const needsUpdate = isNaN(parsedVersion) || parsedVersion < PM_DB_VERSION;

  if (!localStorage.getItem("pm_projects") || needsUpdate) {
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
      {
        id: 4,
        name: "Cloud Migration Prep",
        description: "Pre-flight checks for AWS server migration.",
        departmentId: 2,
        status: "Planning",
        statusLabel: "Planning",
        endDate: "2026-08-20",
        progress: 10,
        totalTasks: 12,
        inProgress: 1,
        completed: 0,
        overdue: 0,
        createdBy: "u2",
      },
    ];

    // ✅ Tasks perfectly assigned to "u7" (Kiran), "u4" (Ravi), and "u8" (Priya)
    const tasks = [
      {
        id: 101,
        projectId: 1,
        name: "Initial Data Audit",
        category: "Audit",
        assignedUserId: "u4",
        priority: "high",
        priorityLabel: "High",
        status: "done",
        statusLabel: "Completed",
        deadline: "2026-02-15",
        deadlineLabel: "Feb 15, 2026",
        overdue: false,
      },
      {
        id: 102,
        projectId: 1,
        name: "Evidence Submission",
        category: "Compliance",
        assignedUserId: "u4",
        priority: "medium",
        priorityLabel: "Medium",
        status: "in_progress",
        statusLabel: "In Progress",
        deadline: "2026-04-10",
        deadlineLabel: "Apr 10, 2026",
        overdue: false,
      },
      {
        id: 103,
        projectId: 1,
        name: "Client Data Cross-verification",
        category: "Data",
        assignedUserId: "u8",
        priority: "high",
        priorityLabel: "High",
        status: "blocked",
        statusLabel: "Blocked",
        deadline: "2026-03-25",
        deadlineLabel: "Mar 25, 2026",
        overdue: true,
        blocked: true,
      },
      {
        id: 201,
        projectId: 2,
        name: "Q1 Variance Analysis",
        category: "Finance",
        assignedUserId: "u4",
        priority: "high",
        priorityLabel: "High",
        status: "in_progress",
        statusLabel: "In Progress",
        deadline: "2026-03-20",
        deadlineLabel: "Mar 20, 2026",
        overdue: true,
        blocked: false,
      },
      {
        id: 202,
        projectId: 2,
        name: "SOX Policy Review Report",
        category: "Compliance",
        assignedUserId: "u7",
        priority: "high",
        priorityLabel: "High",
        status: "not_started",
        statusLabel: "Not Started",
        deadline: "2026-04-05",
        deadlineLabel: "Apr 05, 2026",
        overdue: false,
        blocked: false,
      },
      {
        id: 203,
        projectId: 2,
        name: "Expense Ledger Formatting",
        category: "Finance",
        assignedUserId: "u8",
        priority: "low",
        priorityLabel: "Low",
        status: "not_started",
        statusLabel: "Not Started",
        deadline: "2026-04-12",
        deadlineLabel: "Apr 12, 2026",
        overdue: false,
        blocked: false,
      },
      {
        id: 301,
        projectId: 3,
        name: "Firewall Configuration Check",
        category: "IT",
        assignedUserId: "u7",
        priority: "critical",
        priorityLabel: "Critical",
        status: "done",
        statusLabel: "Completed",
        deadline: "2026-03-01",
        deadlineLabel: "Mar 01, 2026",
        overdue: false,
      },
      {
        id: 302,
        projectId: 3,
        name: "Penetration Testing Results",
        category: "Security",
        assignedUserId: "u8",
        priority: "high",
        priorityLabel: "High",
        status: "in_progress",
        statusLabel: "In Progress",
        deadline: "2026-04-20",
        deadlineLabel: "Apr 20, 2026",
        overdue: false,
      },
    ];

    const escalations = [
      {
        id: 1,
        from: "Ravi Kumar (TM)",
        title: "Client Data Verification — Blocked",
        description:
          "Awaiting IT to grant access to the legacy client database.",
        projectId: 1,
        projectName: "Project Atlas",
        blocker: "Access Issue",
        priority: "high",
        priorityLabel: "High",
        status: "open",
        statusLabel: "Open",
        date: "Mar 28",
      },
      {
        id: 2,
        from: "Kiran Rao (TL)",
        title: "Q1 Report Sign-off — Awaiting",
        description: "Pending VP approval for 5 days.",
        projectId: 2,
        projectName: "Financial Q1 Reporting",
        blocker: "Approval",
        priority: "high",
        priorityLabel: "High",
        status: "open",
        statusLabel: "Open",
        date: "Mar 29",
      },
    ];

    const complianceItems = [
      {
        id: 1,
        projectName: "Project Atlas",
        projectSub: "Finance & Compliance",
        policy: "GDPR",
        status: "at_risk",
        statusLabel: "At Risk",
        evidenceLabel: "Pending",
        lastAudited: "Mar 10, 2026",
        hasWarning: true,
      },
      {
        id: 2,
        projectName: "Financial Q1 Reporting",
        projectSub: "Finance",
        policy: "SOX",
        status: "violation",
        statusLabel: "Violation",
        evidenceLabel: "Missing",
        lastAudited: "Mar 01, 2026",
        hasWarning: true,
      },
    ];

    const complianceViolations = [
      {
        id: 1,
        title: "Variance Report Sign-off Missing",
        detail: "Overdue by 5 days. Blocks Q1 submission.",
        status: "Open",
        statusLabel: "Open",
        severity: "overdue",
        severityLabel: "Overdue",
        action: "take_action",
      },
    ];

    localStorage.setItem("pm_projects", JSON.stringify(projects));
    localStorage.setItem("pm_tasks", JSON.stringify(tasks));
    localStorage.setItem("pm_escalations", JSON.stringify(escalations));
    localStorage.setItem("pm_complianceItems", JSON.stringify(complianceItems));
    localStorage.setItem(
      "pm_complianceViolations",
      JSON.stringify(complianceViolations),
    );
    localStorage.setItem("pm_db_version", PM_DB_VERSION);
  }
}

initializePMDatabase();

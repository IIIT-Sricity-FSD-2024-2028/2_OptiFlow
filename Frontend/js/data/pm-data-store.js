// js/data/pm-data-store.js

const PM_DB_VERSION = 2;

function initializePMDatabase() {
  const currentVersion = localStorage.getItem("pm_db_version");
  const parsedVersion = parseInt(currentVersion, 10);
  const needsUpdate = isNaN(parsedVersion) || parsedVersion < PM_DB_VERSION;

  if (!localStorage.getItem("pm_projects") || needsUpdate) {
    // 1. PROJECTS
    const projects = [
      {
        id: 1,
        name: "Project Atlas",
        description: "Data audit and verification.",
        departmentId: 1,
        status: "Active",
        statusLabel: "Active",
        endDate: "2025-01-15",
        progress: 62,
        totalTasks: 8,
        inProgress: 3,
        completed: 4,
        overdue: 1,
      },
      {
        id: 2,
        name: "Financial Q4 Reporting",
        description: "Quarterly financial report.",
        departmentId: 1,
        status: "Active",
        statusLabel: "At Risk",
        endDate: "2024-12-25",
        progress: 40,
        totalTasks: 6,
        inProgress: 2,
        completed: 2,
        overdue: 2,
      },
      {
        id: 3,
        name: "IT SECURITY Audit",
        description: "Annual IT security audit.",
        departmentId: 2,
        status: "Active",
        statusLabel: "On Track",
        endDate: "2025-01-05",
        progress: 80,
        totalTasks: 5,
        inProgress: 1,
        completed: 4,
        overdue: 0,
      },
    ];

    // 2. TASKS
    const tasks = [
      {
        id: 101,
        projectId: 1,
        name: "Initial Data Audit",
        assignedUserId: "u4",
        priorityLabel: "High",
        status: "Completed",
        statusLabel: "Completed",
        deadline: "2024-12-15",
      },
      {
        id: 102,
        projectId: 1,
        name: "Evidence Submission",
        assignedUserId: "u7",
        priorityLabel: "High",
        status: "In_Progress",
        statusLabel: "In Progress",
        deadline: "2024-12-22",
      },
      {
        id: 201,
        projectId: 2,
        name: "Q4 Variance Analysis",
        assignedUserId: "u4",
        priorityLabel: "High",
        status: "In_Progress",
        statusLabel: "In Progress",
        deadline: "2024-12-20",
        overdue: true,
      },
    ];

    // 3. ESCALATIONS
    const escalations = [
      {
        id: 1,
        from: "Arjun Mehta (TL)",
        title: "Client Data Verification — Blocked",
        description: "Blocked due to missing credentials.",
        projectId: 1,
        projectName: "Project Atlas",
        blocker: "Access Issue",
        priority: "high",
        priorityLabel: "High",
        status: "open",
        statusLabel: "Open",
        date: "Dec 20",
      },
      {
        id: 2,
        from: "Kiran Rao (TL)",
        title: "SOX Sign-off — Awaiting",
        description: "Pending for 5 days.",
        projectId: 2,
        projectName: "Financial Q4 Reporting",
        blocker: "Approval",
        priority: "high",
        priorityLabel: "High",
        status: "open",
        statusLabel: "Open",
        date: "Dec 22",
      },
    ];

    // 4. COMPLIANCE ITEMS
    const complianceItems = [
      {
        id: 1,
        projectName: "Project Atlas",
        projectSub: "Finance & Compliance",
        policy: "GDPR",
        status: "at_risk",
        statusLabel: "At Risk",
        evidenceLabel: "Pending",
        lastAudited: "Dec 10, 2024",
      },
      {
        id: 2,
        projectName: "Financial Q4 Reporting",
        projectSub: "Finance",
        policy: "SOX",
        status: "violation",
        statusLabel: "Violation",
        evidenceLabel: "Missing",
        lastAudited: "Dec 01, 2024",
      },
      {
        id: 3,
        projectName: "IT Security Audit",
        projectSub: "IT Infra",
        policy: "ISO 27001",
        status: "clear",
        statusLabel: "Clear",
        evidenceLabel: "Verified",
        lastAudited: "Dec 18, 2024",
      },
    ];

    // 5. COMPLIANCE VIOLATIONS (Flags)
    const complianceViolations = [
      {
        id: 1,
        title: "Variance Report Sign-off Missing",
        detail: "Overdue by 5 days.",
        status: "Open",
        statusLabel: "Open",
      },
      {
        id: 2,
        title: "GDPR Evidence Submission Delayed",
        detail: "Evidence not submitted.",
        status: "Under_Review",
        statusLabel: "Under Review",
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

// js/data/pm-data-store.js
(function (global) {
  "use strict";

  // Prevent "Identifier has already been declared" if the script is loaded twice
  if (global.__OFFICESYNC_PM_DB_LOADED__) return;
  global.__OFFICESYNC_PM_DB_LOADED__ = true;

  const PM_DB_VERSION = 11; // Demo Ecosystem reset (Office Ecosystem v11)

  function initializePMDatabase() {
    const currentVersion = localStorage.getItem("pm_db_version");
    const parsedVersion = parseInt(currentVersion, 10);
    const needsUpdate = isNaN(parsedVersion) || parsedVersion < PM_DB_VERSION;

    if (!localStorage.getItem("pm_projects") || needsUpdate) {
      // Wipe legacy fragments for a clean demo ecosystem
      localStorage.removeItem("pm_audit_logs");

      // --- 1. PROJECTS ---
      const projects = [
        {
          id: 1,
          name: "Q4 Financial Audit",
          description:
            "Finance controls review, variance reconciliation, and evidence package submission for Q4 close.",
          departmentId: 1,
          status: "Active",
          statusLabel: "Active",
          endDate: "2026-04-15",
          progress: 55,
          totalTasks: 4,
          inProgress: 2,
          completed: 1,
          overdue: 1,
          createdBy: "u4",
        },
        {
          id: 2,
          name: "ISO 27001 Certification",
          description:
            "IT Security certification readiness: access reviews, asset inventory, and control evidence.",
          departmentId: 2,
          status: "Active",
          statusLabel: "On Track",
          endDate: "2026-05-30",
          progress: 72,
          totalTasks: 3,
          inProgress: 1,
          completed: 2,
          overdue: 0,
          createdBy: "u4",
        },
      ];

    // --- 2. TASKS ---
    const tasks = [
      {
        id: 1101,
        projectId: 1,
        name: "Reconcile vendor invoices (Q4)",
        category: "Finance",
        assignedUserId: "u6",
        createdBy: "u4",
        priority: "High",
        priorityLabel: "High",
        status: "In_Progress",
        statusLabel: "In Progress",
        deadline: "2026-04-05",
        overdue: false,
        blocked: false,
      },
      {
        id: 1102,
        projectId: 1,
        name: "Prepare SOX 404 sign-off packet",
        category: "Compliance",
        assignedUserId: "u7",
        createdBy: "u4",
        priority: "Medium",
        priorityLabel: "Medium",
        status: "Pending",
        statusLabel: "Not Started",
        deadline: "2026-04-08",
        overdue: false,
        blocked: false,
      },
      {
        id: 1103,
        projectId: 1,
        name: "Validate journal entries for audit trail",
        category: "Finance",
        assignedUserId: "u6",
        createdBy: "u4",
        priority: "High",
        priorityLabel: "High",
        status: "Completed",
        statusLabel: "Done",
        deadline: "2026-03-28",
        overdue: false,
        blocked: false,
      },
      {
        id: 1104,
        projectId: 1,
        name: "Resolve access to Finance archive share",
        category: "IT",
        assignedUserId: "u7",
        createdBy: "u4",
        priority: "High",
        priorityLabel: "High",
        status: "Cancelled",
        statusLabel: "Blocked",
        deadline: "2026-04-01",
        overdue: true,
        blocked: true,
      },

      // IT Security
      {
        id: 2201,
        projectId: 2,
        name: "Run quarterly privileged access review",
        category: "IT",
        assignedUserId: "u9",
        createdBy: "u4",
        priority: "High",
        priorityLabel: "High",
        status: "In_Progress",
        statusLabel: "In Progress",
        deadline: "2026-04-12",
        overdue: false,
        blocked: false,
      },
      {
        id: 2202,
        projectId: 2,
        name: "Compile asset inventory & ownership map",
        category: "IT",
        assignedUserId: "u10",
        createdBy: "u4",
        priority: "Medium",
        priorityLabel: "Medium",
        status: "Completed",
        statusLabel: "Done",
        deadline: "2026-03-25",
        overdue: false,
        blocked: false,
      },
      {
        id: 2203,
        projectId: 2,
        name: "Patch baseline: critical server hardening",
        category: "IT",
        assignedUserId: "u9",
        createdBy: "u4",
        priority: "Critical",
        priorityLabel: "Critical",
        status: "Completed",
        statusLabel: "Done",
        deadline: "2026-03-20",
        overdue: false,
        blocked: false,
      },
    ];

    // --- 2.5. SUBTASKS (Created by TL) ---
    const subtasks = [
      {
        id: "st_1",
        parentTaskId: 1101,
        title: "Pull Q4 vendor statements",
        assignedUserId: "u7",
        status: "Completed",
      },
      {
        id: "st_2",
        parentTaskId: 1101,
        title: "Cross-check against GL accounts",
        assignedUserId: "u6",
        status: "Pending",
      }
    ];

    // --- 3. COMPLIANCE RULES (Created by CO) ---
    const complianceRules = [
      {
        id: "rule1",
        name: "SOX Section 404 – Financial Controls",
        policy: "SOX",
        dept: "Finance Dept",
        evidence: "Yes",
        status: "Active",
        desc: "Internal financial controls requiring annual sign-offs on all variance reports above $50k.",
      },
      {
        id: "rule2",
        name: "ISO 27001 – Access Review & Logging",
        policy: "ISO 27001",
        dept: "IT Security",
        evidence: "Yes",
        status: "Active",
        desc: "Requires quarterly privileged access reviews and evidence of log retention for critical systems.",
      },
    ];

    // --- 4. EVIDENCE (Submitted by TM/TL, Reviewed by CO) ---
    // Notice how these link a Task (TM) to a Rule (CO)
    const evidence = [
      {
        id: "ev1",
        title: "SOX 404 Sign-off Packet",
        taskName: "Prepare SOX 404 sign-off packet",
        projectId: 1,
        userId: "u5", // Priya (TL)
        type: "SOX",
        status: "approved",
        statusLabel: "Approved",
        submittedOn: "Mar 29, 2026",
        notes: "Packet verified and signed by TL; ready for Compliance review.",
        file: "SOX_404_SignOff_Q4.pdf",
      },
      {
        id: "ev2",
        title: "Invoice Reconciliation Workbook",
        taskName: "Reconcile vendor invoices (Q4)",
        projectId: 1,
        userId: "u6", // Ravi (TM)
        type: "SOX",
        status: "pending",
        statusLabel: "Pending",
        submittedOn: "Mar 31, 2026",
        notes: "Attached reconciliation summary; pending final variance review.",
        file: "Q4_Reconciliation.xlsx",
      },
      {
        id: "ev3",
        title: "Privileged Access Review Export",
        taskName: "Run quarterly privileged access review",
        projectId: 2,
        userId: "u9", // Neha (TM)
        type: "ISO 27001",
        status: "rejected",
        statusLabel: "Rejected",
        submittedOn: "Mar 30, 2026",
        notes: "Export missing approver signature and system scope.",
        file: "PAM_Access_Review_Mar.csv",
      },
    ];

    // --- 5. COMPLIANCE VIOLATIONS (Flagged by CO, fixed by PM) ---
    const complianceViolations = [
      {
        id: "viol1",
        title: "ISO 27001 – Access review evidence incomplete",
        projectId: 2,
        projectName: "ISO 27001 Certification",
        detail:
          "Rejected evidence lacked sign-off and scope. Remediated by re-export and TL approval.",
        status: "Resolved",
        statusLabel: "Resolved",
        severity: "medium",
        dateFlagged: "Mar 30, 2026",
        resolutionNotes: "Re-generated export with approver signature and full scope; re-submitted for review.",
      },
    ];

    // --- 6. COMPLIANCE REPORTS (Generated by CO) ---
    const complianceReports = [
      {
        id: "rep1",
        title: "Compliance Snapshot — Demo Ecosystem",
        meta: "Q4 Financial Audit + ISO 27001 · Generated Apr 01 · PDF · 1.6 MB",
        iconClass: "rtic-blue",
        tags: [
          { cls: "filetype", txt: "PDF" },
          { cls: "gray", txt: "2 Projects" },
        ],
      },
    ];

    // --- 7. ESCALATIONS (Raised by TM to PM) ---
    const escalations = [
      {
        id: 1,
        from: "Sonam Jain (TM)",
        title: "Task Blocked: Resolve access to Finance archive share",
        description:
          "Blocked by missing permissions to the Finance archive share. Needs IT Security approval.",
        projectId: 1,
        projectName: "Q4 Financial Audit",
        blocker: "Access / Permissions",
        priority: "high",
        priorityLabel: "High",
        status: "open",
        statusLabel: "Open",
        date: "Apr 01",
      },
    ];

      // Save everything to localStorage so all users share the same data
      localStorage.setItem("pm_projects", JSON.stringify(projects));
      localStorage.setItem("pm_tasks", JSON.stringify(tasks));
      localStorage.setItem("pm_subtasks", JSON.stringify(subtasks));
      localStorage.setItem("pm_escalations", JSON.stringify(escalations));
      localStorage.setItem(
        "pm_complianceRules",
        JSON.stringify(complianceRules),
      );
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

  global.initializePMDatabase = global.initializePMDatabase || initializePMDatabase;
  initializePMDatabase();
})(window);

// js/data/workflows.js
const WF_DATA_VERSION = 3; // Bump this to force a refresh when default data changes

const defaultWorkflows = [
  {
    id: "wf-1",
    name: "Finance Q4 Reporting",
    department: "Finance Dept",
    totalStages: 4,
    stages: ["Data Collection", "Draft", "Review", "Audit"],
    compliance: ["SOX", "IFRS"],
    status: "Active",
    runs: 14,
    lastModified: "Dec 10, 2024",
  },
  {
    id: "wf-2",
    name: "Employee Onboarding",
    department: "HR Dept",
    totalStages: 5,
    stages: [
      "Documents",
      "HR Verify",
      "IT Setup",
      "Account Setup",
      "Orientation",
    ],
    compliance: ["HR Policy"],
    status: "Active",
    runs: 11,
    lastModified: "Dec 5, 2024",
  },
  {
    id: "wf-3",
    name: "IT Security Audit Protocol",
    department: "IT Dept",
    totalStages: 6,
    stages: ["Scan", "Assess", "Report", "Remediation", "Verify", "Sign-off"],
    compliance: ["ISO 27001"],
    status: "Active",
    runs: 9,
    lastModified: "Nov 20, 2024",
  },
  {
    id: "wf-4",
    name: "GDPR Client Verification",
    department: "Operations Dept",
    totalStages: 4,
    stages: [
      "Data Request",
      "Identity Check",
      "Consent Review",
      "Compliance Sign-off",
    ],
    compliance: ["GDPR"],
    status: "Active",
    runs: 7,
    lastModified: "Jan 8, 2025",
  },
  {
    id: "wf-5",
    name: "Vendor Invoice Verification",
    department: "Finance Dept",
    totalStages: 3,
    stages: ["Invoice Receipt", "PO Matching", "Finance Approval"],
    compliance: ["SOX"],
    status: "Active",
    runs: 6,
    lastModified: "Jan 15, 2025",
  },
];

function getWorkflows() {
  const storedVersion = localStorage.getItem("os_workflows_version");
  if (!storedVersion || parseInt(storedVersion) < WF_DATA_VERSION) {
    // Data is stale or missing — reset to latest defaults
    localStorage.setItem("os_workflows", JSON.stringify(defaultWorkflows));
    localStorage.setItem("os_workflows_version", WF_DATA_VERSION);
    return defaultWorkflows;
  }
  const data = localStorage.getItem("os_workflows");
  if (data) return JSON.parse(data);
  return defaultWorkflows;
}

function saveWorkflows(workflows) {
  localStorage.setItem("os_workflows", JSON.stringify(workflows));
  localStorage.setItem("os_workflows_version", WF_DATA_VERSION);
}

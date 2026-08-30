// js/data/processes.js
const PROCESS_DATA_VERSION = 5;

const defaultProcesses = [
  {
    id: "p-1",
    name: "Finance Q4 Reporting & Audit",
    department: "Finance",
    category: "Finance",
    totalStages: 4,
    stages: ["Data Collection", "Financial Draft", "Executive Review", "Compliance Audit"],
    steps: [
      { name: "Data Collection", stepType: "INPUT", description: "Collect Q4 financial records" },
      { name: "Financial Draft", stepType: "APPROVAL", description: "Draft Q4 financial statement" },
      { name: "Executive Review", stepType: "APPROVAL", description: "VP Finance sign-off" },
      { name: "Compliance Audit", stepType: "AUTOMATED_CHECK", description: "SOX & IFRS compliance verification" }
    ],
    compliance: ["SOX Section 404", "IFRS Reporting"],
    status: "Active",
    runs: 14,
    lastModified: "Dec 10, 2026",
    description: "Standard operating procedure for quarter-end financial reconciliation and reporting."
  },
  {
    id: "p-2",
    name: "Employee Onboarding & Access Provisioning",
    department: "HR",
    category: "HR",
    totalStages: 5,
    stages: ["Documentation", "HR Verification", "IT Setup", "Role Assignment", "Orientation"],
    steps: [
      { name: "Documentation", stepType: "INPUT", description: "Submit tax & ID forms" },
      { name: "HR Verification", stepType: "APPROVAL", description: "HR background check approval" },
      { name: "IT Setup", stepType: "ACTION", description: "Issue hardware & email accounts" },
      { name: "Role Assignment", stepType: "ACTION", description: "Grant permissions & role assignments" },
      { name: "Orientation", stepType: "ACTION", description: "Complete security & compliance training" }
    ],
    compliance: ["HR Security Policy"],
    status: "Active",
    runs: 11,
    lastModified: "Dec 05, 2026",
    description: "End-to-end onboarding process from contract sign to workstation provisioning."
  },
  {
    id: "p-3",
    name: "IT Security Audit Protocol",
    department: "IT",
    category: "IT",
    totalStages: 4,
    stages: ["Vulnerability Scan", "Risk Assessment", "Remediation", "Compliance Sign-off"],
    steps: [
      { name: "Vulnerability Scan", stepType: "AUTOMATED_CHECK", description: "Run automated network port & app scans" },
      { name: "Risk Assessment", stepType: "INPUT", description: "Categorize CVE vulnerabilities" },
      { name: "Remediation", stepType: "ACTION", description: "Apply patches and firewall updates" },
      { name: "Compliance Sign-off", stepType: "APPROVAL", description: "CISO sign-off" }
    ],
    compliance: ["ISO 27001"],
    status: "Active",
    runs: 9,
    lastModified: "Nov 20, 2026",
    description: "Quarterly cybersecurity audit and vulnerability assessment pipeline."
  },
  {
    id: "p-4",
    name: "GDPR Client Data Verification",
    department: "Operations",
    category: "Operations",
    totalStages: 4,
    stages: ["Data Request", "Identity Check", "Consent Review", "Compliance Sign-off"],
    steps: [
      { name: "Data Request", stepType: "INPUT", description: "User data access request" },
      { name: "Identity Check", stepType: "APPROVAL", description: "Verify user credentials" },
      { name: "Consent Review", stepType: "APPROVAL", description: "Check consent parameters" },
      { name: "Compliance Sign-off", stepType: "APPROVAL", description: "Data protection officer sign-off" }
    ],
    compliance: ["GDPR"],
    status: "Active",
    runs: 7,
    lastModified: "Jan 08, 2026",
    description: "GDPR subject access request verification and fulfillment workflow."
  }
];

async function getProcesses() {
  try {
    const rawTemplates = await window.Helpers.api.request('/process-templates', 'GET');
    const templates = Array.isArray(rawTemplates) ? rawTemplates : (rawTemplates && rawTemplates.data ? rawTemplates.data : []);
    return templates.map(t => ({
      id: t.id || t.template_id,
      name: t.name || t.template_name,
      department: t.category || 'General',
      category: t.category || 'General',
      totalStages: t.steps ? t.steps.length : (t.stages ? t.stages.length : 4),
      stages: t.steps ? t.steps.map(s => s.name) : (t.stages || ['Stage 1', 'Stage 2']),
      steps: t.steps || [],
      compliance: t.compliance || ['General Policy'],
      status: t.isActive === false ? 'Inactive' : 'Active',
      runs: t.runs || 5,
      lastModified: t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : 'Recently',
      description: t.description || 'Process template definition.'
    }));
  } catch (e) {
    console.error('[getProcesses] API fetch failed:', e.message);
    return [];
  }
}

async function getProcessById(id) {
  const processes = await getProcesses();
  return processes.find(p => String(p.id) === String(id)) || processes[0] || null;
}

async function saveProcess(process) {
  try {
    if (window.Helpers && window.Helpers.api) {
      if (process.id && !String(process.id).startsWith('p-')) {
        // Update existing process via API
        await window.Helpers.api.request(`/process-templates/${process.id}`, 'PATCH', {
          name: process.name,
          category: process.category || process.department || 'General',
          compliance: process.compliance || ['General'],
          isActive: true,
          steps: (process.steps || []).map((s, i) => ({
            stepOrder: i + 1,
            name: s.name || process.stages[i] || `Stage ${i+1}`,
            stepType: s.stepType || 'ACTION'
          }))
        });
        return process;
      } else {
        // Create new process via API
        const created = await window.Helpers.api.request('/process-templates', 'POST', {
          name: process.name || 'Untitled Process',
          category: process.category || process.department || 'General',
          compliance: process.compliance || ['General'],
          isActive: true,
          steps: (process.steps || []).map((s, i) => ({
            stepOrder: i + 1,
            name: s.name || process.stages[i] || `Stage ${i+1}`,
            stepType: s.stepType || 'ACTION'
          }))
        });
        return created;
      }
    }
  } catch (e) {
    console.warn('[saveProcess] API save failed, using localStorage:', e.message);
  }

  // Fallback: localStorage
  let processes = JSON.parse(localStorage.getItem('os_processes') || '[]');
  const idx = processes.findIndex(p => String(p.id) === String(process.id));
  if (idx > -1) {
    processes[idx] = { ...processes[idx], ...process };
  } else {
    processes.push({
      id: process.id || "p-" + Date.now(),
      name: process.name,
      department: process.department || "Operations",
      category: process.category || "Operations",
      totalStages: process.stages ? process.stages.length : 3,
      stages: process.stages || ["Stage 1", "Stage 2", "Stage 3"],
      steps: process.steps || [],
      compliance: process.compliance || ["Standard Policy"],
      status: "Active",
      runs: 1,
      lastModified: new Date().toLocaleDateString(),
      description: process.description || "Custom process flow"
    });
  }

  localStorage.setItem("os_processes", JSON.stringify(processes));
  localStorage.setItem("os_processes_version", PROCESS_DATA_VERSION);
  return processes;
}

async function deleteProcess(id) {
  try {
    if (window.Helpers && window.Helpers.api && !String(id).startsWith('p-')) {
      await window.Helpers.api.request(`/process-templates/${id}`, 'DELETE');
    }
  } catch (e) {
    console.warn('[deleteProcess] API delete failed:', e.message);
  }

  let processes = await getProcesses();
  processes = processes.filter(p => String(p.id) !== String(id));
  localStorage.setItem("os_processes", JSON.stringify(processes));
  localStorage.setItem("os_processes_version", PROCESS_DATA_VERSION);
  return processes;
}

// Global aliases for legacy workflow references
window.getWorkflows = getProcesses;
window.saveWorkflows = saveProcess;

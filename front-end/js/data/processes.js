// js/data/processes.js
const PROCESS_DATA_VERSION = 5;

const defaultProcesses = [
  {
    id: "p-1",
    name: "Finance Q4 Reporting & Audit",
    department: "Finance",
    category: "Finance",
    totalStages: 4,
    stages: ["Data Collection", "Financial Draft Preparation", "Executive Review", "Compliance & SOX Audit"],
    steps: [
      { name: "Data Collection", stepType: "Input_Required", description: "Collect Q4 financial records" },
      { name: "Financial Draft Preparation", stepType: "Input_Required", description: "Draft Q4 financial statements" },
      { name: "Executive Review", stepType: "Approval", description: "VP Finance sign-off" },
      { name: "Compliance & SOX Audit", stepType: "Automated_Task", description: "SOX & IFRS compliance verification" }
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
    stages: ["Documentation & ID Verification", "HR Background Verification", "IT Setup & Hardware Provisioning", "Role & Permission Assignment", "Compliance Orientation"],
    steps: [
      { name: "Documentation & ID Verification", stepType: "Input_Required", description: "Submit tax & ID forms" },
      { name: "HR Background Verification", stepType: "Approval", description: "HR background check approval" },
      { name: "IT Setup & Hardware Provisioning", stepType: "Input_Required", description: "Issue hardware & email accounts" },
      { name: "Role & Permission Assignment", stepType: "Approval", description: "Grant permissions & role assignments" },
      { name: "Compliance Orientation", stepType: "Automated_Task", description: "Complete security & compliance training" }
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
    stages: ["Vulnerability Scan & Discovery", "Risk Assessment & CVE Rating", "Remediation & Patch Deployment", "CISO Compliance Sign-off"],
    steps: [
      { name: "Vulnerability Scan & Discovery", stepType: "Automated_Task", description: "Run automated network port & app scans" },
      { name: "Risk Assessment & CVE Rating", stepType: "Input_Required", description: "Categorize CVE vulnerabilities" },
      { name: "Remediation & Patch Deployment", stepType: "Input_Required", description: "Apply patches and firewall updates" },
      { name: "CISO Compliance Sign-off", stepType: "Approval", description: "CISO sign-off" }
    ],
    compliance: ["ISO 27001", "SOC2"],
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
    stages: ["Data Subject Access Request Intake", "Identity & Authenticity Check", "Consent & Scope Review", "DPO Compliance Sign-off"],
    steps: [
      { name: "Data Subject Access Request Intake", stepType: "Input_Required", description: "User data access request" },
      { name: "Identity & Authenticity Check", stepType: "Approval", description: "Verify user credentials" },
      { name: "Consent & Scope Review", stepType: "Approval", description: "Check consent parameters" },
      { name: "DPO Compliance Sign-off", stepType: "Approval", description: "Data protection officer sign-off" }
    ],
    compliance: ["GDPR"],
    status: "Active",
    runs: 7,
    lastModified: "Jan 08, 2026",
    description: "GDPR subject access request verification and fulfillment workflow."
  },
  {
    id: "p-5",
    name: "Vendor Security & Compliance Onboarding",
    department: "Procurement",
    category: "Procurement",
    totalStages: 2,
    stages: ["Vendor Information & Audit Intake", "Security Officer Sign-off"],
    steps: [
      { name: "Vendor Information & Audit Intake", stepType: "Input_Required", description: "Intake vendor security questionnaire" },
      { name: "Security Officer Sign-off", stepType: "Approval", description: "Review and sign off vendor risk profile" }
    ],
    compliance: ["Vendor Risk Policy"],
    status: "Active",
    runs: 5,
    lastModified: "Jan 15, 2026",
    description: "Vendor risk assessment and security verification pipeline."
  }
];

async function getProcesses() {
  try {
    if (window.Helpers && window.Helpers.api) {
      const rawTemplates = await window.Helpers.api.request('/process-templates', 'GET');
      const templates = Array.isArray(rawTemplates) ? rawTemplates : (rawTemplates && rawTemplates.data ? rawTemplates.data : []);
      if (templates.length > 0) {
        return templates.map(t => ({
          id: t.id || t.template_id,
          name: t.name || t.template_name,
          department: t.category || 'General',
          category: t.category || 'General',
          totalStages: t.steps ? t.steps.length : (t.stages ? t.stages.length : 4),
          stages: t.steps ? t.steps.map(s => typeof s === 'string' ? s : s.name) : (t.stages || ['Stage 1', 'Stage 2']),
          steps: t.steps || [],
          compliance: t.compliance || ['General Policy'],
          status: t.isActive === false ? 'Inactive' : 'Active',
          runs: t.runs || 5,
          lastModified: t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : 'Recently',
          description: t.description || 'Process template definition.'
        }));
      }
    }
  } catch (e) {
    console.warn('[getProcesses] API fetch failed, falling back to defaults:', e.message);
  }
  return defaultProcesses;
}

async function getProcessById(id) {
  if (!id) return null;
  const strId = String(id).trim();

  // 1. Direct API fetch if it looks like a database UUID
  try {
    if (window.Helpers && window.Helpers.api && strId.length > 10 && !strId.startsWith('p-')) {
      const res = await window.Helpers.api.request(`/process-templates/${strId}`, 'GET');
      const t = res && (res.data || res);
      if (t && (t.id || t.template_id)) {
        return {
          id: t.id || t.template_id,
          name: t.name || t.template_name,
          department: t.category || 'General',
          category: t.category || 'General',
          totalStages: t.steps ? t.steps.length : (t.stages ? t.stages.length : 4),
          stages: t.steps ? t.steps.map(s => typeof s === 'string' ? s : s.name) : (t.stages || ['Stage 1', 'Stage 2']),
          steps: t.steps || [],
          compliance: t.compliance || ['General Policy'],
          status: t.isActive === false ? 'Inactive' : 'Active',
          runs: t.instances ? t.instances.length : (t.runs || 5),
          lastModified: t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : 'Recently',
          description: t.description || 'Process template definition.'
        };
      }
    }
  } catch (e) {
    console.warn('[getProcessById] Direct fetch failed, trying local store / defaults:', e.message);
  }

  // 2. Fetch all processes (API or defaults)
  const processes = await getProcesses();
  let match = processes.find(p => String(p.id) === strId);
  if (match) return match;

  // 3. Fallback matching against defaultProcesses by ID, index, or name
  if (strId === '1' || strId === 'p-1' || strId.toLowerCase().includes('finance')) {
    return defaultProcesses[0];
  }
  if (strId === '2' || strId === 'p-2' || strId.toLowerCase().includes('onboard') || strId.toLowerCase().includes('employee')) {
    return defaultProcesses[1];
  }
  if (strId === '3' || strId === 'p-3' || strId.toLowerCase().includes('security') || strId.toLowerCase().includes('it')) {
    return defaultProcesses[2];
  }
  if (strId === '4' || strId === 'p-4' || strId.toLowerCase().includes('gdpr')) {
    return defaultProcesses[3];
  }
  if (strId === '5' || strId === 'p-5' || strId.toLowerCase().includes('vendor')) {
    return defaultProcesses[4];
  }

  // 4. Case-insensitive substring match
  match = defaultProcesses.find(p => p.name.toLowerCase().includes(strId.toLowerCase()));
  if (match) return match;

  return processes[0] || defaultProcesses[0] || null;
}

async function saveProcess(process) {
  const session = (window.Auth && window.Auth.getSession) ? window.Auth.getSession() : (JSON.parse(sessionStorage.getItem("currentUser") || "{}"));
  try {
    if (window.Helpers && window.Helpers.api) {
      if (process.id && !String(process.id).startsWith('p-')) {
        // Update existing process via API
        const updated = await window.Helpers.api.request(`/process-templates/${process.id}`, 'PATCH', {
          name: process.name,
          category: process.category || process.department || 'General',
          compliance: Array.isArray(process.compliance) ? process.compliance : [process.compliance || 'General'],
          isActive: true,
          createdById: session.id || undefined,
          steps: (process.stages || []).map((stageName, i) => {
            const stp = process.steps && process.steps[i];
            return {
              stepOrder: i + 1,
              name: (stp && stp.name) || stageName || `Stage ${i + 1}`,
              stepType: (stp && stp.stepType) || 'Input_Required'
            };
          })
        });

        if (window.Helpers) window.Helpers._stateCache = null;
        if (window.AuditStore) {
          window.AuditStore.add("UPDATE", "ProcessTemplate", process.id, {
            performedBy: session.id,
            newValue: { name: process.name }
          });
        }
        return updated;
      } else {
        // Create new process via API
        const created = await window.Helpers.api.request('/process-templates', 'POST', {
          name: process.name || 'Untitled Process',
          category: process.category || process.department || 'General',
          compliance: Array.isArray(process.compliance) ? process.compliance : [process.compliance || 'General'],
          isActive: true,
          createdById: session.id || undefined,
          steps: (process.stages || []).map((stageName, i) => {
            const stp = process.steps && process.steps[i];
            return {
              stepOrder: i + 1,
              name: (stp && stp.name) || stageName || `Stage ${i + 1}`,
              stepType: (stp && stp.stepType) || 'Input_Required'
            };
          })
        });

        if (window.Helpers) window.Helpers._stateCache = null;
        const newId = (created && (created.id || (created.data && created.data.id))) || "new";
        if (window.AuditStore) {
          window.AuditStore.add("CREATE", "ProcessTemplate", newId, {
            performedBy: session.id,
            newValue: { name: process.name }
          });
        }
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

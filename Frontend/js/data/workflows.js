// js/data/workflows.js
const defaultWorkflows = [
    {
        id: 'wf-1',
        name: 'Finance Q4 Reporting',
        department: 'Finance Dept',
        totalStages: 4,
        stages: ['Data Collection', 'Draft', 'Review', 'Audit'],
        compliance: ['SOX', 'IFRS'],
        status: 'Active',
        runs: 9,
        lastModified: 'Dec 10, 2024'
    },
    {
        id: 'wf-2',
        name: 'Employee Onboarding',
        department: 'HR Dept',
        totalStages: 5,
        stages: ['Documents', 'HR Verify', 'IT Setup', '+2'],
        compliance: ['HR Policy'],
        status: 'Active',
        runs: 7,
        lastModified: 'Dec 5, 2024'
    },
    {
        id: 'wf-3',
        name: 'IT Security Audit Protocol',
        department: 'IT Dept',
        totalStages: 6,
        stages: ['Scan', 'Assess', 'Report', '+3'],
        compliance: ['ISO 27001'],
        status: 'Active',
        runs: 5,
        lastModified: 'Nov 20, 2024'
    }
];

function getWorkflows() {
    const data = localStorage.getItem('os_workflows');
    if (data) return JSON.parse(data);
    localStorage.setItem('os_workflows', JSON.stringify(defaultWorkflows));
    return defaultWorkflows;
}

function saveWorkflows(workflows) {
    localStorage.setItem('os_workflows', JSON.stringify(workflows));
}

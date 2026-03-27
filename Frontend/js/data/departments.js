// js/data/departments.js
const defaultDepts = [
    { id: 'd1', name: 'Finance', head: 'Sarah Jenkins', users: 14, processes: 5, status: 'Active' },
    { id: 'd2', name: 'HR', head: 'Michael Chang', users: 8, processes: 3, status: 'Active' },
    { id: 'd3', name: 'IT', head: 'Vikram Patel', users: 22, processes: 8, status: 'Active' },
    { id: 'd4', name: 'Operations', head: 'Linda Park', users: 45, processes: 12, status: 'Active' }
];

function getDepartments() {
    const data = localStorage.getItem('os_depts');
    if (data) return JSON.parse(data);
    localStorage.setItem('os_depts', JSON.stringify(defaultDepts));
    return defaultDepts;
}

function saveDepartments(depts) {
    localStorage.setItem('os_depts', JSON.stringify(depts));
}

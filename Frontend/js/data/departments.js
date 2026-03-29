// js/data/departments.js
const DEPT_DATA_VERSION = 3; // Bump to force a reset when default data changes

const defaultDepts = [
  {
    id: "d1",
    name: "Finance",
    head: "Sarah Jenkins",
    users: 14,
    processes: 5,
    status: "Active",
  },
  {
    id: "d2",
    name: "HR",
    head: "Michael Chang",
    users: 8,
    processes: 3,
    status: "Active",
  },
  {
    id: "d3",
    name: "IT",
    head: "Vikram Patel",
    users: 22,
    processes: 8,
    status: "Active",
  },
  {
    id: "d4",
    name: "Operations",
    head: "Linda Park",
    users: 45,
    processes: 12,
    status: "Active",
  },
];

function getDepartments() {
  const storedVersion = localStorage.getItem("os_depts_version");
  if (!storedVersion || parseInt(storedVersion) < DEPT_DATA_VERSION) {
    localStorage.setItem("os_depts", JSON.stringify(defaultDepts));
    localStorage.setItem("os_depts_version", DEPT_DATA_VERSION);
    return defaultDepts;
  }
  const data = localStorage.getItem("os_depts");
  if (data) return JSON.parse(data);
  return defaultDepts;
}

function saveDepartments(depts) {
  localStorage.setItem("os_depts", JSON.stringify(depts));
  localStorage.setItem("os_depts_version", DEPT_DATA_VERSION);
}

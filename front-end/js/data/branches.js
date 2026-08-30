// js/data/branches.js
const BRANCH_DATA_VERSION = 4;

const defaultBranches = [
  {
    id: "b1",
    name: "Headquarters (HQ)",
    head: "Sarah Jenkins",
    users: 28,
    processes: 12,
    status: "Active",
  },
  {
    id: "b2",
    name: "North America Regional Branch",
    head: "Michael Chang",
    users: 18,
    processes: 8,
    status: "Active",
  },
  {
    id: "b3",
    name: "APAC Engineering Hub",
    head: "Vikram Patel",
    users: 42,
    processes: 15,
    status: "Active",
  },
  {
    id: "b4",
    name: "EMEA Operations Branch",
    head: "Linda Park",
    users: 25,
    processes: 9,
    status: "Active",
  },
];

async function getBranches() {
  try {
    const apiBranches = await window.Helpers.api.request('/branches', 'GET');
    const branches = Array.isArray(apiBranches) ? apiBranches : (apiBranches && apiBranches.data ? apiBranches.data : []);
    return branches.map(b => ({
      id: b.id || b.branchId,
      name: b.name,
      head: b.head || 'Branch Manager',
      users: b.users ? b.users.length : (b._count ? b._count.users : 0),
      processes: b.processes || 0,
      status: b.status || 'Active'
    }));
  } catch (e) {
    console.error('[getBranches] API fetch failed:', e.message);
    return [];
  }
}

async function saveBranch(branch) {
  if (branch.id && !String(branch.id).startsWith('b')) {
    await window.Helpers.api.request(`/branches/${branch.id}`, 'PATCH', { name: branch.name });
  } else {
    await window.Helpers.api.request('/branches', 'POST', { name: branch.name });
  }
  return getBranches();
}

async function deleteBranch(id) {
  try {
    if (id && !String(id).startsWith('b')) {
      await window.Helpers.api.request(`/branches/${id}`, 'DELETE');
    }
  } catch (e) {
    console.error('[deleteBranch] API delete failed:', e.message);
  }
  return getBranches();
}

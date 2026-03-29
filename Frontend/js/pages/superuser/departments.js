// js/pages/departments.js
document.addEventListener("DOMContentLoaded", () => {
  refreshDeptTable();
  document
    .getElementById("searchInput")
    .addEventListener("input", refreshDeptTable);

  // Outside click to close
  document.getElementById("deptModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeDeptModal();
  });
});

function refreshDeptTable() {
  let depts = getDepartments();
  const search = document.getElementById("searchInput").value.toLowerCase();

  if (search) {
    depts = depts.filter(
      (d) =>
        d.name.toLowerCase().includes(search) ||
        d.head.toLowerCase().includes(search),
    );
  }

  renderDeptTable(depts);
}

function renderDeptTable(data) {
  const tbody = document.getElementById("deptTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No departments found</td></tr>';
    return;
  }

  data.forEach((d) => {
    const tr = document.createElement("tr");
    const statusBadge = d.status === "Active" ? "green" : "gray";

    tr.innerHTML = `
            <td><div class="td-title">${d.name}</div></td>
            <td>${d.head}</td>
            <td><span class="badge gray">${d.users} users</span></td>
            <td>${d.processes} Active</td>
            <td><span class="badge ${statusBadge}">${d.status}</span></td>
            <td>
                <button class="action-btn edit" onclick="openDeptModal('${d.id}')">Edit</button>
                <button class="action-btn delete" onclick="deleteDept('${d.id}')">Delete</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

function openDeptModal(id = null) {
  const modal = document.getElementById("deptModal");
  const title = document.getElementById("modalTitle");

  // Reset scroll
  const content = modal.querySelector(".modal-body");
  if (content) content.scrollTop = 0;

  showError("deptName", true);
  showError("deptHead", true);

  if (id) {
    const depts = getDepartments();
    const d = depts.find((x) => x.id === id);
    if (d) {
      document.getElementById("deptId").value = d.id;
      document.getElementById("deptName").value = d.name;
      document.getElementById("deptHead").value = d.head;
      document.getElementById("deptStatus").value = d.status;
      title.innerText = "Edit Department";
    }
  } else {
    document.getElementById("deptForm").reset();
    document.getElementById("deptId").value = "";
    title.innerText = "Add New Department";
  }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeDeptModal() {
  document.getElementById("deptModal").classList.remove("active");
  document.body.style.overflow = "";
}

function saveDept() {
  const id = document.getElementById("deptId").value;
  const name = document.getElementById("deptName").value;
  const head = document.getElementById("deptHead").value;
  const status = document.getElementById("deptStatus").value;

  const isNameValid = showError("deptName", validateRequired(name));
  const isHeadValid = showError("deptHead", validateRequired(head));

  if (!isNameValid || !isHeadValid) return;

  const depts = getDepartments();

  if (id) {
    const idx = depts.findIndex((d) => d.id === id);
    if (idx > -1) {
      depts[idx] = { ...depts[idx], name, head, status };
    }
  } else {
    depts.push({
      id: "d" + Date.now(),
      name,
      head,
      status,
      users: 0,
      processes: 0,
    });
  }

  saveDepartments(depts);
  closeDeptModal();
  refreshDeptTable();
}

function deleteDept(id) {
  if (confirm("Are you sure you want to delete this department?")) {
    let depts = getDepartments();
    depts = depts.filter((d) => d.id !== id);
    saveDepartments(depts);
    refreshDeptTable();
  }
}

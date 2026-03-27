// js/pages/users.js
document.addEventListener('DOMContentLoaded', () => {
    refreshTable();

    document.getElementById('searchInput').addEventListener('input', refreshTable);
    document.getElementById('roleFilter').addEventListener('change', refreshTable);
    
    // Outside click to close
    document.getElementById('userModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeUserModal();
    });
});

function refreshTable() {
    let users = getUsers();
    const search = document.getElementById('searchInput').value.toLowerCase();
    const role = document.getElementById('roleFilter').value;

    if (search) {
        users = users.filter(u => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search));
    }
    if (role) {
        users = users.filter(u => u.role === role);
    }

    renderUserTable(users);
}

function renderUserTable(data) {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No users found</td></tr>';
        return;
    }

    data.forEach(u => {
        const tr = document.createElement('tr');
        const roleBadge = u.role === 'Super User' ? 'purple' : (u.role === 'Admin' ? 'blue' : 'gray');
        const statusBadge = u.status === 'Active' ? 'green' : 'gray';

        tr.innerHTML = `
            <td>
                <div class="td-title">${u.name}</div>
                <div class="td-subtitle">${u.email}</div>
            </td>
            <td><span class="badge ${roleBadge}">${u.role}</span></td>
            <td>${u.department}</td>
            <td><span class="badge ${statusBadge}">${u.status}</span></td>
            <td style="color: var(--text-muted);">${u.joined}</td>
            <td>
                <button class="action-btn edit" onclick="openUserModal('${u.id}')">Edit</button>
                <button class="action-btn" style="color: #DC2626; border: 1px solid #DC2626;" onclick="deleteUser('${u.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openUserModal(id = null) {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('modalTitle');
    
    // Reset scroll
    const content = modal.querySelector('.modal-body');
    if (content) content.scrollTop = 0;
    
    // Clear validation
    showError('userName', true);
    showError('userEmail', true);

    if (id) {
        const users = getUsers();
        const u = users.find(x => x.id === id);
        if (u) {
            document.getElementById('userId').value = u.id;
            document.getElementById('userName').value = u.name;
            document.getElementById('userEmail').value = u.email;
            document.getElementById('userRole').value = u.role;
            document.getElementById('userDept').value = u.department;
            
            // Advanced Preview
            document.getElementById('userTeams').value = u.teams || '';
            document.getElementById('userResp').value = u.responsibilities || '';
            document.getElementById('userTasks').value = u.tasks || 0;
            document.getElementById('userProcesses').value = u.processes || 0;
            
            title.innerText = 'Edit User';
        }
    } else {
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        document.getElementById('userTasks').value = '0';
        document.getElementById('userProcesses').value = '0';
        title.innerText = 'Add New User';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
    document.body.style.overflow = '';
}

function saveUser() {
    const id = document.getElementById('userId').value;
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const role = document.getElementById('userRole').value;
    const dept = document.getElementById('userDept').value;
    
    // Advanced fields
    const teams = document.getElementById('userTeams').value;
    const responsibilities = document.getElementById('userResp').value;
    const tasks = document.getElementById('userTasks').value;
    const processes = document.getElementById('userProcesses').value;

    // Validate
    const isNameValid = showError('userName', validateRequired(name));
    const isEmailValid = showError('userEmail', validateEmail(email));

    if (!isNameValid || !isEmailValid) return;

    const users = getUsers();
    
    if (id) {
        const idx = users.findIndex(u => u.id === id);
        if (idx > -1) {
            users[idx] = { ...users[idx], name, email, role, department: dept, teams, responsibilities, tasks, processes };
        }
    } else {
        const newDate = new Date().toLocaleDateString('en-US', {month: 'short', day: '2-digit', year: 'numeric'});
        users.push({
            id: 'u' + Date.now(),
            name, email, role, department: dept, status: 'Active', joined: newDate, teams, responsibilities, tasks, processes
        });
    }

    saveUsers(users);
    closeUserModal();
    refreshTable();
}

function deleteUser(id) {
    if (confirm("Are you sure you want to delete this user?")) {
        let users = getUsers();
        users = users.filter(u => u.id !== id);
        saveUsers(users);
        refreshTable();
    }
}

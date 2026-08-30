document.addEventListener('DOMContentLoaded', async () => {
    const sessionRaw = sessionStorage.getItem('currentUser');
    if (!sessionRaw) {
        window.location.href = '../../login.html';
        return;
    }
    const session = JSON.parse(sessionRaw);

    // Setup Header UI
    document.getElementById("sidebar-user-name").textContent = session.name;
    document.getElementById("sidebar-user-role").textContent = session.roleLabel || "Process Admin";
    document.getElementById("sidebar-user-avatar").textContent = session.name.substring(0, 2).toUpperCase();

    if (window.Sidebar) window.Sidebar.render("workflows");

    const errorMessage = document.getElementById('errorMessage');
    const templateList = document.getElementById('templateList');
    const stepsContainer = document.getElementById('stepsContainer');
    const addStepFormContainer = document.getElementById('addStepFormContainer');
    const addStepForm = document.getElementById('addStepForm');
    const permissionSelect = document.getElementById('requiredPermissionId');
    
    let currentTemplateId = null;
    let nextStepOrder = 1;
    
    const headers = {
        'Content-Type': 'application/json',
        'x-user-role': session.roleId || session.roleSlug || session.role || 'project_manager',
        'x-user-email': session.email,
        'x-company-id': session.companyId
    };

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
        setTimeout(() => errorMessage.style.display = 'none', 5000);
    }

    async function loadTemplates() {
        try {
            const response = await fetch('http://localhost:3000/processes/templates', { headers });
            if (response.status === 403) {
                showError('403 Forbidden: You do not have Process Admin privileges.');
                templateList.innerHTML = '<li style="padding: 15px; color: #dc2626;">Access Denied</li>';
                return;
            }
            if (!response.ok) throw new Error('Failed to load templates');
            
            const result = await response.json();
            const templates = result.data || result;
            
            templateList.innerHTML = '';
            if (!templates || templates.length === 0) {
                templateList.innerHTML = '<li style="padding: 15px; color: var(--text-muted);">No templates found.</li>';
                return;
            }

            templates.forEach(t => {
                const li = document.createElement('li');
                li.className = 'template-item';
                li.innerHTML = `
                    <span class="template-name">${t.name} (v${t.version})</span>
                    <span class="template-meta">${t.category}</span>
                `;
                li.addEventListener('click', () => {
                    document.querySelectorAll('.template-item').forEach(el => el.classList.remove('active'));
                    li.classList.add('active');
                    selectTemplate(t);
                });
                templateList.appendChild(li);
            });
        } catch (error) {
            console.error(error);
            showError('Error loading templates.');
        }
    }

    async function selectTemplate(template) {
        currentTemplateId = template.id;
        document.getElementById('selectedTemplateTitle').textContent = `${template.name} (v${template.version})`;
        document.getElementById('selectedTemplateDesc').textContent = template.description || 'No description provided.';
        addStepFormContainer.style.display = 'block';
        
        try {
            const response = await fetch(`http://localhost:3000/processes/templates/${template.id}/steps`, { headers });
            if (!response.ok) throw new Error('Failed to load steps');
            
            const result = await response.json();
            const steps = result.data || result;
            
            stepsContainer.innerHTML = '';
            if (!steps || steps.length === 0) {
                stepsContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">No steps defined yet. Add the first step below.</p>';
                nextStepOrder = 1;
            } else {
                nextStepOrder = steps.length + 1;
                steps.forEach(s => {
                    const div = document.createElement('div');
                    div.className = 'step-item';
                    div.innerHTML = `
                        <div class="step-header">
                            <span class="step-name">${s.name}</span>
                            <span class="step-order">Step ${s.stepOrder}</span>
                        </div>
                        <div class="step-meta">
                            Type: <strong>${s.stepType.replace('_', ' ')}</strong><br>
                            Permission: ${s.requiredPermission ? s.requiredPermission.name || s.requiredPermission.slug : '<em>None</em>'}
                        </div>
                    `;
                    stepsContainer.appendChild(div);
                });
            }
            // Scroll steps container to bottom
            stepsContainer.scrollTop = stepsContainer.scrollHeight;
        } catch (error) {
            console.error(error);
            showError('Error loading steps.');
        }
    }

    async function loadPermissions() {
        try {
            // Usually permissions are global or tenant-scoped
            const response = await fetch('http://localhost:3000/permissions', { headers });
            if (!response.ok) return;
            
            const result = await response.json();
            const permissions = result.data || result;
            
            if (permissions && Array.isArray(permissions)) {
                permissions.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.name || p.slug;
                    permissionSelect.appendChild(opt);
                });
            }
        } catch (error) {
            console.error('Error loading permissions:', error);
        }
    }

    addStepForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentTemplateId) return;

        const payload = {
            name: document.getElementById('stepName').value,
            stepOrder: nextStepOrder,
            stepType: document.getElementById('stepType').value,
            requiredPermissionId: document.getElementById('requiredPermissionId').value || null
        };

        try {
            const response = await fetch(`http://localhost:3000/processes/templates/${currentTemplateId}/steps`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (response.status === 403) {
                showError('403 Forbidden: You do not have permission to modify process steps.');
                return;
            }
            if (!response.ok) throw new Error('Failed to create step');
            
            addStepForm.reset();
            const activeEl = document.querySelector('.template-item.active .template-name');
            if (activeEl) {
                const activeText = activeEl.textContent;
                selectTemplate({ 
                    id: currentTemplateId, 
                    name: activeText.split(' (')[0], 
                    version: activeText.match(/v(\d+)/)[1] 
                });
            }
        } catch (error) {
            console.error(error);
            showError('Error adding step.');
        }
    });

    loadTemplates();
    loadPermissions();
});

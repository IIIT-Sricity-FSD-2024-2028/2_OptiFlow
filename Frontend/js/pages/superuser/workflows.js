// js/pages/workflows.js

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const wfId = params.get('id');
    const workflows = getWorkflows();
    
    if (wfId) {
        let wf = workflows.find(w => w.id === wfId);
        if (wf) {
            document.getElementById('processListView').style.display = 'none';
            document.getElementById('processDetailView').style.display = 'flex';
            document.getElementById('detailHeaderActions').style.display = 'flex';
            
            renderProcessHeader(wf);
            renderProcessStages(wf);
            
            document.getElementById('editProcessBtn').onclick = () => {
                window.location.href = `workflow-builder.html?id=${wf.id}`;
            }
        } else {
            renderLibraryTable(workflows);
        }
    } else {
        renderLibraryTable(workflows);
    }
});

function renderLibraryTable(workflows) {
    document.getElementById('processDetailView').style.display = 'none';
    document.getElementById('detailHeaderActions').style.display = 'none';
    document.getElementById('processListView').style.display = 'block';
    
    const tbody = document.getElementById('libraryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    workflows.forEach(wf => {
        const tr = document.createElement('tr');
        const statusBadge = wf.status === 'Active' ? 'green' : (wf.status === 'Draft' ? 'gray' : 'yellow');
        
        tr.innerHTML = `
            <td>
                <div class="td-title">${wf.name}</div>
                <div class="td-subtitle" style="font-size:12px; color:var(--text-muted);">${wf.totalStages} Stages</div>
            </td>
            <td>${wf.department}</td>
            <td><span class="badge ${statusBadge}">${wf.status}</span></td>
            <td style="color:var(--text-muted)">Oct 24, 2024</td>
            <td>
                <button class="action-btn" onclick="window.location.href='workflows.html?id=${wf.id}'">View</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderProcessHeader(wf) {
    const header = document.getElementById('processHeader');
    if (!header) return;

    header.innerHTML = `
        <div class="breadcrumb">
            <a href="workflows.html" class="breadcrumb-link">Processes</a> › ${wf.name}
        </div>
        <div class="process-title-row">
            <div class="process-title">${wf.name}</div>
        </div>
        <div class="meta-tags">
            ${renderStatusTag(wf.status)} 
            <span style="color:var(--text-main)">${wf.department}</span> · 
            ${wf.totalStages} Stages · 
            Compliance: ${wf.compliance.join(' · ')}
        </div>
        
        <div class="metrics-grid" style="margin-top: 24px;">
            <div class="card metric-card">
                <div class="metric-title">Total Uses</div>
                <div class="metric-value">${wf.runs}</div>
                <div class="metric-tag blue">All time deployments</div>
            </div>
            <div class="card metric-card">
                <div class="metric-title">Active Now</div>
                <div class="metric-value">2</div>
                <div class="metric-tag green">Currently in progress</div>
            </div>
            <div class="card metric-card">
                <div class="metric-title">Completion Rate</div>
                <div class="metric-value">84%</div>
                <div class="metric-tag green">Historical success</div>
            </div>
            <div class="card metric-card">
                <div class="metric-title">Avg Duration</div>
                <div class="metric-value">6.2d</div>
                <div class="metric-tag yellow">Standard SLA: 7d</div>
            </div>
        </div>
    `;

    document.title = `${wf.name} - OfficeSync`;
}

function renderProcessStages(wf) {
    const container = document.getElementById('stagesContainer');
    if (!container) return;
    
    // Abstracting roles for demo purposes based on Figma
    const mockRoles = ['Team Member', 'Team Member', 'Team Leader', 'Compliance Officer'];
    const mockTags = [
        ['Evidence', 'SOX'],
        ['Evidence', 'Approval'],
        ['Approval'],
        ['Evidence', 'SOX', 'IFRS']
    ];

    let html = '';
    
    wf.stages.forEach((stageName, idx) => {
        const isFirst = idx === 0;
        const isActive = idx === 1; // Stage 2 active for demo
        
        if (!isFirst) {
            html += `<div class="connector"></div>`;
        }
        
        const tagsHtml = (mockTags[idx] || []).map(tag => {
            if (tag === 'Evidence') return `<span class="badge" style="background:#EFF6FF; color:#3B82F6;">${tag}</span>`;
            if (tag === 'Approval') return `<span class="badge" style="background:#DCFCE7; color:#166534;">${tag}</span>`;
            if (tag === 'SOX') return `<span class="badge" style="background:#FEE2E2; color:#DC2626;">${tag}</span>`;
            return createBadge(tag, 'gray');
        }).join('');

        const role = mockRoles[idx] || 'System';

        html += `
            <div class="stage-node ${isActive ? 'is-active' : 'is-default'}">
                <div class="node-number">${idx + 1}</div>
                <div class="node-content">
                    <div class="node-title">${stageName.replace('+2', 'Optional Step').replace('+3', 'Cleanup')}</div>
                    <div class="node-role">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        ${role}
                    </div>
                </div>
                <div class="node-tags">
                    ${tagsHtml}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

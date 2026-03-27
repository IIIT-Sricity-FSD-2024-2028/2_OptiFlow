// js/pages/workflow-builder.js

let builderStages = [
    {name: 'Data Collection', role: 'Team Member', tags: ['Evidence', 'SOX']},
    {name: 'Document Preparation', role: 'Team Member', tags: ['Evidence', 'Approval'], active: true},
    {name: 'TL Review', role: 'Team Leader', tags: ['Approval'], opt: 'Optional Evidence'},
    {name: 'Compliance Audit', role: 'Compliance Officer', tags: ['Evidence', 'SOX', 'IFRS']}
];

document.addEventListener('DOMContentLoaded', () => {
    renderBuilderCanvas();
});

function renderBuilderCanvas() {
    const container = document.getElementById('flowContainer');
    if (!container) return;
    
    document.getElementById('stgCount').innerText = builderStages.length;

    let html = '';
    
    builderStages.forEach((stg, idx) => {
        if(idx > 0) html += `<div class="timeline-edge"></div>`;
        
        const tagsHtml = stg.tags.map(tag => {
            if (tag === 'Evidence') return `<span class="badge" style="background:#EFF6FF; color:#3B82F6;">${tag}</span>`;
            if (tag === 'Approval') return `<span class="badge" style="background:#DCFCE7; color:#166534;">${tag}</span>`;
            if (tag === 'SOX') return `<span class="badge" style="background:#FEE2E2; color:#DC2626;">${tag}</span>`;
            return createBadge(tag, 'gray');
        }).join('');

        html += `
            <div class="timeline-card ${stg.active ? 'active' : ''}">
                <div class="card-header" onclick="toggleStage(${idx})">
                    <div class="node-number">${idx+1}</div>
                    <div class="card-header-content">
                        <div class="node-title">${stg.name}</div>
                        <div class="node-role">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            ${stg.role}
                        </div>
                    </div>
                    <div class="node-tags">${tagsHtml}</div>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label>STAGE NAME</label>
                            <input type="text" class="form-control" id="stgName_${idx}" value="${stg.name}">
                        </div>
                        <div class="form-group">
                            <label>ASSIGNED ROLE</label>
                            <input type="text" class="form-control" id="stgRole_${idx}" value="${stg.role}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>STAGE DESCRIPTION</label>
                        <textarea class="form-control" id="stgDesc_${idx}">Detailed description for this stage execution...</textarea>
                    </div>

                    <label style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 12px; display:block; font-weight: 600;">STAGE RULES</label>
                    <div class="form-row" style="margin-bottom: 24px;">
                        <div>
                            <div class="toggle-row">
                                <span class="toggle-label">Require evidence upload</span>
                                <label class="switch"><input type="checkbox" checked><span class="slider"></span></label>
                            </div>
                            <div class="toggle-row" style="border-bottom:none; margin-bottom: 0;">
                                <span class="toggle-label">Require approval to proceed</span>
                                <label class="switch"><input type="checkbox" checked><span class="slider"></span></label>
                            </div>
                        </div>
                        <div>
                            <div class="toggle-row">
                                <span class="toggle-label">Allow parallel execution</span>
                                <label class="switch"><input type="checkbox"><span class="slider"></span></label>
                            </div>
                            <div class="toggle-row" style="border-bottom:none; margin-bottom: 0;">
                                <span class="toggle-label">Auto-escalate on deadline breach</span>
                                <label class="switch"><input type="checkbox"><span class="slider"></span></label>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 16px;">
                        <button class="btn btn-secondary" style="color:#DC2626; border-color:#DC2626; margin-right: auto;" onclick="deleteStageInline(${idx})">Delete Stage</button>
                        <button class="btn btn-secondary" onclick="toggleStage(${idx})">Collapse</button>
                        <button class="btn btn-primary" onclick="saveStageInline(${idx})">Save Stage</button>
                    </div>
                </div>
            </div>
        `;
    });

    html += `<div class="add-node-btn" title="Add Stage" onclick="addStage()"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>`;
    
    container.innerHTML = html;
}

function toggleStage(idx) {
    builderStages.forEach((s, i) => {
        if (i === idx) s.active = !s.active;
        else s.active = false;
    });
    renderBuilderCanvas();
}

function addStage() {
    builderStages.push({
        name: 'New Draft Stage', role: 'Unassigned', tags: [], active: true
    });
    
    builderStages.forEach((s, idx) => { s.active = (idx === builderStages.length - 1); });
    
    renderBuilderCanvas();
    
    // Scroll to bottom
    const tc = document.querySelector('.timeline-container');
    if (tc) tc.scrollTop = tc.scrollHeight;
}

function saveStageInline(idx) {
    if (!builderStages[idx]) return;
    builderStages[idx].name = document.getElementById(`stgName_${idx}`).value;
    builderStages[idx].role = document.getElementById(`stgRole_${idx}`).value;
    
    // Collapse on save
    builderStages[idx].active = false;
    renderBuilderCanvas();
}

function deleteStageInline(idx) {
    if (confirm("Are you sure you want to delete this stage?")) {
        builderStages.splice(idx, 1);
        renderBuilderCanvas();
    }
}

// js/pages/superuser/processes.js
document.addEventListener("DOMContentLoaded", async () => {
  const sessionRaw = sessionStorage.getItem("currentUser");
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw);
      const nameEl = document.getElementById("sidebar-user-name");
      const roleEl = document.getElementById("sidebar-user-role");
      const avatarEl = document.getElementById("sidebar-user-avatar");
      if (nameEl) nameEl.textContent = session.fullName || session.name || "Arjun Mehta";
      if (roleEl) roleEl.textContent = "Process Admin";
      if (avatarEl) {
        const name = session.fullName || session.name || "AM";
        avatarEl.textContent = name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
      }
    } catch(e) {}
  }

  // Clear any legacy sticky IDs
  sessionStorage.removeItem("selected_process_id");

  const urlParams = new URLSearchParams(window.location.search);
  let processId = urlParams.get("id");
  if (!processId && sessionStorage.getItem("view_process_id")) {
    processId = sessionStorage.getItem("view_process_id");
    sessionStorage.removeItem("view_process_id");
  } else {
    sessionStorage.removeItem("view_process_id");
  }

  const newBtn = document.getElementById("btnHeaderNewProcess");
  if (newBtn) {
    newBtn.addEventListener("click", () => {
      sessionStorage.removeItem("edit_process_id");
      sessionStorage.removeItem("selected_process_id");
      sessionStorage.removeItem("view_process_id");
      sessionStorage.removeItem("newProcessDraft");
    });
  }

  if (processId) {
    await loadProcessDetails(processId);
  } else {
    await loadProcessList();
  }
});

function showProcessList() {
  sessionStorage.removeItem("view_process_id");
  sessionStorage.removeItem("selected_process_id");
  sessionStorage.removeItem("edit_process_id");
  if (window.history && window.history.replaceState) {
    const isHttp = window.location.protocol.startsWith('http');
    const cleanUrl = isHttp ? window.location.pathname.replace(/\.html$/, '') : window.location.pathname.replace(/\?.*$/, '');
    window.history.replaceState(null, '', cleanUrl);
  }
  loadProcessList();
}
window.showProcessList = showProcessList;

async function showProcessDetail(id) {
  sessionStorage.setItem("view_process_id", id);
  if (window.history && window.history.replaceState) {
    const isHttp = window.location.protocol.startsWith('http');
    const base = isHttp ? window.location.pathname.replace(/\.html$/, '') : window.location.pathname;
    const cleanUrl = base + '?id=' + encodeURIComponent(id);
    window.history.replaceState(null, '', cleanUrl);
  }
  await loadProcessDetails(id);
}
window.showProcessDetail = showProcessDetail;

async function loadProcessList() {
  const listView = document.getElementById("processListView");
  const detailView = document.getElementById("processDetailView");
  if (listView) listView.style.display = "block";
  if (detailView) detailView.style.display = "none";

  const tbody = document.getElementById("libraryTableBody");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Loading processes from database...</td></tr>';

  const processes = await getProcesses();
  tbody.innerHTML = "";

  if (!processes || processes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No process templates found in database. Click "+ New Process" to create one.</td></tr>';
    return;
  }

  const isHttp = window.location.protocol.startsWith('http');

  processes.forEach(proc => {
    const tr = document.createElement("tr");
    const stagesSummary = (proc.stages && proc.stages.length) ? proc.stages.join(" → ") : `${proc.totalStages || 0} stages`;
    const complianceTags = (proc.compliance && proc.compliance.length) ? proc.compliance.map(c => `<span class="badge" style="background:#f1f5f9; color:#475569; margin-right:4px;">${c}</span>`).join("") : "";

    const viewUrl = isHttp ? `processes?id=${encodeURIComponent(proc.id)}` : `processes.html?id=${encodeURIComponent(proc.id)}`;
    const editUrl = isHttp ? `process-builder?id=${encodeURIComponent(proc.id)}` : `process-builder.html?id=${encodeURIComponent(proc.id)}`;

    tr.innerHTML = `
      <td>
        <div style="font-weight: 600; color: var(--text-main); cursor: pointer;" onclick="window.showProcessDetail('${proc.id}')">${proc.name}</div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${proc.description || ''}</div>
        <div style="margin-top: 4px;">${complianceTags}</div>
      </td>
      <td><span class="badge badge-gray">${proc.department || proc.category || 'General'}</span></td>
      <td style="font-size: 13px; color: #475569; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${stagesSummary}">${stagesSummary}</td>
      <td><span class="badge ${proc.status === 'Active' ? 'badge-green' : 'badge-yellow'}">${proc.status || 'Active'}</span></td>
      <td style="font-size: 13px; color: var(--text-muted);">${proc.lastModified || 'Recently'}</td>
      <td>
        <div style="display: flex; gap: 8px; align-items: center;">
          <a href="${viewUrl}" onclick="event.preventDefault(); window.showProcessDetail('${proc.id}')" class="action-btn" style="text-decoration:none; padding: 6px 12px; background: #f1f5f9; color: #1e293b; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer;">View</a>
          <a href="${editUrl}" onclick="sessionStorage.setItem('edit_process_id', '${proc.id}')" class="action-btn" style="text-decoration:none; padding: 6px 12px; background: #2563eb; color: white; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer;">Edit in Builder</a>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadProcessDetails(id) {
  const listView = document.getElementById("processListView");
  const detailView = document.getElementById("processDetailView");
  if (listView) listView.style.display = "none";
  if (detailView) detailView.style.display = "flex";

  const proc = await getProcessById(id);
  if (!proc) {
    alert("Process template not found.");
    window.showProcessList();
    return;
  }

  // Header and breadcrumb
  const headerEl = document.getElementById("processHeader");
  if (headerEl) {
    headerEl.innerHTML = `
      <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <a href="javascript:void(0)" onclick="window.showProcessList()" style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #2563eb; text-decoration: none; font-weight: 600; cursor: pointer;">
          &larr; Back to Process Library
        </a>
        <div style="font-size: 13px; color: #64748b;">
          <a href="dashboard.html" style="color: #64748b; text-decoration: none;">Dashboard</a> &rsaquo; 
          <a href="javascript:void(0)" onclick="window.showProcessList()" style="color: #64748b; text-decoration: none; cursor: pointer;">Processes</a> &rsaquo; 
          <span style="color: #0f172a; font-weight: 600;">${proc.name}</span>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0;">${proc.name}</h1>
          <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: #64748b;">
            <span class="badge badge-gray">${proc.department || proc.category || 'Operations'}</span>
            <span class="badge ${proc.status === 'Active' ? 'badge-green' : 'badge-yellow'}">${proc.status || 'Active'}</span>
            <span>&bull; ${proc.stages ? proc.stages.length : 0} Stages</span>
            <span>&bull; Last modified ${proc.lastModified || 'Recently'}</span>
            <span>&bull; ${proc.runs || 0} executions</span>
          </div>
        </div>
        <div>
          <button id="btnEditInBuilder" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px 16px; font-size: 13px; font-weight: 600;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            Edit in Builder
          </button>
        </div>
      </div>
    `;
  }

  // Render Stages
  const stagesContainer = document.getElementById("stagesContainer");
  if (stagesContainer) {
    const stagesList = proc.stages || [];
    stagesContainer.innerHTML = stagesList.map((stageName, index) => {
      const stepObj = proc.steps && proc.steps[index];
      return `
        <div class="stage-node ${index === 0 ? 'is-active' : ''}" style="margin-bottom: 12px; background: white; border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: ${index === 0 ? '#2563eb' : '#e2e8f0'}; color: ${index === 0 ? '#fff' : '#475569'}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;">
                ${index + 1}
              </div>
              <div>
                <div style="font-weight: 600; font-size: 15px; color: #0f172a;">${stageName}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                  ${stepObj && stepObj.description ? stepObj.description : `Step ${index + 1} execution and governance`}
                </div>
              </div>
            </div>
            <div>
              <span class="badge badge-gray">${stepObj && stepObj.stepType ? stepObj.stepType : 'Stage'}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Wire Edit in Builder button
  const editBtn = document.getElementById("btnEditInBuilder");
  if (editBtn) {
    editBtn.onclick = () => {
      sessionStorage.setItem("edit_process_id", proc.id);
      const isHttp = window.location.protocol.startsWith('http');
      const target = isHttp ? `process-builder?id=${encodeURIComponent(proc.id)}` : `process-builder.html?id=${encodeURIComponent(proc.id)}`;
      window.location.href = target;
    };
  }

  // Update compliance tags list
  const compList = document.getElementById("complianceRulesList");
  if (compList && proc.compliance && proc.compliance.length) {
    compList.innerHTML = proc.compliance.map(tag => `
      <div class="rule-item" style="margin-bottom: 12px;">
        <div class="rule-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <div>
          <div class="rule-title">${tag}</div>
          <div class="rule-desc">Required compliance checkpoint enforced for this process workflow.</div>
        </div>
      </div>
    `).join("");
  }
}

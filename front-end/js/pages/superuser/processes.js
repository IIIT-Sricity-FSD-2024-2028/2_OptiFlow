// js/pages/superuser/processes.js
document.addEventListener("DOMContentLoaded", async () => {
  if (window.Sidebar) {
    window.Sidebar.render("workflows"); // Render sidebar for processes
  }

  const urlParams = new URLSearchParams(window.location.search);
  const processId = urlParams.get("id") || "p-1";

  await loadProcessDetails(processId);
});

async function loadProcessDetails(id) {
  const proc = await getProcessById(id);
  if (!proc) return;

  // Title and Breadcrumbs
  const titleEl = document.querySelector(".process-title");
  if (titleEl) titleEl.textContent = proc.name;

  const breadcrumbEl = document.querySelector(".breadcrumb");
  if (breadcrumbEl) {
    breadcrumbEl.innerHTML = `
      <a href="dashboard.html" class="breadcrumb-link">Dashboard</a> ›
      <a href="processes.html" class="breadcrumb-link">Processes</a> ›
      <span>${proc.name}</span>
    `;
  }

  // Meta tags (Department, Status, Runs)
  const metaTags = document.querySelector(".meta-tags");
  if (metaTags) {
    metaTags.innerHTML = `
      <span class="badge badge-gray">${proc.department || 'Operations'}</span>
      <span class="badge ${proc.status === 'Active' ? 'badge-green' : 'badge-yellow'}">${proc.status}</span>
      <span>• Last modified ${proc.lastModified || 'Recently'}</span>
      <span>• ${proc.runs || 0} executions</span>
    `;
  }

  // Render Stage Nodes
  const stagesContainer = document.querySelector(".stages-path");
  if (stagesContainer) {
    stagesContainer.innerHTML = proc.stages.map((stageName, index) => `
      <div class="stage-node ${index === 0 ? 'is-active' : ''}" style="margin-bottom: 12px; background: white; border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${index === 0 ? '#3b82f6' : '#e2e8f0'}; color: ${index === 0 ? '#fff' : '#475569'}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;">
              ${index + 1}
            </div>
            <div>
              <div style="font-weight: 600; font-size: 15px; color: #0f172a;">${stageName}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                ${proc.steps && proc.steps[index] ? proc.steps[index].description : `Step ${index + 1} verification & approval phase`}
              </div>
            </div>
          </div>
          <div>
            <span class="badge badge-gray">${proc.steps && proc.steps[index] ? proc.steps[index].stepType || 'TASK' : 'STAGE'}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Bind Edit button
  const editBtn = document.getElementById("btnEditProcess");
  if (editBtn) {
    editBtn.onclick = () => {
      window.location.href = `process-builder.html?id=${proc.id}`;
    };
  }
}

function openProcessBuilder(id) {
  window.location.href = `process-builder.html${id ? '?id=' + id : ''}`;
}
window.openProcessBuilder = openProcessBuilder;

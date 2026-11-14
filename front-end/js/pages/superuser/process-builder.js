// js/pages/superuser/process-builder.js
let currentProcess = {
  id: null,
  name: "",
  department: "Finance",
  category: "Finance",
  compliance: [],
  stages: ["Stage 1", "Stage 2"],
  steps: [
    { name: "Stage 1", stepType: "Input_Required", description: "Initial data entry" },
    { name: "Stage 2", stepType: "Approval", description: "Review and approval" }
  ]
};

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  let processId = urlParams.get("id");
  if (!processId) {
    processId = sessionStorage.getItem("edit_process_id") || sessionStorage.getItem("selected_process_id");
  }
  if (sessionStorage.getItem("edit_process_id")) {
    sessionStorage.removeItem("edit_process_id");
  }
  if (processId && !urlParams.get("id") && window.history && window.history.replaceState) {
    const cleanUrl = window.location.pathname + '?id=' + encodeURIComponent(processId);
    window.history.replaceState(null, '', cleanUrl);
  }

  const modeText = document.getElementById("builderModeText");
  const modeBadge = document.getElementById("builderModeBadge");
  const publishBtn = document.getElementById("btnPublishProcess");
  const statusText = document.getElementById("builderStatusText");

  if (processId) {
    // EDIT MODE: Load existing template from DB
    const existing = await getProcessById(processId);
    if (existing) {
      const rawStages = (existing.stages && existing.stages.length)
        ? existing.stages
        : (existing.steps && existing.steps.length ? existing.steps.map(s => typeof s === 'string' ? s : s.name) : ["Stage 1", "Stage 2"]);

      const rawSteps = (existing.steps && existing.steps.length)
        ? existing.steps.map((s, idx) => {
            const name = typeof s === 'string' ? s : (s.name || rawStages[idx] || `Stage ${idx + 1}`);
            let type = typeof s === 'object' && s.stepType ? s.stepType : 'Input_Required';
            if (type === 'INPUT' || type === 'Input_Required') type = 'Input_Required';
            else if (type === 'APPROVAL' || type === 'Approval') type = 'Approval';
            else if (type === 'AUTOMATED_CHECK' || type === 'ACTION' || type === 'AUTOMATED_TASK' || type === 'Automated_Task') type = 'Automated_Task';
            return { name, stepType: type };
          })
        : rawStages.map((name, idx) => ({
            name,
            stepType: idx === 0 ? 'Input_Required' : (idx === rawStages.length - 1 ? 'Automated_Task' : 'Approval')
          }));

      currentProcess = {
        id: existing.id,
        name: existing.name || "Untitled Process",
        department: existing.department || existing.category || "Finance",
        category: existing.category || existing.department || "Finance",
        compliance: Array.isArray(existing.compliance) ? existing.compliance : [existing.compliance || "Standard"],
        stages: rawStages,
        steps: rawSteps
      };

      if (modeText) modeText.textContent = `Edit: ${currentProcess.name}`;
      if (modeBadge) {
        modeBadge.textContent = "Editing Existing";
        modeBadge.style.background = "#EFF6FF";
        modeBadge.style.color = "#1D4ED8";
      }
      if (publishBtn) publishBtn.textContent = "Update Process";
      if (statusText) statusText.textContent = "Editing template";
    } else {
      alert("Process template not found in database.");
      window.location.href = "processes.html";
      return;
    }
  } else {
    // CREATE MODE: Start completely clean afresh
    sessionStorage.removeItem("newProcessDraft");
    currentProcess = {
      id: null,
      name: "",
      department: "Finance",
      category: "Finance",
      compliance: [],
      stages: ["Stage 1", "Stage 2"],
      steps: [
        { name: "Stage 1", stepType: "Input_Required", description: "Initial data entry" },
        { name: "Stage 2", stepType: "Approval", description: "Review and approval" }
      ]
    };

    if (modeText) modeText.textContent = "Create New Process";
    if (modeBadge) {
      modeBadge.textContent = "New Template";
      modeBadge.style.background = "#F0FDF4";
      modeBadge.style.color = "#15803D";
    }
    if (publishBtn) publishBtn.textContent = "Create & Publish Process";
    if (statusText) statusText.textContent = "Drafting new template";
  }

  initBuilderForm();
  renderFlowBuilder();
});

function initBuilderForm() {
  const nameInput = document.getElementById("newProcessName");
  const deptSelect = document.getElementById("newProcessDept");
  const compInput = document.getElementById("newProcessCompliance");

  if (nameInput) {
    nameInput.value = currentProcess.name || "";
    nameInput.placeholder = "Enter process name (e.g., Vendor Payment Approval)";
    nameInput.addEventListener("input", (e) => {
      currentProcess.name = e.target.value;
      updateMetaDisplay();
    });
  }

  if (deptSelect) {
    deptSelect.value = currentProcess.department || "Finance";
    deptSelect.addEventListener("change", (e) => {
      currentProcess.department = e.target.value;
      currentProcess.category = e.target.value;
      updateMetaDisplay();
    });
  }

  if (compInput) {
    compInput.value = Array.isArray(currentProcess.compliance) ? currentProcess.compliance.join(", ") : (currentProcess.compliance || "");
    compInput.addEventListener("input", (e) => {
      currentProcess.compliance = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
      updateMetaDisplay();
    });
  }

  updateMetaDisplay();
}

function updateMetaDisplay() {
  const mName = document.getElementById("metaProcessName");
  const mDept = document.getElementById("metaProcessDept");
  const mComp = document.getElementById("metaProcessCompliance");
  const stgCount = document.getElementById("stgCount");

  if (mName) mName.textContent = currentProcess.name || "Untitled Process";
  if (mDept) mDept.textContent = currentProcess.department || "Finance";
  if (mComp) mComp.textContent = Array.isArray(currentProcess.compliance) && currentProcess.compliance.length ? currentProcess.compliance.join(", ") : "None";
  if (stgCount) stgCount.textContent = currentProcess.stages ? currentProcess.stages.length : 0;
}

function renderFlowBuilder() {
  const container = document.getElementById("flowContainer");
  if (!container) return;

  container.innerHTML = "";

  currentProcess.stages.forEach((stageName, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.cssText = "width: 100%; max-width: 680px; margin-bottom: 16px; padding: 20px; background: #fff; border: 1px solid var(--border-color, #e2e8f0); border-radius: 10px;";

    const currentStepType = (currentProcess.steps && currentProcess.steps[index] && currentProcess.steps[index].stepType) || "Input_Required";

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="background: var(--blue, #3b82f6); color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px;">
            ${index + 1}
          </span>
          <input type="text" class="form-control" value="${stageName}" onchange="updateStageName(${index}, this.value)" style="font-weight: 600; font-size: 15px; width: 280px;" />
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-sm btn-secondary" onclick="moveStage(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn btn-sm btn-secondary" onclick="moveStage(${index}, 1)" ${index === currentProcess.stages.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn-sm btn-secondary" onclick="deleteStage(${index})" style="color: #ef4444;">Delete</button>
        </div>
      </div>
      <div style="font-size: 12px; color: var(--text-muted, #64748b); display: flex; align-items: center; gap: 8px;">
        <span>Step Type:</span>
        <select class="form-control" style="display: inline-block; width: 160px; height: 32px; padding: 2px 8px; font-size: 12px;" onchange="updateStepType(${index}, this.value)">
          <option value="Input_Required" ${currentStepType === 'Input_Required' ? 'selected' : ''}>Input Required</option>
          <option value="Approval" ${currentStepType === 'Approval' ? 'selected' : ''}>Approval</option>
          <option value="Automated_Task" ${currentStepType === 'Automated_Task' ? 'selected' : ''}>Automated Task</option>
        </select>
      </div>
    `;

    container.appendChild(card);
  });

  // Add Stage Button
  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-secondary";
  addBtn.style.cssText = "margin-top: 8px; margin-bottom: 30px;";
  addBtn.innerHTML = "+ Add Stage";
  addBtn.onclick = addStage;
  container.appendChild(addBtn);
}

function updateStageName(index, val) {
  currentProcess.stages[index] = val;
  if (!currentProcess.steps[index]) currentProcess.steps[index] = {};
  currentProcess.steps[index].name = val;
  updateMetaDisplay();
}

function updateStepType(index, val) {
  if (!currentProcess.steps[index]) currentProcess.steps[index] = { name: currentProcess.stages[index] };
  currentProcess.steps[index].stepType = val;
}

function addStage() {
  const newNum = currentProcess.stages.length + 1;
  currentProcess.stages.push(`Stage ${newNum}`);
  currentProcess.steps.push({ name: `Stage ${newNum}`, stepType: "Input_Required" });
  updateMetaDisplay();
  renderFlowBuilder();
}

function deleteStage(index) {
  if (currentProcess.stages.length <= 1) {
    alert("A process must have at least one stage.");
    return;
  }
  currentProcess.stages.splice(index, 1);
  currentProcess.steps.splice(index, 1);
  updateMetaDisplay();
  renderFlowBuilder();
}

function moveStage(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= currentProcess.stages.length) return;

  const tempStage = currentProcess.stages[index];
  currentProcess.stages[index] = currentProcess.stages[newIndex];
  currentProcess.stages[newIndex] = tempStage;

  const tempStep = currentProcess.steps[index];
  currentProcess.steps[index] = currentProcess.steps[newIndex];
  currentProcess.steps[newIndex] = tempStep;

  renderFlowBuilder();
}

async function saveProcessBuilder() {
  const nameInput = document.getElementById("newProcessName");
  const nameVal = nameInput ? nameInput.value.trim() : "";
  if (!nameVal) {
    alert("Please provide a process name before saving.");
    if (nameInput) nameInput.focus();
    return;
  }
  currentProcess.name = nameVal;

  const deptSelect = document.getElementById("newProcessDept");
  if (deptSelect) {
    currentProcess.department = deptSelect.value;
    currentProcess.category = deptSelect.value;
  }

  const compInput = document.getElementById("newProcessCompliance");
  if (compInput && compInput.value) {
    currentProcess.compliance = compInput.value.split(",").map(s => s.trim()).filter(Boolean);
  }

  const isExisting = !!currentProcess.id;

  try {
    const saved = await saveProcess(currentProcess);
    if (isExisting) {
      alert(`Process "${currentProcess.name}" updated successfully in database!`);
      sessionStorage.setItem("view_process_id", currentProcess.id);
      sessionStorage.setItem("selected_process_id", currentProcess.id);
      const isHttp = window.location.protocol.startsWith('http');
      window.location.href = isHttp ? `processes?id=${encodeURIComponent(currentProcess.id)}` : `processes.html?id=${encodeURIComponent(currentProcess.id)}`;
    } else {
      alert(`New process "${currentProcess.name}" created and saved to library!`);
      const isHttp = window.location.protocol.startsWith('http');
      window.location.href = isHttp ? "processes" : "processes.html";
    }
  } catch (err) {
    console.error("Save process error:", err);
    alert("Failed to save process: " + (err.message || err));
  }
}

window.updateStageName = updateStageName;
window.updateStepType = updateStepType;
window.addStage = addStage;
window.deleteStage = deleteStage;
window.moveStage = moveStage;
window.saveProcessBuilder = saveProcessBuilder;

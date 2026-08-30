// js/pages/superuser/process-builder.js
let currentProcess = {
  id: null,
  name: "New Process",
  department: "Finance",
  category: "Finance",
  compliance: ["SOX"],
  stages: ["Data Collection", "Verification & Review", "Executive Sign-off"],
  steps: [
    { name: "Data Collection", stepType: "INPUT", description: "Upload source documentation" },
    { name: "Verification & Review", stepType: "APPROVAL", description: "Review and approve data" },
    { name: "Executive Sign-off", stepType: "APPROVAL", description: "Final manager authorization" }
  ]
};

document.addEventListener("DOMContentLoaded", async () => {
  if (window.Sidebar) {
    window.Sidebar.render("workflows");
  }

  const urlParams = new URLSearchParams(window.location.search);
  const processId = urlParams.get("id");

  if (processId) {
    const existing = await getProcessById(processId);
    if (existing) {
      currentProcess = { ...existing };
      if (!currentProcess.stages || !currentProcess.stages.length) {
        currentProcess.stages = ["Stage 1", "Stage 2"];
      }
    }
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
  if (mComp) mComp.textContent = Array.isArray(currentProcess.compliance) ? currentProcess.compliance.join(", ") : "None";
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
      <div style="font-size: 12px; color: var(--text-muted, #64748b);">
        Step Type: 
        <select class="form-control" style="display: inline-block; width: 140px; margin-left: 6px; height: 30px; padding: 2px 8px; font-size: 12px;" onchange="updateStepType(${index}, this.value)">
          <option value="INPUT" ${currentProcess.steps[index]?.stepType === 'INPUT' ? 'selected' : ''}>Data Input</option>
          <option value="APPROVAL" ${currentProcess.steps[index]?.stepType === 'APPROVAL' ? 'selected' : ''}>Approval</option>
          <option value="ACTION" ${currentProcess.steps[index]?.stepType === 'ACTION' ? 'selected' : ''}>Task Action</option>
          <option value="AUTOMATED_CHECK" ${currentProcess.steps[index]?.stepType === 'AUTOMATED_CHECK' ? 'selected' : ''}>Automated Check</option>
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
  currentProcess.steps.push({ name: `Stage ${newNum}`, stepType: "ACTION" });
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
  if (nameInput && nameInput.value.trim()) {
    currentProcess.name = nameInput.value.trim();
  }

  await saveProcess(currentProcess);
  alert("Process saved successfully!");
  window.location.href = "processes.html";
}

window.updateStageName = updateStageName;
window.updateStepType = updateStepType;
window.addStage = addStage;
window.deleteStage = deleteStage;
window.moveStage = moveStage;
window.saveProcessBuilder = saveProcessBuilder;

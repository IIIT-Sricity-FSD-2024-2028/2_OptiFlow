// js/pages/workflow-builder.js

let builderStages = [];

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const wfId = params.get("id");
  const workflows = getWorkflows();

  if (wfId) {
    let wf = workflows.find((w) => w.id === wfId);
    if (wf) {
      document.getElementById("builderTitle").innerHTML =
        `<span class="muted">${wf.name}</span> › Workflow Builder`;
      if (document.getElementById("processHeaderEdit"))
        document.getElementById("processHeaderEdit").style.display = "none";
      if (document.getElementById("processMetaDisplay"))
        document.getElementById("processMetaDisplay").style.display = "flex";

      if (document.getElementById("metaProcessName"))
        document.getElementById("metaProcessName").innerText = wf.name;
      if (document.getElementById("metaProcessDept"))
        document.getElementById("metaProcessDept").innerText = wf.department;
      if (document.getElementById("metaProcessCompliance"))
        document.getElementById("metaProcessCompliance").innerText =
          wf.compliance.join(" · ");

      // Map stages for builder
      builderStages = wf.stages.map((stg, idx) => ({
        name: stg.replace("+2", "Optional Step").replace("+3", "Cleanup"),
        role: "Unassigned",
        tags: wf.compliance || [],
        active: false,
      }));
      if (builderStages.length > 0) builderStages[0].active = true;
    }
  } else {
    // New Process
    document.getElementById("builderTitle").innerHTML =
      `<span class="muted">New Process</span> › Workflow Builder`;
    if (document.getElementById("processHeaderEdit"))
      document.getElementById("processHeaderEdit").style.display = "block";
    if (document.getElementById("processMetaDisplay"))
      document.getElementById("processMetaDisplay").style.display = "none";

    builderStages = [
      { name: "New Draft Stage", role: "Unassigned", tags: [], active: true },
    ];
  }

  renderBuilderCanvas();
});

function renderBuilderCanvas() {
  const container = document.getElementById("flowContainer");
  if (!container) return;

  document.getElementById("stgCount").innerText = builderStages.length;

  let html = "";

  builderStages.forEach((stg, idx) => {
    if (idx > 0) html += `<div class="timeline-edge"></div>`;

    const tagsHtml = stg.tags
      .map((tag) => {
        if (tag === "Evidence")
          return `<span class="badge" style="background:#EFF6FF; color:#3B82F6;">${tag}</span>`;
        if (tag === "Approval")
          return `<span class="badge" style="background:#DCFCE7; color:#166534;">${tag}</span>`;
        if (tag === "SOX")
          return `<span class="badge" style="background:#FEE2E2; color:#DC2626;">${tag}</span>`;
        return createBadge(tag, "gray");
      })
      .join("");

    html += `
            <div class="timeline-card ${stg.active ? "active" : ""}">
                <div class="card-header" onclick="toggleStage(${idx})">
                    <div class="node-number">${idx + 1}</div>
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
    name: "New Draft Stage",
    role: "Unassigned",
    tags: [],
    active: true,
  });

  builderStages.forEach((s, idx) => {
    s.active = idx === builderStages.length - 1;
  });

  renderBuilderCanvas();

  // Scroll to bottom
  const tc = document.querySelector(".timeline-container");
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

// ─── Collect current builder state into a workflow object ─────────────────────
function collectProcessData(status) {
  const params = new URLSearchParams(window.location.search);
  const wfId = params.get("id");
  const isNew = !wfId;

  const name = isNew
    ? document.getElementById("newProcessName")?.value.trim() ||
      "Untitled Process"
    : document.getElementById("metaProcessName")?.innerText ||
      "Untitled Process";
  const deptRaw = isNew
    ? document.getElementById("newProcessDept")?.value || "General"
    : document.getElementById("metaProcessDept")?.innerText || "General";
  const department = deptRaw.includes("Dept") ? deptRaw : deptRaw + " Dept";
  const compRaw = isNew
    ? document.getElementById("newProcessCompliance")?.value || ""
    : document.getElementById("metaProcessCompliance")?.innerText || "";
  const compliance = compRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const stages = builderStages.map((s) => s.name);
  const now = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    id: wfId || "wf-" + Date.now(),
    name,
    department,
    totalStages: stages.length,
    stages,
    compliance: compliance.length ? compliance : ["General"],
    status,
    runs: 0,
    lastModified: now,
  };
}

function saveProcessDraft() {
  const wfData = collectProcessData("Draft");
  _upsertWorkflow(wfData);
  _setStatusText("Draft saved ✓");
}

function publishProcess() {
  const wfData = collectProcessData("Active");
  _upsertWorkflow(wfData);
  _setStatusText("Published ✓");
  setTimeout(() => {
    window.location.href = "workflows.html";
  }, 800);
}

function _upsertWorkflow(wfData) {
  const workflows = getWorkflows();
  const idx = workflows.findIndex((w) => w.id === wfData.id);
  if (idx > -1) {
    workflows[idx] = { ...workflows[idx], ...wfData };
  } else {
    workflows.push(wfData);
  }
  saveWorkflows(workflows);
}

function _setStatusText(msg) {
  const el = document.querySelector(".status-text");
  if (el) {
    el.textContent = msg;
    el.style.color = "#166534";
    el.style.fontWeight = "600";
    setTimeout(() => {
      el.textContent = "Unsaved changes";
      el.style.color = "";
      el.style.fontWeight = "";
    }, 3000);
  }
}

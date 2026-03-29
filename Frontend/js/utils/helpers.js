// js/utils/helpers.js

function createBadge(text, colorClass) {
  return `<span class="badge ${colorClass}">${text}</span>`;
}

function processComplianceTags(compliances) {
  return compliances
    .map((c) => {
      if (c.includes("SOX")) return createBadge(c, "purple");
      if (c.includes("ISO")) return createBadge(c, "yellow");
      return createBadge(c, "green");
    })
    .join("");
}

function processStageTags(stages) {
  return stages
    .map((s) => {
      if (s.startsWith("+")) return createBadge(s, "gray");
      return createBadge(s, "gray");
    })
    .join("");
}

function renderStatusTag(status) {
  if (status === "Active") return createBadge(status, "green");
  if (status === "Draft") return createBadge(status, "gray");
  return createBadge(status, "gray");
}

function renderUsageBar(runs) {
  const max = 15;
  const pct = Math.min((runs / max) * 100, 100);
  return `
        <div class="progress-container">
            <div class="progress-bar" style="width: ${pct}%"></div>
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">${runs} uses</div>
    `;
}

function logout() {
  // In a real app this clears tokens
  alert("Logging out...");
  window.location.href = "../login.html";
}

function openNewProcessModal() {
  window.location.href = "workflow-builder.html";
}

document.addEventListener("DOMContentLoaded", () => {
  initNotifications();
});

function initNotifications() {
  const bell = document.querySelector('button[aria-label="Notifications"]');
  if (!bell) return;

  const dropdown = document.createElement("div");
  dropdown.id = "globalNotificationPanel";
  dropdown.style.cssText = `
        position: absolute; width: 380px; background: var(--card-bg); border: 1px solid var(--border-color);
        border-radius: 8px; box-shadow: 0 12px 30px rgba(0,0,0,0.1); z-index: 9999; display: none;
        flex-direction: column; overflow: hidden; cursor: default;
    `;

  dropdown.innerHTML = `
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-color);">
            <span style="font-weight: 600; font-size: 14px; color: var(--text-main);">Notifications</span>
            <span id="markAllReadBtn" style="font-size: 12px; color: var(--primary-color); cursor: pointer; font-weight: 500;">Mark all as read</span>
        </div>
        <div id="notifyList" style="max-height: 400px; overflow-y: auto;">
            <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; gap: 14px; align-items: flex-start; cursor: pointer;">
                <div style="width: 8px; height: 8px; background: #EF4444; border-radius: 50%; margin-top: 6px; flex-shrink: 0;"></div>
                <div>
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Finance Q4 Report Overdue</div>
                    <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">Stage 3 (Department Review) is delayed by 2 days. Escalation protocols met.</div>
                    <div style="font-size: 11px; color: #94A3B8; margin-top: 6px;">2 hours ago</div>
                </div>
            </div>
            <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; gap: 14px; align-items: flex-start; cursor: pointer;">
                <div style="width: 8px; height: 8px; background: #EF4444; border-radius: 50%; margin-top: 6px; flex-shrink: 0;"></div>
                <div>
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">New End User Request</div>
                    <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">Rahul Sharma (Sales) requested OfficeSync configuration portal access.</div>
                    <div style="font-size: 11px; color: #94A3B8; margin-top: 6px;">5 hours ago</div>
                </div>
            </div>
            <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); opacity: 0.6; display: flex; gap: 14px; align-items: flex-start; cursor: pointer;">
                <div style="width: 8px; height: 8px; background: transparent; border-radius: 50%; margin-top: 6px; flex-shrink: 0;"></div>
                <div>
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Compliance Scan Complete</div>
                    <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">Weekly automated SOX and IFRS compliance scans resulted in 0 anomalies.</div>
                    <div style="font-size: 11px; color: #94A3B8; margin-top: 6px;">Yesterday</div>
                </div>
            </div>
        </div>
        <div id="viewAllAlertsBtn" style="padding: 12px; text-align: center; border-top: 1px solid var(--border-color); font-size: 12px; color: var(--primary-color); cursor: pointer; font-weight: 600; background: var(--card-bg);">
            View All Internal Alerts
        </div>
    `;

  document.body.appendChild(dropdown);

  document.getElementById("markAllReadBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const dots = document.querySelectorAll(
      "#notifyList > div > div:first-child",
    );
    dots.forEach((d) => (d.style.background = "transparent"));

    const bellDot = bell.querySelector("span");
    if (bellDot) bellDot.style.display = "none";

    const items = document.querySelectorAll("#notifyList > div");
    items.forEach((i) => (i.style.opacity = "0.6"));
  });

  document.getElementById("viewAllAlertsBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    window.location.href = "audit.html";
  });

  bell.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dropdown.style.display === "flex") {
      dropdown.style.display = "none";
    } else {
      const rect = bell.getBoundingClientRect();
      // Dropdown aligns to right edge of button and renders downwards
      dropdown.style.top = rect.bottom + 12 + "px";
      dropdown.style.right = window.innerWidth - rect.right + "px";
      dropdown.style.display = "flex";
    }
  });

  document.addEventListener("click", (e) => {
    if (dropdown.style.display === "flex" && !dropdown.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });
}

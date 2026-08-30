// js/pages/compliance/compliance.js
// Main Compliance UI Manager — Multi-Tenant State Integration & Role-Based Visibility Control

window.ComplianceUI = {
  getCurrentRole() {
    const presetKey = window.ACTIVE_PRESET_KEY;
    const preset = presetKey && window.TEST_ACTOR_PRESETS ? window.TEST_ACTOR_PRESETS[presetKey] : null;
    if (preset) return preset.role.toLowerCase();

    const sessionRaw = sessionStorage.getItem("currentUser");
    if (sessionRaw) {
      try {
        const session = JSON.parse(sessionRaw);
        return (session.role || session.roleName || "team_member").toLowerCase();
      } catch (e) {}
    }
    return "team_member";
  },

  isTeamMember() {
    const role = this.getCurrentRole();
    return role === "team_member" || role === "team member";
  },

  enforceRolePermissions() {
    const isMember = this.isTeamMember();

    // 1. Compliance Rules Page: Hide "New Rule" button for Team Members
    const newRuleBtn = document.getElementById("btn-new-rule");
    if (newRuleBtn) {
      newRuleBtn.style.display = isMember ? "none" : "inline-flex";
    }

    // 2. Compliance Violations Page: Hide Action Buttons (Mark Resolved / Escalate) for Team Members
    const markResolvedBtn = document.getElementById("btn-mark-resolved");
    const escalateBtn = document.getElementById("btn-escalate");
    const vdFooter = document.querySelector(".vd-footer");

    if (isMember) {
      if (markResolvedBtn) markResolvedBtn.style.display = "none";
      if (escalateBtn) escalateBtn.style.display = "none";
      if (vdFooter) vdFooter.style.display = "none";
    }

    // 3. Compliance Evidence Page: Hide Approve / Reject buttons for Team Members
    const approveEvBtn = document.getElementById("btn-approve-evidence");
    const rejectEvBtn = document.getElementById("btn-reject-evidence");
    if (isMember) {
      if (approveEvBtn) approveEvBtn.style.display = "none";
      if (rejectEvBtn) rejectEvBtn.style.display = "none";
    }

    // 4. Reports Page: Disable / Hide report generation controls for Team Members
    const generateBtn = document.getElementById("btn-generate");
    if (generateBtn && isMember) {
      generateBtn.disabled = true;
      generateBtn.title = "Only Compliance Officers and Managers can generate reports.";
      generateBtn.style.opacity = "0.5";
      generateBtn.style.cursor = "not-allowed";
    }
  },

  async init() {
    this.enforceRolePermissions();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.ComplianceUI.init();
});

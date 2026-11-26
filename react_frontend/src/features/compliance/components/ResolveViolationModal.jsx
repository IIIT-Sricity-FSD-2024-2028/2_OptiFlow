import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import { apiClient } from "../../../services/api/client";
import { useDispatch } from "react-redux";
import { resolveComplianceViolation } from "../../../store/complianceViolations";
import { ShieldCheck, AlertTriangle, Bell } from "lucide-react";

export function ResolveViolationModal({
  isOpen,
  onClose,
  violation,
  onResolved,
  initialTab = "RESOLVE",
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // "RESOLVE" | "NOTIFY"
  const [resolutionMode, setResolutionMode] = useState("VERIFIED"); // "VERIFIED" | "WAIVER"
  const [waiverType, setWaiverType] = useState("PROVISIONAL_EXEMPTION");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [sendNoticeOnResolve, setSendNoticeOnResolve] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const dispatch = useDispatch();

  const recipientOptions = useMemo(() => {
    const list = [];
    const seen = new Set();
    const pushTarget = (u, roleLabel) => {
      if (!u?.id || seen.has(u.id)) return;
      seen.add(u.id);
      list.push({
        id: u.id,
        fullName: u.fullName || null,
        email: u.email || null,
        roleLabel,
      });
    };
    (violation?.notificationTargets || []).forEach((t) =>
      pushTarget(t, t.roleLabel || "Contact"),
    );
    pushTarget(violation?.teamLead, "Team Leader");
    pushTarget(violation?.entityOwner, "Entity Owner");
    return list;
  }, [violation]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab || "RESOLVE");
    setError(null);
    setSuccessMsg(null);
    setSendNoticeOnResolve(false);
    const defaultTarget =
      recipientOptions.find((t) => /team lead/i.test(t.roleLabel))?.id ||
      recipientOptions[0]?.id ||
      "";
    setSelectedTargetId(defaultTarget);
  }, [isOpen, initialTab, violation?.id, recipientOptions]);

  const resolvedTargetUserIds = useMemo(() => {
    if (selectedTargetId === "__ALL__") {
      return recipientOptions.map((t) => t.id);
    }
    return selectedTargetId ? [selectedTargetId] : [];
  }, [selectedTargetId, recipientOptions]);

  const selectedTargetLabel = useMemo(() => {
    if (selectedTargetId === "__ALL__") {
      return recipientOptions
        .map((t) => `${t.fullName || t.email} (${t.roleLabel})`)
        .join(" & ");
    }
    const found = recipientOptions.find((t) => t.id === selectedTargetId);
    if (found) {
      return `${found.fullName || found.email} (${found.roleLabel})`;
    }
    return violation?.entityOwner?.fullName || violation?.entityOwner?.email || "Team Leader / Entity Owner";
  }, [selectedTargetId, recipientOptions, violation]);

  const isAlreadyResolved = violation?.status === "Resolved";

  const handleResolve = async () => {
    const minLen = resolutionMode === "WAIVER" ? 10 : 5;
    if (!violation || isAlreadyResolved || resolutionNotes.trim().length < minLen) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const violationId = violation.id || violation.rawViolation?.id;
      const remarksPrefix = resolutionMode === "VERIFIED" ? "[Verified Remediation] " : "";
      const finalRemarks = remarksPrefix + resolutionNotes.trim();
      await dispatch(
        resolveComplianceViolation({
          id: violationId,
          waiverType: resolutionMode === "WAIVER" ? waiverType : "VERIFIED_REMEDIATION",
          resolutionRemarks: finalRemarks,
          notifyTeamLead: sendNoticeOnResolve,
          notifyUserIds: sendNoticeOnResolve ? resolvedTargetUserIds : undefined,
          notifyMessage: sendNoticeOnResolve ? resolutionNotes.trim() : undefined,
        }),
      ).unwrap();

      setResolutionNotes("");
      setSendNoticeOnResolve(false);
      onResolved?.();
      onClose();
    } catch (err) {
      setError("Failed to resolve violation: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendNotice = async () => {
    if (!violation) return;
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const violationId = violation.id || violation.rawViolation?.id;
      const msg = noticeMessage.trim() || `Remediation required for compliance rule "${violation.rule?.name || 'Policy'}". Please update the entity or provide required evidence.`;

      const payload = { message: msg };
      if (resolvedTargetUserIds.length > 0) {
        payload.targetUserIds = resolvedTargetUserIds;
      } else {
        payload.targetRole = "team_lead";
      }

      const res = await apiClient(`/api/compliance-violations/${violationId}/notify-owner`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const deliveredNames = Array.isArray(res?.recipients) && res.recipients.length > 0
        ? res.recipients.map((r) => r.fullName || r.email).join(", ")
        : selectedTargetLabel;
      setSuccessMsg(`Compliance notice delivered to ${deliveredNames}!`);
      setNoticeMessage("");
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1400);
    } catch (err) {
      setError("Failed to send notice: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const entityOwnerName = violation?.entityOwner?.fullName || violation?.entityOwner?.email || "Entity Owner";
  const entityOwnerEmail = violation?.entityOwner?.email || "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setResolutionNotes("");
        setNoticeMessage("");
        setError(null);
        setSuccessMsg(null);
        setSendNoticeOnResolve(false);
        setActiveTab(initialTab || "RESOLVE");
        onClose();
      }}
      title="Compliance Action & Remediation Hub"
      footer={
        activeTab === "RESOLVE" ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant={resolutionMode === "WAIVER" ? "warning" : "primary"}
              onClick={handleResolve}
              disabled={
                isSubmitting ||
                isAlreadyResolved ||
                resolutionNotes.trim().length < (resolutionMode === "WAIVER" ? 10 : 5)
              }
            >
              {isSubmitting
                ? "Processing..."
                : resolutionMode === "WAIVER"
                ? "Grant Waiver & Unblock"
                : "Confirm Remediation & Resolve"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSendNotice}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Dispatching..." : "Send Urgent Notification"}
            </Button>
          </>
        )
      }
    >
      {error && (
        <div className="mb-4 text-sm text-red-800 bg-red-50 p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 text-sm text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200 font-medium">
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab("RESOLVE")}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "RESOLVE"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShieldCheck size={14} />
          <span>Remediate & Close</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("NOTIFY")}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "NOTIFY"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Bell size={14} />
          <span>Notify Entity Owner</span>
        </button>
      </div>

      {activeTab === "RESOLVE" ? (
        <div className="space-y-4">
          {/* Resolution Mode Switcher */}
          <div className="flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setResolutionMode("VERIFIED")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                resolutionMode === "VERIFIED"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Verified Remediation
            </button>
            <button
              type="button"
              onClick={() => setResolutionMode("WAIVER")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                resolutionMode === "WAIVER"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Policy Waiver / Exemption
            </button>
          </div>

          {resolutionMode === "VERIFIED" ? (
            <div className="flex gap-3 text-xs text-blue-900 bg-blue-50/80 p-3.5 rounded-lg border border-blue-200">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-blue-600 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-0.5">Audit-Verified Remediation</strong>
                Confirm that the required task condition, review sign-off, or deliverable requirement has been satisfied. The violation will be marked as Resolved with your officer stamp.
              </div>
            </div>
          ) : (
            <div className="flex gap-3 text-xs text-amber-900 bg-amber-50/80 p-3.5 rounded-lg border border-amber-200">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-0.5">Regulatory Exception / Policy Waiver</strong>
                Granting a waiver lifts active governance locks and resolves the violation. Your officer identity, waiver classification, and legal justification will be permanently recorded in the immutable compliance audit log.
              </div>
            </div>
          )}

          {resolutionMode === "WAIVER" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Waiver Classification *
              </label>
              <select
                value={waiverType}
                onChange={(e) => setWaiverType(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
              >
                <option value="PROVISIONAL_EXEMPTION">
                  Provisional Exemption (Temporary unblock until next sprint / audit)
                </option>
                <option value="PERMANENT_WAIVER">
                  Permanent Policy Waiver (Scope-specific regulatory exemption)
                </option>
                <option value="FALSE_POSITIVE">
                  False Positive (Deliverable verified through alternative evidence)
                </option>
                <option value="ADMIN_OVERRIDE">
                  Executive Directive (Emergency business continuity override)
                </option>
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              {resolutionMode === "WAIVER" ? "Regulatory Justification & Audit Notes *" : "Remediation Verification Remarks *"}
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none transition-shadow"
              rows={4}
              placeholder={
                resolutionMode === "WAIVER"
                  ? "Explain why this waiver is legally/operationally justified (e.g. Pen test scheduled for Oct 30; CTO signed ticket SEC-104)..."
                  : "Detail how the policy condition was met (e.g. Code reviewed and approved by Tech Lead, artifact verified in vault)..."
              }
            />
            <span className="text-[11px] text-slate-400">
              Minimum {resolutionMode === "WAIVER" ? 10 : 5} characters required.
            </span>
          </div>

          {recipientOptions.length > 0 && !isAlreadyResolved && (
            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={sendNoticeOnResolve}
                onChange={(e) => setSendNoticeOnResolve(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-xs text-slate-700 leading-snug">
                Also send these remarks as a notification to{" "}
                <strong className="text-slate-900">{selectedTargetLabel}</strong>
              </span>
            </label>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Violating Entity:</span>
              <span className="font-semibold text-slate-900">{violation?.entityName || "Entity"}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Entity Owner:</span>
              <span className="font-semibold text-slate-900">
                {entityOwnerName} {entityOwnerEmail ? `(${entityOwnerEmail})` : ""}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Policy Violated:</span>
              <span className="font-semibold text-rose-600">{violation?.rule?.name || "Rule"}</span>
            </div>
          </div>

          {recipientOptions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Notify Recipient *
              </label>
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:ring-2 focus:ring-blue-600 outline-none font-medium"
              >
                {recipientOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.roleLabel}: {opt.fullName || opt.email}{opt.email ? ` (${opt.email})` : ""}
                  </option>
                ))}
                {recipientOptions.length > 1 && (
                  <option value="__ALL__">
                    All Listed Contacts ({recipientOptions.length})
                  </option>
                )}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Remediation Instructions / Message *
            </label>
            <textarea
              value={noticeMessage}
              onChange={(e) => setNoticeMessage(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none transition-shadow"
              rows={4}
              placeholder={`Notice to ${selectedTargetLabel}: Please resolve this violation by attaching the required sign-off deliverable or updating task details.`}
            />
            <p className="text-[11px] text-slate-500">
              This will send an immediate high-priority <strong>Compliance Notification</strong> to{" "}
              {selectedTargetLabel}&apos;s notification bell.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

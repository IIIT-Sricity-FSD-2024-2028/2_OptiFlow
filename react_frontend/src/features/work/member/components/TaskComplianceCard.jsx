import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  Mail,
  Send,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { Button } from '../../../../shared/components/Button';

export default function TaskComplianceCard({
  primaryViolation,
  isEvidenceRequired,
  latestRejectedEvidence,
  isLockedOut,
  complianceRule,
  getSlaTimeRemaining,
  onOpenEvidenceModal,
}) {
  if (!primaryViolation && !isEvidenceRequired && !latestRejectedEvidence) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl p-6 border shadow-xs transition-all ${
        isLockedOut
          ? 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-200'
          : primaryViolation
          ? 'bg-amber-50/80 border-amber-300'
          : 'bg-blue-50/70 border-blue-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isLockedOut
                ? 'bg-rose-600 text-white shadow-xs'
                : primaryViolation
                ? 'bg-amber-500 text-white'
                : 'bg-blue-600 text-white'
            }`}
          >
            {isLockedOut ? <AlertOctagon size={24} /> : <ShieldAlert size={24} />}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isLockedOut
                    ? 'bg-rose-200 text-rose-900'
                    : primaryViolation
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-blue-200 text-blue-900'
                }`}
              >
                {isLockedOut
                  ? '🚨 Governance Lockout Engaged'
                  : primaryViolation
                  ? '⚠️ Remediation SLA Active'
                  : '🛡️ Evidence Policy Active'}
              </span>
              {primaryViolation?.severity && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                  Severity: {primaryViolation.severity}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {primaryViolation?.rule?.name || complianceRule?.name || 'Deliverable Compliance Policy'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              {primaryViolation?.description ||
                complianceRule?.description ||
                'This deliverable requires formal regulatory documentation and audit evidence prior to completion.'}
            </p>
          </div>
        </div>

        <div className="flex sm:flex-col items-end gap-2 shrink-0">
          <Button
            variant={isLockedOut ? 'danger' : 'primary'}
            size="sm"
            onClick={onOpenEvidenceModal}
            className="text-xs font-semibold shadow-xs flex items-center gap-1.5"
          >
            <Send size={13} />
            <span>Upload Remediation Evidence</span>
          </Button>
        </div>
      </div>

      {/* Rejection Alert Banner if officer rejected previous upload */}
      {latestRejectedEvidence && (
        <div className="mt-4 p-3.5 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Prior Submission Rejected by Compliance Officer: </span>
            <span>"{latestRejectedEvidence.rejectionReason}"</span>
            <p className="mt-1 text-[11px] text-rose-700">
              Please resolve the feedback above and submit revised documentation.
            </p>
          </div>
        </div>
      )}

      {/* Metadata Grid: Officer Contact, SLA Countdown, Policy Scope */}
      <div className="mt-4 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-slate-500 font-medium block">Assigned Compliance Officer:</span>
          <div className="mt-0.5 font-bold text-slate-900 flex items-center gap-1">
            <UserCheck size={13} className="text-blue-600" />
            <span>
              {primaryViolation?.assignedOfficer?.fullName ||
                primaryViolation?.rule?.assignedOfficer?.fullName ||
                'Compliance Governance Office'}
            </span>
          </div>
          <a
            href={`mailto:${
              primaryViolation?.assignedOfficer?.email ||
              primaryViolation?.rule?.assignedOfficer?.email ||
              'compliance@optiflow.io'
            }`}
            className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
          >
            <Mail size={11} />
            <span>
              {primaryViolation?.assignedOfficer?.email ||
                primaryViolation?.rule?.assignedOfficer?.email ||
                'compliance@optiflow.io'}
            </span>
          </a>
        </div>

        <div>
          <span className="text-slate-500 font-medium block">Remediation SLA Deadline:</span>
          {primaryViolation?.dueDate ? (
            <div className="mt-0.5">
              <span
                className={`font-bold flex items-center gap-1 ${
                  isLockedOut ? 'text-rose-700' : 'text-slate-900'
                }`}
              >
                <Clock size={13} className={isLockedOut ? 'text-rose-600' : 'text-amber-600'} />
                <span>{new Date(primaryViolation.dueDate).toLocaleString()}</span>
              </span>
              <span
                className={`text-[11px] font-semibold ${
                  isLockedOut ? 'text-rose-600' : 'text-amber-700'
                }`}
              >
                {isLockedOut
                  ? '⛔ Deadline Breached (Lockout active)'
                  : getSlaTimeRemaining
                  ? getSlaTimeRemaining(primaryViolation.dueDate)?.text || 'Pending evaluation'
                  : 'Pending evaluation'}
              </span>
            </div>
          ) : (
            <span className="font-semibold text-slate-700 mt-0.5 block">Standard SLA Window</span>
          )}
        </div>

        <div>
          <span className="text-slate-500 font-medium block">Resolution Actions:</span>
          <p className="mt-0.5 text-[11px] text-slate-600 leading-normal">
            {isLockedOut ? (
              <>
                1. Upload remediation evidence.<br />
                2. Contact officer for Fast-Track Waiver.<br />
                3. Request PM deadline extension.
              </>
            ) : (
              <>
                Submit evidence before deadline to maintain continuous task workflow.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

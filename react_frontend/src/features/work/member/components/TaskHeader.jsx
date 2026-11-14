import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  AlertTriangle,
  Send,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  Check,
} from 'lucide-react';
import { Button } from '../../../../shared/components/Button';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { PATHS } from '../../../../app/paths';

export default function TaskHeader({
  task,
  taskId,
  project,
  managerName,
  dueDate,
  isOverdue,
  isCompleted,
  isPendingReview,
  isLockedOut,
  isEvidenceRequired,
  complianceRule,
  stages,
  onOpenExtensionModal,
  onOpenBlockerModal,
  onOpenSubmitModal,
}) {
  const navigate = useNavigate();

  return (
    <>
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Link to={PATHS.MEMBER.DASHBOARD} className="hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          <span>›</span>
          <Link to={PATHS.MEMBER.TASKS} className="hover:text-blue-600 transition-colors">
            My Tasks
          </Link>
          <span>›</span>
          <span className="text-slate-800 font-semibold truncate max-w-xs">{task.title}</span>
        </div>

        <button
          type="button"
          onClick={() => navigate(PATHS.MEMBER.TASKS)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to tasks</span>
        </button>
      </div>

      {/* Main Task Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                TASK-{String(task.id || taskId).slice(0, 8)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {project?.name || 'General Process'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">
                Assigned by <strong className="text-slate-800">{managerName}</strong>
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              {task.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>
                  Due:{' '}
                  <strong className={isOverdue ? 'text-rose-600' : 'text-slate-700'}>
                    {dueDate ? new Date(dueDate).toLocaleDateString() : 'No deadline'}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  Estimated:{' '}
                  <strong className="text-slate-700">
                    {task.estimatedHours || task.estimated_hours || 0} hrs
                  </strong>
                </span>
              </div>

              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} isOverdue={isOverdue} />
              {isLockedOut ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                  title="Compliance SLA expired. Remediation lockout active."
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                  Governance Lockout
                </span>
              ) : isEvidenceRequired ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                  title={`Mandated by compliance rule: ${complianceRule?.name || 'Evidence Policy'}`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  Evidence Required
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200/80">
                  <Check className="w-3 h-3 text-slate-400" />
                  Evidence Optional
                </span>
              )}
            </div>
          </div>

          {/* Member Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isCompleted && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenExtensionModal}
                  className="text-xs font-semibold"
                >
                  Request Extension
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenBlockerModal}
                  className="text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 mr-1.5" />
                  Report Blocker
                </Button>

                {isPendingReview ? (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled
                    className="text-xs font-semibold opacity-75 cursor-not-allowed bg-purple-600 hover:bg-purple-600"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Under Review by Lead
                  </Button>
                ) : isLockedOut ? (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled
                    className="text-xs font-semibold opacity-90 cursor-not-allowed bg-rose-600 hover:bg-rose-600 flex items-center gap-1.5"
                    title="Remediation deadline expired. Task completion locked by Compliance Governance."
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    Locked by Compliance
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onOpenSubmitModal}
                    className="text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Work for Review
                  </Button>
                )}
              </>
            )}

            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Task Completed & Approved
              </span>
            )}
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            {stages.map((stg, i) => (
              <React.Fragment key={stg.label}>
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      stg.done
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {stg.done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span
                    className={`text-[11px] font-semibold mt-1.5 ${
                      stg.done ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {stg.label}
                  </span>
                </div>
                {i < stages.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 -mt-4 transition-all ${
                      stages[i + 1].done ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

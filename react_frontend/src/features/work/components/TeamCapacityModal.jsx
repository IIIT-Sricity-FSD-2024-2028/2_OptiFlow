import { AlertTriangle, Clock, Users } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';

/**
 * Pop-up alert shown when a PM enters estimated hours that exceed what the
 * project's available team can complete before the chosen deadline.
 */
export function TeamCapacityModal({
  isOpen,
  onClose,
  capacityCheck,
  dueDate,
  workHoursPerDay = 8,
  allowOverride = false,
  onConfirmOverride = null,
}) {
  if (!isOpen || !capacityCheck) return null;

  const {
    estHours,
    workingDays,
    perPersonHours,
    teamCount,
    maxTeamHours,
    peopleNeeded,
    shortfallHours,
  } = capacityCheck;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Team Cannot Handle These Hours"
      footer={(
        <>
          {allowOverride && typeof onConfirmOverride === 'function' && (
            <Button variant="outline" onClick={onConfirmOverride}>
              Create Anyway
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            Adjust Hours or Deadline
          </Button>
        </>
      )}
    >
      <div className="space-y-4 text-sm text-slate-700">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 space-y-1">
            <p className="font-bold text-sm text-rose-900">
              {estHours}h is not achievable with your current team
            </p>
            <p className="leading-relaxed">
              {workingDays === 0
                ? `There are 0 working days left before ${dueDate}.`
                : `Before ${dueDate}, your team of ${teamCount} can handle at most ${maxTeamHours}h total (${perPersonHours}h per person across ${workingDays} working day(s) at ${workHoursPerDay}h/day).`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-slate-500 font-medium">Requested</p>
            <p className="text-base font-bold text-rose-700 mt-0.5">{estHours}h</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-slate-500 font-medium">Team Limit</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">{maxTeamHours}h</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-slate-500 font-medium">Shortfall</p>
            <p className="text-base font-bold text-amber-700 mt-0.5">{shortfallHours}h</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-600 space-y-1.5">
          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>How to make this plan feasible:</span>
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Reduce Estimated Hours to <strong>{maxTeamHours}h or less</strong>.</li>
            <li>Extend the Target Due Date to give your team more working days.</li>
            {Number.isFinite(peopleNeeded) && peopleNeeded > teamCount && (
              <li>
                Or expand the squad from <strong>{teamCount}</strong> to at least{' '}
                <strong>{peopleNeeded} team member(s)</strong>{' '}
                <span className="inline-flex items-center gap-0.5 text-slate-500">
                  (<Clock className="w-3 h-3 inline" /> {perPersonHours}h each)
                </span>.
              </li>
            )}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

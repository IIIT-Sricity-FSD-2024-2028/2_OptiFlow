import { Calendar, Clock, AlertTriangle, Sparkles, GitBranch, ShieldAlert } from 'lucide-react';
import { Button } from '../../../shared/components/Button';
import { isoDay, toUtcDay, getDependencyIds } from '../utils/scheduling';

/**
 * Displays task-level schedule capacity, critical path, review buffer,
 * warnings, and a mini horizontal Gantt timeline for subtasks.
 */
export function ScheduleTimelinePanel({
  task,
  subtasks = [],
  scheduleAnalysis = null,
  onAutoSchedule = null,
  autoScheduling = false,
}) {
  if (!task || !scheduleAnalysis) return null;

  const {
    workingDaysRemaining,
    availableWindowHours,
    reviewBufferDays,
    latestRecommendedSubtaskDue,
    criticalPathHours,
    criticalPathSubtaskIds = [],
    warnings = [],
  } = scheduleAnalysis;

  const criticalSet = new Set((criticalPathSubtaskIds || []).map(String));
  const taskDue = toUtcDay(task.dueDate);
  const anchorStart = toUtcDay(new Date());
  const totalSpanMs = taskDue && anchorStart && taskDue > anchorStart
    ? taskDue.getTime() - anchorStart.getTime()
    : null;

  const timedSubtasks = subtasks.filter((st) => st.startDate || st.dueDate);
  const canAutoSchedule = typeof onAutoSchedule === 'function'
    && subtasks.some((st) => st.status !== 'Completed' && st.status !== 'Cancelled');

  return (
    <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Task Timeline &amp; Workload</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Based on {scheduleAnalysis.workHoursPerDay}h workdays, company holidays, and time kept for final review.
          </p>
        </div>
        {canAutoSchedule && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={autoScheduling}
            onClick={onAutoSchedule}
            title="Automatically space out subtask start and due dates while respecting dependencies"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            {autoScheduling ? 'Scheduling...' : 'Auto-Schedule Dates'}
          </Button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div
          className="rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2.5"
          title="Working hours 1 team member has before the due date (excludes weekends & holidays)"
        >
          <p className="text-[11px] font-semibold text-slate-700">Available Hours</p>
          <p className="font-bold text-slate-900 mt-0.5 text-sm">
            {availableWindowHours != null ? `${availableWindowHours}h` : 'No due date'}
            {workingDaysRemaining != null && (
              <span className="font-normal text-xs text-slate-500"> ({workingDaysRemaining}d)</span>
            )}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Per person before due date</p>
        </div>
        <div
          className="rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2.5"
          title="Longest chain of subtasks waiting on each other one after another"
        >
          <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
            <GitBranch className="w-3 h-3 text-slate-400" /> Step-by-Step Chain
          </p>
          <p className="font-bold text-slate-900 mt-0.5 text-sm">{criticalPathHours ?? 0}h</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Longest back-to-back chain</p>
        </div>
        <div
          className="rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2.5"
          title="Working days kept clear before the deadline so reviews don't run late"
        >
          <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" /> Time Kept for Review
          </p>
          <p className="font-bold text-slate-900 mt-0.5 text-sm">{reviewBufferDays ?? 0} work day(s)</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Reserved before deadline</p>
        </div>
        <div
          className="rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2.5"
          title="Recommended date for all subtasks to wrap up so review starts on time"
        >
          <p className="text-[11px] font-semibold text-slate-700">Finish Subtasks By</p>
          <p className="font-bold text-slate-900 mt-0.5 text-sm">{latestRecommendedSubtaskDue || '—'}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Leaves time for sign-off</p>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, idx) => {
            const isError = w.severity === 'error';
            return (
              <div
                key={`${w.code}-${idx}`}
                className={`rounded-xl border px-3.5 py-2.5 text-xs flex items-start gap-2.5 ${
                  isError
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
                role="status"
              >
                {isError
                  ? <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                <span>{w.message}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Visual Gantt / Timeline Strip */}
      {totalSpanMs && timedSubtasks.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Today ({isoDay(anchorStart)})</span>
            {latestRecommendedSubtaskDue && (
              <span className="text-amber-700">Review Window Starts: {latestRecommendedSubtaskDue}</span>
            )}
            <span>Task Due ({isoDay(taskDue)})</span>
          </div>

          <div className="space-y-2">
            {subtasks.map((st) => {
              const stId = String(st.id || st.subtaskId);
              const start = toUtcDay(st.startDate) || anchorStart;
              const end = toUtcDay(st.dueDate) || taskDue;
              const clampedStart = Math.max(anchorStart.getTime(), Math.min(taskDue.getTime(), start.getTime()));
              const clampedEnd = Math.max(clampedStart, Math.min(taskDue.getTime(), end.getTime()));
              const leftPct = Math.round(((clampedStart - anchorStart.getTime()) / totalSpanMs) * 100);
              const widthPct = Math.max(8, Math.round(((clampedEnd - clampedStart) / totalSpanMs) * 100));
              const isCrit = criticalSet.has(stId);
              const deps = getDependencyIds(st);

              return (
                <div key={stId} className="grid grid-cols-[150px_1fr] sm:grid-cols-[200px_1fr] items-center gap-3 text-xs">
                  <div className="truncate flex items-center gap-1.5">
                    <span className="truncate font-medium text-slate-700" title={st.title}>
                      {st.title}
                    </span>
                    {isCrit && (
                      <span
                        className="shrink-0 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700"
                        title="Part of the longest step-by-step chain of dependent subtasks"
                      >
                        Key chain
                      </span>
                    )}
                    {deps.length > 0 && (
                      <span className="shrink-0 text-[10px] text-slate-400" title={`${deps.length} prerequisite(s)`}>
                        ⛓{deps.length}
                      </span>
                    )}
                  </div>
                  <div className="relative h-5 rounded-md bg-white border border-slate-200 overflow-hidden">
                    <div
                      className={`absolute top-0.5 bottom-0.5 rounded ${
                        st.status === 'Completed'
                          ? 'bg-emerald-500'
                          : isCrit
                          ? 'bg-blue-600'
                          : 'bg-slate-500'
                      }`}
                      style={{ left: `${Math.min(92, leftPct)}%`, width: `${Math.min(100 - Math.min(92, leftPct), widthPct)}%` }}
                      title={`${isoDay(start)} → ${isoDay(end)} (${st.estimatedHours ?? 0}h)`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

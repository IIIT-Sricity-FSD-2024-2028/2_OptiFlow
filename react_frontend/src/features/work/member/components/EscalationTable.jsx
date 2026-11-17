import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import EmptyState from '../../../../shared/components/EmptyState';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { Button } from '../../../../shared/components/Button';

export default function EscalationTable({
  escalations,
  tasks = [],
  searchQuery,
  priorityFilter,
  statusFilter,
  onViewItem,
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
      {escalations.length === 0 ? (
        <div className="p-12">
          <EmptyState
            icon={<CheckCircle2 className="w-10 h-10 text-emerald-500" />}
            title="No blockers found"
            description={
              searchQuery || priorityFilter || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'You have no active blockers logged.'
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">Blocker Summary</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6">Priority</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Reported On</th>
                <th className="py-3.5 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {escalations.map((esc) => {
                const taskObj = tasks.find(
                  (t) => String(t.id || t.taskId) === String(esc.taskId || esc.task_id)
                );
                return (
                  <tr
                    key={esc.id}
                    onClick={() => onViewItem(esc)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6 max-w-xs">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {esc.title || 'Blocker Incident'}
                      </div>
                      {taskObj && (
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          Task: {taskObj.title}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                      <span className="font-medium px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        {esc.blockerType || 'General'}
                      </span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <PriorityBadge priority={esc.priority} />
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <StatusBadge status={esc.status || 'Active'} />
                    </td>
                    <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                      {esc.createdAt ? new Date(esc.createdAt).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewItem(esc);
                        }}
                        className="text-xs"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

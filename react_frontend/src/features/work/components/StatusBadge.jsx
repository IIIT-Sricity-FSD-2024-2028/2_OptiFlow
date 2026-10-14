import React from 'react';

export function StatusBadge({ status, isOverdue = false, className = '' }) {
  const s = String(status || 'Pending').replace(/_/g, ' ');
  const lower = s.toLowerCase();

  if (isOverdue && !lower.includes('complete') && !lower.includes('approved')) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100 ${className}`}>
        Overdue
      </span>
    );
  }

  if (lower.includes('complete') || lower.includes('approved')) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 ${className}`}>
        Completed
      </span>
    );
  }

  if (lower.includes('review')) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100 ${className}`}>
        Under Review
      </span>
    );
  }

  if (lower.includes('progress') || lower.includes('active')) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 ${className}`}>
        In Progress
      </span>
    );
  }

  if (lower.includes('blocked') || lower.includes('failed') || lower.includes('rejected')) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 ${className}`}>
        Blocked
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
      {s}
    </span>
  );
}

export function PriorityDot({ priority, className = '' }) {
  const p = String(priority || 'Medium').toLowerCase();
  let color = 'bg-emerald-500';

  if (p === 'high' || p === 'urgent' || p === 'critical') {
    color = 'bg-rose-500';
  } else if (p === 'medium') {
    color = 'bg-amber-500';
  }

  return <span className={`w-2.5 h-2.5 rounded-full shrink-0 inline-block ${color} ${className}`} />;
}

export function PriorityBadge({ priority, className = '' }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <PriorityDot priority={priority} />
      <span className="capitalize font-medium text-slate-700 text-xs">
        {priority || 'Medium'}
      </span>
    </div>
  );
}

export default StatusBadge;

import React from 'react';

/**
 * Humanizes raw audit log action strings into professional, enterprise SaaS action descriptors.
 */
const ACTION_MAP = {
  // Company actions
  'company.provision': { label: 'Company Provisioned', category: 'Tenant', dot: 'bg-emerald-500' },
  'company.create': { label: 'Company Registered', category: 'Tenant', dot: 'bg-emerald-500' },
  'company.suspend': { label: 'Company Suspended', category: 'Tenant', dot: 'bg-rose-500' },
  'company.reactivate': { label: 'Company Reactivated', category: 'Tenant', dot: 'bg-emerald-500' },
  'company.close': { label: 'Company Closed', category: 'Tenant', dot: 'bg-rose-500' },
  'company.update': { label: 'Company Updated', category: 'Tenant', dot: 'bg-slate-400' },

  // Plan actions
  'plan.create': { label: 'Plan Created', category: 'Commercial', dot: 'bg-blue-500' },
  'plan.update': { label: 'Plan Updated', category: 'Commercial', dot: 'bg-slate-400' },
  'plan.archive': { label: 'Plan Archived', category: 'Commercial', dot: 'bg-amber-500' },
  'plan.unarchive': { label: 'Plan Restored', category: 'Commercial', dot: 'bg-emerald-500' },

  // Subscription actions
  'subscription.assign': { label: 'Subscription Assigned', category: 'Commercial', dot: 'bg-emerald-500' },
  'subscription.status_override': { label: 'Status Overridden', category: 'Operations', dot: 'bg-amber-500' },
  'subscription.cancel': { label: 'Subscription Cancelled', category: 'Commercial', dot: 'bg-rose-500' },
  'subscription.update': { label: 'Subscription Updated', category: 'Commercial', dot: 'bg-slate-400' },

  // Support access actions
  'support_access.grant': { label: 'Support Access Granted', category: 'Security', dot: 'bg-emerald-500' },
  'support_access.revoke': { label: 'Support Access Revoked', category: 'Security', dot: 'bg-rose-500' },

  // Admin user actions
  'admin.create': { label: 'Admin Invited', category: 'Identity', dot: 'bg-blue-500' },
  'admin.update': { label: 'Admin Profile Updated', category: 'Identity', dot: 'bg-slate-400' },
  'admin.deactivate': { label: 'Admin Deactivated', category: 'Identity', dot: 'bg-rose-500' },
  'admin.password_change': { label: 'Password Changed', category: 'Security', dot: 'bg-slate-400' },
  'admin.reset_password': { label: 'Password Reset Issued', category: 'Security', dot: 'bg-amber-500' },

  // Audit export
  'audit.export': { label: 'Audit Trail Exported', category: 'Compliance', dot: 'bg-slate-400' },
};

export function formatAuditAction(action = '') {
  if (ACTION_MAP[action]) {
    return ACTION_MAP[action];
  }

  // Fallback for custom or unmapped actions
  const parts = action.split('.');
  const domain = parts[0] ? parts[0].replace(/_/g, ' ') : '';
  const verb = parts[1] ? parts[1].replace(/_/g, ' ') : '';

  const label = [
    domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : '',
    verb ? verb.charAt(0).toUpperCase() + verb.slice(1) : '',
  ].filter(Boolean).join(' ') || action || 'Action';

  const isDestructive = action.includes('suspend') || action.includes('delete') || action.includes('revoke') || action.includes('close');
  const isPositive = action.includes('create') || action.includes('grant') || action.includes('reactivate') || action.includes('provision');

  return {
    label,
    category: domain || 'System',
    dot: isDestructive ? 'bg-rose-500' : isPositive ? 'bg-emerald-500' : 'bg-slate-400',
  };
}

export function AuditActionBadge({ action, showRaw = false, className = '' }) {
  const meta = formatAuditAction(action);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
        <span>{meta.label}</span>
      </span>
      {showRaw && (
        <span className="text-[10px] font-mono text-slate-400 tracking-tight">
          {action}
        </span>
      )}
    </div>
  );
}

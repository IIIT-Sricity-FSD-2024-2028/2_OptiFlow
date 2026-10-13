import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../shared/components/Toast';
import { 
  Building2, 
  ShieldCheck, 
  Mail, 
  ArrowLeft, 
  Copy, 
  Check, 
  UserCircle,
  Briefcase
} from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [copiedKey, setCopiedKey] = useState(null);

  const formattedRole = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'User';

  const companyName = user?.company?.legalName || user?.company?.name || 'Acme Corporation';

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-6 text-slate-900">
      {/* Top Header & Breadcrumb */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="text-xs text-slate-500 mt-1">
          Identity credentials, assigned governance roles, and organization scope.
        </p>
      </div>

      {/* Main Profile Summary Card */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs ring-2 ring-slate-100">
            {getInitials(user?.fullName || user?.email)}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{user?.fullName || 'User Account'}</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                {formattedRole}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Mail size={12} className="text-slate-400" />
              <span>{user?.email}</span>
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Building2 size={12} className="text-slate-400" />
              <span>{companyName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Structured Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Account Information */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCircle size={16} className="text-slate-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Account Information</h3>
          </div>
          <dl className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1">
              <dt className="text-slate-500">Full Name</dt>
              <dd className="font-semibold text-slate-900">{user?.fullName || '—'}</dd>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-slate-50">
              <dt className="text-slate-500">Email Address</dt>
              <dd className="font-semibold text-slate-900">{user?.email || '—'}</dd>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-slate-50">
              <dt className="text-slate-500">User ID</dt>
              <dd className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                  {user?.id ? `${user.id.substring(0, 14)}…` : '—'}
                </span>
                {user?.id && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(user.id, 'userId')}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors"
                    title="Copy full User ID"
                  >
                    {copiedKey === 'userId' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Card 2: Organization & Scope */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Briefcase size={16} className="text-slate-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Organization & Scope</h3>
          </div>
          <dl className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1">
              <dt className="text-slate-500">Organization</dt>
              <dd className="font-semibold text-slate-900">{companyName}</dd>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-slate-50">
              <dt className="text-slate-500">System Role</dt>
              <dd className="font-semibold text-slate-900">{formattedRole}</dd>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-slate-50">
              <dt className="text-slate-500">Tenant ID</dt>
              <dd className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                  {user?.companyId ? `${user.companyId.substring(0, 14)}…` : '—'}
                </span>
                {user?.companyId && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(user.companyId, 'tenantId')}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors"
                    title="Copy full Tenant ID"
                  >
                    {copiedKey === 'tenantId' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

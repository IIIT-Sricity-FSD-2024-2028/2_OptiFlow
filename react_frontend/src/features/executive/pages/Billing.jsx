import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Calendar,
  Clock,
  Users,
  Building2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  Download,
  Layers,
  Check,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import * as executiveApi from '../../../services/api/executive';
import { Badge } from '../../../shared/components/Badge';
import { Loader } from '../../../shared/components/Loader';

export default function ExecutiveBilling() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBillingData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await executiveApi.getMetrics({});
      setMetrics(res?.data || res);
    } catch (err) {
      setError(err.message || 'Failed to load billing telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-8">
        <Loader />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Retrieving subscription & billing telemetry...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadBillingData}
            className="text-xs font-bold underline hover:no-underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    planName = 'Standard Plan',
    subscriptionStatus = 'Active',
    trialEndsAt = null,
    currentPeriodStart = null,
    currentPeriodEnd = null,
    billingCycle = 'Monthly',
    totalUsers = 0,
    totalBranches = 0,
    totalProcessTemplates = 0,
    totalComplianceRules = 0,
    planQuotas = {},
  } = metrics || {};

  // Date calculations
  const effectiveExpiry = currentPeriodEnd || trialEndsAt;
  const isTrial = subscriptionStatus === 'Trialing' || Boolean(trialEndsAt);

  const daysRemaining = effectiveExpiry
    ? Math.max(
        0,
        Math.ceil((new Date(effectiveExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Ongoing';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return String(dateString);
    }
  };

  // Quota calculation helpers
  const userCap = planQuotas?.maxUsers;
  const branchCap = planQuotas?.maxBranches;
  const templateCap = planQuotas?.maxActiveProcessTemplates;
  const ruleCap = planQuotas?.maxComplianceRules;

  const userUsagePercent = userCap ? Math.min(100, Math.round((totalUsers / userCap) * 100)) : 25;
  const branchUsagePercent = branchCap ? Math.min(100, Math.round((totalBranches / branchCap) * 100)) : 20;
  const templateUsagePercent = templateCap ? Math.min(100, Math.round((totalProcessTemplates / templateCap) * 100)) : 15;
  const ruleUsagePercent = ruleCap ? Math.min(100, Math.round((totalComplianceRules / ruleCap) * 100)) : 30;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* 1. Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <span>Subscription & Commercial Billing</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise overview of your commercial tier, billing cycle, entitlement quotas, and resource consumption.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadBillingData}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <a
            href="mailto:support@officesync.com?subject=Enterprise%20Plan%20Upgrade%20Request"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Upgrade Plan</span>
          </a>
        </div>
      </header>

      {/* 2. Primary Plan & Expiry Banner Card */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white p-6 lg:p-8 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full border border-blue-200">
                Current Commercial Tier
              </span>
              <Badge
                status={
                  subscriptionStatus === 'Active'
                    ? 'success'
                    : subscriptionStatus === 'Trialing'
                    ? 'warning'
                    : 'danger'
                }
              >
                {subscriptionStatus === 'Trialing' ? '14-Day Free Trial' : subscriptionStatus}
              </Badge>
              <span className="text-xs font-semibold text-slate-600 bg-white/80 px-2.5 py-0.5 rounded-full border border-slate-200">
                {billingCycle} Billing
              </span>
            </div>

            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                {planName}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Subscribed for organization:{' '}
                <strong className="text-slate-900">{user?.companyName || user?.company?.legalName || 'Your Organization'}</strong>
              </p>
            </div>

            {/* Key Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Period Start Date
                </span>
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  {formatDate(currentPeriodStart)}
                </span>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Renewal / Expiry Date
                </span>
                <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {formatDate(effectiveExpiry)}
                </span>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Status & Countdown
                </span>
                <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  {daysRemaining !== null ? (
                    <span className={daysRemaining <= 3 ? 'text-rose-600' : 'text-emerald-700'}>
                      {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
                    </span>
                  ) : (
                    <span className="text-emerald-700">Auto-renews</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col shrink-0 min-w-[220px]">
            <a
              href="mailto:support@officesync.com?subject=Manage%20Subscription%20Inquiry"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <span>Manage Subscription</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => alert('Receipt and invoice history is managed via your enterprise account manager.')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Download Invoices</span>
            </button>
          </div>
        </div>

        {/* Trial Upgrade Alert Callout */}
        {isTrial && (
          <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">14-Day Full Access Evaluation Active</p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  You have complete access to automated compliance gates, delivery squads, and audit tracking during your trial.
                </p>
              </div>
            </div>
            <a
              href="mailto:sales@officesync.com?subject=Convert%20Trial%20to%20Annual%20Plan"
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shrink-0 text-xs transition-colors"
            >
              Convert to Paid Plan →
            </a>
          </div>
        )}
      </div>

      {/* 3. Resource Entitlements & Live Consumption Matrix */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Plan Entitlements & Live Resource Consumption</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of organizational resources utilized against your subscribed plan limits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: User Seats */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                User Seats
              </span>
              <span className="text-xs font-extrabold text-slate-800">
                {userUsagePercent}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{totalUsers}</span>
              <span className="text-xs font-semibold text-slate-400">
                Capacity: {userCap ? `${userCap} Seats` : 'Unlimited'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  userUsagePercent >= 90 ? 'bg-rose-500' : 'bg-blue-600'
                }`}
                style={{ width: `${userUsagePercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {userCap ? `${userCap - totalUsers} remaining seats available` : 'No seat restrictions'}
            </p>
          </div>

          {/* Card 2: Branch Offices */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Branch Units
              </span>
              <span className="text-xs font-extrabold text-slate-800">
                {branchUsagePercent}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{totalBranches}</span>
              <span className="text-xs font-semibold text-slate-400">
                Capacity: {branchCap ? `${branchCap} Units` : 'Unlimited'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${branchUsagePercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {branchCap ? `${branchCap - totalBranches} branch unit slots remaining` : 'Unlimited regional branches'}
            </p>
          </div>

          {/* Card 3: Process Templates */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Process Templates
              </span>
              <span className="text-xs font-extrabold text-slate-800">
                {templateUsagePercent}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{totalProcessTemplates}</span>
              <span className="text-xs font-semibold text-slate-400">
                Capacity: {templateCap ? `${templateCap} Active` : 'Unlimited'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${templateUsagePercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Automated operational workflow definitions
            </p>
          </div>

          {/* Card 4: Compliance Policies */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Compliance Rules
              </span>
              <span className="text-xs font-extrabold text-slate-800">
                {ruleUsagePercent}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{totalComplianceRules}</span>
              <span className="text-xs font-semibold text-slate-400">
                Capacity: {ruleCap ? `${ruleCap} Rules` : 'Unlimited'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${ruleUsagePercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Active automated validation policies
            </p>
          </div>
        </div>

        {/* Feature Entitlements Row */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-800">Immutable Audit Logs</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {planQuotas?.auditLogRetentionDays || 90} Days Retention Policy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-800">Enterprise Integrations</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {planQuotas?.allowsIntegrations !== false ? 'API & Webhooks Active' : 'Basic Tier (Webhooks Disabled)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-800">Executive Telemetry</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real-Time Delivery & Risk Dashboards
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Billing Details & Invoice Information */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-700" />
              <span>Billing Account & Invoicing Details</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Legal billing profile and invoice recipient preferences.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Billing Entity:</span>
              <span className="font-bold text-slate-800">{user?.companyName || user?.company?.legalName || 'Acme Corp'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Primary Billing Email:</span>
              <span className="font-mono text-slate-800">{user?.email || 'finance@company.com'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Payment Terms:</span>
              <span className="font-semibold text-slate-800">Net 30 · Electronic Invoicing</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Current Status:</span>
              <Badge status={subscriptionStatus === 'Active' ? 'success' : 'warning'}>
                {subscriptionStatus}
              </Badge>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Billing Cadence:</span>
              <span className="font-semibold text-slate-800">{billingCycle} Renewal</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Support Plan:</span>
              <span className="font-semibold text-blue-700">Dedicated Platform Account Manager</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, User, CreditCard, Sparkles, AlertCircle } from 'lucide-react';
import { PATHS } from '../../../app/paths';
import { apiClient } from '../../../services/api/client';
import { CompanyProvisionSuccessModal } from '../components/CompanyProvisionSuccessModal';

export default function CompanyProvision() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  const [form, setForm] = useState({
    legalName: '',
    industry: 'Technology',
    size: '1-50',
    ownerFullName: '',
    ownerEmail: '',
    password: 'OptiFlow@2026!',
    planId: '',
    billingCycle: 'Monthly',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoadingPlans(true);
        const res = await apiClient('/api/platform/plans?isActive=true');
        const activePlans = Array.isArray(res) ? res : res?.items || [];
        setPlans(activePlans);
        if (activePlans.length > 0) {
          setForm((prev) => ({ ...prev, planId: activePlans[0].id }));
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
        setFormError('Failed to load active plans tier list');
      } finally {
        setLoadingPlans(false);
      }
    }
    loadPlans();
  }, []);

  const validate = () => {
    const errors = {};
    if (!form.legalName.trim()) {
      errors.legalName = 'Company Legal Name is required';
    } else if (form.legalName.trim().length < 2) {
      errors.legalName = 'Company Legal Name must be at least 2 characters';
    }

    if (!form.ownerFullName.trim()) {
      errors.ownerFullName = 'Primary owner full name is required';
    } else if (form.ownerFullName.trim().length < 2) {
      errors.ownerFullName = 'Full name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.ownerEmail.trim()) {
      errors.ownerEmail = 'Corporate email address is required';
    } else if (!emailRegex.test(form.ownerEmail.trim())) {
      errors.ownerEmail = 'Please provide a valid corporate email address';
    }

    if (!form.password || form.password.length < 8) {
      errors.password = 'Initial password must be at least 8 characters long';
    }

    if (!form.planId) {
      errors.planId = 'Please select a subscription plan tier';
    }

    return errors;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError('Please resolve the validation errors highlighted below.');
      return;
    }
    setFieldErrors({});

    try {
      setSubmitting(true);
      const res = await apiClient('/api/platform/companies', {
        method: 'POST',
        body: form,
      });
      setSuccessResult(res);
    } catch (err) {
      setFormError(err.message || 'Failed to provision company');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Back Link */}
      <Link to={PATHS.PLATFORM.COMPANIES} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Companies</span>
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Provision New Company</h1>
        <p className="text-sm text-slate-500 mt-1">
          Create a new tenant organization, provision the initial administrator, and configure their subscription plan.
        </p>
      </div>

      {formError && (
        <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Details */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-sm font-bold text-slate-900">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>1. Organization Details</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company Legal Name *</label>
            <input
              type="text"
              required
              value={form.legalName}
              onChange={(e) => handleChange('legalName', e.target.value)}
              placeholder="e.g. Acme Corporation Ltd."
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none ${
                fieldErrors.legalName ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
              }`}
            />
            {fieldErrors.legalName && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.legalName}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
              <input type="text" value={form.industry} onChange={(e) => handleChange('industry', e.target.value)} placeholder="e.g. Technology / Retail" className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Size</label>
              <select value={form.size} onChange={(e) => handleChange('size', e.target.value)} className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none">
                <option value="1-50">1 - 50 Employees</option>
                <option value="51-200">51 - 200 Employees</option>
                <option value="201-500">201 - 500 Employees</option>
                <option value="500+">500+ Employees</option>
              </select>
            </div>
          </div>
        </div>

        {/* Owner Details */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-sm font-bold text-slate-900">
            <User className="w-4 h-4 text-indigo-600" />
            <span>2. Primary Owner (System Admin)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={form.ownerFullName}
                onChange={(e) => handleChange('ownerFullName', e.target.value)}
                placeholder="e.g. Jane Doe"
                className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none ${
                  fieldErrors.ownerFullName ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                }`}
              />
              {fieldErrors.ownerFullName && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.ownerFullName}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email Address *</label>
              <input
                type="email"
                required
                value={form.ownerEmail}
                onChange={(e) => handleChange('ownerEmail', e.target.value)}
                placeholder="e.g. jane@acme.com"
                className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none ${
                  fieldErrors.ownerEmail ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                }`}
              />
              {fieldErrors.ownerEmail && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.ownerEmail}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Login Password *</label>
            <input
              type="text"
              required
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Minimum 8 characters"
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none font-mono ${
                fieldErrors.password ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
              }`}
            />
            {fieldErrors.password ? (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                Direct credentials for the company administrator. Default: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">OptiFlow@2026!</code>
              </p>
            )}
          </div>
        </div>

        {/* Plan Selection */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-sm font-bold text-slate-900">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>3. Subscription Plan & Billing</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Tier *</label>
              <select required disabled={loadingPlans} value={form.planId} onChange={(e) => handleChange('planId', e.target.value)} className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none">
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.maxUsers ? `(${p.maxUsers} max users)` : '(Unlimited users)'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Cycle</label>
              <select value={form.billingCycle} onChange={(e) => handleChange('billingCycle', e.target.value)} className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none">
                <option value="Monthly">Monthly Billing</option>
                <option value="Annual">Annual Billing (12 Months)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(PATHS.PLATFORM.COMPANIES)} className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting || loadingPlans} className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow disabled:opacity-50 transition-all flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{submitting ? 'Provisioning...' : 'Provision Company'}</span>
          </button>
        </div>
      </form>

      {/* Success Modal */}
      <CompanyProvisionSuccessModal isOpen={Boolean(successResult)} result={successResult} onClose={() => navigate(PATHS.PLATFORM.COMPANIES)} />
    </div>
  );
}

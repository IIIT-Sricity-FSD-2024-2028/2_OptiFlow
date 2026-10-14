import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, PauseCircle, PlayCircle, XCircle } from 'lucide-react';
import { PATHS } from '../../../app/paths';
import { apiClient } from '../../../services/api/client';
import { Badge } from '../../../shared/components/Badge';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { CompanyOverviewTab } from '../components/detail/CompanyOverviewTab';
import { CompanySubscriptionTab } from '../components/detail/CompanySubscriptionTab';
import { CompanyActivityTab } from '../components/detail/CompanyActivityTab';

const TABS = ['Overview', 'Subscription', 'Activity'];

export default function CompanyDetail() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, targetStatus: null, loading: false });

  const loadCompany = useCallback(async (isInitial = false) => {
    try {
      if (!isInitial) setLoading(true);
      setError(null);
      const res = await apiClient(`/api/platform/companies/${id}`);
      setCompany(res);
    } catch (err) {
      setError(err.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCompany(true);
  }, [loadCompany]);

  const handleConfirmStatus = async () => {
    if (!confirmModal.targetStatus) return;
    try {
      setConfirmModal((prev) => ({ ...prev, loading: true }));
      await apiClient(`/api/platform/companies/${id}`, {
        method: 'PATCH',
        body: { status: confirmModal.targetStatus },
      });
      setConfirmModal({ isOpen: false, targetStatus: null, loading: false });
      await loadCompany();
    } catch (err) {
      alert(err.message || 'Status transition failed');
      setConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

  if (loading) return <div className="text-center py-16 text-slate-400 text-sm">Loading company details...</div>;
  if (error || !company) return (
    <div className="p-6 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-sm max-w-xl mx-auto my-8">
      {error || 'Company not found'}
      <div className="mt-3"><Link to={PATHS.PLATFORM.COMPANIES} className="font-bold underline">Return to Companies</Link></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 pb-4 border-b border-slate-200">
        <Link to={PATHS.PLATFORM.COMPANIES} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Companies</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900">{company.legalName}</h1>
                <Badge status={company.status === 'Active' ? 'success' : company.status === 'Suspended' ? 'warning' : 'danger'}>
                  {company.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Contextual Status Action Buttons */}
          <div className="flex items-center gap-2">
            {company.status === 'Active' && (
              <>
                <button type="button" onClick={() => setConfirmModal({ isOpen: true, targetStatus: 'Suspended', loading: false })} className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5 cursor-pointer">
                  <PauseCircle className="w-3.5 h-3.5" /> Suspend
                </button>
                <button type="button" onClick={() => setConfirmModal({ isOpen: true, targetStatus: 'Closed', loading: false })} className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5 cursor-pointer">
                  <XCircle className="w-3.5 h-3.5" /> Close
                </button>
              </>
            )}
            {company.status === 'Suspended' && (
              <>
                <button type="button" onClick={() => setConfirmModal({ isOpen: true, targetStatus: 'Active', loading: false })} className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 cursor-pointer">
                  <PlayCircle className="w-3.5 h-3.5" /> Reactivate
                </button>
                <button type="button" onClick={() => setConfirmModal({ isOpen: true, targetStatus: 'Closed', loading: false })} className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5 cursor-pointer">
                  <XCircle className="w-3.5 h-3.5" /> Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {TABS.map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'Overview' && <CompanyOverviewTab company={company} />}
      {activeTab === 'Subscription' && <CompanySubscriptionTab company={company} />}
      {activeTab === 'Activity' && <CompanyActivityTab company={company} />}

      {/* Status Transition ConfirmDialog */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        onCancel={() => !confirmModal.loading && setConfirmModal({ isOpen: false, targetStatus: null, loading: false })}
        onConfirm={handleConfirmStatus}
        title={`${confirmModal.targetStatus} Company`}
        message={`Are you sure you want to transition ${company.legalName} to ${confirmModal.targetStatus}?`}
        confirmText={`Confirm ${confirmModal.targetStatus}`}
        variant={confirmModal.targetStatus === 'Active' ? 'primary' : 'danger'}
        loading={confirmModal.loading}
      />
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Badge } from '../../../../shared/components/Badge';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { Toast } from '../../../../shared/components/Toast';
import * as evidenceApi from '../../../../services/api/evidence';

const statusVariant = (s) => {
  s = String(s || '').toLowerCase();
  if (s === 'approved') return 'success';
  if (s === 'rejected') return 'danger';
  return 'warning';
};

export default function TeamLeadReviews() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [approving, setApproving] = useState(false);
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  useEffect(() => {
    let active = true;
    evidenceApi.getEvidenceList()
      .then(r => active && setList(Array.isArray(r) ? r : r?.data || []))
      .catch(() => active && showToast('error', 'Failed to load evidence.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filtered = list.filter(e => {
    const s = String(e.status || '').toLowerCase();
    return tab === 'pending' ? (s === 'pending' || s === 'under_review') : s === 'approved';
  });

  const handleApprove = async (item) => {
    setApproving(true);
    try {
      await evidenceApi.updateEvidence(item.id, { status: 'Approved' });
      const update = e => e.id === item.id ? { ...e, status: 'Approved' } : e;
      setList(l => l.map(update));
      setSelected(s => s?.id === item.id ? { ...s, status: 'Approved' } : s);
      showToast('success', 'Evidence approved.');
    } catch {
      showToast('error', 'Failed to approve evidence.');
    } finally {
      setApproving(false);
    }
  };

  if (loading) return (
    <div className="min-h-full flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3"><Loader /><p className="text-sm text-gray-500">Loading evidence vault...</p></div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Evidence Vault</h1>
          <p className="text-gray-500 mt-1">Review and approve your team's submitted evidence</p>
        </div>
        <Badge status="info">Team Lead</Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 items-start">

        {/* Master list */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 flex">
            {['pending', 'approved'].map(t => (
              <button key={t} onClick={() => { setTab(t); setSelected(null); }}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'pending' ? 'Pending Review' : 'Approved'}
              </button>
            ))}
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filtered.length === 0
              ? <div className="p-6"><EmptyState title="No items" description={tab === 'pending' ? 'No pending evidence.' : 'No approved evidence.'} /></div>
              : filtered.map(e => (
                <button key={e.id} onClick={() => setSelected(e)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selected?.id === e.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{e.submittedBy || e.userName || 'Team Member'}</p>
                  <p className="text-sm font-semibold text-gray-900 mb-2 truncate">{e.title || 'Untitled Evidence'}</p>
                  <Badge status={statusVariant(e.status)}>{String(e.status || 'Pending').replace(/_/g, ' ')}</Badge>
                </button>
              ))}
          </div>
        </div>

        {/* Detail pane */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {!selected
            ? <div className="flex items-center justify-center min-h-[400px]"><EmptyState title="Select evidence to review" description="Choose an item from the list on the left." /></div>
            : <div className="p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selected.title || 'Evidence Detail'}</h2>
                    <p className="text-sm text-gray-500 mt-1">Submitted by <span className="font-medium text-gray-700">{selected.submittedBy || selected.userName || 'Team Member'}</span></p>
                  </div>
                  <Badge status={statusVariant(selected.status)}>{String(selected.status || 'Pending').replace(/_/g, ' ')}</Badge>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-10 text-center">
                  <svg className="w-12 h-12 text-blue-500 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700">{selected.file_url || selected.file || selected.fileName || 'document.pdf'}</p>
                  {(selected.file_url || selected.file) && (
                    <a href={selected.file_url || selected.file} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-blue-600 hover:underline">Open document →</a>
                  )}
                </div>

                {selected.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-sm text-amber-900 italic">"{selected.notes}"</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Task', selected.taskTitle || selected.task_id || '—'],
                    ['Submitted', selected.createdAt || selected.created_at || '—'],
                    ['Type', selected.type || selected.evidenceType || '—'],
                    ['Status', String(selected.status || 'Pending').replace(/_/g, ' ')],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-sm font-medium text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>

                {String(selected.status || '').toLowerCase() !== 'approved'
                  ? <Button variant="primary" onClick={() => handleApprove(selected)} disabled={approving}>{approving ? 'Approving…' : 'Approve Team Evidence'}</Button>
                  : <div className="flex items-center gap-2 py-3 px-4 bg-green-50 border border-green-200 rounded-lg">
                      <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      <span className="text-sm font-semibold text-green-700">Evidence Approved</span>
                    </div>
                }
              </div>
          }
        </div>
      </div>

      <Toast visible={toast.visible} type={toast.type} message={toast.message} onClose={() => setToast(t => ({ ...t, visible: false }))} />
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { Badge } from '../../../../shared/components/Badge';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { Toast } from '../../../../shared/components/Toast';
import { Modal } from '../../../../shared/components/Modal';
import { FormField, Textarea } from '../../../../shared/components/FormField';
import { Pagination } from '../../../../shared/components/Pagination';
import { formatDate } from '../../../../shared/utils/formatDate';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  AlertTriangle, 
  ArrowUpRight,
  RotateCcw
} from 'lucide-react';
import * as evidenceApi from '../../../../services/api/evidence';
import * as escalationsApi from '../../../../services/api/escalations';
import * as tasksApi from '../../../../services/api/tasks';

const statusVariant = (s) => {
  s = String(s || '').toLowerCase();
  if (s === 'approved') return 'success';
  if (s === 'rejected') return 'danger';
  return 'warning';
};

const getDocumentName = (evidence) => {
  if (!evidence) return 'Deliverable Artifact';
  if (evidence.fileName) return evidence.fileName;

  const rawUrl = evidence.fileUrl || evidence.file_url || evidence.file || '';
  if (!rawUrl) return evidence.title || 'Attached Document';

  let name = rawUrl;
  if (name.includes('/')) {
    name = name.split('/').pop() || name;
  }

  // Strip timestamp prefix if any (e.g. 1739123456789-file.pdf -> file.pdf)
  name = name.replace(/^\d+[-_]/, '');

  try {
    name = decodeURIComponent(name);
  } catch (_) {}

  if (!name || name.startsWith('http') || name.startsWith('supabase')) {
    return evidence.title || 'Attached Deliverable';
  }

  return name;
};

export default function TeamLeadReviews() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [approving, setApproving] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
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

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    list.forEach((e) => {
      const s = String(e.status || '').toLowerCase();
      if (s === 'pending' || s === 'under_review') pending++;
      else if (s === 'approved') approved++;
      else if (s === 'rejected') rejected++;
    });
    return { pending, approved, rejected };
  }, [list]);

  const filtered = list.filter((e) => {
    const s = String(e.status || '').toLowerCase();
    if (tab === 'pending') return s === 'pending' || s === 'under_review';
    if (tab === 'approved') return s === 'approved';
    if (tab === 'rejected') return s === 'rejected';
    return true;
  });

  const paginatedList = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleApprove = async (item) => {
    setApproving(true);
    try {
      await evidenceApi.updateEvidence(item.id, { status: 'Approved' });
      const update = e => e.id === item.id ? { ...e, status: 'Approved' } : e;
      setList(l => l.map(update));
      setSelected(s => s?.id === item.id ? { ...s, status: 'Approved' } : s);
      showToast('success', 'Evidence approved.');
    } catch (error) {
      showToast('error', error.message || 'Failed to approve evidence.');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectAndEscalate = async () => {
    if (!rejectionReason.trim()) {
      showToast('error', 'Please provide revision feedback.');
      return;
    }
    setRejecting(true);
    try {
      const taskId = selected?.taskId || selected?.task_id;
      // 1. Update evidence to Rejected with rejection feedback
      await evidenceApi.updateEvidence(selected.id, {
        status: 'Rejected',
        notes: rejectionReason.trim(),
      });

      // 2. Revert task status to Active so team member can revise deliverables
      if (taskId) {
        try {
          await tasksApi.update(taskId, { status: 'Active' });
        } catch (_) {}
      }

      // 3. Create Escalation to PM
      if (taskId) {
        try {
          await escalationsApi.create({
            taskId,
            title: `Deliverable Rejected: ${selected.title}`,
            blockerType: 'Compliance Blocker',
            description: `Team Lead rejected evidence "${selected.title}". Feedback: ${rejectionReason.trim()}. Work reopened for revision.`,
            priority: 'High',
          });
        } catch (_) {}
      }

      // 4. Update local state
      const update = e => e.id === selected.id ? { ...e, status: 'Rejected', notes: rejectionReason.trim() } : e;
      setList(l => l.map(update));
      setSelected(s => s ? { ...s, status: 'Rejected', notes: rejectionReason.trim() } : null);
      showToast('success', 'Evidence rejected, work reopened, and escalated to PM.');
      setRejectModalOpen(false);
      setRejectionReason('');
    } catch (err) {
      showToast('error', err.message || 'Failed to reject evidence.');
    } finally {
      setRejecting(false);
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
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col shadow-xs">
          <div className="border-b border-gray-200 flex bg-gray-50/50">
            {[
              { key: 'pending', label: 'Pending Review', count: counts.pending },
              { key: 'approved', label: 'Approved', count: counts.approved },
              { key: 'rejected', label: 'Rejections', count: counts.rejected },
            ].map((t) => {
              const isActive = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    setTab(t.key);
                    setSelected(null);
                    setPage(1);
                  }}
                  className={`flex-1 py-3 px-2 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                    isActive
                      ? t.key === 'rejected'
                        ? 'text-rose-700 border-rose-600 bg-white'
                        : 'text-blue-600 border-blue-600 bg-white'
                      : 'text-gray-500 hover:text-gray-800 border-transparent hover:bg-gray-100/50'
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                      isActive
                        ? t.key === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                        : 'bg-gray-200/80 text-gray-600'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No items"
                  description={
                    tab === 'pending'
                      ? 'No pending evidence deliverables awaiting review.'
                      : tab === 'approved'
                      ? 'No approved evidence items.'
                      : 'No rejected deliverables. Items returned for revision will appear here.'
                  }
                />
              </div>
            ) : (
              paginatedList.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selected?.id === e.id
                      ? tab === 'rejected'
                        ? 'bg-rose-50/70 border-l-4 border-l-rose-500'
                        : 'bg-blue-50 border-l-4 border-l-blue-500'
                      : ''
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    {e.user?.fullName || e.user?.email || e.submittedBy || e.userName || 'Team Member'}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mb-1 truncate">{e.title || 'Untitled Evidence'}</p>
                  {(e.task?.title || e.violation?.rule?.name) && (
                    <p className="mb-2 truncate text-xs text-gray-500">
                      {e.task?.title ? `Task: ${e.task.title}` : `Rule: ${e.violation.rule.name}`}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Badge status={statusVariant(e.status)}>{String(e.status || 'Pending').replace(/_/g, ' ')}</Badge>
                    {e.notes && tab === 'rejected' && (
                      <span className="text-[10px] text-rose-600 font-medium truncate max-w-[130px]">
                        Feedback logged
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          {filtered.length > PAGE_SIZE && (
            <div className="border-t border-gray-100 px-3 py-2 bg-gray-50/50">
              <Pagination
                currentPage={page}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>

        {/* Detail pane */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {!selected
            ? <div className="flex items-center justify-center min-h-[400px]"><EmptyState title="Select evidence to review" description="Choose an item from the list on the left." /></div>
            : <div className="p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selected.title || 'Evidence Detail'}</h2>
                    <p className="text-sm text-gray-500 mt-1">Submitted by <span className="font-medium text-gray-700">{selected.user?.fullName || selected.user?.email || selected.submittedBy || selected.userName || 'Team Member'}</span></p>
                  </div>
                  <Badge status={statusVariant(selected.status)}>{String(selected.status || 'Pending').replace(/_/g, ' ')}</Badge>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 max-w-md mx-auto truncate">
                    {getDocumentName(selected)}
                  </p>
                  {(selected.fileUrl || selected.file_url || selected.file) && (() => {
                    const rawUrl = selected.fileUrl || selected.file_url || selected.file || '';
                    const isExternal = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');
                    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5500';
                    const openDocUrl = isExternal
                      ? rawUrl
                      : `${apiBase}/api/evidence/${selected.id}/file?token=${encodeURIComponent(sessionStorage.getItem('authToken') || '')}`;
                    return (
                      <a
                        href={openDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-blue-600 hover:text-blue-700 hover:bg-gray-50 rounded-md text-xs font-semibold shadow-xs transition-colors"
                      >
                        <span>Open Document</span>
                        <span>↗</span>
                      </a>
                    );
                  })()}
                  {(selected.task?.title || selected.taskTitle || selected.violation?.rule?.name) && (
                    <p className="mt-3 text-xs text-gray-500">
                      {selected.task?.title || selected.taskTitle
                        ? <>Related Task: <span className="font-semibold text-gray-700">{selected.task?.title || selected.taskTitle}</span></>
                        : <>Compliance Rule: <span className="font-semibold text-gray-700">{selected.violation.rule.name}</span></>}
                    </p>
                  )}
                </div>

                {String(selected.status || '').toLowerCase() === 'rejected' ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                      <XCircle size={18} className="text-rose-600 shrink-0" />
                      <span>Returned for Revision by Team Lead</span>
                    </div>
                    {selected.notes && (
                      <div className="text-xs text-rose-900 bg-white/95 p-3 rounded-lg border border-rose-200/80 shadow-xs">
                        <p className="font-semibold text-rose-700 uppercase tracking-wide text-[10px] mb-1">
                          TL Feedback & Revision Instructions:
                        </p>
                        <p className="italic leading-relaxed">{selected.notes}</p>
                      </div>
                    )}
                    <p className="text-[11px] text-rose-700 leading-normal">
                      Task status was reverted to Active so the team member can make adjustments. An escalation ticket was logged with the Project Manager.
                    </p>
                  </div>
                ) : selected.notes ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-sm text-amber-900 italic">"{selected.notes}"</p>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Task', selected.taskTitle || selected.task_id || '—'],
                    ['Submitted', formatDate(selected.submittedAt || selected.createdAt || selected.created_at)],
                    ['Type', selected.type || selected.evidenceType || '—'],
                    ['Status', String(selected.status || 'Pending').replace(/_/g, ' ')],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-sm font-medium text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>

                {String(selected.status || '').toLowerCase() === 'approved' ? (
                  <div className="flex items-center gap-2 py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-800">Evidence Approved & Validated</span>
                  </div>
                ) : String(selected.status || '').toLowerCase() === 'rejected' ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-500" />
                      <span className="text-xs font-medium text-slate-700">Awaiting revised submission from team member</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(selected)}
                      disabled={approving || rejecting}
                    >
                      {approving ? 'Approving…' : 'Re-evaluate & Approve'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button variant="primary" onClick={() => handleApprove(selected)} disabled={approving || rejecting}>
                      {approving ? 'Approving…' : 'Approve Team Evidence'}
                    </Button>
                    <Button
                      variant="outline"
                      className="text-rose-600 border-rose-300 hover:bg-rose-50"
                      onClick={() => { setRejectionReason(''); setRejectModalOpen(true); }}
                      disabled={approving || rejecting}
                    >
                      Reject & Escalate to PM
                    </Button>
                  </div>
                )}
              </div>
          }
        </div>
      </div>

      {/* Reject & Escalate Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Evidence & Escalate to Project Manager"
        footer={(
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)} disabled={rejecting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRejectAndEscalate} disabled={rejecting}>
              {rejecting ? 'Rejecting…' : 'Confirm Rejection & Escalate'}
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Rejecting this evidence deliverable will revert the task/subtask status back to <strong>In Progress (Active)</strong> for revision, and register an active <strong>Compliance Blocker Escalation</strong> on the Project Manager's board.
          </p>
          <FormField label="Reason for Rejection & Revision Instructions" required>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              placeholder="Explain why this deliverable is insufficient (e.g. Missing security signature, invalid format, incomplete test coverage)..."
            />
          </FormField>
        </div>
      </Modal>

      <Toast visible={toast.visible} type={toast.type} message={toast.message} onClose={() => setToast(t => ({ ...t, visible: false }))} />
    </div>
  );
}

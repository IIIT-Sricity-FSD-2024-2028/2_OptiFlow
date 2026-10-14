import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../shared/components/Toast';
import { StatCard } from '../../../../shared/components/StatCard';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { StatusBadge } from '../../components/StatusBadge';
import { UploadEvidenceModal } from '../components/modals/UploadEvidenceModal';
import { EVIDENCE_TYPES } from '../../constants';
import * as evidenceApi from '../../../../services/api/evidence';
import * as tasksApi from '../../../../services/api/tasks';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
} from 'lucide-react';

export default function MemberEvidence() {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [evidenceList, setEvidenceList] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Delete Confirm Dialog state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evRes, tasksRes] = await Promise.allSettled([
        evidenceApi.list(),
        tasksApi.list(),
      ]);

      const allEv = evRes.status === 'fulfilled' && evRes.value ? (Array.isArray(evRes.value) ? evRes.value : evRes.value.data || []) : [];
      const allTasks = tasksRes.status === 'fulfilled' && tasksRes.value ? (Array.isArray(tasksRes.value) ? tasksRes.value : tasksRes.value.data || []) : [];

      const currentUserId = String(user?.id || user?.userId || '');

      const myEv = allEv.filter((e) => {
        const uId = String(e.userId || e.user_id || (typeof e.user === 'object' ? e.user?.id : e.user) || '');
        return !currentUserId || uId === currentUserId || !uId;
      });

      setEvidenceList(myEv);
      setTasks(allTasks);
    } catch (err) {
      console.error('Error fetching evidence:', err);
      toast.error('Failed to load evidence records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const metrics = useMemo(() => {
    const total = evidenceList.length;
    const verified = evidenceList.filter((e) => String(e.status || '').toLowerCase().includes('verif') || String(e.status || '').toLowerCase().includes('approv')).length;
    const pending = total - verified;
    return { total, verified, pending };
  }, [evidenceList]);

  const filteredEvidence = useMemo(() => {
    return evidenceList.filter((e) => {
      const s = String(e.status || '').toLowerCase();

      let matchesStatus = true;
      if (statusFilter === 'verified') {
        matchesStatus = s.includes('verif') || s.includes('approv');
      } else if (statusFilter === 'pending') {
        matchesStatus = !s.includes('verif') && !s.includes('approv');
      }

      const matchesType = typeFilter ? String(e.evidenceType || e.type || '').toLowerCase() === typeFilter.toLowerCase() : true;
      const matchesQuery = searchQuery.trim()
        ? (e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           e.notes?.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;

      return matchesStatus && matchesType && matchesQuery;
    });
  }, [evidenceList, statusFilter, typeFilter, searchQuery]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await evidenceApi.remove(deletingId);
      setEvidenceList((prev) => prev.filter((e) => e.id !== deletingId));
      toast.success('Artifact record removed.');
      setIsDeleteConfirmOpen(false);
      setDeletingId(null);
    } catch (err) {
      toast.error('Failed to delete evidence record.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader />
        <p className="text-sm font-medium text-slate-500">Loading evidence submissions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
          <Link to={PATHS.MEMBER.DASHBOARD} className="hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          <span>›</span>
          <span className="text-slate-800 font-semibold">Evidence & Audit Deliverables</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Evidence Deliverables</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Submit proof of work, documentation, and compliance artifacts for your assigned tasks.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Evidence</span>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Deliverables"
          value={metrics.total}
          subtitle="Artifacts uploaded by you"
          icon={<FileText className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Verified / Approved"
          value={metrics.verified}
          subtitle="Cleared compliance verification"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Pending Verification"
          value={metrics.pending}
          subtitle="Awaiting lead or auditor review"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search deliverable title or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending Review' },
              { key: 'verified', label: 'Verified' },
            ].map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => setStatusFilter(pill.key)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  statusFilter === pill.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">All Categories</option>
          {EVIDENCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Evidence Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {filteredEvidence.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<FileText className="w-10 h-10 text-slate-400" />}
              title="No evidence found"
              description={searchQuery || typeFilter || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'You have not uploaded any deliverables yet.'}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Artifact Title</th>
                  <th className="py-3.5 px-6">Related Task</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Submitted</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEvidence.map((ev) => {
                  const taskObj = tasks.find((t) => String(t.id || t.taskId) === String(ev.taskId || ev.task_id));
                  const fileUrl = ev.fileUrl || ev.url;

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 max-w-xs">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {ev.title || ev.name}
                        </div>
                        {ev.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                            {ev.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-700 whitespace-nowrap">
                        {taskObj?.title || `Task #${String(ev.taskId || '').slice(0, 8)}`}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                          {ev.evidenceType || ev.type || 'Document'}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <StatusBadge status={ev.status || 'Under Review'} />
                      </td>
                      <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                        {ev.createdAt ? new Date(ev.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap space-x-2">
                        {fileUrl && (() => {
                          const token = sessionStorage.getItem('authToken') || '';
                          const isExternalUrl = fileUrl.startsWith('http://') || fileUrl.startsWith('https://');
                          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5500';
                          const viewUrl = isExternalUrl ? fileUrl : `${apiBase}/api/evidence/${ev.id}/file?token=${encodeURIComponent(token)}`;
                          return (
                            <a
                              href={viewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex p-1 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Open File"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(ev);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                          title="Edit Artifact"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingId(ev.id);
                            setIsDeleteConfirmOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Artifact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shared Upload / Edit Evidence Modal */}
      <UploadEvidenceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        tasks={tasks}
        initialData={editingItem}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Reusable Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Remove Evidence Artifact"
        message="Are you sure you want to delete this deliverable submission? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setDeletingId(null);
        }}
      />
    </div>
  );
}

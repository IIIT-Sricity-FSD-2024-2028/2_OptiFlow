import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../shared/components/Toast';
import { StatCard } from '../../../../shared/components/StatCard';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { UploadEvidenceModal } from '../components/modals/UploadEvidenceModal';
import EvidenceTable from '../components/EvidenceTable';
import { EVIDENCE_TYPES } from '../../constants';
import { useDispatch, useSelector } from 'react-redux';
import { memberReads, useMemberReads } from '../useMemberReads';
import { selectAllTasks } from '../../../../store/tasks';
import { selectAllEvidence, deleteEvidence } from '../../../../store/evidence';
import {
  FileText,
  CheckCircle2,
  Clock,
  Search,
  Plus,
} from 'lucide-react';

const reads = [memberReads.tasks, memberReads.evidence];

export default function MemberEvidence() {
  const { user } = useAuth();
  const toast = useToast();

  const { loading, error } = useMemberReads(reads);
  const dispatch = useDispatch();
  const allEvidence = useSelector(selectAllEvidence);
  const tasks = useSelector(selectAllTasks);
  const currentUserId = String(user?.id || user?.userId || '');
  const evidenceList = useMemo(() => allEvidence.filter(item => {
    const owner = String(item.userId || item.user_id || item.user?.id || item.user || '');
    return !currentUserId || owner === currentUserId || !owner;
  }), [allEvidence, currentUserId]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const editingItem = evidenceList.find(item => item.id === editingId);

  // Delete Confirm Dialog state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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
      } else if (statusFilter === 'rejected') {
        matchesStatus = s === 'rejected';
      } else if (statusFilter === 'pending') {
        matchesStatus = !s.includes('verif') && !s.includes('approv') && s !== 'rejected';
      }

      const matchesType = typeFilter ? String(e.evidenceType || e.type || '').toLowerCase() === typeFilter.toLowerCase() : true;
      const feedbackText = String(e.rejectionReason || e.notes || '').toLowerCase();
      const matchesQuery = searchQuery.trim()
        ? (e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           feedbackText.includes(searchQuery.toLowerCase()))
        : true;

      return matchesStatus && matchesType && matchesQuery;
    });
  }, [evidenceList, statusFilter, typeFilter, searchQuery]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await dispatch(deleteEvidence(deletingId)).unwrap();
      toast.success('Artifact record removed.');
      setIsDeleteConfirmOpen(false);
      setDeletingId(null);
    } catch {
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
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
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
              setEditingId(null);
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
              { key: 'rejected', label: 'Rejected' },
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

      {/* Decomposed Evidence Table */}
      <EvidenceTable
        evidence={filteredEvidence}
        tasks={tasks}
        searchQuery={searchQuery}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        onEditItem={(item) => {
          setEditingId(item.id);
          setIsModalOpen(true);
        }}
        onDeleteItem={(item) => {
          setDeletingId(item.id);
          setIsDeleteConfirmOpen(true);
        }}
      />

      {/* Shared Upload / Edit Evidence Modal */}
      <UploadEvidenceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
        }}
        tasks={tasks}
        initialData={editingItem}
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

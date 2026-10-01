import { useState } from 'react';

// Shared Components
import PermissionGate from '../shared_components/auth/PermissionGate.jsx';
import StatusBadge from '../shared_components/ui/StatusBadge.jsx';
import SeverityBadge from '../shared_components/ui/SeverityBadge.jsx';
import { Avatar, AvatarGroup } from '../shared_components/ui/Avatar.jsx';
import { Modal, useConfirm } from '../shared_components/ui/Modal.jsx';
import SlideOverDrawer from '../shared_components/ui/SlideOverDrawer.jsx';
import { EmptyState, SkeletonCard, SkeletonTable } from '../shared_components/feedback/EmptyState.jsx';
import MetricCard from '../shared_components/data-display/MetricCard.jsx';
import DataTable from '../shared_components/data-display/DataTable.jsx';
import AuditTimeline from '../shared_components/data-display/AuditTimeline.jsx';
import SearchFilterBar from '../shared_components/forms/SearchFilterBar.jsx';
import WorkflowStepper from '../shared_components/workflow/WorkflowStepper.jsx';
import ApprovalActionBar from '../shared_components/workflow/ApprovalActionBar.jsx';
import CommentThread from '../shared_components/collaboration/CommentThread.jsx';
import MasterDetailLayout from '../shared_components/layout/MasterDetailLayout.jsx';

// Features
import EvidenceDropzone from '../features/compliance/EvidenceDropzone.jsx';
import ChangeRequestModal from '../features/change-requests/ChangeRequestModal.jsx';

// Hooks
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Icons
import { LayoutGrid, Shield, Database, GitBranch, Users, Layers, Bell, FileCheck } from 'lucide-react';

// ─── Sample Data ──────────────────────────────────────────────────────────────
const SAMPLE_TASKS = [
  { id: 't1', title: 'Review Q3 Compliance Report', assignee: 'Dana Osei', status: 'In_Review', severity: 'High',    due: '2026-09-30' },
  { id: 't2', title: 'Update Data Retention Policy', assignee: 'Casey Park', status: 'Active',    severity: 'Medium', due: '2026-10-05' },
  { id: 't3', title: 'Onboard New Team Members',    assignee: 'Robin Nkosi', status: 'Completed', severity: 'Low',    due: '2026-09-15' },
  { id: 't4', title: 'Audit ISO 27001 Evidence',    assignee: 'Dana Osei',   status: 'Blocked',   severity: 'Critical', due: '2026-09-22' },
  { id: 't5', title: 'Deploy Process v2.1',          assignee: 'Jordan Lee',  status: 'Draft',     severity: 'Low',    due: '2026-10-12' },
];

const SAMPLE_AUDIT_EVENTS = [
  { id: 'a1', type: 'TASK_STATUS_CHANGED', actor: { name: 'Casey Park', role: 'Project_Manager' }, timestamp: new Date(Date.now() - 1200000).toISOString(), description: 'Changed task status from Active to In_Review.', before: { status: 'Active' }, after: { status: 'In_Review' } },
  { id: 'a2', type: 'EVIDENCE_SUBMITTED',  actor: { name: 'Drew Santos', role: 'Team_Member' },   timestamp: new Date(Date.now() - 3600000).toISOString(), description: 'Submitted Q3 compliance evidence package (3 files).' },
  { id: 'a3', type: 'VIOLATION_CREATED',   actor: { name: 'Dana Osei', role: 'Compliance_Officer' }, timestamp: new Date(Date.now() - 7200000).toISOString(), description: 'Raised Critical violation: Missing ISO 27001 control evidence.', status: 'Open' },
  { id: 'a4', type: 'APPROVAL_GRANTED',    actor: { name: 'Morgan Blake', role: 'Company_Owner' }, timestamp: new Date(Date.now() - 86400000).toISOString(), description: 'Approved change request CR-2026-042 for Project Alpha.' },
];

const SAMPLE_COMMENTS = [
  { id: 'c1', author: { id: 'u007', name: 'Dana Osei', role: 'Compliance_Officer', roleLabel: 'Compliance Officer' }, body: 'Evidence package is incomplete. Please submit the SHA-256 checksums for all attached files before this can proceed to final review.', createdAt: new Date(Date.now() - 5400000).toISOString() },
  { id: 'c2', author: { id: 'u010', name: 'Drew Santos', role: 'Team_Member', roleLabel: 'Team Member' }, body: 'Understood. Will re-upload with verified checksums by EOD today.', createdAt: new Date(Date.now() - 3600000).toISOString() },
];

const SAMPLE_WORKFLOW_STAGES = [
  { id: 's1', label: 'Initiated',          status: 'completed', assignee: 'Drew Santos',  note: 'Task created and assigned.' },
  { id: 's2', label: 'In Review',           status: 'active',    assignee: 'Jamie Xu',     note: 'Awaiting TL sign-off.' },
  { id: 's3', label: 'Compliance Checked',  status: 'pending',   assignee: 'Dana Osei' },
  { id: 's4', label: 'Approved',            status: 'pending',   assignee: 'Casey Park' },
];

const TABLE_COLUMNS = [
  { accessorKey: 'title',    header: 'Task Title',  cell: info => <span style={{ fontWeight: 500 }}>{info.getValue()}</span> },
  { accessorKey: 'assignee', header: 'Assignee',    cell: info => <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={info.getValue()} size={24} />{info.getValue()}</div> },
  { accessorKey: 'status',   header: 'Status',      cell: info => <StatusBadge status={info.getValue()} />, enableSorting: false },
  { accessorKey: 'severity', header: 'Severity',    cell: info => <SeverityBadge severity={info.getValue()} />, enableSorting: false },
  { accessorKey: 'due',      header: 'Due Date',    cell: info => <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{info.getValue()}</span> },
];

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({ id, title, icon: Icon, description, children }) {
  return (
    <section id={id} style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
          <Icon size={18} />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{title}</h2>
          {description && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{description}</p>}
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--border-color)', marginBottom: 20 }} />
      {children}
    </section>
  );
}

// ─── Main Showcase Page ───────────────────────────────────────────────────────
export default function ShowcasePage() {
  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const { currentUser, hasPermission } = useAuth();

  const [modalOpen, setModalOpen]       = useState(false);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [crModalOpen, setCrModalOpen]   = useState(false);
  const [comments, setComments]         = useState(SAMPLE_COMMENTS);
  const [tableLoading, setTableLoading] = useState(false);

  const handleAddComment = async ({ body }) => {
    setComments(prev => [...prev, {
      id: `c${Date.now()}`, body,
      author: { id: currentUser?.id, name: currentUser?.name, role: currentUser?.role, roleLabel: currentUser?.roleLabel },
      createdAt: new Date().toISOString(),
    }]);
  };

  const handleDeleteComment = (id) => {
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const simulateTableLoading = () => {
    setTableLoading(true);
    setTimeout(() => setTableLoading(false), 1800);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {ConfirmDialog}

      {/* ─── Page Header ─── */}
      <div style={{ marginBottom: 36, padding: '24px 0 0' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          OptiFlow Component Showcase
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
          All 23 shared components — interactive, role-aware, and live. Switch roles above to see access control in action.
        </p>
      </div>

      {/* ══════════════════════════════════════════════
          GROUP 2 — METRICS & KPI CARDS
      ══════════════════════════════════════════════ */}
      <Section id="metrics" title="KPI Metrics" icon={LayoutGrid} description="MetricCard with trends, tags, and progress bars">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          <MetricCard title="Total Tasks"        value="248"  tag="This Month"  tagVariant="blue"   trend={12} />
          <MetricCard title="Compliance Score"   value="94%"  tag="Excellent"   tagVariant="green"  trend={3}  progress={94} />
          <MetricCard title="Open Violations"    value="4"    tag="High Risk"   tagVariant="red"    trend={-8} />
          <MetricCard title="Processes Active"   value="17"   tag="Running"     tagVariant="yellow" progress={67} />
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          GROUP 2 — BADGES
      ══════════════════════════════════════════════ */}
      <Section id="badges" title="Badges & Indicators" icon={Shield} description="StatusBadge, SeverityBadge, and Avatar components">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 24 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status Badges</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Draft', 'Active', 'In_Review', 'Completed', 'Blocked', 'Pending', 'Approved', 'Rejected', 'Escalated'].map(s => (
                <StatusBadge key={s} status={s} />
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Severity Badges</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Low', 'Medium', 'High', 'Critical'].map(s => (
                <SeverityBadge key={s} severity={s} />
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avatars & Groups</p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <Avatar name="Dana Osei"    role="Compliance_Officer" presence="online" size={40} />
              <Avatar name="Casey Park"   role="Project_Manager"    presence="away"   size={40} />
              <Avatar name="Drew Santos"  role="Team_Member"        presence="busy"   size={40} />
              <Avatar name="Robin Nkosi"  role="HR_Manager"         presence="offline" size={40} />
              <div style={{ width: 1, height: 32, background: 'var(--border-color)' }} />
              <AvatarGroup users={[
                { name: 'Dana Osei', role: 'Compliance_Officer' },
                { name: 'Casey Park', role: 'Project_Manager' },
                { name: 'Drew Santos', role: 'Team_Member' },
                { name: 'Robin Nkosi', role: 'HR_Manager' },
                { name: 'Jamie Xu', role: 'Team_Leader' },
              ]} max={3} size={34} />
            </div>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          GROUP 1 — SECURITY (PermissionGate)
      ══════════════════════════════════════════════ */}
      <Section id="permission-gate" title="Permission Gate" icon={Shield} description="PermissionGate — DOM suppression for unauthorized roles">
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 24 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Current role: <strong>{currentUser?.roleLabel}</strong>. Buttons below only render for authorized roles — not hidden, completely absent from DOM.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <PermissionGate roles={['SuperUser', 'System_Admin']}>
              <button style={showcaseBtn('#2563eb')} id="pg-superuser-btn">🔑 SuperUser / Admin Only</button>
            </PermissionGate>
            <PermissionGate roles={['Compliance_Officer', 'SuperUser']}>
              <button style={showcaseBtn('#dc2626')} id="pg-compliance-btn">🛡️ Compliance Officer Only</button>
            </PermissionGate>
            <PermissionGate permissions={['approve']}>
              <button style={showcaseBtn('#16a34a')} id="pg-approve-btn">✅ Can Approve</button>
            </PermissionGate>
            <PermissionGate roles={['Team_Member']}>
              <button style={showcaseBtn('#9333ea')} id="pg-member-btn">👤 Team Member Only</button>
            </PermissionGate>
            <PermissionGate permissions={['submit_evidence']}>
              <button style={showcaseBtn('#0891b2')} id="pg-evidence-btn">📎 Can Submit Evidence</button>
            </PermissionGate>
            {/* Always visible */}
            <button style={showcaseBtn('#475569')} id="pg-public-btn">🌐 Visible to All Roles</button>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          GROUP 1 — TOAST NOTIFICATIONS
      ══════════════════════════════════════════════ */}
      <Section id="toasts" title="Toast Notifications" icon={Bell} description="useToast() hook — all 4 variants with pause-on-hover">
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 24 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: '✅ Success',  fn: () => toast.success('Task approved successfully!', { title: 'Approved' }) },
              { label: '❌ Error',    fn: () => toast.error('Failed to submit evidence. Server timeout.', { title: 'Upload Failed' }) },
              { label: '⚠️ Warning', fn: () => toast.warning('Deadline is approaching for 3 tasks.') },
              { label: 'ℹ️ Info',    fn: () => toast.info('Compliance audit scheduled for Oct 1st.') },
            ].map(({ label, fn }) => (
              <button key={label} id={`toast-${label.split(' ')[1].toLowerCase()}-btn`} onClick={fn} style={showcaseBtn('#475569')}>{label}</button>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          GROUP 1 — MODAL & DRAWER
      ══════════════════════════════════════════════ */}
      <Section id="overlays" title="Modal & SlideOver Drawer" icon={Layers} description="React Portal dialogs with focus trapping and ESC dismiss">
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 24 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button id="open-modal-btn" onClick={() => setModalOpen(true)} style={showcaseBtn('#2563eb')}>Open Modal</button>
            <button id="open-drawer-btn" onClick={() => setDrawerOpen(true)} style={showcaseBtn('#7c3aed')}>Open SlideOver Drawer</button>
            <button id="open-confirm-btn" onClick={async () => {
              const ok = await confirm({ title: 'Delete Task', message: 'Are you sure you want to delete this task? This action cannot be undone.' });
              toast[ok ? 'success' : 'info'](ok ? 'Task deleted.' : 'Deletion cancelled.');
            }} style={showcaseBtn('#dc2626')}>useConfirm() Dialog</button>
          </div>
        </div>

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Example Modal Dialog" size="md"
          footer={<><button onClick={() => setModalOpen(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer' }}>Cancel</button><button onClick={() => { setModalOpen(false); toast.success('Action confirmed!'); }} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}>Confirm</button></>}
        >
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>This modal uses <strong>React Portal</strong>, implements focus trapping (Tab cycles within), ESC key dismissal, body scroll lock, and a smooth scale-in animation. Click the backdrop or press ESC to close.</p>
          <div style={{ marginTop: 16, padding: 14, background: 'var(--surface-2)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>
            The footer accepts any ReactNode via the <code>footer</code> prop, enabling flexible action compositions.
          </div>
        </Modal>

        <SlideOverDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="SlideOver Drawer Panel"
          footer={<button onClick={() => setDrawerOpen(false)} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}>Close</button>}
        >
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 16 }}>This drawer slides in from the right edge using CSS transitions. It includes backdrop blur dismiss, ESC key handling, and body scroll lock.</p>
          <WorkflowStepper stages={SAMPLE_WORKFLOW_STAGES} />
        </SlideOverDrawer>
      </Section>

      {/* ══════════════════════════════════════════════
          GROUP 2 — SEARCH FILTER BAR
      ══════════════════════════════════════════════ */}
      <Section id="search" title="Search & Filter Bar" icon={Database} description="Debounced search + URL-synced PillTabs + select filters">
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 24 }}>
          <SearchFilterBar
            tabs={['All', 'Open', 'In Review', 'Resolved']}
            placeholder="Search tasks…"
            onSearch={v => v && toast.info(`Searching for: "${v}"`)}
            filters={[
              { key: 'severity', label: 'Severity', options: [{ label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' }, { label: 'Critical', value: 'critical' }] },
              { key: 'assignee', label: 'Assignee',  options: [{ label: 'Dana Osei', value: 'dana' }, { label: 'Casey Park', value: 'casey' }] },
            ]}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Tab and search state is synced with URL query params (?tab=In+Review&q=compliance). Check your browser address bar.</p>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          GROUP 2 — DATA TABLE
      ══════════════════════════════════════════════ */}
      <Section id="datatable" title="Data Table" icon={Database} description="TanStack Table v8 — sorting, selection, pagination, skeleton">
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 24 }}>
          <div style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
            <button id="datatable-loading-btn" onClick={simulateTableLoading} style={showcaseBtn('#475569')}>Simulate Loading Skeleton</button>
          </div>
          <DataTable
            data={SAMPLE_TASKS}
            columns={TABLE_COLUMNS}
            isLoading={tableLoading}
            enableRowSelection
            pageSize={5}
            emptyTitle="No tasks found"
            emptyDescription="Try adjusting your search filters."
            bulkActions={
              <button style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#dc2626', color: 'white', fontSize: 12, cursor: 'pointer' }}>
                Delete Selected
              </button>
            }
          />
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          GROUP 2 — EMPTY STATE & SKELETONS
      ══════════════════════════════════════════════ */}
      <Section id="empty" title="Empty States & Skeletons" icon={Layers} description="EmptyState SVG illustrations and shimmer placeholders">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <EmptyState title="No results found" description="Try a different search term or clear your active filters to see all records." variant="search" />
          </div>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          GROUP 3 — AUDIT TIMELINE
      ══════════════════════════════════════════════ */}
      <Section id="audit" title="Audit Timeline" icon={FileCheck} description="Chronological audit stream with JSON before/after diffs">
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 24 }}>
          <AuditTimeline events={SAMPLE_AUDIT_EVENTS} />
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          GROUP 3 — MASTER DETAIL LAYOUT
      ══════════════════════════════════════════════ */}
      <Section id="master-detail" title="Master Detail Layout" icon={Layers} description="Split-screen queue + inspector with URL selection sync">
        <div style={{ height: 360 }}>
          <MasterDetailLayout
            listTitle="Task Queue"
            detailTitle="Task Inspector"
            list={
              <div>
                {SAMPLE_TASKS.map(t => (
                  <div key={t.id} style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)', marginBottom: 4 }}>{t.title}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <StatusBadge status={t.status} size="sm" />
                      <SeverityBadge severity={t.severity} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            }
            detail={
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Review Q3 Compliance Report</h3>
                <WorkflowStepper stages={SAMPLE_WORKFLOW_STAGES} />
              </div>
            }
          />
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          GROUP 3 — COMMENT THREAD
      ══════════════════════════════════════════════ */}
      <Section id="comments" title="Comment Thread" icon={Users} description="Nested discussion feed with optimistic submit and author delete">
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 24 }}>
          <CommentThread
            comments={comments}
            onSubmit={handleAddComment}
            onDelete={handleDeleteComment}
          />
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          GROUP 3 — EVIDENCE DROPZONE
      ══════════════════════════════════════════════ */}
      <Section id="evidence" title="Evidence Dropzone" icon={FileCheck} description="Dual-mode: Upload with SHA-256 / Reviewer preview">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 24 }}>
            <EvidenceDropzone mode="upload" onUpload={files => { toast.success(`${files.length} file(s) uploaded with SHA-256 checksums computed.`); }} />
          </div>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 24 }}>
            <EvidenceDropzone mode="review" documents={[
              { id: 'd1', name: 'Q3_Compliance_Report.pdf', sha256: 'a3f2b1c8d9e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0', url: '#', uploadedBy: { name: 'Drew Santos' }, uploadedAt: 'Sep 20, 2026' },
              { id: 'd2', name: 'ISO27001_Evidence.docx',   sha256: 'b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5', url: '#', uploadedBy: { name: 'Drew Santos' }, uploadedAt: 'Sep 19, 2026' },
            ]} />
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          GROUP 3 — CHANGE REQUEST MODAL
      ══════════════════════════════════════════════ */}
      <Section id="change-request" title="Change Request (Downward Immutability)" icon={GitBranch} description="Baseline delta diff modal with mandatory justification">
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 24 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Subordinates cannot edit baselines directly. This modal captures proposed changes and mandatory justification before dispatching to the superior's review queue.
          </p>
          <button id="open-change-request-btn" onClick={() => setCrModalOpen(true)} style={showcaseBtn('#7c3aed')}>
            Open Change Request Modal
          </button>
        </div>
        <ChangeRequestModal
          isOpen={crModalOpen}
          onClose={() => setCrModalOpen(false)}
          onSubmit={({ changes, justification }) => {
            toast.success(`Change request submitted for review. ${Object.keys(changes).length} field(s) changed.`);
          }}
          entityName="Project Alpha — Q4 Delivery"
          entityType="project"
          current={{ deadline: '2026-12-31', budget: '$120,000', scope: 'Phase 1 & 2 only' }}
        />
      </Section>

      {/* ══════════════════════════════════════════════
          GROUP 3 — APPROVAL ACTION BAR
      ══════════════════════════════════════════════ */}
      <Section id="approval-bar" title="Approval Action Bar" icon={Shield} description="Sticky bottom bar with role-gated Approve/Reject/Escalate">
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              The action bar below is sticky to the bottom of review screens.
              Buttons are suppressed via PermissionGate for roles that cannot Approve/Reject/Escalate.
            </p>
          </div>
          <ApprovalActionBar
            entityLabel="Q3 Compliance Report Review"
            onApprove={() => toast.success('Approved! Item has been moved to Completed.', { title: 'Approved' })}
            onReject={({ justification }) => toast.error(`Rejected. Reason: "${justification.slice(0, 60)}…"`, { title: 'Rejected' })}
            onEscalate={() => toast.warning('Escalated to senior management for review.', { title: 'Escalated' })}
          />
        </div>
      </Section>

      <div style={{ height: 40 }} />
    </div>
  );
}

// ─── Utility button style ─────────────────────────────────────────────────────
function showcaseBtn(color) {
  return {
    padding: '8px 16px', borderRadius: 8,
    border: 'none', background: `${color}15`,
    color, fontSize: 13, fontWeight: 500, cursor: 'pointer',
    transition: 'all 0.15s',
  };
}

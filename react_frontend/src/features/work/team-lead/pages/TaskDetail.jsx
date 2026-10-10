import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge } from '../../../../shared/components/Badge';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { Modal } from '../../../../shared/components/Modal';
import { Toast } from '../../../../shared/components/Toast';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { TaskDetailPanel, SubtaskList, EscalationForm } from '../../components';
import { useAuth } from '../../../../context/AuthContext';
import * as tasksApi from '../../../../services/api/tasks';
import * as subtasksApi from '../../../../services/api/subtasks';
import * as escalationsApi from '../../../../services/api/escalations';
import * as usersApi from '../../../../services/api/users';

const BLOCKER_TYPES = ['Missing Information / Data', 'System Issue / Bug', 'Dependency Delay', 'Access / permission', 'Other'];
const STAGES = ['Data Collection', 'Work In Progress', 'Team Leader Review', 'Compliance Audit'];
const STAGE_MAP = { In_Progress: 1, In_Review: 2, Pending_TL_Review: 2, Completed: 3 };

const toStr = (val, fb = '—') => {
  if (val == null) return fb;
  if (typeof val === 'object') return val.fullName || val.name || val.label || val.title || fb;
  return String(val) || fb;
};
const badgeVariant = (s) => {
  s = String(s || '').toLowerCase();
  if (s.includes('complet') || s.includes('approved')) return 'success';
  if (s.includes('progress') || s.includes('review')) return 'info';
  if (s.includes('pending') || s.includes('blocked')) return 'warning';
  if (s.includes('reject') || s.includes('fail')) return 'danger';
  return 'default';
};
const fmt = (s) => String(s || 'Unknown').replace(/_/g, ' ');

export default function TeamLeadTaskDetail() {
  const { id: taskId } = useParams();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [actionOpen, setActionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('submit');
  const [blockerType, setBlockerType] = useState(BLOCKER_TYPES[0]);
  const [blockerDesc, setBlockerDesc] = useState('');
  const [extDate, setExtDate] = useState('');
  const [extReason, setExtReason] = useState('');

  const [subtaskOpen, setSubtaskOpen] = useState(false);
  const [stForm, setStForm] = useState({ title: '', assignee: '', due: '' });
  const [savingSt, setSavingSt] = useState(false);
  const [subtaskError, setSubtaskError] = useState('');

  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });
  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  useEffect(() => {
    if (!taskId) { setNotFound(true); setLoading(false); return; }
    let active = true;
    Promise.all([tasksApi.get(taskId).catch(() => null), usersApi.list().catch(() => [])])
      .then(([taskRes, membersRes]) => {
        if (!active) return;
        const t = taskRes?.data || taskRes;
        if (!t) { setNotFound(true); return; }
        setTask(t);
        setSubtasks(Array.isArray(t.subtasks) ? t.subtasks : []);
        const membersData = Array.isArray(membersRes) ? membersRes : membersRes?.data || [];
        setMembers(membersData.filter(member => member.managerUserId === user.id));
      })
      .catch(() => active && showToast('error', 'Failed to load task.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [taskId]);

  const patchTask = async (patch) => {
    try {
      await tasksApi.update(taskId, patch);
      setTask(prev => ({ ...prev, ...patch }));
    } catch { showToast('error', 'Update failed.'); }
  };

  const handleApprove = () => patchTask({ status: 'Completed' }).then(() => showToast('success', 'Task approved.'));
  const handleReject  = () => patchTask({ status: 'In_Progress' }).then(() => showToast('success', 'Sent back for changes.'));

  const handleReportBlocker = async () => {
    if (!blockerDesc.trim()) return showToast('error', 'Please describe the blocker.');
    try {
      await escalationsApi.create({ taskId, title: `Blocker: ${blockerType}`, blockerType, description: blockerDesc.trim(), priority: 'high', status: 'Pending', createdAt: new Date().toISOString() });
      showToast('success', 'Blocker reported.');
      setActionOpen(false); setBlockerDesc('');
    } catch { showToast('error', 'Failed to report blocker.'); }
  };

  const handleExtension = async () => {
    if (!extDate || !extReason.trim()) return showToast('error', 'Please fill all fields.');
    try {
      await tasksApi.update(taskId, { extensionRequest: { requestedDate: extDate, reason: extReason.trim() } });
      showToast('success', 'Extension requested.');
      setActionOpen(false); setExtDate(''); setExtReason('');
    } catch { showToast('error', 'Failed to submit request.'); }
  };

  const handleSaveSubtask = async () => {
    setSubtaskError('');
    if (!stForm.title.trim()) {
      setSubtaskError('Title is required.');
      return;
    }
    setSavingSt(true);
    try {
      const assignedMember = members.find(m => String(m.id || m.userId) === String(stForm.assignee));
      const res = await subtasksApi.create({
        taskId: taskId,
        title: stForm.title.trim(),
        assignedTo: stForm.assignee || undefined,
        assignedToId: stForm.assignee || undefined,
        dueDate: stForm.due || undefined,
        isSubtask: true,
        status: 'Active'
      });
      const created = res?.data || res || { id: Date.now(), ...stForm };
      const subtaskItem = {
        ...created,
        assignedTo: assignedMember?.fullName || assignedMember?.name || stForm.assignee,
        assignedToName: assignedMember?.fullName || assignedMember?.name,
      };
      setSubtasks(prev => [...prev, subtaskItem]);
      showToast('success', 'Subtask created.');
      setSubtaskOpen(false); setSubtaskError(''); setStForm({ title: '', assignee: '', due: '' });
    } catch (error) {
      setSubtaskError(error?.message || 'Failed to create subtask.');
    }
    finally { setSavingSt(false); }
  };

  if (loading) return (
    <div className="min-h-full flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3"><Loader /><p className="text-sm text-gray-500">Loading task...</p></div>
    </div>
  );

  if (notFound || !task) return (
    <div className="p-8">
      <Link to="/team-lead/tasks" className="text-sm text-blue-600 hover:underline">← Back to Tasks</Link>
      <div className="mt-4"><EmptyState title="Task not found" description="This task does not exist or you lack access." /></div>
    </div>
  );

  const isInReview = ['In_Review', 'Pending_TL_Review'].includes(task.status);
  const currentStage = STAGE_MAP[task.status] ?? 1;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/team-lead/tasks" className="hover:text-gray-700">Team Tasks</Link>
        <span>›</span>
        <span className="text-gray-900 font-semibold truncate max-w-xs">{toStr(task.title, 'Untitled')}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">

        {/* Left column */}
        <div className="space-y-5">
          <TaskDetailPanel
            task={task}
            onClose={() => window.history.back()}
            headerActions={isInReview ? (
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" onClick={handleReject}>Request Changes</Button>
                <Button variant="primary" onClick={handleApprove}>Approve</Button>
              </div>
            ) : null}
          >
            <div className="flex justify-end -mb-4 relative z-10 pr-2">
              <Button variant="outline" onClick={() => { setSubtaskError(''); setSubtaskOpen(true); }}>+ Add Subtask</Button>
            </div>
            <SubtaskList 
              subtasks={subtasks}
              readOnly={true}
            />

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button variant="primary" onClick={() => { setActiveTab('submit'); setActionOpen(true); }}>Submit Work</Button>
              <Button variant="outline" onClick={() => { setActiveTab('blocker'); setActionOpen(true); }}>Report Blocker</Button>
              <Button variant="outline" onClick={() => { setActiveTab('extension'); setActionOpen(true); }}>Request Extension</Button>
            </div>
          </TaskDetailPanel>
        </div>

        {/* Right column — Process stages */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 sticky top-6">
          <h2 className="text-sm font-bold text-gray-900 mb-6">Process Stages</h2>
          {STAGES.map((name, i) => {
            const done = i < currentStage;
            const active = i === currentStage;
            return (
              <div key={name} className="flex gap-4 relative pb-6 last:pb-0">
                {i < STAGES.length - 1 && <div className="absolute left-[13px] top-7 bottom-0 w-0.5 bg-gray-200 z-0" />}
                <div className={`relative z-10 w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold ${done ? 'bg-blue-600 text-white' : active ? 'border-2 border-amber-400 bg-amber-50 text-amber-600' : 'border border-gray-300 bg-white text-gray-500'}`}>
                  {done
                    ? <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    : i + 1}
                </div>
                <div className="pt-1">
                  <p className="text-sm font-semibold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{done ? 'Completed' : active ? 'In progress' : 'Pending'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action modal */}
      <Modal isOpen={actionOpen} onClose={() => setActionOpen(false)} title="Task Actions"
        footer={<>
          <Button variant="outline" onClick={() => setActionOpen(false)}>Cancel</Button>
          {activeTab === 'submit' && (
            <Button variant="primary" onClick={async () => {
              try { await tasksApi.update(taskId, { status: 'In_Review' }); setTask(p => ({ ...p, status: 'In_Review' })); showToast('success', 'Work submitted.'); setActionOpen(false); }
              catch { showToast('error', 'Failed to submit.'); }
            }}>Submit for Review</Button>
          )}
          {activeTab === 'blocker' && <Button variant="primary" onClick={handleReportBlocker}>Report Blocker</Button>}
          {activeTab === 'extension' && <Button variant="primary" onClick={handleExtension}>Submit Request</Button>}
        </>}>
        <div className="-mx-6 -mt-4 mb-4 border-b border-slate-200 flex px-6 gap-6">
          {[['submit','Submit Work'],['blocker','Report Blocker'],['extension','Request Extension']].map(([id,label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`py-3 text-sm font-semibold transition-colors ${activeTab===id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        {activeTab === 'submit' && <p className="text-sm text-gray-600">Current status: <strong>{fmt(task.status)}</strong>. Submitting will move it to the review queue.</p>}
        {activeTab === 'blocker' && (
          <div className="space-y-4">
            <FormField label="Blocker Type">
              <Select value={blockerType} onChange={e => setBlockerType(e.target.value)}>
                {BLOCKER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Description" required>
              <Textarea value={blockerDesc} onChange={e => setBlockerDesc(e.target.value)} rows={4} placeholder="Describe the blocker in detail..." />
            </FormField>
          </div>
        )}
        {activeTab === 'extension' && (
          <div className="space-y-4">
            <FormField label="New Deadline" required>
              <Input type="date" value={extDate} onChange={e => setExtDate(e.target.value)} />
            </FormField>
            <FormField label="Reason" required>
              <Textarea value={extReason} onChange={e => setExtReason(e.target.value)} rows={4} placeholder="Explain why more time is needed..." />
            </FormField>
          </div>
        )}
      </Modal>

      {/* Subtask modal */}
      <Modal isOpen={subtaskOpen} onClose={() => { setSubtaskOpen(false); setSubtaskError(''); }} title="Create Subtask"
        footer={<>
          <Button variant="outline" onClick={() => { setSubtaskOpen(false); setSubtaskError(''); }}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveSubtask} disabled={savingSt}>{savingSt ? 'Saving…' : 'Assign Subtask'}</Button>
        </>}>
        <div className="space-y-4">
          {subtaskError && (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {subtaskError}
            </div>
          )}
          <FormField label="Subtask Title" required>
            <Input value={stForm.title} onChange={e => setStForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" />
          </FormField>
          <FormField label="Assign To">
            <Select value={stForm.assignee} onChange={e => setStForm(f => ({ ...f, assignee: e.target.value }))}>
              <option value="">— Unassigned —</option>
              {members.map(m => <option key={m.id || m.userId} value={m.id || m.userId}>{m.fullName || m.name || 'Member #' + m.id}</option>)}
            </Select>
          </FormField>
          <FormField label="Deadline">
            <Input type="date" value={stForm.due} onChange={e => setStForm(f => ({ ...f, due: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      <Toast visible={toast.visible} type={toast.type} message={toast.message} onClose={() => setToast(t => ({ ...t, visible: false }))} />
    </div>
  );
}
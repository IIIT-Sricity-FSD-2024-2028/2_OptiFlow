import React, { useEffect, useState } from 'react';
import { Badge } from '../../../../shared/components/Badge';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { Modal } from '../../../../shared/components/Modal';
import { Toast } from '../../../../shared/components/Toast';
import { FormField, Input, Select } from '../../../../shared/components/FormField';
import * as escalationsApi from '../../../../services/api/escalations';
import * as tasksApi from '../../../../services/api/tasks';

const BLOCKER_TYPES = ['Access / permission', 'Missing Information / Data', 'System Issue / Bug', 'Dependency Delay', 'Other'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const escVariant = (s) => {
  s = String(s || '').toLowerCase();
  if (s === 'resolved') return 'success';
  if (s === 'pending') return 'warning';
  if (s === 'in_progress' || s === 'open') return 'info';
  return 'default';
};
const priVariant = (p) => {
  p = String(p || '').toLowerCase();
  if (p === 'critical' || p === 'high') return 'danger';
  if (p === 'medium') return 'warning';
  return 'default';
};
const fmt = (s) => String(s || 'Unknown').replace(/_/g, ' ');
const normalize = (r) => Array.isArray(r) ? r : r?.data || [];

export default function TeamLeadEscalations() {
  const [escalations, setEscalations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [form, setForm] = useState({ taskId: '', title: '', type: BLOCKER_TYPES[0], priority: 'medium' });
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  useEffect(() => {
    let active = true;
    Promise.all([escalationsApi.list().catch(() => []), tasksApi.list().catch(() => [])])
      .then(([e, t]) => { if (!active) return; setEscalations(normalize(e)); setTasks(normalize(t)); })
      .catch(() => active && showToast('error', 'Failed to load escalations.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filtered = escalations.filter(e =>
    filter === 'all' ? true : String(e.status || '').toLowerCase() === filter
  );

  const handleCreate = async () => {
    if (!form.title.trim()) return showToast('error', 'Please enter a title.');
    setCreating(true);
    try {
      const res = await escalationsApi.create({
        ...form,
        taskId: form.taskId || undefined,
        title: form.title.trim(),
        status: 'Pending',
        createdAt: new Date().toISOString(),
      });
      setEscalations(prev => [res?.data || res || { id: Date.now(), ...form }, ...prev]);
      showToast('success', 'Escalation sent.');
      setIsOpen(false);
      setForm({ taskId: '', title: '', type: BLOCKER_TYPES[0], priority: 'medium' });
    } catch {
      showToast('error', 'Failed to send escalation.');
    } finally { setCreating(false); }
  };

  const handleResolve = async (esc) => {
    setResolvingId(esc.id);
    try {
      await escalationsApi.update(esc.id, { status: 'Resolved' });
      setEscalations(prev => prev.map(e => e.id === esc.id ? { ...e, status: 'Resolved' } : e));
      showToast('success', 'Escalation resolved.');
    } catch {
      showToast('error', 'Failed to resolve.');
    } finally { setResolvingId(null); }
  };

  if (loading) return (
    <div className="min-h-full flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3"><Loader /><p className="text-sm text-gray-500">Loading escalations...</p></div>
    </div>
  );

  const pendingCount = escalations.filter(e => String(e.status || '').toLowerCase() === 'pending').length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Escalations</h1>
          <p className="text-gray-500 mt-1">Manage blockers and notify the Project Manager</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && <Badge status="warning">{pendingCount} pending</Badge>}
          <Button variant="primary" onClick={() => setIsOpen(true)}>+ New Escalation</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: escalations.length, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Pending', count: escalations.filter(e => String(e.status||'').toLowerCase()==='pending').length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'In Progress', count: escalations.filter(e => ['in_progress','open'].includes(String(e.status||'').toLowerCase())).length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Resolved', count: escalations.filter(e => String(e.status||'').toLowerCase()==='resolved').length, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`${bg} rounded-lg p-4 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 flex px-5 gap-6">
          {['all', 'pending', 'in_progress', 'resolved'].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`py-3 text-sm font-semibold capitalize transition-colors ${filter===t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'in_progress' ? 'In Progress' : t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <div className="p-8"><EmptyState title="No escalations" description="No escalations match this filter." /></div>
          : <div className="divide-y divide-gray-100">
              {filtered.map(esc => {
                const isResolved = String(esc.status||'').toLowerCase() === 'resolved';
                const linkedTask = tasks.find(t => String(t.id) === String(esc.taskId||esc.task_id||''));
                return (
                  <div key={esc.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-gray-900 truncate">{esc.title || 'Untitled'}</p>
                        <Badge status={priVariant(esc.priority)}>{String(esc.priority||'medium')}</Badge>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge status={escVariant(esc.status)}>{fmt(esc.status)}</Badge>
                        {esc.blockerType && <span className="text-xs text-gray-500">{esc.blockerType}</span>}
                        {linkedTask && <span className="text-xs text-gray-400">Task: {linkedTask.title || '#'+linkedTask.id}</span>}
                        {esc.createdAt && <span className="text-xs text-gray-400">{new Date(esc.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    {!isResolved && (
                      <Button variant="outline" onClick={() => handleResolve(esc)} disabled={resolvingId===esc.id}>
                        {resolvingId===esc.id ? 'Resolving…' : 'Resolve'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
        }
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="New Escalation"
        footer={<>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={creating}>{creating ? 'Sending…' : 'Send Escalation'}</Button>
        </>}>
        <div className="space-y-4">
          <FormField label="Related Task">
            <Select value={form.taskId} onChange={e => setForm(f => ({ ...f, taskId: e.target.value }))}>
              <option value="">— No specific task —</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.title || 'Task #'+t.id}</option>)}
            </Select>
          </FormField>
          <FormField label="Issue Title" required>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Briefly describe the blocker..." />
          </FormField>
          <FormField label="Blocker Type">
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {BLOCKER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormField>
          <FormField label="Priority">
            <Select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </Select>
          </FormField>
        </div>
      </Modal>

      <Toast visible={toast.visible} type={toast.type} message={toast.message} onClose={() => setToast(t => ({ ...t, visible: false }))} />
    </div>
  );
}

import React, { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Input, Select, FormField } from '../../../shared/components/FormField';

export function EscalationForm({
  taskId,
  tasks = [], // optional array for task dropdown: { id, title }
  isLoading = false,
  onSubmit,
  onCancel
}) {
  const [selectedTaskId, setSelectedTaskId] = useState(taskId || '');
  const [reason, setReason] = useState('Access / permission');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('medium');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || !selectedTaskId) return;

    await onSubmit({
      taskId: selectedTaskId,
      reason,
      description,
      urgency
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          {taskId ? `Escalate Task (ID: ${taskId})` : 'Escalate to PM'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">Submit an escalation if you are blocked and need help from management.</p>
      </div>

      <div className="space-y-4">
        {!taskId && tasks.length > 0 && (
          <FormField label="Task" required>
            <Select 
              value={selectedTaskId} 
              onChange={(e) => setSelectedTaskId(e.target.value)} 
              disabled={isLoading}
            >
              <option value="">Select a team task…</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField label="Blocker Type (Reason)">
          <Select value={reason} onChange={(e) => setReason(e.target.value)} disabled={isLoading}>
            <option value="Access / permission">Access / Permission</option>
            <option value="Dependency delay">Dependency Delay</option>
            <option value="Awaiting approval">Awaiting Approval</option>
            <option value="System outage / bug">System Outage / Bug</option>
            <option value="Unclear requirements">Unclear Requirements</option>
            <option value="Technical issue">Technical Issue</option>
            <option value="Other">Other</option>
          </Select>
        </FormField>

        <FormField label="Priority / Urgency">
          <Select value={urgency} onChange={(e) => setUrgency(e.target.value)} disabled={isLoading}>
            <option value="high">High (Completely blocked, urgent)</option>
            <option value="medium">Medium (Needs attention soon)</option>
            <option value="low">Low (Can wait a few days)</option>
          </Select>
        </FormField>

        <FormField label="Description">
          <textarea
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            rows={4}
            placeholder="Brief description of the blocker..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
            required
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button variant="primary" type="submit" disabled={isLoading || !description.trim() || !selectedTaskId}>
          {isLoading ? 'Submitting...' : 'Send Escalation'}
        </Button>
      </div>
    </form>
  );
}

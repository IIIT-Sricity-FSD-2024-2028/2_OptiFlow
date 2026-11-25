import { expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { ApiError } from '../../src/services/api/client';
import { renderMember, subtask } from './renderMember';
import TaskDetail from '../../src/features/work/member/pages/TaskDetail';

it('retries an upload against the existing record before submitting the member’s subtask', async () => {
  const create = vi.fn(data => ({ ...data, id: 'e1' }));
  const upload = vi.fn().mockRejectedValueOnce(new Error('Upload interrupted')).mockResolvedValueOnce({ id: 'e1' });
  const update = vi.fn(data => ({ ...subtask, ...data }));
  renderMember(TaskDetail, {
    'POST /api/evidence': create, 'PATCH /api/evidence/e1': data => ({ ...data, id: 'e1' }),
    'POST /api/evidence/e1/upload': upload, 'PATCH /api/subtasks/s1': update,
  });
  expect(screen.getByText('Loading task deliverable...')).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Submit Work for Review' }));
  fireEvent.change(screen.getByPlaceholderText(/Describe what was accomplished/), { target: { value: 'Work is ready.' } });
  const file = new File(['proof'], 'review.pdf', { type: 'application/pdf' });
  fireEvent.change(document.querySelector('input[type=file]'), { target: { files: [file] } });
  const confirm = screen.getByRole('button', { name: 'Confirm Submission' });
  fireEvent.click(confirm);
  await screen.findByText('Upload interrupted');
  expect(update).not.toHaveBeenCalled();
  fireEvent.click(confirm);
  await screen.findByRole('button', { name: 'Under Review by Lead' });
  expect(create).toHaveBeenCalledTimes(1);
  expect(upload).toHaveBeenCalledTimes(2);
  expect(upload.mock.calls[1][0].get('file').name).toBe('review.pdf');
  expect(update).toHaveBeenCalledWith({ status: 'In_Review' });
});
it('sends a later extension date and the task’s manager', async () => {
  const create = vi.fn(data => ({ ...data, id: 'ext' }));
  const datedSubtask = { id: 's1', taskId: 't1', title: 'My subtask', assignedToId: 'member', status: 'Pending', dueDate: '2030-01-10' };
  renderMember(TaskDetail, {
    'GET /api/tasks/t1': { id: 't1', title: 'My task', assignedToId: 'member', status: 'In_Progress', projectId: 'p1', createdById: 'lead', dueDate: '2030-01-15', subtasks: [datedSubtask] },
    'GET /api/subtasks': [datedSubtask],
    'POST /api/escalations': create,
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Request Extension' }));
  const date = document.querySelector('input[type=date]');
  expect(date.min).toBe('2030-01-11');
  fireEvent.change(date, { target: { value: '2030-01-14' } });
  fireEvent.change(screen.getByPlaceholderText(/Explain why extra time/), { target: { value: 'Waiting on review' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
  await screen.findByText('Extension request sent to your Team Lead.');
  expect(create).toHaveBeenCalledWith(expect.objectContaining({
    taskId: 't1', targetManagerId: 'lead', blockerType: 'Extension Request',
    description: expect.stringContaining('2030-01-14'),
  }));
});
it('shows a missing task and the read failure reason', async () => {
  renderMember(TaskDetail, { 'GET /api/tasks/t1': () => { throw new Error('Task reassigned'); } });
  await screen.findByText('Task not found');
  expect(screen.getByText('Task reassigned')).toBeInTheDocument();
});

it('refreshes compliance violations after remediation evidence is saved', async () => {
  const readViolations = vi.fn().mockResolvedValueOnce([
    { id: 'v1', entityId: 't1', status: 'Open', rule: { name: 'Evidence policy' } },
  ]).mockResolvedValue([]);
  renderMember(TaskDetail, {
    'GET /api/compliance-violations': readViolations,
    'POST /api/evidence': data => ({ ...data, id: 'proof' }),
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Upload Remediation Evidence' }));
  fireEvent.change(screen.getByPlaceholderText(/Test Coverage Report/), { target: { value: 'Policy proof' } });
  fireEvent.click(screen.getByRole('button', { name: 'Upload Deliverable' }));
  await screen.findByText('Policy proof');
  expect(screen.queryByRole('button', { name: 'Upload Remediation Evidence' })).toBeNull();
  expect(readViolations).toHaveBeenCalledTimes(2);
});

it('keeps the subtask open and explains a compliance rejection', async () => {
  renderMember(TaskDetail, {
    'PATCH /api/subtasks/s1': () => {
      throw new ApiError('Evidence required', { status: 409, code: 'COMPLIANCE_BLOCK' });
    },
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Submit Work for Review' }));
  fireEvent.change(screen.getByPlaceholderText(/Describe what was accomplished/), { target: { value: 'Ready for review' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Submission' }));
  await screen.findByText(/Submission blocked: Compliance rule/);
  expect(screen.getByRole('button', { name: 'Confirm Submission' })).toBeEnabled();
});

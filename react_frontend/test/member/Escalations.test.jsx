import { expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderMember, task } from './renderMember';
import Escalations from '../../src/features/work/member/pages/Escalations';

it('adds a reported blocker to the table and updates its parent task', async () => {
  const { store } = renderMember(Escalations, {
    'POST /api/escalations': data => ({ ...data, id: 'b1' }),
    'PATCH /api/tasks/t1': data => ({ ...task, ...data }),
  });
  expect(screen.getByText(/Loading escalations/)).toBeInTheDocument();
  await screen.findByText('No blockers found');
  fireEvent.click(screen.getByRole('button', { name: /Report Blocker/i }));
  fireEvent.change(screen.getByPlaceholderText(/Missing API credentials/), { target: { value: 'Waiting for access' } });
  fireEvent.change(screen.getByPlaceholderText(/Describe what is preventing/), { target: { value: 'Need access to the project' } });
  fireEvent.click(screen.getByRole('button', { name: 'Alert Leadership' }));
  await screen.findByText('Waiting for access');
  expect(store.getState().tasks.entities.t1.status).toBe('Blocked');
});
it('displays a failed escalation read', async () => {
  renderMember(Escalations, { 'GET /api/escalations': () => { throw new Error('Escalations unavailable'); } });
  await screen.findByText('Escalations unavailable');
});

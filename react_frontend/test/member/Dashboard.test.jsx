import { expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderMember } from './renderMember';
import Dashboard from '../../src/features/work/member/pages/Dashboard';

it('counts and displays only this member’s tasks and subtasks', async () => {
  renderMember(Dashboard);
  expect(screen.getByText('Loading your workspace...')).toBeInTheDocument();
  await screen.findByText('1 deliverables, 1 subtasks');
  expect(screen.queryByText('Other task')).toBeNull();
});
it('shows an empty workspace and reports unavailable task data', async () => {
  renderMember(Dashboard, { 'GET /api/tasks': () => { throw new Error('Tasks unavailable'); }, 'GET /api/subtasks': [] });
  await screen.findByText('0 deliverables, 0 subtasks');
  expect(screen.getByRole('alert')).toHaveTextContent('Tasks unavailable');
});

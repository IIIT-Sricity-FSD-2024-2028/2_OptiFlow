import { expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderMember } from './renderMember';
import Tasks from '../../src/features/work/member/pages/Tasks';

it('filters the assigned tasks and subtasks without fetching another list', async () => {
  renderMember(Tasks);
  expect(screen.getByText('Loading your tasks...')).toBeInTheDocument();
  await screen.findByText('My subtask');
  expect(screen.getByText('My task')).toBeInTheDocument();
  expect(screen.queryByText('Other task')).toBeNull();
  fireEvent.change(screen.getByPlaceholderText(/Search tasks/), { target: { value: 'absent' } });
  expect(screen.getByText('No tasks found')).toBeInTheDocument();
});
it('keeps available tasks visible if a secondary list fails', async () => {
  renderMember(Tasks, { 'GET /api/projects': () => { throw new Error('Projects unavailable'); } });
  await screen.findByText('My task');
  expect(screen.getByRole('alert')).toHaveTextContent('Projects unavailable');
});

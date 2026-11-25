import { expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderMember } from './renderMember';
import Evidence from '../../src/features/work/member/pages/Evidence';

it('uploads, edits and deletes an artifact while keeping rejected deletes visible', async () => {
  const remove = vi.fn().mockRejectedValueOnce(new Error('Denied')).mockResolvedValueOnce(null);
  renderMember(Evidence, {
    'POST /api/evidence': data => ({ ...data, id: 'e1' }),
    'PATCH /api/evidence/e1': data => ({ ...data, id: 'e1' }),
    'DELETE /api/evidence/e1': remove,
  });
  expect(screen.getByText('Loading evidence submissions...')).toBeInTheDocument();
  await screen.findByText('No evidence found');
  fireEvent.click(screen.getByRole('button', { name: 'Upload Evidence' }));
  fireEvent.change(screen.getByPlaceholderText(/Test Coverage Report/), { target: { value: 'Draft evidence' } });
  fireEvent.click(screen.getByRole('button', { name: 'Upload Deliverable' }));
  await screen.findByText('Draft evidence');
  fireEvent.click(screen.getByTitle('Edit Artifact'));
  fireEvent.change(screen.getByPlaceholderText(/Test Coverage Report/), { target: { value: 'Final evidence' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await screen.findByText('Final evidence');
  fireEvent.click(screen.getByTitle('Delete Artifact'));
  const confirm = screen.getByRole('button', { name: 'Delete' });
  fireEvent.click(confirm);
  await screen.findByText('Failed to delete evidence record.');
  expect(screen.getByText('Final evidence')).toBeInTheDocument();
  fireEvent.click(confirm);
  await waitFor(() => expect(screen.queryByText('Final evidence')).toBeNull());
});
it('reports an unavailable evidence list', async () => {
  renderMember(Evidence, { 'GET /api/evidence': () => { throw new Error('Evidence unavailable'); } });
  await screen.findByText('Evidence unavailable');
});

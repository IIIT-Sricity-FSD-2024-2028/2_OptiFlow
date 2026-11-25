import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../../src/store';
import * as api from '../../src/services/api/process';
import InstanceDetail from '../../src/features/process-admin/pages/InstanceDetail';

vi.mock('../../src/services/api/process');

function mount() {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={['/test/row']}>
        <Routes><Route path="/test/:id" element={<InstanceDetail />} /></Routes>
      </MemoryRouter>
    </Provider>,
  );
}

it('renders the loading state and the returned instancedetail data', async () => {
  const row = { id: 'row', title: 'Approval workflow', status: 'Active', steps: [] };
  api.getInstance.mockResolvedValue(row);
  const { container } = mount();
  expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  await screen.findByText('Approval workflow');
});
it('displays the server error', async () => {
  api.getInstance.mockRejectedValue(new Error('Process unavailable'));
  mount();
  await screen.findByText('Process unavailable');
});
it('handles an empty response', async () => {
  api.getInstance.mockResolvedValue(null);
  mount();
  await screen.findByText(/Process instance could not be found/);
});

it('renders active instance steps in read-only mode without approve or reject actions', async () => {
  const step = { id: 's', processInstanceId: 'row', status: 'Pending', templateStep: { name: 'Review' } };
  const instance = { id: 'row', title: 'Review run', status: 'Active', currentStepId: 's', steps: [step] };
  api.getInstance.mockResolvedValueOnce(instance);
  mount();
  await screen.findByText('Review');
  expect(screen.getByText('Active Step')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Approve/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Reject/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Abort/i })).not.toBeInTheDocument();
});

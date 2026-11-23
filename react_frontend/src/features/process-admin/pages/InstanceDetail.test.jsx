import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../../../store';
import * as api from '../../../services/api/process';
import InstanceDetail from './InstanceDetail';

vi.mock('../../../services/api/process');

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

it('preserves a rejected step, then refreshes the parent after approval succeeds', async () => {
  const step = { id: 's', processInstanceId: 'row', status: 'Pending', templateStep: { name: 'Review' } };
  const instance = { id: 'row', title: 'Review run', status: 'Active', currentStepId: 's', steps: [step] };
  const approved = { ...step, status: 'Approved' };
  api.getInstance.mockResolvedValueOnce(instance).mockResolvedValueOnce({
    ...instance, status: 'Completed', currentStepId: null, steps: [approved],
  });
  api.actionStep.mockRejectedValueOnce(new Error('Step is blocked')).mockResolvedValueOnce(approved);
  mount();
  fireEvent.click(await screen.findByRole('button', { name: /Approve/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Approved' }));
  await screen.findByText('Step is blocked');
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Approved' }));
  await screen.findByText('Completed');
  expect(api.actionStep).toHaveBeenLastCalledWith('s', { status: 'Approved', comment: undefined },
    expect.objectContaining({ signal: expect.anything() }));
});

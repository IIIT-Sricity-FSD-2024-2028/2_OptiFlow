import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../../../store';
import * as api from '../../../services/api/process';
import Dashboard from './Dashboard';

vi.mock('../../../services/api/process');

function mount(templates = []) {
  api.listTemplates.mockResolvedValue(templates);
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={['/test/row']}>
        <Routes>
          <Route path="/test/:id" element={<Dashboard />} />
          <Route path="/process-admin/instances/:id" element={<p>Opened new instance</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

it('renders the loading state and the returned dashboard data', async () => {
  const row = { id: 'row', title: 'Approval workflow', status: 'Active', steps: [] };
  api.listInstances.mockResolvedValue([row]);
  mount();
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  await screen.findByText('Approval workflow');
});
it('displays the server error', async () => {
  api.listInstances.mockRejectedValue(new Error('Process unavailable'));
  mount();
  await screen.findByText('Process unavailable');
});
it('handles an empty response', async () => {
  api.listInstances.mockResolvedValue([]);
  mount();
  await screen.findByText(/No active process instances found/);
});

it('launches the selected template and navigates to the created instance', async () => {
  api.listInstances.mockResolvedValue([]);
  api.createInstance.mockResolvedValue({ id: 'new-instance' });
  mount([{ id: 't', name: 'Review', isActive: true, steps: [{ id: 's' }] }]);
  await screen.findByText(/No active process instances found/);
  fireEvent.click(screen.getByRole('button', { name: /Launch/i }));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 't' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start Workflow' }));
  await screen.findByText('Opened new instance');
  expect(api.createInstance).toHaveBeenCalledWith({ templateId: 't' }, expect.objectContaining({ signal: expect.anything() }));
});

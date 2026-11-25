import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../../src/store';
import * as api from '../../src/services/api/process';
import Dashboard from '../../src/features/process-admin/pages/Dashboard';

vi.mock('../../src/services/api/process');

function mount(templates = []) {
  api.listTemplates.mockResolvedValue(templates);
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={['/test/row']}>
        <Routes>
          <Route path="/test/:id" element={<Dashboard />} />
          <Route path="/process-admin/templates/:id" element={<p>Opened template builder</p>} />
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

it('creates a new process template and navigates to the template builder', async () => {
  api.listInstances.mockResolvedValue([]);
  api.createTemplate.mockResolvedValue({ id: 'new-template', name: 'Review', version: 1, isActive: true });
  mount([]);
  await screen.findByText(/No active process instances found/);
  fireEvent.click(screen.getByRole('button', { name: /\+ Create Template/i }));
  fireEvent.change(screen.getByPlaceholderText('Enter descriptive template name'), { target: { value: 'Review' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create & Open Builder' }));
  await screen.findByText('Opened template builder');
  expect(api.createTemplate).toHaveBeenCalledWith(
    { name: 'Review', version: 1, isActive: true },
    expect.objectContaining({ signal: expect.anything() }),
  );
});

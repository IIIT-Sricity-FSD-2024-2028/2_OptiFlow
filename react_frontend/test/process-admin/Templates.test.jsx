import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../../src/store';
import * as api from '../../src/services/api/process';
import Templates from '../../src/features/process-admin/pages/Templates';

vi.mock('../../src/services/api/process');

function mount() {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={['/test/row']}>
        <Routes><Route path="/test/:id" element={<Templates />} /></Routes>
      </MemoryRouter>
    </Provider>,
  );
}

it('renders the loading state and the returned templates data', async () => {
  const row = { id: 'row', name: 'Approval workflow', status: 'Active', steps: [] };
  api.listTemplates.mockResolvedValue([row]);
  mount();
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  await screen.findByText('Approval workflow');
});
it('displays the server error', async () => {
  api.listTemplates.mockRejectedValue(new Error('Process unavailable'));
  mount();
  await screen.findByText('Process unavailable');
});
it('handles an empty response', async () => {
  api.listTemplates.mockResolvedValue([]);
  mount();
  await screen.findByText(/No process templates found/);
});

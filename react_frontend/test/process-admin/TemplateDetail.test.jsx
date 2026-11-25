import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../../src/store';
import * as api from '../../src/services/api/process';
import TemplateDetail from '../../src/features/process-admin/pages/TemplateDetail';

vi.mock('../../src/services/api/process');

function mount() {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={['/test/row']}>
        <Routes><Route path="/test/:id" element={<TemplateDetail />} /></Routes>
      </MemoryRouter>
    </Provider>,
  );
}

it('renders the loading state and the returned templatedetail data', async () => {
  const row = { id: 'row', name: 'Approval workflow', status: 'Active', steps: [] };
  api.getTemplate.mockResolvedValue(row);
  const { container } = mount();
  expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  await screen.findByText('Approval workflow');
});
it('displays the server error', async () => {
  api.getTemplate.mockRejectedValue(new Error('Process unavailable'));
  mount();
  await screen.findByText('Process unavailable');
});
it('handles an empty response', async () => {
  api.getTemplate.mockResolvedValue(null);
  mount();
  await screen.findByText(/Process template could not be found/);
});

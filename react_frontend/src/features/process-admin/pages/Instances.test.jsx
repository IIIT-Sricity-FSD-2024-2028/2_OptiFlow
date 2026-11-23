import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../../../store';
import * as api from '../../../services/api/process';
import Instances from './Instances';

vi.mock('../../../services/api/process');

function mount() {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={['/test/row']}>
        <Routes><Route path="/test/:id" element={<Instances />} /></Routes>
      </MemoryRouter>
    </Provider>,
  );
}

it('renders the loading state and the returned instances data', async () => {
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
  await screen.findByText(/No matching process instances found/);
});

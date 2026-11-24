import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { makeStore } from '../../src/store';
import { apiClient } from '../../src/services/api/client';
import AuditLogs from '../../src/features/process-admin/pages/AuditLogs';

vi.mock('../../src/services/api/client', async (importOriginal) => ({
  ...await importOriginal(),
  apiClient: vi.fn(),
}));

function mount(store = makeStore()) {
  return render(<Provider store={store}><AuditLogs /></Provider>);
}

it('shares fresh results across mounts and retries a failed refresh', async () => {
  apiClient.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Feed unavailable'))
    .mockResolvedValueOnce({ data: [{ id: 'a', entityName: 'Recovered workflow' }] });
  const store = makeStore();
  const first = mount(store);
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
  await screen.findByText('No process audit logs found');
  first.unmount();
  mount(store);
  expect(apiClient).toHaveBeenCalledTimes(1);
  expect(apiClient).toHaveBeenCalledWith('/api/audit-logs/process', expect.objectContaining({
    signal: expect.anything(), abortKey: expect.any(String),
  }));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await screen.findByText('Feed unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await screen.findByText('Recovered workflow');
  expect(screen.queryByText('Feed unavailable')).toBeNull();
});

it('returns to page one after refresh and opens the detail for a filtered row', async () => {
  const rows = Array.from({ length: 16 }, (_, i) => ({
    id: String(i), entityName: 'Workflow ' + i, action: 'CREATE',
  }));
  apiClient.mockResolvedValue(rows);
  mount();
  await screen.findByText('Workflow 0');
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  expect(screen.getByText('Workflow 15')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await screen.findByText('Workflow 0');
  fireEvent.change(screen.getByPlaceholderText(/Search by action/), { target: { value: 'Workflow 15' } });
  expect(screen.queryByText('Workflow 0')).toBeNull();
  fireEvent.click(screen.getByTitle('View Details'));
  expect(screen.getByText('Process Audit Record Inspection')).toBeInTheDocument();
  expect(screen.getAllByText('Workflow 15')).toHaveLength(2);
});

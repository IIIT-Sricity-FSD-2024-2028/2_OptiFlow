import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../../../store';
import { Topbar } from '../../../shared/components/Topbar';
import Notifications from './Notifications';
import * as api from '../../../services/api/notifications';

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u' } }) }));
vi.mock('../../../services/api/notifications', () => ({
  list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn(), create: vi.fn(), remove: vi.fn(),
}));
function mount() {
  return render(<Provider store={makeStore()}><MemoryRouter><Topbar /><Notifications /></MemoryRouter></Provider>);
}
it('shares a request and updates both surfaces after individual and bulk reads', async () => {
  const first = { id: '1', title: 'First', userId: 'u', isRead: false };
  api.list.mockResolvedValue([first, { ...first, id: '2', title: 'Second' }]);
  api.markRead.mockResolvedValue({ ...first, isRead: true });
  api.markAllRead.mockResolvedValue({ userId: 'u', updatedCount: 1 });
  mount();
  expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
  await screen.findByText('Unread (2)');
  const bell = screen.getByRole('button', { name: 'View notifications' });
  expect(bell).toHaveTextContent('2');
  fireEvent.click(screen.getByText('First'));
  await screen.findByText('Unread (1)');
  expect(bell).toHaveTextContent('1');
  fireEvent.click(screen.getByText('Mark all as read'));
  await screen.findByText('Unread (0)');
  expect(bell).toHaveTextContent(/^$/);
  expect(api.list).toHaveBeenCalledTimes(1);
});
it('renders an empty feed', async () => {
  api.list.mockResolvedValue([]);
  mount();
  await screen.findByText('All caught up!');
});
it('renders a service error', async () => {
  api.list.mockRejectedValue(new Error('Feed unavailable'));
  mount();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Feed unavailable'));
});

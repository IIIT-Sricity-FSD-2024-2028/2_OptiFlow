import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { makeStore } from '../../src/store';
import { ToastProvider } from '../../src/shared/components/Toast';
import { apiClient } from '../../src/services/api/client';

vi.mock('../../src/services/api/client', async importOriginal => ({
  ...(await importOriginal()), apiClient: vi.fn(),
}));
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'member', managerId: 'lead', companyId: 'company' } }),
}));

export const subtask = { id: 's1', taskId: 't1', title: 'My subtask', assignedToId: 'member', status: 'Pending' };
export const task = { id: 't1', title: 'My task', assignedToId: 'member', status: 'In_Progress',
  projectId: 'p1', createdById: 'lead', dueDate: '2030-01-15', subtasks: [subtask] };
export function renderMember(Page, responses = {}) {
  const routes = {
    'GET /api/tasks': [task, { ...task, id: 't2', title: 'Other task', assignedToId: 'other', subtasks: [] }],
    'GET /api/tasks/t1': task, 'GET /api/subtasks': [subtask],
    'GET /api/users': [{ id: 'lead', fullName: 'Team Leader' }],
    'GET /api/projects': [{ id: 'p1', name: 'Review Project' }],
    'GET /api/evidence': [], 'GET /api/escalations': [],
    'GET /api/compliance-bindings': [], 'GET /api/compliance-violations': [],
    ...responses,
  };
  apiClient.mockImplementation(async (path, options = {}) => {
    const method = options.method || (options.body ? 'POST' : 'GET');
    const key = method + ' ' + path;
    if (!(key in routes)) throw new Error('Unexpected request ' + key);
    const value = routes[key];
    return typeof value === 'function' ? value(options.body) : value;
  });
  const store = makeStore();
  const view = render(<Provider store={store}><ToastProvider><MemoryRouter initialEntries={['/member/t1']}>
    <Routes><Route path="/member/:id" element={<Page />} /></Routes>
  </MemoryRouter></ToastProvider></Provider>);
  return { ...view, store };
}

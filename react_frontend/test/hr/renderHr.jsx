import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { makeStore } from '../../src/store';
import { ToastProvider } from '../../src/shared/components/Toast';
import { ApiError, apiClient } from '../../src/services/api/client';

vi.mock('../../src/services/api/client', async importOriginal => ({
  ...(await importOriginal()), apiClient: vi.fn(),
}));
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me', companyId: 'c1', role: 'company_owner' } }),
}));

export const fail = (status, message = 'Server said no') => () => {
  throw new ApiError(message, { status, code: 'X' });
};
export const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
};

// A tiny in-memory server: lists live in `db`, so a reload shows what a write changed.
export function makeDb() {
  return {
    users: [
      { id: 'u1', fullName: 'Asha Rao', email: 'asha@example.com', isActive: true, role: 'team_member', roleLabel: 'Team Member', roleAssignments: [], teamMembers: [] },
      { id: 'u2', fullName: 'Ben Cole', email: 'ben@example.com', isActive: true, role: 'team_member', roleLabel: 'Team Member', roleAssignments: [], teamMembers: [] },
      { id: 'u3', fullName: 'Cy Former', email: 'cy@example.com', isActive: false, role: 'team_member', roleLabel: 'Team Member', roleAssignments: [], teamMembers: [] },
    ],
    branches: [{ id: 'b1', name: 'Pune Office', code: 'PUN', teams: [], createdAt: '2026-01-01' }, { id: 'b2', name: 'Delhi Office', code: 'DEL', teams: [{ id: 't1' }], createdAt: '2026-01-01' }],
    teams: [{ id: 't1', name: 'Falcon', branchId: 'b2', branch: { id: 'b2', name: 'Delhi Office' }, projects: [], teamMembers: [{ id: 'm1', userId: 'u1', role: 'Lead', user: { id: 'u1', fullName: 'Asha Rao' } }] }],
    roles: [
      { id: 'r1', label: 'Auditor', name: 'auditor', isSystem: false, permissions: [{ permission: { slug: 'task:create' } }] },
      { id: 'r2', label: 'Planner', name: 'planner', isSystem: false, permissions: [] },
    ],
    'role-assignments': [{ id: 'a1', userId: 'u1', roleId: 'r1', scopeType: 'Company', grantedAt: '2026-01-01', user: { id: 'u1', fullName: 'Asha Rao', email: 'asha@example.com' }, role: { id: 'r1', label: 'Auditor' } }],
  };
}

export function renderHr(Page, { db = makeDb(), responses = {}, path = '/hr', route = '/hr', store = makeStore() } = {}) {
  const calls = [];
  apiClient.mockImplementation(async (url, options = {}) => {
    const method = options.method || 'GET';
    const key = `${method} ${url}`;
    calls.push({ key, body: options.body });
    if (key in responses) {
      const value = responses[key];
      return typeof value === 'function' ? value(options.body, db) : value;
    }
    const list = url.replace('/api/', '');
    if (method === 'GET' && list in db) return structuredClone(db[list]);
    const one = /^users\/([^/]+)$/.exec(list);
    if (method === 'GET' && one) {
      const row = db.users.find((u) => u.id === one[1]);
      if (!row) throw new ApiError('User not found', { status: 404, code: 'NOT_FOUND' });
      return structuredClone({ ...row, reports: [], assignedTasks: [] });
    }
    throw new Error('Unexpected request ' + key);
  });
  const ui = (
    <Provider store={store}><ToastProvider><MemoryRouter initialEntries={[path]}>
      <Routes><Route path={route} element={<Page />} /><Route path="*" element={<p>elsewhere</p>} /></Routes>
    </MemoryRouter></ToastProvider></Provider>
  );
  const view = render(ui);
  const count = (key) => calls.filter((c) => c.key === key).length;
  const bodyOf = (key) => calls.find((c) => c.key === key)?.body;
  return { ...view, store, db, calls, count, bodyOf };
}

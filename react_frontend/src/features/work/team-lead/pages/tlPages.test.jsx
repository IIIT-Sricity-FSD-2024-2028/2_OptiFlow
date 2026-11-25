/**
 * Team Leader page migration tests: each page with a real store and the services mocked.
 * Covers loading, error and success, the extension approve / reject flow, evidence upload
 * cleanup on Task Detail, evidence review and CSV export on Reviews, and the cross-page
 * approve-then-view flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { makeStore } from '../../../../store';
import { ApiError } from '../../../../services/api/client';
import TeamLeadDashboard from './Dashboard';
import TeamLeadTasks from './Tasks';
import TeamLeadTaskDetail from './TaskDetail';
import TeamLeadEscalations from './Escalations';
import TeamLeadReviews from './Reviews';

// One stable user object: the pages list user fields as effect dependencies.
const tlUser = { id: 'u-tl', fullName: 'Tara Lead', role: 'team_lead', teams: [] };
vi.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: tlUser }) }));

vi.mock('../../../../services/api/projects');
vi.mock('../../../../services/api/tasks');
vi.mock('../../../../services/api/subtasks');
vi.mock('../../../../services/api/escalations');
vi.mock('../../../../services/api/compliance');
vi.mock('../../../../services/api/evidence');
vi.mock('../../../../services/api/users');
// The evidence and compliance thunks call apiClient directly; a small fake server answers them.
vi.mock('../../../../services/api/client', async (importOriginal) => {
  const actual = await importOriginal();
  const apiClient = vi.fn();
  return { ...actual, apiClient, apiRequest: apiClient };
});
import { apiClient } from '../../../../services/api/client';
import * as projectsApi from '../../../../services/api/projects';
import * as tasksApi from '../../../../services/api/tasks';
import * as escalationsApi from '../../../../services/api/escalations';
import * as complianceApi from '../../../../services/api/compliance';
import * as evidenceApi from '../../../../services/api/evidence';
import * as usersApi from '../../../../services/api/users';

const never = () => new Promise(() => {});
const project = { id: 'p1', name: 'Alpha Rollout', status: 'Active', createdById: 'u-pm' };
const task = {
  id: 't1', title: 'Write the spec', status: 'Active', priority: 'Medium',
  projectId: 'p1', dueDate: '2026-12-20', createdById: 'u-pm', subtasks: [],
};
const extension = {
  id: 'e1',
  title: 'Extension request: Write the spec',
  blockerType: 'Extension Request',
  status: 'Open',
  taskId: 't1',
  description: 'Requested deadline: 2026-12-30\nReason: Waiting on data',
  reportedBy: { fullName: 'Asha Member' },
};

beforeEach(() => {
  vi.clearAllMocks();
  projectsApi.list.mockResolvedValue([project]);
  projectsApi.get.mockResolvedValue({ ...project, team: { teamMembers: [] } });
  tasksApi.list.mockResolvedValue([task]);
  tasksApi.get.mockResolvedValue({ ...task, project });
  escalationsApi.list.mockResolvedValue([extension]);
  escalationsApi.update.mockImplementation((id, data) => Promise.resolve({ ...extension, id, ...data }));
  complianceApi.getViolations.mockResolvedValue([]);
  evidenceApi.getEvidenceList.mockResolvedValue([]);
  usersApi.list.mockResolvedValue([]);
  server = fakeServer();
  apiClient.mockImplementation(server.handle);
});

// Evidence rows live here so a refetch returns what earlier writes changed.
let server;
const evidenceRow = { id: 'ev1', title: 'Signed audit', status: 'Pending', taskId: 't1', evidenceType: 'Document' };
function fakeServer() {
  const state = { evidence: [{ ...evidenceRow }], violations: [], failUpload: false };
  const handle = async (url, { method = 'GET', body } = {}) => {
    if (url.startsWith('/api/compliance-violations')) return state.violations;
    const upload = url.match(/^\/api\/evidence\/([^/]+)\/upload$/);
    if (upload) {
      if (state.failUpload) throw new ApiError('Upload rejected', { status: 413 });
      return state.evidence.find((row) => row.id === upload[1]);
    }
    const one = url.match(/^\/api\/evidence\/([^/?]+)$/);
    if (one && method === 'PATCH') {
      const row = state.evidence.find((item) => item.id === one[1]);
      Object.assign(row, body);
      return { ...row };
    }
    if (one && method === 'DELETE') {
      state.evidence = state.evidence.filter((item) => item.id !== one[1]);
      return null;
    }
    if (url === '/api/evidence' && method === 'POST') {
      const row = { id: 'ev-new', status: 'Pending', ...body };
      state.evidence.unshift(row);
      return { ...row };
    }
    if (url.startsWith('/api/evidence')) return state.evidence.map((row) => ({ ...row }));
    return [];
  };
  return { state, handle: vi.fn(handle) };
}

const renderAt = (ui, { store = makeStore(), path = '/', route = '/' } = {}) => {
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return { ...view, store };
};
const spinner = (container) => container.querySelector('.animate-spin');

describe('TL Dashboard', () => {
  it('shows the loader while the store loads', () => {
    tasksApi.list.mockReturnValue(never());
    const { container } = renderAt(<TeamLeadDashboard />);
    expect(spinner(container)).not.toBeNull();
  });

  it('renders once tasks, escalations and projects are in the store', async () => {
    renderAt(<TeamLeadDashboard />);
    expect(await screen.findByText('Team Orchestration')).toBeInTheDocument();
    expect(tasksApi.list).toHaveBeenCalledTimes(1);
    expect(escalationsApi.list).toHaveBeenCalledTimes(1);
  });

  it('approving an extension resolves it and refetches tasks even though the list is fresh', async () => {
    const user = userEvent.setup();
    renderAt(<TeamLeadDashboard />);
    await user.click(await screen.findByRole('button', { name: /Extensions/ }));
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(escalationsApi.update).toHaveBeenCalledWith('e1', { status: 'Resolved' }, expect.anything());
    await vi.waitFor(() => expect(tasksApi.list).toHaveBeenCalledTimes(2)); // forced refresh
  });

  it('rejecting an extension needs a reason and stores it on the escalation', async () => {
    const user = userEvent.setup();
    renderAt(<TeamLeadDashboard />);
    await user.click(await screen.findByRole('button', { name: /Extensions/ }));
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    const confirm = await screen.findByRole('button', { name: 'Reject Extension' });
    expect(confirm).toBeDisabled(); // no reason yet
    await user.type(screen.getByPlaceholderText(/Explain why the extension request is rejected/), 'Scope is fixed');
    await user.click(confirm);

    expect(escalationsApi.update).toHaveBeenCalledWith(
      'e1',
      { status: 'Closed', description: expect.stringContaining('Rejection Comment: Scope is fixed') },
      expect.anything(),
    );
    // A closed request leaves the open-extensions list.
    await vi.waitFor(() => expect(screen.queryByText('Extension request: Write the spec')).toBeNull());
  });
});

describe('TL Tasks', () => {
  it('shows the loader while the store loads', () => {
    tasksApi.list.mockReturnValue(never());
    const { container } = renderAt(<TeamLeadTasks />);
    expect(spinner(container)).not.toBeNull();
  });

  it('shows a load error on the page', async () => {
    tasksApi.list.mockRejectedValue(new ApiError('Tasks are down', { status: 500 }));
    renderAt(<TeamLeadTasks />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Tasks are down');
  });

  it('lists the tasks from the store', async () => {
    renderAt(<TeamLeadTasks />);
    expect(await screen.findByText('Write the spec')).toBeInTheDocument();
  });
});

describe('TL TaskDetail', () => {
  const at = { path: '/tl/tasks/:id', route: '/tl/tasks/t1' };

  it('shows "Task not found" when the detail fetch fails', async () => {
    tasksApi.get.mockRejectedValue(new ApiError('Not here', { status: 404 }));
    renderAt(<TeamLeadTaskDetail />, at);
    expect(await screen.findByText('Task not found')).toBeInTheDocument();
  });

  it('renders the task from the store', async () => {
    renderAt(<TeamLeadTaskDetail />, at);
    expect(await screen.findByRole('heading', { name: 'Write the spec' })).toBeInTheDocument();
  });
});

describe('TL Escalations', () => {
  it('shows the loader while the store loads', () => {
    escalationsApi.list.mockReturnValue(never());
    const { container } = renderAt(<TeamLeadEscalations />);
    expect(spinner(container)).not.toBeNull();
  });

  it('renders once escalations and tasks are in the store', async () => {
    renderAt(<TeamLeadEscalations />);
    const heading = await screen.findByRole('heading', { name: 'Escalations', level: 1 });
    expect(within(heading.closest('div')).getByText('Escalations')).toBeInTheDocument();
  });
});

describe('TL TaskDetail evidence', () => {
  const at = { path: '/tl/tasks/:id', route: '/tl/tasks/t1' };

  it('reads users, violations and evidence from the store', async () => {
    const { store } = renderAt(<TeamLeadTaskDetail />, at);
    expect(await screen.findByText('Signed audit')).toBeInTheDocument();
    expect(usersApi.list).toHaveBeenCalledTimes(1);
    expect(store.getState().evidence.items).toHaveLength(1);
  });

  it('deletes the new evidence row when its upload fails, and the store drops it too', async () => {
    server.state.evidence = []; // the file input only shows while the task has no evidence
    server.state.failUpload = true;
    const user = userEvent.setup();
    const { store } = renderAt(<TeamLeadTaskDetail />, at);
    await user.click(await screen.findByRole('button', { name: /Submit Work for Review/ }));
    const file = new File(['pdf'], 'report.pdf', { type: 'application/pdf' });
    await user.upload(document.querySelector('input[type="file"]'), file);
    await user.click(screen.getByRole('button', { name: 'Confirm & Submit to PM' }));

    expect(await screen.findByText('Upload rejected')).toBeInTheDocument();
    expect(apiClient).toHaveBeenCalledWith('/api/evidence', expect.objectContaining({ method: 'POST' }));
    expect(apiClient).toHaveBeenCalledWith('/api/evidence/ev-new', { method: 'DELETE' });
    expect(store.getState().evidence.items.find((row) => row.id === 'ev-new')).toBeUndefined();
    expect(tasksApi.update).not.toHaveBeenCalled(); // the task is not submitted
  });
});

describe('TL Reviews', () => {
  const openRow = async (user) => {
    await user.click(await screen.findByText('Signed audit'));
  };

  it('approves evidence through the store; list and detail show the same status', async () => {
    const user = userEvent.setup();
    const { store } = renderAt(<TeamLeadReviews />);
    await openRow(user);
    await user.click(screen.getByRole('button', { name: 'Approve Team Evidence' }));

    expect(apiClient).toHaveBeenCalledWith('/api/evidence/ev1', { method: 'PATCH', body: { status: 'Approved' } });
    expect(await screen.findByText('Evidence Approved & Validated')).toBeInTheDocument();
    expect(store.getState().evidence.items[0].status).toBe('Approved');
  });

  it('rejects with the feedback as notes, reopens the task and escalates', async () => {
    escalationsApi.create.mockResolvedValue({ id: 'esc9', taskId: 't1', status: 'Open' });
    tasksApi.update.mockResolvedValue({ ...task, status: 'Active' });
    const user = userEvent.setup();
    const { store } = renderAt(<TeamLeadReviews />);
    await openRow(user);
    await user.click(screen.getByRole('button', { name: 'Reject & Escalate to PM' }));
    await user.type(screen.getByPlaceholderText(/Explain why this deliverable is insufficient/), 'Missing signature');
    await user.click(screen.getByRole('button', { name: 'Confirm Rejection & Escalate' }));

    expect(apiClient).toHaveBeenCalledWith('/api/evidence/ev1', {
      method: 'PATCH',
      body: { status: 'Rejected', notes: 'Missing signature' },
    });
    await vi.waitFor(() => expect(escalationsApi.create).toHaveBeenCalledTimes(1));
    expect(tasksApi.update).toHaveBeenCalledWith('t1', { status: 'Active' }, expect.anything());
    expect(store.getState().evidence.items[0]).toMatchObject({ status: 'Rejected', notes: 'Missing signature' });
  });

  it('exports the CSV through the evidence thunk and keeps the file out of the store', async () => {
    const createObjectURL = vi.fn(() => 'blob:csv');
    const revokeObjectURL = vi.fn();
    const originalCreate = window.URL.createObjectURL;
    const originalRevoke = window.URL.revokeObjectURL;
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    evidenceApi.exportCsv.mockResolvedValue(new Blob(['id,title'], { type: 'text/csv' }));
    try {
      const user = userEvent.setup();
      const { store } = renderAt(<TeamLeadReviews />);
      await user.click(await screen.findByRole('button', { name: /Export Audit CSV/ }));

      expect(await screen.findByText('Evidence audit log exported successfully.')).toBeInTheDocument();
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv');
      expect(Object.keys(store.getState().evidence)).not.toContain('file');
    } finally {
      click.mockRestore();
      window.URL.createObjectURL = originalCreate;
      window.URL.revokeObjectURL = originalRevoke;
    }
  });

  it('shows the export error when the CSV request fails', async () => {
    evidenceApi.exportCsv.mockRejectedValue(new ApiError('Failed to export evidence data', { status: 500 }));
    const user = userEvent.setup();
    renderAt(<TeamLeadReviews />);
    await user.click(await screen.findByRole('button', { name: /Export Audit CSV/ }));
    expect(await screen.findByText('Failed to export evidence data')).toBeInTheDocument();
  });
});

describe('Cross-page: approve in Reviews, then open Task Detail', () => {
  it('shows the approved status without a reload', async () => {
    const user = userEvent.setup();
    const store = makeStore();
    const reviews = renderAt(<TeamLeadReviews />, { store });
    await user.click(await screen.findByText('Signed audit'));
    await user.click(screen.getByRole('button', { name: 'Approve Team Evidence' }));
    await screen.findByText('Evidence Approved & Validated');
    reviews.unmount();

    renderAt(<TeamLeadTaskDetail />, { store, path: '/tl/tasks/:id', route: '/tl/tasks/t1' });
    expect(await screen.findByText('Signed audit')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });
});

/**
 * Team Leader page migration tests: each page with a real store and the services mocked.
 * Covers loading, error and success, plus the extension approve / reject flow.
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
});

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

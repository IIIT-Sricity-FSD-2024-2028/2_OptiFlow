/**
 * PM page migration tests: each page with a real store and the services mocked.
 * Covers loading, error and success for Dashboard, Tasks and ProjectDetail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { makeStore } from '../../../../store';
import { fetchProjects } from '../../../../store/projects';
import { ApiError } from '../../../../services/api/client';
import PmDashboard from './Dashboard';
import PmTasks from './Tasks';
import PmProjectDetail from './ProjectDetail';

vi.mock('../../../../services/api/projects');
vi.mock('../../../../services/api/tasks');
vi.mock('../../../../services/api/escalations');
vi.mock('../../../../services/api/compliance');
vi.mock('../../../../services/api/evidence');
vi.mock('../../../../services/api/teams');
vi.mock('../../../../services/api/users');
import * as projectsApi from '../../../../services/api/projects';
import * as tasksApi from '../../../../services/api/tasks';
import * as escalationsApi from '../../../../services/api/escalations';
import * as complianceApi from '../../../../services/api/compliance';
import * as evidenceApi from '../../../../services/api/evidence';
import * as teamsApi from '../../../../services/api/teams';
import * as usersApi from '../../../../services/api/users';

const never = () => new Promise(() => {});
const project = { id: 'p1', name: 'Alpha Rollout', status: 'Active' };
const task = { id: 't1', title: 'Write the spec', status: 'Active', priority: 'Medium', projectId: 'p1' };

beforeEach(() => {
  vi.clearAllMocks();
  projectsApi.list.mockResolvedValue([project]);
  projectsApi.get.mockResolvedValue({ ...project, tasks: [task] });
  tasksApi.list.mockResolvedValue([task]);
  escalationsApi.list.mockResolvedValue([]);
  complianceApi.getViolations.mockResolvedValue([]);
  complianceApi.getBindings.mockResolvedValue([]);
  evidenceApi.getEvidenceList.mockResolvedValue([]);
  teamsApi.list.mockResolvedValue([]);
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

describe('PM Dashboard', () => {
  it('shows the loader while the store loads', () => {
    tasksApi.list.mockReturnValue(never());
    const { container } = renderAt(<PmDashboard />);
    expect(spinner(container)).not.toBeNull();
  });

  it('shows the load error from the store', async () => {
    projectsApi.list.mockRejectedValue(new ApiError('Projects are down', { status: 500 }));
    renderAt(<PmDashboard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Projects are down');
  });

  it('renders store data once loaded', async () => {
    renderAt(<PmDashboard />);
    expect(await screen.findByText('Project Management Overview')).toBeInTheDocument();
    expect(projectsApi.list).toHaveBeenCalledTimes(1);
    expect(tasksApi.list).toHaveBeenCalledTimes(1);
    expect(escalationsApi.list).toHaveBeenCalledTimes(1);
  });
});

describe('PM Tasks', () => {
  it('shows the loader while the store loads', () => {
    tasksApi.list.mockReturnValue(never());
    const { container } = renderAt(<PmTasks />);
    expect(spinner(container)).not.toBeNull();
  });

  it('shows a load error on the page, not only inside the create form', async () => {
    tasksApi.list.mockRejectedValue(new ApiError('Tasks are down', { status: 500 }));
    renderAt(<PmTasks />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Tasks are down');
  });

  it('lists the tasks from the store', async () => {
    renderAt(<PmTasks />);
    expect(await screen.findByText('Write the spec')).toBeInTheDocument();
  });
});

describe('PM ProjectDetail', () => {
  const at = { path: '/pm/projects/:id', route: '/pm/projects/p1' };

  it('waits for its own detail fetch even when the list row is already in the store', async () => {
    const store = makeStore();
    await store.dispatch(fetchProjects()); // list row: no nested tasks
    projectsApi.get.mockReturnValue(never());
    const { container } = renderAt(<PmProjectDetail />, { store, ...at });
    expect(spinner(container)).not.toBeNull();
  });

  it('shows "not found" with the server message when the detail fetch fails', async () => {
    projectsApi.get.mockRejectedValue(new ApiError('No such project', { status: 404 }));
    renderAt(<PmProjectDetail />, at);
    expect(await screen.findByText('Project not found')).toBeInTheDocument();
    expect(screen.getByText('No such project')).toBeInTheDocument();
  });

  it('renders the project and its tasks, and keeps them when a list fetch lands later', async () => {
    const { store } = renderAt(<PmProjectDetail />, at);
    expect(await screen.findByRole('heading', { name: 'Alpha Rollout' })).toBeInTheDocument();
    expect(screen.getByText('Write the spec')).toBeInTheDocument();

    // A list response arriving after the detail must not wipe project.tasks.
    store.dispatch(fetchProjects.fulfilled([project], 'late', undefined));
    expect(await screen.findByText('Write the spec')).toBeInTheDocument();
  });
});

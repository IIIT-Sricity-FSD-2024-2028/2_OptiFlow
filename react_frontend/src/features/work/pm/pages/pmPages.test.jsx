/**
 * PM page migration tests: each page with a real store and the services mocked.
 * Covers loading, error and success for Dashboard, Tasks and ProjectDetail, and the
 * project-then-workflow creation flow on Projects (with and without a template).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { makeStore } from '../../../../store';
import { fetchProjects } from '../../../../store/projects';
import { ApiError } from '../../../../services/api/client';
import PmDashboard from './Dashboard';
import PmTasks from './Tasks';
import PmProjectDetail from './ProjectDetail';
import PmProjects from './Projects';

vi.mock('../../../../services/api/projects');
vi.mock('../../../../services/api/tasks');
vi.mock('../../../../services/api/escalations');
vi.mock('../../../../services/api/compliance');
vi.mock('../../../../services/api/evidence');
vi.mock('../../../../services/api/teams');
vi.mock('../../../../services/api/users');
vi.mock('../../../../services/api/process');
// The compliance and evidence thunks call apiClient directly; route those URLs here.
vi.mock('../../../../services/api/client', async (importOriginal) => {
  const actual = await importOriginal();
  const apiClient = vi.fn();
  return { ...actual, apiClient, apiRequest: apiClient };
});
import { apiClient } from '../../../../services/api/client';
import * as processApi from '../../../../services/api/process';
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
  teamsApi.list.mockResolvedValue([team]);
  usersApi.list.mockResolvedValue([]);
  processApi.listTemplates.mockResolvedValue([template]);
  apiClient.mockImplementation(() => Promise.resolve([]));
});

const team = { id: 'team1', name: 'Platform Squad' };
const template = { id: 'tpl1', name: 'Audit Flow', isActive: true, steps: [{ id: 's1', name: 'Collect' }] };

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

describe('PM Dashboard supporting data', () => {
  it('loads violations, evidence and teams through their slices', async () => {
    apiClient.mockImplementation((url) => Promise.resolve(
      url.startsWith('/api/compliance-violations')
        ? [{ id: 'v1', status: 'Open', severity: 'High', entityType: 'Task', entityId: 't1' }]
        : [],
    ));
    const { store } = renderAt(<PmDashboard />);
    expect(await screen.findByText('Project Management Overview')).toBeInTheDocument();
    expect(apiClient).toHaveBeenCalledWith('/api/compliance-violations');
    expect(apiClient).toHaveBeenCalledWith('/api/evidence');
    expect(teamsApi.list).toHaveBeenCalledTimes(1);
    expect(store.getState().complianceViolations.items).toHaveLength(1);
  });

  it('still renders when the supporting data fails to load', async () => {
    apiClient.mockRejectedValue(new ApiError('Compliance down', { status: 500 }));
    teamsApi.list.mockRejectedValue(new ApiError('Teams down', { status: 500 }));
    renderAt(<PmDashboard />);
    expect(await screen.findByText('Project Management Overview')).toBeInTheDocument();
  });
});

describe('PM Projects: create project, then start its workflow', () => {
  const created = { id: 'p9', name: 'Beta Launch', status: 'Active' };

  const fillAndSubmit = async (user, { withTemplate }) => {
    await user.click(await screen.findByRole('button', { name: '+ New Project' }));
    await user.type(screen.getByPlaceholderText('e.g. Q1 Compliance Review'), 'Beta Launch');
    await user.type(screen.getByPlaceholderText('Brief project description...'), 'Launch the beta to pilots');
    await user.selectOptions(screen.getByDisplayValue('Select a team'), 'team1');
    if (withTemplate) {
      await user.selectOptions(screen.getByDisplayValue('No Template (Manual Tasks)'), 'tpl1');
    }
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2027-01-31' } });
    await user.click(screen.getByRole('button', { name: 'Create Project' }));
  };

  beforeEach(() => {
    projectsApi.create.mockResolvedValue(created);
    projectsApi.get.mockResolvedValue({ ...created, team: { teamMembers: [] }, tasks: [] });
  });

  it('creates a project without a template and never starts a workflow', async () => {
    const user = userEvent.setup();
    const { store } = renderAt(<PmProjects />);
    await fillAndSubmit(user, { withTemplate: false });
    expect(await screen.findByText('Project created.')).toBeInTheDocument();
    expect(projectsApi.create).toHaveBeenCalledTimes(1);
    expect(processApi.createInstance).not.toHaveBeenCalled();
    expect(store.getState().projects.entities.p9).toMatchObject({ name: 'Beta Launch' });
  });

  it('starts the workflow on the new project when a template is chosen', async () => {
    processApi.createInstance.mockResolvedValue({ id: 'i1' });
    const user = userEvent.setup();
    renderAt(<PmProjects />);
    await fillAndSubmit(user, { withTemplate: true });
    await vi.waitFor(() => expect(processApi.createInstance).toHaveBeenCalledWith(
      { templateId: 'tpl1', projectId: 'p9', title: 'Audit Flow - Beta Launch' },
      expect.anything(),
    ));
    expect(screen.queryByText(/did\s+not start/)).toBeNull();
  });

  it('reports a workflow failure apart from the project, and retry reuses the project id', async () => {
    processApi.createInstance.mockRejectedValueOnce(new ApiError('Template is locked', { status: 409 }));
    const user = userEvent.setup();
    const { store } = renderAt(<PmProjects />);
    await fillAndSubmit(user, { withTemplate: true });

    expect(await screen.findByText(/Project created, but its workflow could not be started: Template is locked/)).toBeInTheDocument();
    expect(screen.getByText(/did\s+not start/)).toBeInTheDocument();
    expect(store.getState().projects.entities.p9).toBeDefined(); // the project stays

    processApi.createInstance.mockResolvedValueOnce({ id: 'i1' });
    await user.click(screen.getByRole('button', { name: 'Retry workflow' }));

    await vi.waitFor(() => expect(processApi.createInstance).toHaveBeenCalledTimes(2));
    expect(processApi.createInstance.mock.calls[1][0]).toMatchObject({ templateId: 'tpl1', projectId: 'p9' });
    expect(projectsApi.create).toHaveBeenCalledTimes(1); // no second project
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'Retry workflow' })).toBeNull());
  });
});

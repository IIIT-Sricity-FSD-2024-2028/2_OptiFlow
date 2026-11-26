import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { makeStore } from '../../../store';
import { StatusBadge } from './StatusBadge';
import { TaskTable } from './TaskTable';
import { Toast } from '../../../shared/components/Toast';
import TeamLeadTasks from '../team-lead/pages/Tasks';
import TeamLeadDashboard from '../team-lead/pages/Dashboard';
import TeamLeadTaskDetail from '../team-lead/pages/TaskDetail';
import PmDashboard from '../pm/pages/Dashboard';
import MemberTasks from '../member/pages/Tasks';
import * as tasksApi from '../../../services/api/tasks';
import * as projectsApi from '../../../services/api/projects';
import * as escalationsApi from '../../../services/api/escalations';
import * as complianceApi from '../../../services/api/compliance';
import * as evidenceApi from '../../../services/api/evidence';
import * as teamsApi from '../../../services/api/teams';
import * as subtasksApi from '../../../services/api/subtasks';
import * as usersApi from '../../../services/api/users';

vi.mock('../../../services/api/tasks');
vi.mock('../../../services/api/projects');
vi.mock('../../../services/api/escalations');
vi.mock('../../../services/api/compliance');
vi.mock('../../../services/api/evidence');
vi.mock('../../../services/api/teams');
vi.mock('../../../services/api/subtasks');
vi.mock('../../../services/api/users');
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', fullName: 'Test User', role: 'team_lead' } }),
}));
vi.mock('../../../services/api/client', async (importOriginal) => {
  const actual = await importOriginal();
  const apiClient = vi.fn(async (url) => {
    if (url.startsWith('/api/compliance-violations')) {
      return [{ id: 'v1', status: 'Open', severity: 'High', entityType: 'Task', entityId: 't1', rule: { name: 'Evidence Policy' } }];
    }
    return [];
  });
  return { ...actual, apiClient, apiRequest: apiClient };
});

describe('Step 3 UI & Workflow Fixes', () => {
  it('StatusBadge renders Rejected distinctly from Blocked', () => {
    const { rerender } = render(<StatusBadge status="Rejected" />);
    const rejected = screen.getByText('Rejected');
    expect(rejected).toBeInTheDocument();
    expect(rejected.className).toContain('bg-rose-50');
    expect(screen.queryByText('Blocked')).toBeNull();

    rerender(<StatusBadge status="Blocked" />);
    expect(screen.getByText('Blocked').className).toContain('bg-amber-50');

    rerender(<StatusBadge status="Revision_Requested" />);
    expect(screen.getByText('Revision Requested')).toBeInTheDocument();
  });

  it('standalone Toast floats above modals with fixed positioning unless stacked', () => {
    const { rerender } = render(<Toast visible type="error" message="Modal error" />);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('fixed');
    expect(alert.className).toContain('z-[70]');

    rerender(<Toast visible stacked type="info" message="Inline toast" />);
    expect(screen.getByRole('alert').className).not.toContain('fixed');
  });

  it('TaskTable sorts columns cleanly on header click and omits cursor-pointer on non-sortable columns', async () => {
    const user = userEvent.setup();
    const rows = [
      { id: 't1', title: 'Alpha Task', priority: 'Low', status: 'Active', dueDate: '2026-12-20' },
      { id: 't2', title: 'Beta Task', priority: 'Urgent', status: 'Completed', dueDate: '2026-12-01' },
    ];
    render(
      <TaskTable
        tasks={rows}
        visibleColumns={['title', 'project', 'priority', 'status', 'dueDate']}
      />
    );

    const projectHeader = screen.getByText('Process / Project');
    expect(projectHeader.className).not.toContain('cursor-pointer');

    const titleHeader = screen.getByText('Task Deliverable');
    expect(titleHeader.className).toContain('cursor-pointer');

    await user.click(screen.getByText('Priority'));
    let bodyRows = screen.getAllByRole('row').slice(1);
    expect(within(bodyRows[0]).getByText('Alpha Task')).toBeInTheDocument();

    await user.click(screen.getByText(/Priority/));
    bodyRows = screen.getAllByRole('row').slice(1);
    expect(within(bodyRows[0]).getByText('Beta Task')).toBeInTheDocument();
  });

  it('TL Tasks Reset Filters clears both URL filter and projectId params simultaneously', async () => {
    projectsApi.list.mockResolvedValue([{ id: 'p1', name: 'Alpha' }]);
    tasksApi.list.mockResolvedValue([{ id: 't1', title: 'Draft Spec', status: 'In_Review', projectId: 'p1' }]);
    complianceApi.getViolations.mockResolvedValue([]);

    let latestSearch = '';
    function LocationSpy() {
      latestSearch = useLocation().search;
      return null;
    }

    const user = userEvent.setup();
    render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/tl/tasks?filter=review&projectId=p1']}>
          <LocationSpy />
          <Routes>
            <Route path="/tl/tasks" element={<TeamLeadTasks />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    const resetBtn = await screen.findByRole('button', { name: /Reset Filters/i });
    await user.click(resetBtn);
    expect(latestSearch).toBe('');
  });

  it('PM Dashboard prompts for compliance override confirmation before approving a compliance-blocked review task', async () => {
    projectsApi.list.mockResolvedValue([{ id: 'p1', name: 'Alpha', status: 'Active' }]);
    tasksApi.list.mockResolvedValue([{ id: 't1', title: 'Blocked Deliverable', status: 'In_Review', projectId: 'p1' }]);
    tasksApi.update.mockResolvedValue({ id: 't1', title: 'Blocked Deliverable', status: 'Completed' });
    escalationsApi.list.mockResolvedValue([]);
    complianceApi.getViolations.mockResolvedValue([]);
    evidenceApi.getEvidenceList.mockResolvedValue([]);
    teamsApi.list.mockResolvedValue([]);

    const user = userEvent.setup();
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <PmDashboard />
        </MemoryRouter>
      </Provider>
    );

    const approveBtn = await screen.findByRole('button', { name: 'Approve & Complete' });
    expect(screen.getByText('⚠ Blocked by Compliance')).toBeInTheDocument();
    await user.click(approveBtn);

    expect(tasksApi.update).not.toHaveBeenCalled();
    expect(await screen.findByText('Approve despite compliance block?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approve with override' }));
    expect(tasksApi.update).toHaveBeenCalledWith('t1', { status: 'Completed', pmApproval: true }, expect.anything());
  });

  it('Member Tasks Report Blocker button opens ReportBlockerModal directly', async () => {
    projectsApi.list.mockResolvedValue([{ id: 'p1', name: 'Alpha' }]);
    tasksApi.list.mockResolvedValue([{ id: 't1', title: 'Member Task', status: 'Active', projectId: 'p1', assignedToId: 'u-1' }]);
    subtasksApi.list.mockResolvedValue([]);

    const user = userEvent.setup();
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <MemberTasks />
        </MemoryRouter>
      </Provider>
    );

    await user.click(await screen.findByRole('button', { name: 'Report Blocker' }));
    expect(await screen.findByText('Report Blocker / Escalation')).toBeInTheDocument();
  });

  it('TL Dashboard focuses Subtasks tab when member subtasks are In_Review and shows Approve/Send Back on TL TaskDetail', async () => {
    const parentTask = {
      id: 't-oauth',
      title: 'Implement OAuth Flow',
      status: 'Active',
      projectId: 'p1',
      subtasks: [
        { id: 'st-1', taskId: 't-oauth', title: 'Build Callback', status: 'In_Review', assignedToId: 'u-mem' },
      ],
    };
    projectsApi.list.mockResolvedValue([{ id: 'p1', name: 'Audit Test Project', status: 'Active' }]);
    projectsApi.get.mockResolvedValue({ id: 'p1', name: 'Audit Test Project', team: { teamMembers: [] } });
    tasksApi.list.mockResolvedValue([parentTask]);
    tasksApi.get.mockResolvedValue(parentTask);
    escalationsApi.list.mockResolvedValue([]);
    complianceApi.getViolations.mockResolvedValue([]);
    complianceApi.getBindings.mockResolvedValue([]);
    evidenceApi.getEvidenceList.mockResolvedValue([]);
    usersApi.list.mockResolvedValue([]);
    subtasksApi.update.mockResolvedValue({ id: 'st-1', taskId: 't-oauth', title: 'Build Callback', status: 'Completed' });

    const { unmount } = render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <TeamLeadDashboard />
        </MemoryRouter>
      </Provider>
    );

    expect(await screen.findByText('Build Callback')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Back' })).toBeInTheDocument();
    unmount();

    const user = userEvent.setup();
    render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/tl/tasks/t-oauth']}>
          <Routes>
            <Route path="/tl/tasks/:id" element={<TeamLeadTaskDetail />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(await screen.findByText('Build Callback')).toBeInTheDocument();
    const approveBtn = await screen.findByRole('button', { name: 'Approve' });
    await user.click(approveBtn);
    expect(subtasksApi.update).toHaveBeenCalledWith('st-1', { status: 'Completed' }, expect.anything());
  });
});

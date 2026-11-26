import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { makeStore } from '../../../store';
import ComplianceDashboard from './Dashboard';
import { apiClient } from '../../../services/api/client';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'co-1', fullName: 'Samuel Jackson', role: 'compliance_officer' } }),
}));

vi.mock('../../../services/api/client', async (importOriginal) => {
  const actual = await importOriginal();
  const apiClientMock = vi.fn();
  return { ...actual, apiClient: apiClientMock, apiRequest: apiClientMock };
});

describe('ComplianceDashboard project scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.mockImplementation(async (url) => {
      const path = String(url);
      if (path.startsWith('/api/compliance-rules')) {
        return [
          {
            id: 'r-global',
            name: 'Global Operations Policy',
            isActive: true,
            severity: 'High',
            category: { id: 'cat-ops', ownerId: 'co-1' },
            bindings: [{ id: 'b-comp', ruleId: 'r-global', scopeType: 'Company', scopeId: 'comp-1' }],
          },
          {
            id: 'r-proj1',
            name: 'Alpha Project Only Rule',
            isActive: true,
            severity: 'Critical',
            category: { id: 'cat-ops', ownerId: 'co-1' },
            bindings: [{ id: 'b-p1', ruleId: 'r-proj1', scopeType: 'Project', scopeId: 'proj-1' }],
          },
        ];
      }
      if (path.startsWith('/api/compliance-bindings')) {
        return [];
      }
      if (path.startsWith('/api/compliance-violations')) {
        return [
          {
            id: 'v-1',
            status: 'Open',
            entityType: 'Task',
            entityId: 'task-1',
            rule: { id: 'r-proj1', severity: 'Critical', category: { id: 'cat-ops', ownerId: 'co-1' } },
          },
          {
            id: 'v-2',
            status: 'Open',
            entityType: 'Project',
            entityId: 'proj-2',
            rule: { id: 'r-global', severity: 'High', category: { id: 'cat-ops', ownerId: 'co-1' } },
          },
        ];
      }
      if (path.startsWith('/api/evidence')) {
        return [
          {
            id: 'ev-1',
            status: 'Pending',
            taskId: 'task-1',
            task: { id: 'task-1', projectId: 'proj-1' },
            violation: { id: 'v-1', entityType: 'Task', entityId: 'task-1', rule: { category: { ownerId: 'co-1' } } },
          },
          {
            id: 'ev-2',
            status: 'Approved',
            taskId: 'task-2',
            task: { id: 'task-2', projectId: 'proj-2' },
            violation: { id: 'v-2', entityType: 'Project', entityId: 'proj-2', rule: { category: { ownerId: 'co-1' } } },
          },
          {
            id: 'ev-3',
            status: 'Pending',
            taskId: 'task-2',
            task: { id: 'task-2', projectId: 'proj-2' },
            violation: { id: 'v-2', entityType: 'Project', entityId: 'proj-2', rule: { category: { ownerId: 'co-1' } } },
          },
        ];
      }
      if (path === '/projects') {
        return [
          { id: 'proj-1', name: 'Alpha Rollout', teamId: 'team-1', team: { id: 'team-1', name: 'Core Team', branchId: 'br-1' } },
          { id: 'proj-2', name: 'Beta Audit', teamId: 'team-2', team: { id: 'team-2', name: 'Sales Team', branchId: 'br-1' } },
        ];
      }
      if (path === '/tasks') {
        return [
          { id: 'task-1', projectId: 'proj-1', title: 'Alpha Task' },
          { id: 'task-2', projectId: 'proj-2', title: 'Beta Task' },
        ];
      }
      return [];
    });
  });

  it('updates Policies, Violations, and Evidence Queue dynamically when switching Project Scope', async () => {
    const user = userEvent.setup();
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <ComplianceDashboard />
        </MemoryRouter>
      </Provider>
    );

    const policiesLabel = await screen.findByText('My Policies');
    const policiesCard = policiesLabel.closest('.bg-white');
    const violationsCard = screen.getByText('My Queue Violations').closest('.bg-white');
    const evidenceCard = screen.getByText('My Evidence Queue').closest('.bg-white');

    // All projects initially: 2 active policies, 2 open violations, 2 pending evidence
    expect(within(policiesCard).getByText('/ 2 active')).toBeInTheDocument();
    expect(within(violationsCard).getByText('2 in your active triage queue')).toBeInTheDocument();
    expect(within(evidenceCard).getByText('2 deliverables to review')).toBeInTheDocument();

    // Select Project 2 ("Beta Audit"): 1 applicable policy (Global), 1 violation, 1 pending evidence
    const projectSelect = screen.getByLabelText('Project Scope');
    await user.selectOptions(projectSelect, 'proj-2');

    expect(within(policiesCard).getByText('/ 1 active')).toBeInTheDocument();
    expect(within(violationsCard).getByText('1 in your active triage queue')).toBeInTheDocument();
    expect(within(evidenceCard).getByText('1 deliverables to review')).toBeInTheDocument();

    // Reset back to All via the Reset Scope button
    await user.click(screen.getByRole('button', { name: 'Reset Scope' }));
    expect(within(policiesCard).getByText('/ 2 active')).toBeInTheDocument();
    expect(within(evidenceCard).getByText('2 deliverables to review')).toBeInTheDocument();
  });

  it('toggles Filter Scope / Clear Filter from Project Risk Matrix rows', async () => {
    const user = userEvent.setup();
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <ComplianceDashboard />
        </MemoryRouter>
      </Provider>
    );

    await screen.findByText('My Policies');
    const filterButtons = screen.getAllByRole('button', { name: /Filter Scope/i });
    await user.click(filterButtons[0]);

    expect(screen.getByRole('button', { name: /Clear Filter/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Clear Filter/i }));
    expect(screen.queryByRole('button', { name: /Clear Filter/i })).toBeNull();
  });
});

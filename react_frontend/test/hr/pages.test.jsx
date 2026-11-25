import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderHr, fail, deferred, makeDb } from './renderHr';
import { API_EVENT } from '../../src/services/api/client';
import Branches from '../../src/features/hr/pages/Branches';
import Dashboard from '../../src/features/hr/pages/Dashboard';
import RoleAssignments from '../../src/features/hr/pages/RoleAssignments';
import Roles from '../../src/features/hr/pages/Roles';
import Teams from '../../src/features/hr/pages/Teams';
import Users from '../../src/features/hr/pages/Users';
import UserDetail from '../../src/features/hr/pages/UserDetail';

const click = (name, scope = screen) => fireEvent.click(scope.getByRole('button', { name }));
const type = (label, value, scope = screen) => fireEvent.change(scope.getByLabelText(label), { target: { value } });
const dialog = () => within(screen.getByRole('dialog'));
const detail = { path: '/hr/users/u1', route: '/hr/users/:id' };
const teamsTable = { path: '/hr?view=table' };

const PAGES = [
  ['Branches', Branches, {}, 'Pune Office', 'branches', 'users', 'Users'],
  ['Dashboard', Dashboard, {}, 'Workforce Overview', 'users', 'roles', 'Roles'],
  ['RoleAssignments', RoleAssignments, {}, 'Scoped Role Assignments', 'role-assignments', 'branches', 'Branches'],
  ['Roles', Roles, {}, 'Roles & Permissions Studio', 'roles', 'role-assignments', 'Role assignments'],
  ['Teams', Teams, teamsTable, 'Falcon', 'teams', 'users', 'Users'],
  ['Users', Users, {}, 'Asha Rao', 'users', 'roles', 'Roles'],
  ['UserDetail', UserDetail, detail, 'asha@example.com', 'users/u1', 'users', 'Users'],
];

describe.each(PAGES)('%s reads', (_name, Page, options, text, primary, secondary, label) => {
  it('loads through the store', async () => {
    const { store } = renderHr(Page, options);
    expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
    expect(store.getState().users.status).toBe('succeeded');
  });

  it('says so when a secondary list fails, and still renders', async () => {
    renderHr(Page, { ...options, responses: { [`GET /api/${secondary}`]: fail(500) } });
    expect(await screen.findByText(new RegExp(`${label}.*could not be loaded`))).toBeInTheDocument();
    expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
  });

  it('shows the error when its main data fails', async () => {
    renderHr(Page, { ...options, responses: { [`GET /api/${primary}`]: fail(500, 'Main data broke') } });
    expect(await screen.findByText('Main data broke')).toBeInTheDocument();
  });
});

describe.each(PAGES.filter(([n]) => n !== 'UserDetail'))('%s refresh', (_name, Page, options, text, primary) => {
  it('Retry loads again after a failure', async () => {
    let broken = true;
    const db = makeDb();
    renderHr(Page, { ...options, db, responses: { [`GET /api/${primary}`]: () => {
      if (broken) fail(500, 'Main data broke')();
      return db[primary];
    } } });
    await screen.findByText('Main data broke');
    broken = false;
    click('Retry');
    await waitFor(() => expect(screen.queryByText('Main data broke')).not.toBeInTheDocument());
    expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
  });

  it('keeps the page on screen while Refresh runs', async () => {
    const d = deferred();
    let first = true;
    const db = makeDb();
    const { count } = renderHr(Page, { ...options, db, responses: { [`GET /api/${primary}`]: () => {
      if (first) { first = false; return db[primary]; }
      return d.promise;
    } } });
    await screen.findAllByText(text);
    click(/Refresh/);
    await waitFor(() => expect(count(`GET /api/${primary}`)).toBe(2));
    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    await act(async () => d.resolve(db[primary]));
  });

  it('an empty list stays on screen while Refresh runs', async () => {
    const d = deferred();
    let first = true;
    const { count } = renderHr(Page, { ...options, db: { ...makeDb(), [primary]: [] }, responses: { [`GET /api/${primary}`]: () => {
      if (first) { first = false; return []; }
      return d.promise;
    } } });
    const heading = await screen.findByRole('heading', { level: 1 });
    click(/Refresh/);
    await waitFor(() => expect(count(`GET /api/${primary}`)).toBe(2));
    expect(heading).toBeInTheDocument();
    await act(async () => d.resolve([]));
  });
});

describe('Branches', () => {
  it('creates a branch and reloads', async () => {
    const { bodyOf } = renderHr(Branches, { responses: { 'POST /api/branches': (body, db) => {
      db.branches.push({ id: 'b9', teams: [], ...body });
      return { id: 'b9' };
    } } });
    await screen.findAllByText('Pune Office');
    click(/Add Branch/);
    type('Branch Name', ' Goa Office ');
    type('Branch Code (Optional)', 'goa');
    click('Create Branch');
    expect((await screen.findAllByText('Goa Office')).length).toBeGreaterThan(0);
    expect(bodyOf('POST /api/branches')).toEqual({ name: 'Goa Office', code: 'GOA' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the form open with the server message when create fails', async () => {
    renderHr(Branches, { responses: { 'POST /api/branches': fail(409, 'Name taken') } });
    await screen.findAllByText('Pune Office');
    click(/Add Branch/);
    type('Branch Name', 'Goa');
    click('Create Branch');
    expect(await dialog().findByText('Name taken')).toBeInTheDocument();
  });

  it('a 403 is announced once through the shared toast, not by the page as well', async () => {
    const seen = vi.fn();
    window.addEventListener(API_EVENT, seen);
    renderHr(Branches, { responses: { 'POST /api/branches': fail(403, 'Not allowed') } });
    await screen.findAllByText('Pune Office');
    click(/Add Branch/);
    type('Branch Name', 'Goa');
    click('Create Branch');
    await dialog().findByText('Not allowed');
    expect(seen).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('Not allowed')).toHaveLength(1);
    window.removeEventListener(API_EVENT, seen);
  });

  it('deletes an empty branch', async () => {
    renderHr(Branches, { responses: { 'DELETE /api/branches/b1': (_b, db) => {
      db.branches = db.branches.filter((b) => b.id !== 'b1');
      return { success: true, message: 'Branch gone' };
    } } });
    await screen.findAllByText('Pune Office');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    click('Delete Branch');
    expect(await screen.findByText('Branch gone')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Pune Office')).not.toBeInTheDocument());
  });

  it('migrates teams when the branch has some', async () => {
    const { count } = renderHr(Branches, { responses: { 'DELETE /api/branches/b2?reassignBranchId=b1': { message: 'Migrated' } } });
    await screen.findAllByText('Delhi Office');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]);
    click(/Migrate 1 Team/);
    await screen.findByText('Migrated');
    expect(count('DELETE /api/branches/b2?reassignBranchId=b1')).toBe(1);
  });
});

describe('RoleAssignments', () => {
  it('assigns a role and reloads', async () => {
    const { bodyOf, count } = renderHr(RoleAssignments, { responses: { 'POST /api/role-assignments': { id: 'a2' } } });
    await screen.findByRole('button', { name: 'Revoke' });
    fireEvent.click(screen.getAllByRole('button', { name: /Assign/ })[0]);
    type('Select Employee', 'u2');
    type('Select Role', 'r2');
    fireEvent.submit(screen.getByLabelText('Select Role').closest('form'));
    await screen.findByText('Role assigned successfully!');
    expect(bodyOf('POST /api/role-assignments')).toEqual({ userId: 'u2', roleId: 'r2', scopeType: 'Company', scopeId: 'c1' });
    await waitFor(() => expect(count('GET /api/role-assignments')).toBe(2));
  });

  it('revokes a role', async () => {
    renderHr(RoleAssignments, { responses: { 'DELETE /api/role-assignments/a1': (_b, db) => { db['role-assignments'] = []; return {}; } } });
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke' }));
    click('Revoke Role');
    await screen.findByText(/revoked from Asha Rao/);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument());
  });
});

describe('Roles', () => {
  it('saves permissions', async () => {
    const { bodyOf } = renderHr(Roles, { responses: { 'PUT /api/roles/r1/permissions': (body, db) => {
      db.roles[0].permissions = body.permissionSlugs.map((slug) => ({ permission: { slug } }));
      return db.roles[0];
    } } });
    fireEvent.click(await screen.findByRole('checkbox', { name: /Execute Subtasks/ }));
    click('Save Changes');
    await screen.findByText(/Permissions updated/);
    expect(bodyOf('PUT /api/roles/r1/permissions')).toEqual({ permissionSlugs: ['task:create', 'task:execute'] });
    await waitFor(() => expect(screen.queryByText('Save Changes')).not.toBeInTheDocument());
  });

  it('keeps unsaved ticks when the list reloads unchanged', async () => {
    const { count } = renderHr(Roles);
    const box = await screen.findByRole('checkbox', { name: /Execute Subtasks/ });
    fireEvent.click(box);
    click(/Refresh/);
    await waitFor(() => expect(count('GET /api/roles')).toBe(2));
    await act(async () => {});
    expect(screen.getByRole('checkbox', { name: /Execute Subtasks/ })).toBeChecked();
  });

  it('selects the role it just created', async () => {
    renderHr(Roles, { responses: { 'POST /api/roles': (body, db) => {
      const role = { id: 'r9', isSystem: false, permissions: [], label: body.label };
      db.roles.push(role);
      return role;
    } } });
    await screen.findAllByText('Auditor');
    fireEvent.click(screen.getAllByRole('button', { name: /Create|New/ })[0]);
    type('Role Label', 'Curator');
    fireEvent.submit(screen.getByLabelText('Role Label').closest('form'));
    expect(await screen.findByRole('heading', { name: 'Curator' })).toBeInTheDocument();
  });

  it('deletes a custom role and moves to the next one', async () => {
    renderHr(Roles, { responses: { 'DELETE /api/roles/r1': (_b, db) => { db.roles.shift(); return {}; } } });
    await screen.findByRole('heading', { name: 'Auditor' });
    fireEvent.click(screen.getAllByRole('button', { name: /Delete/ })[0]);
    fireEvent.click(dialog().getByRole('button', { name: /Delete/ }));
    expect(await screen.findByRole('heading', { name: 'Planner' })).toBeInTheDocument();
  });
});

describe('Teams', () => {
  it('creates a team', async () => {
    const { bodyOf } = renderHr(Teams, { ...teamsTable, responses: { 'POST /api/teams': (body, db) => {
      db.teams.push({ id: 't9', teamMembers: [], projects: [], ...body });
      return {};
    } } });
    await screen.findByText('Falcon');
    fireEvent.click(screen.getAllByRole('button', { name: /Create|Add|New/ })[0]);
    type('Team / Squad Name', 'Heron', dialog());
    type('Assigned Branch', 'b1', dialog());
    fireEvent.submit(dialog().getByLabelText('Team / Squad Name').closest('form'));
    expect(await screen.findByText('Heron')).toBeInTheDocument();
    expect(bodyOf('POST /api/teams')).toEqual({ name: 'Heron', branchId: 'b1' });
  });

  it('hands the Lead over in two calls and refreshes the open roster', async () => {
    const { calls } = renderHr(Teams, { ...teamsTable, responses: {
      'POST /api/teams/t1/members': (body, db) => { db.teams[0].teamMembers.push({ id: 'm2', ...body, user: { id: 'u2', fullName: 'Ben Cole' } }); return {}; },
      'PATCH /api/teams/t1/members/u2': (_b, db) => { db.teams[0].teamMembers[0].role = 'Member'; db.teams[0].teamMembers[1].role = 'Lead'; return {}; },
    } });
    await screen.findByText('Falcon');
    fireEvent.click(screen.getByTitle(/manage squad roster/));
    type('Employee to assign', 'u2');
    type('Squad role', 'Lead');
    fireEvent.submit(screen.getByLabelText('Squad role').closest('form'));
    await screen.findByText(/new Squad Lead/);
    expect(await dialog().findByText(/Assigned Members \(2\)/)).toBeInTheDocument();
    expect(calls.filter((c) => /members/.test(c.key)).map((c) => [c.key, c.body])).toEqual([
      ['POST /api/teams/t1/members', { userId: 'u2', role: 'Member' }],
      ['PATCH /api/teams/t1/members/u2', { role: 'Lead' }],
    ]);
  });

  it('says the member was added when only the promotion failed', async () => {
    renderHr(Teams, { ...teamsTable, responses: { 'POST /api/teams/t1/members': {}, 'PATCH /api/teams/t1/members/u2': fail(500, 'No promote') } });
    await screen.findByText('Falcon');
    fireEvent.click(screen.getByTitle(/manage squad roster/));
    type('Employee to assign', 'u2');
    type('Squad role', 'Lead');
    fireEvent.submit(screen.getByLabelText('Squad role').closest('form'));
    expect(await screen.findByText(/No promote They were added as a Member/)).toBeInTheDocument();
  });

  it('removes a member and the roster modal stays open', async () => {
    renderHr(Teams, { ...teamsTable, responses: { 'DELETE /api/teams/t1/members/u1': (_b, db) => { db.teams[0].teamMembers = []; return {}; } } });
    await screen.findByText('Falcon');
    fireEvent.click(screen.getByTitle(/manage squad roster/));
    click('Remove', dialog());
    expect(await dialog().findByText(/Assigned Members \(0\)/)).toBeInTheDocument();
  });
});

describe('Users', () => {
  it('onboards an employee', async () => {
    const { bodyOf } = renderHr(Users, { responses: { 'POST /api/users': (body, db) => { db.users.push({ ...body, id: 'u9', roleAssignments: [], teamMembers: [] }); return { id: 'u9' }; } } });
    await screen.findAllByText('Asha Rao');
    click(/Onboard Employee/);
    type('Full Name', 'Dia New');
    type('Email Address', 'DIA@example.com');
    type('Temporary Password', 'longenough');
    fireEvent.submit(screen.getByLabelText('Full Name').closest('form'));
    expect((await screen.findAllByText('Dia New')).length).toBeGreaterThan(0);
    expect(bodyOf('POST /api/users')).toMatchObject({ fullName: 'Dia New', email: 'dia@example.com', password: 'longenough' });
  });

  it('keeps the typed password out of the store', async () => {
    const { store } = renderHr(Users, { responses: { 'POST /api/users': fail(409, 'Email used') } });
    await screen.findAllByText('Asha Rao');
    click(/Onboard Employee/);
    type('Full Name', 'Dia New');
    type('Email Address', 'dia@example.com');
    type('Temporary Password', 'longenough');
    fireEvent.submit(screen.getByLabelText('Full Name').closest('form'));
    await screen.findByText('Email used');
    expect(JSON.stringify(store.getState())).not.toContain('longenough');
  });
});

describe('UserDetail', () => {
  it('updates the profile and shows the new name', async () => {
    const { bodyOf } = renderHr(UserDetail, { ...detail, responses: { 'PATCH /api/users/u1': (body, db) => { Object.assign(db.users[0], body); return db.users[0]; } } });
    await screen.findAllByText('asha@example.com');
    click('Edit Profile');
    const input = dialog().getByDisplayValue('Asha Rao');
    fireEvent.change(input, { target: { value: 'Asha R' } });
    fireEvent.submit(input.closest('form'));
    expect((await screen.findAllByText('Asha R')).length).toBeGreaterThan(0);
    expect(bodyOf('PATCH /api/users/u1')).toMatchObject({ fullName: 'Asha R' });
  });

  it('deactivates and then reactivates', async () => {
    const set = (isActive) => (_b, db) => { db.users[0].isActive = isActive; return db.users[0]; };
    renderHr(UserDetail, { ...detail, responses: { 'DELETE /api/users/u1': set(false), 'PATCH /api/users/u1/reactivate': set(true) } });
    await screen.findAllByText('asha@example.com');
    click('Deactivate Account');
    click('Deactivate Account', dialog());
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivate Account' }));
    click('Reactivate Account', dialog());
    expect(await screen.findByRole('button', { name: 'Deactivate Account' })).toBeInTheDocument();
  });

  it.each(['missing', 'not.valid'])('shows not found for %s', async (id) => {
    renderHr(UserDetail, { path: `/hr/users/${id}`, route: '/hr/users/:id' });
    expect(await screen.findByText('Employee Not Found')).toBeInTheDocument();
  });
});

describe('two visits', () => {
  it('a list that failed last time is requested again on the next visit', async () => {
    let broken = true;
    const db = makeDb();
    const { store, unmount } = renderHr(Branches, { db, responses: { 'GET /api/users': () => { if (broken) fail(500)(); return db.users; } } });
    await screen.findByText(/Users.*could not be loaded/);
    unmount();
    broken = false;
    renderHr(Branches, { db, store });
    await screen.findAllByText('Pune Office');
    await waitFor(() => expect(store.getState().users.status).toBe('succeeded'));
    expect(screen.queryByText(/could not be loaded/)).not.toBeInTheDocument();
  });
});

describe('review findings', () => {
  it('switching role during a permission save never mixes the two roles', async () => {
    const d = deferred();
    renderHr(Roles, { responses: { 'PUT /api/roles/r1/permissions': async (body, db) => {
      await d.promise;
      db.roles[0].permissions = body.permissionSlugs.map((slug) => ({ permission: { slug } }));
      return {};
    } } });
    fireEvent.click(await screen.findByRole('checkbox', { name: /Execute Subtasks/ }));
    click('Save Changes');
    fireEvent.click(screen.getAllByText('Planner')[0]);
    await screen.findByRole('heading', { name: 'Planner' });
    await act(async () => d.resolve());
    await screen.findByText(/Permissions updated/);
    await act(async () => {});
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Execute Subtasks/ })).not.toBeChecked();
  });

  it('the edit form stays open and busy until the new data is in', async () => {
    const d = deferred();
    let reads = 0;
    const db = makeDb();
    renderHr(UserDetail, { ...detail, db, responses: {
      'PATCH /api/users/u1': (body) => { Object.assign(db.users[0], body); return {}; },
      'GET /api/users/u1': async () => { reads += 1; if (reads === 2) await d.promise; return { ...db.users[0], reports: [], assignedTasks: [] }; },
    } });
    await screen.findAllByText('asha@example.com');
    click('Edit Profile');
    const input = dialog().getByDisplayValue('Asha Rao');
    fireEvent.change(input, { target: { value: 'Asha R' } });
    fireEvent.submit(input.closest('form'));
    await waitFor(() => expect(reads).toBe(2));
    expect(dialog().getByRole('button', { name: 'Saving...' })).toBeDisabled();
    await act(async () => d.resolve());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('a revisited profile waits for its own read instead of showing the cached one', async () => {
    const first = renderHr(UserDetail, detail);
    await screen.findAllByText('asha@example.com');
    first.unmount();
    renderHr(UserDetail, { ...detail, store: first.store, responses: { 'GET /api/users/u1': fail(404, 'Gone') } });
    expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
    expect(await screen.findByText('Employee Not Found')).toBeInTheDocument();
  });

  it.each([404, 403])('a profile that turns unreadable (%i) on reload is replaced by not found', async (status) => {
    let reads = 0;
    renderHr(UserDetail, { ...detail, responses: {
      'DELETE /api/users/u1': {},
      'GET /api/users/u1': () => { reads += 1; if (reads > 1) fail(status, 'Gone')(); return { ...makeDb().users[0], reports: [], assignedTasks: [] }; },
    } });
    await screen.findAllByText('asha@example.com');
    click('Deactivate Account');
    click('Deactivate Account', dialog());
    expect(await screen.findByText('Employee Not Found')).toBeInTheDocument();
  });

  it('a 403 on a confirm dialog is always shown by the page', async () => {
    renderHr(RoleAssignments, { responses: { 'DELETE /api/role-assignments/a1': fail(403, 'Owner only') } });
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke' }));
    click('Revoke Role');
    expect(await screen.findByText('Owner only')).toBeInTheDocument();
  });

  it('says so in the roster when the change was saved but the refresh failed', async () => {
    let reads = 0;
    renderHr(Teams, { ...teamsTable, responses: {
      'DELETE /api/teams/t1/members/u1': {},
      'GET /api/teams': (_b, db) => { reads += 1; if (reads > 1) fail(500)(); return db.teams; },
    } });
    await screen.findByText('Falcon');
    fireEvent.click(screen.getByTitle(/manage squad roster/));
    click('Remove', dialog());
    expect(await dialog().findByText(/could not be refreshed/)).toBeInTheDocument();
  });

  it.each([[500, 2], [409, 2], [404, 2], [400, 1]])('after a failed write with %i the list is read %i time(s)', async (status, reads) => {
    const { count } = renderHr(Branches, { responses: { 'POST /api/branches': fail(status) } });
    await screen.findAllByText('Pune Office');
    click(/Add Branch/);
    type('Branch Name', 'Goa');
    click('Create Branch');
    await dialog().findByText('Server said no');
    await act(async () => {});
    expect(count('GET /api/branches')).toBe(reads);
  });

  it('Refresh is disabled while it runs', async () => {
    const d = deferred();
    let reads = 0;
    renderHr(Branches, { responses: { 'GET /api/branches': (_b, db) => { reads += 1; return reads > 1 ? d.promise : db.branches; } } });
    await screen.findAllByText('Pune Office');
    click(/Refresh/);
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeDisabled();
    await act(async () => d.resolve([]));
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeEnabled();
  });
});

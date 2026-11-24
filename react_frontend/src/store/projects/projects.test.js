/**
 * Projects slice tests — reducer, thunks (service mocked), selectors.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import projectsReducer, { projectsAdapter } from './slice';
import { fetchProjects, fetchProjectById, createProject, updateProject, deleteProject } from './thunks';
import { selectAllProjects, selectProjectById, selectOpenProjects } from './selectors';

vi.mock('../../services/api/projects');
import * as projectsApi from '../../services/api/projects';

const makeStore = () => configureStore({ reducer: { projects: projectsReducer } });

const proj1 = { id: 1, name: 'Alpha', status: 'Active' };
const proj2 = { id: 2, name: 'Beta', status: 'Completed' };

beforeEach(() => vi.clearAllMocks());

// ── reducer ─────────────────────────────────────────────────────────────────

describe('projects reducer — initial state', () => {
  it('starts idle with no entities', () => {
    const state = projectsReducer(undefined, { type: '@@init' });
    expect(state.status).toBe('idle');
    expect(state.queryKey).toBeNull();
  });
});

describe('projects reducer — fetchProjects', () => {
  it('pending → loading', () => {
    expect(projectsReducer(undefined, fetchProjects.pending('', undefined)).status).toBe('loading');
  });

  it('fulfilled → entities populated, status succeeded', () => {
    const state = projectsReducer(undefined, fetchProjects.fulfilled([proj1, proj2], '', undefined));
    expect(state.status).toBe('succeeded');
    expect(projectsAdapter.getSelectors().selectAll(state)).toHaveLength(2);
  });

  it('rejected → failed with error', () => {
    const err = { message: 'err', status: 500, code: 'SERVER_ERROR', details: null };
    const state = projectsReducer(undefined, fetchProjects.rejected(null, '', undefined, err));
    expect(state.status).toBe('failed');
    expect(state.error).toEqual(err);
  });

  it('aborted → state unchanged', () => {
    const before = projectsReducer(undefined, fetchProjects.fulfilled([proj1], '', undefined));
    const after = projectsReducer(before, fetchProjects.rejected(null, '', undefined, { code: 'ABORTED' }));
    expect(after.status).toBe('succeeded');
  });
});

describe('projects reducer — mutations', () => {
  it('createProject adds entity', () => {
    const after = projectsReducer(undefined, createProject.fulfilled(proj1, '', {}));
    expect(projectsAdapter.getSelectors().selectById(after, 1)).toMatchObject(proj1);
    expect(after.mutations.create.status).toBe('succeeded');
  });

  it('updateProject merges entity', () => {
    const before = projectsReducer(undefined, fetchProjects.fulfilled([proj1], '', undefined));
    const after = projectsReducer(before, updateProject.fulfilled({ ...proj1, name: 'Alpha v2' }, '', {}));
    expect(projectsAdapter.getSelectors().selectById(after, 1).name).toBe('Alpha v2');
  });

  it('deleteProject removes entity', () => {
    const before = projectsReducer(undefined, fetchProjects.fulfilled([proj1, proj2], '', undefined));
    const after = projectsReducer(before, deleteProject.fulfilled(undefined, '', 1));
    expect(projectsAdapter.getSelectors().selectById(after, 1)).toBeUndefined();
  });
});

// ── thunks ───────────────────────────────────────────────────────────────────

describe('fetchProjects thunk', () => {
  it('populates store from api', async () => {
    projectsApi.list.mockResolvedValue([proj1]);
    const store = makeStore();
    await store.dispatch(fetchProjects());
    expect(selectAllProjects(store.getState())).toHaveLength(1);
  });

  it('passes full options object (signal + abortKey) to service', async () => {
    projectsApi.list.mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch(fetchProjects());
    const [, options] = projectsApi.list.mock.calls[0];
    expect(options).toHaveProperty('signal');
    expect(options).toHaveProperty('abortKey');
  });
});

// ── selectors ────────────────────────────────────────────────────────────────

describe('projects selectors', () => {
  it('selectOpenProjects excludes closed statuses', () => {
    const store = makeStore();
    store.dispatch(fetchProjects.fulfilled([proj1, proj2], '', undefined));
    const open = selectOpenProjects(store.getState());
    expect(open.map((p) => p.id)).toContain(proj1.id);
    expect(open.map((p) => p.id)).not.toContain(proj2.id);
  });

  it('selectProjectById returns the right project', () => {
    const store = makeStore();
    store.dispatch(fetchProjects.fulfilled([proj1, proj2], '', undefined));
    expect(selectProjectById(store.getState(), 2)).toMatchObject(proj2);
  });
});

// ── list fetch vs. detail rows ───────────────────────────────────────────────

describe('projects reducer — list after detail', () => {
  it('keeps fields a detail fetch stored (project.tasks) when the list arrives later', () => {
    const detail = { ...proj1, tasks: [{ id: 't1', title: 'Spec' }] };
    let state = projectsReducer(undefined, fetchProjectById.fulfilled(detail, '', 1));
    state = projectsReducer(state, fetchProjects.fulfilled([{ ...proj1, name: 'Alpha (renamed)' }, proj2], '', undefined));
    const row = projectsAdapter.getSelectors().selectById(state, 1);
    expect(row.tasks).toEqual(detail.tasks); // detail field kept
    expect(row.name).toBe('Alpha (renamed)'); // list field updated
  });

  it('drops rows the server no longer returns and keeps the server order', () => {
    let state = projectsReducer(undefined, fetchProjects.fulfilled([proj1, proj2], '', undefined));
    const proj3 = { id: 3, name: 'Gamma', status: 'Active' };
    state = projectsReducer(state, fetchProjects.fulfilled([proj3, proj1], '', undefined));
    expect(state.ids).toEqual([3, 1]);
    expect(projectsAdapter.getSelectors().selectById(state, 2)).toBeUndefined();
  });
});

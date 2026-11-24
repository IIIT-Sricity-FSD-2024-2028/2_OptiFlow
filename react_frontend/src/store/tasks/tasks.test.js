/**
 * Tasks slice tests — reducer, thunks (service mocked), selectors.
 * Template: src/store/core/createApiThunk.test.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import tasksReducer, { tasksAdapter, clearTaskMutation } from './slice';
import { fetchTasks, fetchTaskById, createTask, updateTask, deleteTask } from './thunks';
import {
  selectAllTasks,
  selectTaskById,
  selectTasksStatus,
  selectTasksLoading,
  selectOpenTasks,
  selectOverdueTasks,
  selectTasksByProjectId,
} from './selectors';

// ── helpers ────────────────────────────────────────────────────────────────

vi.mock('../../services/api/tasks');
import * as tasksApi from '../../services/api/tasks';
import { isReportableError } from '../work/entitySlice';

const makeStore = () =>
  configureStore({
    reducer: { tasks: tasksReducer },
  });

const task1 = { id: 1, title: 'First', status: 'Active', projectId: 10, dueDate: null };
const task2 = { id: 2, title: 'Second', status: 'Completed', projectId: 10, dueDate: null };
const overdueTask = {
  id: 3,
  title: 'Overdue',
  status: 'Active',
  projectId: 20,
  dueDate: new Date(Date.now() - 86_400_000).toISOString(), // yesterday
};

beforeEach(() => vi.clearAllMocks());

// ── reducer: initial state ──────────────────────────────────────────────────

describe('tasks reducer — initial state', () => {
  it('starts idle with empty entities', () => {
    const state = tasksReducer(undefined, { type: '@@init' });
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
    expect(state.loadedAt).toBeNull();
    expect(state.queryKey).toBeNull();
    expect(tasksAdapter.getSelectors().selectAll(state)).toHaveLength(0);
  });
});

// ── reducer: fetchTasks (list) ──────────────────────────────────────────────

describe('tasks reducer — fetchTasks', () => {
  it('pending → status loading, error cleared', () => {
    const state = tasksReducer(undefined, fetchTasks.pending('', undefined));
    expect(state.status).toBe('loading');
    expect(state.error).toBeNull();
  });

  it('fulfilled → entities set, status succeeded, loadedAt stamped', () => {
    const state = tasksReducer(undefined, fetchTasks.fulfilled([task1, task2], '', undefined));
    expect(state.status).toBe('succeeded');
    expect(state.loadedAt).toBeGreaterThan(0);
    expect(tasksAdapter.getSelectors().selectAll(state)).toHaveLength(2);
  });

  it('rejected → status failed, error stored', () => {
    const err = { message: 'Network error', status: 500, code: 'SERVER_ERROR', details: null };
    const action = fetchTasks.rejected(null, '', undefined, err);
    const state = tasksReducer(undefined, action);
    expect(state.status).toBe('failed');
    expect(state.error).toEqual(err);
  });

  it('aborted rejection → state unchanged (no error)', () => {
    const before = tasksReducer(undefined, fetchTasks.fulfilled([task1], '', undefined));
    const aborted = fetchTasks.rejected(null, '', undefined, { code: 'ABORTED' });
    const after = tasksReducer(before, aborted);
    expect(after.status).toBe('succeeded'); // unchanged
    expect(after.error).toBeNull();
  });
});

// ── reducer: createTask / updateTask / deleteTask (mutations) ───────────────

describe('tasks reducer — mutations', () => {
  it('createTask fulfilled → new entity at top of list', () => {
    const before = tasksReducer(undefined, fetchTasks.fulfilled([task1], '', undefined));
    const after = tasksReducer(before, createTask.fulfilled(task2, '', {}));
    const all = tasksAdapter.getSelectors().selectAll(after);
    expect(all[0].id).toBe(task2.id); // newest first
    expect(after.mutations.create.status).toBe('succeeded');
  });

  it('updateTask fulfilled → entity updated in place', () => {
    const before = tasksReducer(undefined, fetchTasks.fulfilled([task1], '', undefined));
    const updated = { ...task1, title: 'Updated' };
    const after = tasksReducer(before, updateTask.fulfilled(updated, '', { id: 1, data: {} }));
    expect(tasksAdapter.getSelectors().selectById(after, 1).title).toBe('Updated');
    expect(after.mutations.update.status).toBe('succeeded');
  });

  it('deleteTask fulfilled → entity removed', () => {
    const before = tasksReducer(undefined, fetchTasks.fulfilled([task1, task2], '', undefined));
    const after = tasksReducer(before, deleteTask.fulfilled(undefined, '', 1));
    expect(tasksAdapter.getSelectors().selectById(after, 1)).toBeUndefined();
  });

  it('mutation rejected → status failed with error', () => {
    const err = { message: 'Bad input', status: 400, code: 'BAD_REQUEST', details: null };
    const action = createTask.rejected(null, '', {}, err);
    const after = tasksReducer(undefined, action);
    expect(after.mutations.create.status).toBe('failed');
    expect(after.mutations.create.error).toEqual(err);
  });

  it('cancelled getById rejected → no error written (plan section 3)', () => {
    const aborted = fetchTaskById.rejected(null, '', 1, { code: 'ABORTED' });
    Object.assign(aborted, { meta: { aborted: true } });
    const after = tasksReducer(undefined, aborted);
    expect(after.mutations.getById).toBeUndefined(); // never set
  });

  it('clearTaskMutation removes the entry', () => {
    const withMutation = tasksReducer(undefined, createTask.pending('', {}));
    const cleared = tasksReducer(withMutation, clearTaskMutation('create'));
    expect(cleared.mutations.create).toBeUndefined();
  });
});

// ── thunks (service mocked) ─────────────────────────────────────────────────

describe('fetchTasks thunk', () => {
  it('dispatches fulfilled with the api result', async () => {
    tasksApi.list.mockResolvedValue([task1]);
    const store = makeStore();
    await store.dispatch(fetchTasks());
    expect(selectAllTasks(store.getState())).toEqual([task1]);
  });

  it('passes options (signal + abortKey) to the service', async () => {
    tasksApi.list.mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch(fetchTasks());
    const [options] = tasksApi.list.mock.calls[0];
    expect(options).toHaveProperty('signal');
    expect(options).toHaveProperty('abortKey');
  });

  it('dispatches failed when api throws', async () => {
    tasksApi.list.mockRejectedValue(new Error('fail'));
    const store = makeStore();
    await store.dispatch(fetchTasks());
    expect(selectTasksStatus(store.getState())).toBe('failed');
  });
});

describe('createTask thunk', () => {
  it('adds the returned entity to the store', async () => {
    tasksApi.create.mockResolvedValue(task1);
    const store = makeStore();
    await store.dispatch(createTask({ title: 'First' }));
    expect(selectTaskById(store.getState(), 1)).toMatchObject({ title: 'First' });
  });
});

describe('updateTask thunk', () => {
  it('merges the updated entity into the store', async () => {
    tasksApi.list.mockResolvedValue([task1]);
    tasksApi.update.mockResolvedValue({ ...task1, title: 'Changed' });
    const store = makeStore();
    await store.dispatch(fetchTasks());
    await store.dispatch(updateTask({ id: 1, data: { title: 'Changed' } }));
    expect(selectTaskById(store.getState(), 1).title).toBe('Changed');
  });
});

// ── selectors ───────────────────────────────────────────────────────────────

describe('tasks selectors', () => {
  const makePopulatedStore = () => {
    const store = makeStore();
    store.dispatch(fetchTasks.fulfilled([task1, task2, overdueTask], '', undefined));
    return store;
  };

  it('selectAllTasks returns all entities', () => {
    expect(selectAllTasks(makePopulatedStore().getState())).toHaveLength(3);
  });

  it('selectOpenTasks excludes Completed/Cancelled', () => {
    const open = selectOpenTasks(makePopulatedStore().getState());
    expect(open.map((t) => t.id)).not.toContain(task2.id);
  });

  it('selectOverdueTasks returns only past-due open tasks', () => {
    const overdue = selectOverdueTasks(makePopulatedStore().getState());
    expect(overdue.map((t) => t.id)).toContain(overdueTask.id);
    expect(overdue.map((t) => t.id)).not.toContain(task1.id);
  });

  it('selectTasksByProjectId filters by projectId', () => {
    const state = makePopulatedStore().getState();
    expect(selectTasksByProjectId(state, 10)).toHaveLength(2);
    expect(selectTasksByProjectId(state, 20)).toHaveLength(1);
  });

  it('selectTasksLoading is true only on first load', () => {
    const store = makeStore();
    store.dispatch(fetchTasks.pending('', undefined));
    expect(selectTasksLoading(store.getState())).toBe(true);
    store.dispatch(fetchTasks.fulfilled([task1], '', undefined));
    store.dispatch(fetchTasks.pending('', undefined));
    expect(selectTasksLoading(store.getState())).toBe(false); // background refetch
  });
});

// ── cancelled detail fetch ──────────────────────────────────────────────────

describe('tasks reducer — cancelled getById after pending', () => {
  it('goes back to idle instead of staying on loading', () => {
    const loading = tasksReducer(undefined, fetchTaskById.pending('', 1));
    expect(loading.mutations.getById.status).toBe('loading');
    const aborted = fetchTaskById.rejected(null, '', 1, { code: 'ABORTED' });
    const after = tasksReducer(loading, aborted);
    expect(after.mutations.getById).toEqual({ status: 'idle', error: null });
  });
});

// ── freshness (shouldFetch condition) ───────────────────────────────────────

describe('fetchTasks freshness', () => {
  it('skips a second fetch while the list is fresh', async () => {
    tasksApi.list.mockResolvedValue([task1]);
    const store = makeStore();
    await store.dispatch(fetchTasks());
    const second = await store.dispatch(fetchTasks());
    expect(tasksApi.list).toHaveBeenCalledTimes(1);
    expect(second.meta.condition).toBe(true);
  });

  it('refetches with force: true even when fresh', async () => {
    tasksApi.list.mockResolvedValue([task1]);
    const store = makeStore();
    await store.dispatch(fetchTasks());
    await store.dispatch(fetchTasks({ force: true }));
    expect(tasksApi.list).toHaveBeenCalledTimes(2);
  });

  it('a skipped fetch is not a reportable error for pages', async () => {
    tasksApi.list.mockResolvedValue([task1]);
    const store = makeStore();
    await store.dispatch(fetchTasks());
    const err = await store.dispatch(fetchTasks()).unwrap().catch((e) => e);
    expect(err.name).toBe('ConditionError');
    expect(isReportableError(err)).toBe(false);
  });
});

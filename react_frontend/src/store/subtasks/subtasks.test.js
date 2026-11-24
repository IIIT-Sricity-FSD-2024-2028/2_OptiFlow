/**
 * Subtasks slice tests — reducer, thunks (service mocked), selectors.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import subtasksReducer, { subtasksAdapter } from './slice';
import { fetchSubtasks, fetchSubtasksByTask, createSubtask, updateSubtask, deleteSubtask } from './thunks';
import { selectAllSubtasks, selectSubtasksByTaskId, selectSubtasksStatus } from './selectors';

vi.mock('../../services/api/subtasks');
import * as subtasksApi from '../../services/api/subtasks';

const makeStore = () => configureStore({ reducer: { subtasks: subtasksReducer } });

const st1 = { id: 1, title: 'Sub A', taskId: 10, status: 'Active' };
const st2 = { id: 2, title: 'Sub B', taskId: 10, status: 'Completed' };
const st3 = { id: 3, title: 'Sub C', taskId: 20, status: 'Active' };

beforeEach(() => vi.clearAllMocks());

// ── reducer ──────────────────────────────────────────────────────────────────

describe('subtasks reducer — initial state', () => {
  it('starts idle', () => {
    expect(subtasksReducer(undefined, { type: '@@init' }).status).toBe('idle');
  });
});

describe('subtasks reducer — fetchSubtasks', () => {
  it('pending → loading', () => {
    expect(subtasksReducer(undefined, fetchSubtasks.pending('', undefined)).status).toBe('loading');
  });

  it('fulfilled → entities set', () => {
    const state = subtasksReducer(undefined, fetchSubtasks.fulfilled([st1, st2, st3], '', undefined));
    expect(state.status).toBe('succeeded');
    expect(subtasksAdapter.getSelectors().selectAll(state)).toHaveLength(3);
  });

  it('aborted → unchanged', () => {
    const before = subtasksReducer(undefined, fetchSubtasks.fulfilled([st1], '', undefined));
    const after = subtasksReducer(before, fetchSubtasks.rejected(null, '', undefined, { code: 'ABORTED' }));
    expect(after.status).toBe('succeeded');
  });
});

describe('subtasks reducer — fetchSubtasksByTask', () => {
  it('replaces only subtasks of that task', () => {
    const before = subtasksReducer(undefined, fetchSubtasks.fulfilled([st1, st2, st3], '', undefined));
    // Replace task 10's subtasks with just one updated subtask
    const updated = { id: 1, title: 'Updated A', taskId: 10, status: 'Completed' };
    const after = subtasksReducer(before, fetchSubtasksByTask.fulfilled([updated], '', 10));
    const all = subtasksAdapter.getSelectors().selectAll(after);
    // st2 (task 10) should be gone, st3 (task 20) must remain, updated must be present
    expect(all.find((s) => s.id === 2)).toBeUndefined();
    expect(all.find((s) => s.id === 3)).toBeDefined();
    expect(all.find((s) => s.id === 1).title).toBe('Updated A');
  });
});

describe('subtasks reducer — mutations', () => {
  it('createSubtask adds entity', () => {
    const after = subtasksReducer(undefined, createSubtask.fulfilled(st1, '', {}));
    expect(subtasksAdapter.getSelectors().selectById(after, 1)).toMatchObject(st1);
    expect(after.mutations.create.status).toBe('succeeded');
  });

  it('updateSubtask merges entity', () => {
    const before = subtasksReducer(undefined, fetchSubtasks.fulfilled([st1], '', undefined));
    const after = subtasksReducer(before, updateSubtask.fulfilled({ ...st1, title: 'Updated' }, '', {}));
    expect(subtasksAdapter.getSelectors().selectById(after, 1).title).toBe('Updated');
  });

  it('deleteSubtask removes entity', () => {
    const before = subtasksReducer(undefined, fetchSubtasks.fulfilled([st1, st2], '', undefined));
    const after = subtasksReducer(before, deleteSubtask.fulfilled(undefined, '', 1));
    expect(subtasksAdapter.getSelectors().selectById(after, 1)).toBeUndefined();
  });

  it('mutation rejected → failed, abort skipped', () => {
    const err = { message: 'bad', status: 400, code: 'BAD', details: null };
    expect(subtasksReducer(undefined, createSubtask.rejected(null, '', {}, err)).mutations.create.status).toBe('failed');

    const aborted = updateSubtask.rejected(null, '', {}, { code: 'ABORTED' });
    Object.assign(aborted, { meta: { aborted: true } });
    expect(subtasksReducer(undefined, aborted).mutations.update).toBeUndefined();
  });
});

// ── thunks ────────────────────────────────────────────────────────────────────

describe('fetchSubtasks thunk', () => {
  it('populates store from api', async () => {
    subtasksApi.list.mockResolvedValue([st1, st2]);
    const store = makeStore();
    await store.dispatch(fetchSubtasks());
    expect(selectAllSubtasks(store.getState())).toHaveLength(2);
  });

  it('passes full options to service', async () => {
    subtasksApi.list.mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch(fetchSubtasks());
    const [options] = subtasksApi.list.mock.calls[0];
    expect(options).toHaveProperty('signal');
    expect(options).toHaveProperty('abortKey');
  });
});

// ── selectors ─────────────────────────────────────────────────────────────────

describe('subtasks selectors', () => {
  it('selectSubtasksByTaskId filters by taskId', () => {
    const store = makeStore();
    store.dispatch(fetchSubtasks.fulfilled([st1, st2, st3], '', undefined));
    const forTask10 = selectSubtasksByTaskId(store.getState(), 10);
    expect(forTask10).toHaveLength(2);
    expect(forTask10.map((s) => s.id)).not.toContain(st3.id);
  });
});

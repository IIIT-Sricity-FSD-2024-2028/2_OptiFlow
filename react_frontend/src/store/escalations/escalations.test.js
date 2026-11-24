/**
 * Escalations slice tests — reducer, thunks (service mocked), selectors.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import escalationsReducer, { escalationsAdapter } from './slice';
import { fetchEscalations, createEscalation, updateEscalation } from './thunks';
import { selectAllEscalations, selectOpenEscalations } from './selectors';

vi.mock('../../services/api/escalations');
import * as escalationsApi from '../../services/api/escalations';

const makeStore = () => configureStore({ reducer: { escalations: escalationsReducer } });

const esc1 = { id: 1, title: 'Blocker', status: 'Open', blockerType: 'Blocker', taskId: 10 };
const esc2 = { id: 2, title: 'Extension', status: 'Resolved', blockerType: 'Extension Request', taskId: 11 };

beforeEach(() => vi.clearAllMocks());

// ── reducer ──────────────────────────────────────────────────────────────────

describe('escalations reducer — initial state', () => {
  it('starts idle', () => {
    expect(escalationsReducer(undefined, { type: '@@init' }).status).toBe('idle');
  });
});

describe('escalations reducer — fetchEscalations', () => {
  it('pending → loading', () => {
    expect(escalationsReducer(undefined, fetchEscalations.pending('', undefined)).status).toBe('loading');
  });

  it('fulfilled → entities set', () => {
    const state = escalationsReducer(undefined, fetchEscalations.fulfilled([esc1, esc2], '', undefined));
    expect(state.status).toBe('succeeded');
    expect(escalationsAdapter.getSelectors().selectAll(state)).toHaveLength(2);
  });

  it('aborted → state unchanged', () => {
    const before = escalationsReducer(undefined, fetchEscalations.fulfilled([esc1], '', undefined));
    const after = escalationsReducer(before, fetchEscalations.rejected(null, '', undefined, { code: 'ABORTED' }));
    expect(after.status).toBe('succeeded');
    expect(after.error).toBeNull();
  });
});

describe('escalations reducer — mutations', () => {
  it('createEscalation fulfilled → entity added', () => {
    const after = escalationsReducer(undefined, createEscalation.fulfilled(esc1, '', {}));
    expect(escalationsAdapter.getSelectors().selectById(after, 1)).toMatchObject(esc1);
    expect(after.mutations.create.status).toBe('succeeded');
  });

  it('updateEscalation fulfilled → entity updated', () => {
    const before = escalationsReducer(undefined, fetchEscalations.fulfilled([esc1], '', undefined));
    const after = escalationsReducer(
      before,
      updateEscalation.fulfilled({ ...esc1, status: 'Resolved' }, '', { id: 1, data: {} }),
    );
    expect(escalationsAdapter.getSelectors().selectById(after, 1).status).toBe('Resolved');
    expect(after.mutations.update.status).toBe('succeeded');
  });

  it('mutation rejected → failed with error, not from abort', () => {
    const err = { message: 'forbidden', status: 403, code: 'FORBIDDEN', details: null };
    const after = escalationsReducer(undefined, createEscalation.rejected(null, '', {}, err));
    expect(after.mutations.create.status).toBe('failed');
    expect(after.mutations.create.error).toEqual(err);
  });

  it('cancelled update → no error written', () => {
    const action = updateEscalation.rejected(null, '', { id: 1, data: {} }, { code: 'ABORTED' });
    Object.assign(action, { meta: { aborted: true } });
    const after = escalationsReducer(undefined, action);
    expect(after.mutations.update).toBeUndefined();
  });
});

// ── thunks ────────────────────────────────────────────────────────────────────

describe('fetchEscalations thunk', () => {
  it('populates store', async () => {
    escalationsApi.list.mockResolvedValue([esc1, esc2]);
    const store = makeStore();
    await store.dispatch(fetchEscalations());
    expect(selectAllEscalations(store.getState())).toHaveLength(2);
  });

  it('passes full options (signal + abortKey) to service', async () => {
    escalationsApi.list.mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch(fetchEscalations());
    const [options] = escalationsApi.list.mock.calls[0];
    expect(options).toHaveProperty('signal');
    expect(options).toHaveProperty('abortKey');
  });
});

// ── selectors ─────────────────────────────────────────────────────────────────

describe('escalations selectors', () => {
  it('selectOpenEscalations excludes Resolved and Closed', () => {
    const store = makeStore();
    store.dispatch(fetchEscalations.fulfilled([esc1, esc2], '', undefined));
    const open = selectOpenEscalations(store.getState());
    expect(open.map((e) => e.id)).toContain(esc1.id);
    expect(open.map((e) => e.id)).not.toContain(esc2.id);
  });
});

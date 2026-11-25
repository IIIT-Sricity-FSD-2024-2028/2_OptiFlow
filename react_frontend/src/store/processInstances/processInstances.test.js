import { expect, it, vi } from 'vitest';
import { makeStore } from '../index';
import * as api from '../../services/api/process';
import { fetchProcessInstances, fetchProcessInstanceById, createInstanceStep, selectAllProcessInstances, selectInstanceSteps } from './index';

vi.mock('../../services/api/process');

it('loads rows and stores a successful step under its parent', async () => {
  const store = makeStore();
  const row = { id: 'p', steps: [] };
  api.listInstances.mockResolvedValue([row]);
  const loading = store.dispatch(fetchProcessInstances());
  expect(store.getState().processInstances.status).toBe('loading');
  await loading;
  expect(selectAllProcessInstances(store.getState())).toEqual([row]);
  const step = { id: 's', processInstanceId: 'p', stepOrder: 1 };
  api.createInstanceStep.mockResolvedValue(step);
  await store.dispatch(createInstanceStep({ processInstanceId: 'p' })).unwrap();
  expect(selectInstanceSteps(store.getState(), 'p')).toEqual([step]);
});
it('records errors and ignores cancelled and superseded reads', async () => {
  const store = makeStore();
  api.listInstances.mockRejectedValue(new Error('Unavailable'));
  await store.dispatch(fetchProcessInstances());
  expect(store.getState().processInstances.error.message).toBe('Unavailable');
  store.dispatch(fetchProcessInstanceById.pending('first', 'p'));
  store.dispatch(fetchProcessInstanceById.pending('second', 'p'));
  store.dispatch(fetchProcessInstanceById.fulfilled({ id: 'p' }, 'first', 'p'));
  store.dispatch(fetchProcessInstanceById.rejected({ name: 'AbortError' }, 'second', 'p'));
  expect(store.getState().processInstances.entities.p).toBeUndefined();
  expect(store.getState().processInstances.details.p.error).toBeNull();
});

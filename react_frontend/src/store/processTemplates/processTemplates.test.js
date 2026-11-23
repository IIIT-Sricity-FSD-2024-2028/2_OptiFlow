import { expect, it, vi } from 'vitest';
import { makeStore } from '../index';
import * as api from '../../services/api/process';
import { fetchProcessTemplates, fetchProcessTemplateById, addTemplateStep, selectAllProcessTemplates, selectTemplateSteps } from './index';

vi.mock('../../services/api/process');

it('loads rows and stores a successful step under its parent', async () => {
  const store = makeStore();
  const row = { id: 'p', steps: [] };
  api.listTemplates.mockResolvedValue([row]);
  const loading = store.dispatch(fetchProcessTemplates());
  expect(store.getState().processTemplates.status).toBe('loading');
  await loading;
  expect(selectAllProcessTemplates(store.getState())).toEqual([row]);
  const step = { id: 's', processInstanceId: 'p', stepOrder: 1 };
  api.addTemplateStep.mockResolvedValue(step);
  await store.dispatch(addTemplateStep({ id: 'p', data: { name: 'Review' } })).unwrap();
  expect(selectTemplateSteps(store.getState(), 'p')).toEqual([step]);
});
it('records errors and ignores cancelled and superseded reads', async () => {
  const store = makeStore();
  api.listTemplates.mockRejectedValue(new Error('Unavailable'));
  await store.dispatch(fetchProcessTemplates());
  expect(store.getState().processTemplates.error.message).toBe('Unavailable');
  store.dispatch(fetchProcessTemplateById.pending('first', 'p'));
  store.dispatch(fetchProcessTemplateById.pending('second', 'p'));
  store.dispatch(fetchProcessTemplateById.fulfilled({ id: 'p' }, 'first', 'p'));
  store.dispatch(fetchProcessTemplateById.rejected({ name: 'AbortError' }, 'second', 'p'));
  expect(store.getState().processTemplates.entities.p).toBeUndefined();
  expect(store.getState().processTemplates.details.p.error).toBeNull();
});

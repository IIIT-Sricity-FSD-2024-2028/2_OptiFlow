import * as escalationsApi from '../../services/api/escalations';
import { createApiThunk } from '../core/createApiThunk';
import { shouldFetch } from '../core/shouldFetch';

export const fetchEscalations = createApiThunk(
  'escalations/fetchAll',
  (arg, options) => escalationsApi.list(options),
  { abortable: true, condition: (_arg, { getState }) => shouldFetch(getState().escalations, _arg) },
);
export const fetchEscalationById = createApiThunk(
  'escalations/fetchById',
  (id, options) => escalationsApi.get(id, options),
  { abortable: true },
);
export const createEscalation = createApiThunk('escalations/create', (data, options) =>
  escalationsApi.create(data, options),
);
export const updateEscalation = createApiThunk('escalations/update', ({ id, data }, options) =>
  escalationsApi.update(id, data, options),
);
export const deleteEscalation = createApiThunk('escalations/delete', (id, options) =>
  escalationsApi.remove(id, options),
);

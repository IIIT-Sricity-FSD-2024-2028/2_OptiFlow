import * as escalationsApi from '../../services/api/escalations';
import { createApiThunk } from '../core/createApiThunk';
import { skipWhileLoading } from '../work/entitySlice';

export const fetchEscalations = createApiThunk(
  'escalations/fetchAll',
  (_arg, { signal }) => escalationsApi.list({ signal }),
  skipWhileLoading('escalations'),
);
export const fetchEscalationById = createApiThunk('escalations/fetchById', (id, { signal }) =>
  escalationsApi.get(id, { signal }),
);
export const createEscalation = createApiThunk('escalations/create', (data, { signal }) =>
  escalationsApi.create(data, { signal }),
);
export const updateEscalation = createApiThunk('escalations/update', ({ id, data }, { signal }) =>
  escalationsApi.update(id, data, { signal }),
);
export const deleteEscalation = createApiThunk('escalations/delete', (id, { signal }) =>
  escalationsApi.remove(id, { signal }),
);

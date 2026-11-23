import * as projectsApi from '../../services/api/projects';
import { createApiThunk } from '../core/createApiThunk';
import { skipWhileLoading } from '../work/entitySlice';

export const fetchProjects = createApiThunk(
  'projects/fetchAll',
  (params, { signal }) => projectsApi.list(params || {}, { signal }),
  skipWhileLoading('projects'),
);
export const fetchProjectById = createApiThunk('projects/fetchById', (id, { signal }) =>
  projectsApi.get(id, { signal }),
);
export const createProject = createApiThunk('projects/create', (data, { signal }) =>
  projectsApi.create(data, { signal }),
);
export const updateProject = createApiThunk('projects/update', ({ id, data }, { signal }) =>
  projectsApi.update(id, data, { signal }),
);
export const deleteProject = createApiThunk('projects/delete', (id, { signal }) =>
  projectsApi.remove(id, { signal }),
);

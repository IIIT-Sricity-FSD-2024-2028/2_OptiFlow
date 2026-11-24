import * as projectsApi from '../../services/api/projects';
import { createApiThunk } from '../core/createApiThunk';
import { shouldFetch } from '../core/shouldFetch';

export const fetchProjects = createApiThunk(
  'projects/fetchAll',
  (params, options) => projectsApi.list(params || {}, options),
  { abortable: true, condition: (_arg, { getState }) => shouldFetch(getState().projects, _arg) },
);
export const fetchProjectById = createApiThunk(
  'projects/fetchById',
  (id, options) => projectsApi.get(id, options),
  { abortable: true },
);
export const createProject = createApiThunk('projects/create', (data, options) => projectsApi.create(data, options));
export const updateProject = createApiThunk('projects/update', ({ id, data }, options) =>
  projectsApi.update(id, data, options),
);
export const deleteProject = createApiThunk('projects/delete', (id, options) => projectsApi.remove(id, options));

import * as api from '../../services/api/process';
import { createApiThunk } from '../core/createApiThunk';
import { shouldFetch } from '../core/shouldFetch';

export const fetchProcessTemplates = createApiThunk('processTemplates/list',
  (_arg, options) => api.listTemplates(options), {
    abortable: true, condition: (arg, { getState }) => shouldFetch(getState().processTemplates, arg),
  });
export const fetchProcessTemplateById = createApiThunk('processTemplates/get', (id, options) => api.getTemplate(id, options), { abortable: true });
export const createProcessTemplate = createApiThunk('processTemplates/create', (data, options) => api.createTemplate(data, options));
export const updateProcessTemplate = createApiThunk('processTemplates/update',
  ({ id, data }, options) => api.updateTemplate(id, data, options));
export const deleteProcessTemplate = createApiThunk('processTemplates/delete', (id, options) => api.deleteTemplate(id, options));
export const fetchTemplateSteps = createApiThunk('processTemplates/listSteps', (id, options) => api.listTemplateSteps(id, options), { abortable: true });
export const addTemplateStep = createApiThunk('processTemplates/addStep',
  ({ id, data }, options) => api.addTemplateStep(id, data, options));

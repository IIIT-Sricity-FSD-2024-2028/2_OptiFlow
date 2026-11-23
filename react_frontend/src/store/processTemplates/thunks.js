import * as api from '../../services/api/process';
import { createApiThunk } from '../core/createApiThunk';
import { shouldFetch } from '../core/shouldFetch';

export const fetchProcessTemplates = createApiThunk('processTemplates/list',
  (_arg, options) => api.listTemplates(options), {
    abortable: true, condition: (arg, { getState }) => shouldFetch(getState().processTemplates, arg),
  });
export const fetchProcessTemplateById = createApiThunk('processTemplates/get', api.getTemplate, { abortable: true });
export const createProcessTemplate = createApiThunk('processTemplates/create', api.createTemplate);
export const updateProcessTemplate = createApiThunk('processTemplates/update',
  ({ id, data }, options) => api.updateTemplate(id, data, options));
export const deleteProcessTemplate = createApiThunk('processTemplates/delete', api.deleteTemplate);
export const fetchTemplateSteps = createApiThunk('processTemplates/listSteps', api.listTemplateSteps, { abortable: true });
export const addTemplateStep = createApiThunk('processTemplates/addStep',
  ({ id, data }, options) => api.addTemplateStep(id, data, options));

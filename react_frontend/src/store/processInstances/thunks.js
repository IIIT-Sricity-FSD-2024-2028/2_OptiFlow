import * as api from '../../services/api/process';
import { createApiThunk } from '../core/createApiThunk';
import { shouldFetch } from '../core/shouldFetch';

export const fetchProcessInstances = createApiThunk('processInstances/list',
  ({ templateId, projectId } = {}, options) => {
    const params = {};
    if (templateId) params.templateId = templateId;
    if (projectId) params.projectId = projectId;
    return api.listInstances(params, options);
  }, {
    abortable: true, condition: (arg, { getState }) => shouldFetch(getState().processInstances, arg),
  });
export const fetchProcessInstanceById = createApiThunk('processInstances/get', (id, options) => api.getInstance(id, options), { abortable: true });
export const createProcessInstance = createApiThunk('processInstances/create', (data, options) => api.createInstance(data, options));
export const updateProcessInstance = createApiThunk('processInstances/update',
  ({ id, data }, options) => api.updateInstance(id, data, options));
export const deleteProcessInstance = createApiThunk('processInstances/delete', (id, options) => api.deleteInstance(id, options));
export const fetchInstanceSteps = createApiThunk('processInstances/listSteps', (id, options) => api.listInstanceSteps(id, options), { abortable: true });
export const fetchInstanceStepById = createApiThunk('processInstances/getStep', (id, options) => api.getInstanceStep(id, options), { abortable: true });
export const createInstanceStep = createApiThunk('processInstances/createStep', (data, options) => api.createInstanceStep(data, options));
export const actionInstanceStep = createApiThunk('processInstances/actionStep',
  ({ id, data }, options) => api.actionStep(id, data, options));

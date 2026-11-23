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
export const fetchProcessInstanceById = createApiThunk('processInstances/get', api.getInstance, { abortable: true });
export const createProcessInstance = createApiThunk('processInstances/create', api.createInstance);
export const updateProcessInstance = createApiThunk('processInstances/update',
  ({ id, data }, options) => api.updateInstance(id, data, options));
export const deleteProcessInstance = createApiThunk('processInstances/delete', api.deleteInstance);
export const fetchInstanceSteps = createApiThunk('processInstances/listSteps', api.listInstanceSteps, { abortable: true });
export const fetchInstanceStepById = createApiThunk('processInstances/getStep', api.getInstanceStep, { abortable: true });
export const createInstanceStep = createApiThunk('processInstances/createStep', api.createInstanceStep);
export const actionInstanceStep = createApiThunk('processInstances/actionStep',
  ({ id, data }, options) => api.actionStep(id, data, options));

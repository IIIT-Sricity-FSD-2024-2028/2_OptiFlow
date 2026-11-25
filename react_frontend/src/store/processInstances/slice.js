import { createSlice } from '@reduxjs/toolkit';
import { resourceState, listCases, requestCases, rows, includeRow, removeRow } from '../resourceState';
import * as actions from './thunks';

function storeStep(state, parentId, step) {
  const steps = state.entities[parentId]?.steps ?? [];
  const updated = steps.filter(item => item.id !== step.id);
  updated.push(step);
  updated.sort((a, b) => (a.templateStep?.stepOrder ?? 0) - (b.templateStep?.stepOrder ?? 0));
  rows.upsertOne(state, { id: parentId, steps: updated });
}

export default createSlice({
  name: 'processInstances',
  initialState: resourceState(),
  reducers: {},
  extraReducers(builder) {
    listCases(builder, actions.fetchProcessInstances);
    requestCases(builder, actions.fetchProcessInstanceById, 'details', a => a.meta.arg, (state, { payload }) => {
      if (payload) rows.upsertOne(state, payload);
    });
    requestCases(builder, actions.createProcessInstance, 'mutations', a => 'create:' + a.meta.requestId, (state, { payload }) => {
      const query = JSON.parse(state.queryKey) ?? {};
      if ((!query.templateId || query.templateId === payload.templateId) &&
          (!query.projectId || query.projectId === payload.projectId)) includeRow(state, payload);
      else rows.upsertOne(state, payload);
    });
    requestCases(builder, actions.updateProcessInstance, 'mutations', a => 'update:' + a.meta.arg.id, (state, { payload }) => {
      if (state.listRequest) state.changedDuringLoad[payload.id] = true;
      rows.upsertOne(state, payload);
    });
    requestCases(builder, actions.deleteProcessInstance, 'mutations', a => 'delete:' + a.meta.arg, (state, action) => {
      removeRow(state, action.meta.arg);
    });
    requestCases(builder, actions.fetchInstanceSteps, 'details', a => 'steps:' + (a.meta.arg?.processInstanceId ?? 'all'), (state, action) => {
      const groups = new Map();
      const parentId = action.meta.arg?.processInstanceId;
      for (const id of parentId ? [parentId] : state.ids) groups.set(id, []);
      for (const step of action.payload) {
        if (!groups.has(step.processInstanceId)) groups.set(step.processInstanceId, []);
        groups.get(step.processInstanceId).push(step);
      }
      for (const [id, steps] of groups) rows.upsertOne(state, { id, steps });
    });
    requestCases(builder, actions.fetchInstanceStepById, 'details', a => 'step:' + a.meta.arg, (state, { payload }) => {
      storeStep(state, payload.processInstanceId, payload);
    });
    requestCases(builder, actions.createInstanceStep, 'mutations', a => 'createStep:' + a.meta.requestId, (state, { payload }) => {
      storeStep(state, payload.processInstanceId, payload);
    });
    requestCases(builder, actions.actionInstanceStep, 'mutations', a => 'action:' + a.meta.arg.id, (state, { payload }) => {
      storeStep(state, payload.processInstanceId, payload);
    });
  },
}).reducer;

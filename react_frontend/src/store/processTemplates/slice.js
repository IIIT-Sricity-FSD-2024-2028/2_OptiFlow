import { createSlice } from '@reduxjs/toolkit';
import { resourceState, listCases, requestCases, rows, includeRow, removeRow } from '../resourceState';
import * as actions from './thunks';
import { createProcessInstance, updateProcessInstance, deleteProcessInstance, actionInstanceStep } from '../processInstances/thunks';

function storeStep(state, parentId, step) {
  const steps = state.entities[parentId]?.steps ?? [];
  const updated = steps.filter(item => item.id !== step.id);
  updated.push(step);
  updated.sort((a, b) => a.stepOrder - b.stepOrder);
  rows.upsertOne(state, { id: parentId, steps: updated });
}

export default createSlice({
  name: 'processTemplates',
  initialState: resourceState(),
  reducers: {},
  extraReducers(builder) {
    listCases(builder, actions.fetchProcessTemplates);
    requestCases(builder, actions.fetchProcessTemplateById, 'details', a => a.meta.arg, (state, { payload }) => {
      if (payload) rows.upsertOne(state, payload);
    });
    requestCases(builder, actions.createProcessTemplate, 'mutations', a => 'create:' + a.meta.requestId, (state, { payload }) => {
      includeRow(state, payload);
    });
    requestCases(builder, actions.updateProcessTemplate, 'mutations', a => 'update:' + a.meta.arg.id, (state, { payload }) => {
      if (state.listRequest) state.changedDuringLoad[payload.id] = true;
      rows.upsertOne(state, payload);
    });
    requestCases(builder, actions.deleteProcessTemplate, 'mutations', a => 'delete:' + a.meta.arg, (state, action) => {
      removeRow(state, action.meta.arg);
    });
    requestCases(builder, actions.fetchTemplateSteps, 'details', a => 'steps:' + a.meta.arg, (state, action) => {
      rows.upsertOne(state, { id: action.meta.arg, steps: action.payload });
    });
    requestCases(builder, actions.addTemplateStep, 'mutations', a => 'addStep:' + a.meta.requestId, (state, action) => {
      storeStep(state, action.meta.arg.id, action.payload);
    });
    // Template lists include instance summaries and counts.
    for (const thunk of [createProcessInstance, updateProcessInstance, deleteProcessInstance, actionInstanceStep]) {
      builder.addCase(thunk.fulfilled, state => { state.loadedAt = null; });
    }
  },
}).reducer;

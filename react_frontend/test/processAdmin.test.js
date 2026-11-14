// react_frontend/test/processAdmin.test.js
// Unit tests for Process Admin API client contracts using mockClient

import assert from 'node:assert/strict';
import { createMockClient, mockTemplates, mockInstances } from './mockClient.js';

// Bind API methods to the mock client
function createProcessApi(client) {
  return {
    listTemplates: () => client('/api/process-templates'),
    getTemplate: (id) => client(`/api/process-templates/${id}`),
    createTemplate: (data) => client('/api/process-templates', { method: 'POST', body: data }),
    updateTemplate: (id, data) => client(`/api/process-templates/${id}`, { method: 'PATCH', body: data }),
    deleteTemplate: (id) => client(`/api/process-templates/${id}`, { method: 'DELETE' }),
    addTemplateStep: (id, data) => client(`/api/process-templates/${id}/steps`, { method: 'POST', body: data }),
    listInstances: (params) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return client(`/api/process-instances${q}`);
    },
    getInstance: (id) => client(`/api/process-instances/${id}`),
    createInstance: (data) => client('/api/process-instances', { method: 'POST', body: data }),
    actionStep: (stepId, data) => client(`/api/process-instance-steps/${stepId}/action`, { method: 'PATCH', body: data }),
  };
}

async function runTests() {
  console.log('🧪 Starting Process Admin API client unit tests...\n');

  const client = createMockClient();
  const api = createProcessApi(client);

  // 1. listTemplates
  const templatesRes = await api.listTemplates();
  assert.ok(Array.isArray(templatesRes.data), 'listTemplates must return array in data');
  assert.equal(templatesRes.data.length, mockTemplates.length);
  console.log('  ✓ listTemplates returns envelope data matching templates');

  // 2. getTemplate
  const tpl = await api.getTemplate('tpl-101');
  assert.equal(tpl.data.id, 'tpl-101');
  assert.equal(tpl.data.name, 'Standard Document Approval');
  assert.equal(tpl.data.steps.length, 2);
  console.log('  ✓ getTemplate returns requested template with steps');

  // 3. createTemplate
  const createdTpl = await api.createTemplate({
    name: 'New Custom Workflow',
    steps: [{ name: 'Step 1', stepOrder: 1, stepType: 'Approval' }],
  });
  assert.ok(createdTpl.data.id, 'New template must have an ID');
  assert.equal(createdTpl.data.name, 'New Custom Workflow');
  assert.equal(createdTpl.data.steps.length, 1);
  console.log('  ✓ createTemplate creates template and returns data');

  // 4. updateTemplate
  const updatedTpl = await api.updateTemplate('tpl-101', { name: 'Standard Doc Approval Renamed' });
  assert.equal(updatedTpl.data.name, 'Standard Doc Approval Renamed');
  console.log('  ✓ updateTemplate updates template fields');

  // 5. addTemplateStep (Canonical endpoint)
  const newStep = await api.addTemplateStep('tpl-101', {
    name: 'Additional Step',
    stepOrder: 3,
    stepType: 'Approval',
  });
  assert.ok(newStep.data.id);
  assert.equal(newStep.data.name, 'Additional Step');
  console.log('  ✓ addTemplateStep adds step via canonical route');

  // 6. deleteTemplate
  const delRes = await api.deleteTemplate('tpl-102');
  assert.equal(delRes.success, true);
  console.log('  ✓ deleteTemplate removes template');

  // 7. listInstances
  const instancesRes = await api.listInstances();
  assert.ok(Array.isArray(instancesRes.data));
  assert.equal(instancesRes.data.length, mockInstances.length);
  console.log('  ✓ listInstances returns instances list');

  // 8. getInstance
  const inst = await api.getInstance('inst-201');
  assert.equal(inst.data.id, 'inst-201');
  assert.equal(inst.data.status, 'Active');
  assert.equal(inst.data.currentStepId, 'istep-2');
  console.log('  ✓ getInstance returns instance with steps and currentStepId');

  // 9. createInstance
  const createdInst = await api.createInstance({
    templateId: 'tpl-101',
    title: 'Audit Run 2026',
  });
  assert.ok(createdInst.data.id);
  assert.equal(createdInst.data.status, 'Draft');
  console.log('  ✓ createInstance creates draft instance');

  // 10. actionStep
  const actionRes = await api.actionStep('istep-2', { status: 'Approved' });
  assert.equal(actionRes.data.status, 'Approved');
  assert.ok(actionRes.data.actionedAt);
  console.log('  ✓ actionStep transitions step to Approved');

  // 11. Error handling (404)
  let threw404 = false;
  try {
    await api.getTemplate('nonexistent-tpl-id');
  } catch (err) {
    threw404 = true;
    assert.equal(err.status, 404);
  }
  assert.ok(threw404, 'Must throw error on 404');
  console.log('  ✓ Client throws on 404 responses');

  console.log('\n======================================================================');
  console.log('      ALL 11 PROCESS ADMIN API CLIENT TESTS PASSED!                   ');
  console.log('======================================================================\n');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});


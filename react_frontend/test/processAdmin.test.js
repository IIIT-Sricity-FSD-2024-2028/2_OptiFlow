// Contract tests for the real Process Admin API module (src/services/api/process.js).
// Only the network client is replaced, so a changed URL, method or body in the module fails here.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/services/api/client', () => ({
  apiClient: vi.fn(async () => ({ success: true, data: {} })),
}));

import { apiClient } from '../src/services/api/client';
import * as processApi from '../src/services/api/process';

beforeEach(() => {
  apiClient.mockClear();
});

describe('process API paths and methods', () => {
  it('lists and reads templates on the canonical path', async () => {
    await processApi.listTemplates();
    await processApi.getTemplate('t1');
    expect(apiClient).toHaveBeenNthCalledWith(1, '/api/process-templates');
    expect(apiClient).toHaveBeenNthCalledWith(2, '/api/process-templates/t1');
  });

  it('creates, updates and deletes templates', async () => {
    const body = { name: 'Flow', steps: [{ name: 'A', stepOrder: 1 }] };
    await processApi.createTemplate(body);
    await processApi.updateTemplate('t1', { name: 'Renamed' });
    await processApi.deleteTemplate('t1');
    expect(apiClient).toHaveBeenNthCalledWith(1, '/api/process-templates', { method: 'POST', body });
    expect(apiClient).toHaveBeenNthCalledWith(2, '/api/process-templates/t1', { method: 'PATCH', body: { name: 'Renamed' } });
    expect(apiClient).toHaveBeenNthCalledWith(3, '/api/process-templates/t1', { method: 'DELETE' });
  });

  it('adds a template step on the canonical steps path', async () => {
    const body = { name: 'Review', stepOrder: 2 };
    await processApi.addTemplateStep('t1', body);
    expect(apiClient).toHaveBeenCalledWith('/api/process-templates/t1/steps', { method: 'POST', body });
  });

  it('builds the instance query string only when params are given', async () => {
    await processApi.listInstances();
    await processApi.listInstances({ templateId: 't1', projectId: 'p1' });
    expect(apiClient).toHaveBeenNthCalledWith(1, '/api/process-instances');
    expect(apiClient).toHaveBeenNthCalledWith(2, '/api/process-instances?templateId=t1&projectId=p1');
  });

  it('launches, updates and deletes instances', async () => {
    await processApi.createInstance({ templateId: 't1' });
    await processApi.updateInstance('i1', { status: 'Cancelled' });
    await processApi.deleteInstance('i1');
    expect(apiClient).toHaveBeenNthCalledWith(1, '/api/process-instances', { method: 'POST', body: { templateId: 't1' } });
    expect(apiClient).toHaveBeenNthCalledWith(2, '/api/process-instances/i1', { method: 'PATCH', body: { status: 'Cancelled' } });
    expect(apiClient).toHaveBeenNthCalledWith(3, '/api/process-instances/i1', { method: 'DELETE' });
  });

  it('actions a step with PATCH on the /action path', async () => {
    await processApi.actionStep('s1', { status: 'Approved', comment: 'ok' });
    expect(apiClient).toHaveBeenCalledWith('/api/process-instance-steps/s1/action', {
      method: 'PATCH',
      body: { status: 'Approved', comment: 'ok' },
    });
  });

  it('keeps the legacy aliases pointing at the instance functions', () => {
    expect(processApi.list).toBe(processApi.listInstances);
    expect(processApi.get).toBe(processApi.getInstance);
    expect(processApi.create).toBe(processApi.createInstance);
    expect(processApi.update).toBe(processApi.updateInstance);
    expect(processApi.remove).toBe(processApi.deleteInstance);
  });
});

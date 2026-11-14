// react_frontend/test/mockClient.js
// Mocked client helper for testing API integration and future Redux thunks without store dependencies

export const mockTemplates = [
  {
    id: 'tpl-101',
    companyId: 'comp-1',
    name: 'Standard Document Approval',
    version: 1,
    isActive: true,
    steps: [
      { id: 'tstep-1', stepOrder: 1, name: 'Document Submission', stepType: 'Input_Required', onRejectGotoStepId: null },
      { id: 'tstep-2', stepOrder: 2, name: 'Executive Approval', stepType: 'Approval', onRejectGotoStepId: 'tstep-1' },
    ],
    _count: { instances: 2 },
  },
  {
    id: 'tpl-102',
    companyId: 'comp-1',
    name: 'Multi-Tier QA Process',
    version: 1,
    isActive: true,
    steps: [
      { id: 'tstep-3', stepOrder: 1, name: 'Code Review', stepType: 'Input_Required', onRejectGotoStepId: null },
      { id: 'tstep-4', stepOrder: 2, name: 'Security Review', stepType: 'Approval', onRejectGotoStepId: 'tstep-3' },
      { id: 'tstep-5', stepOrder: 3, name: 'Compliance Sign-off', stepType: 'Approval', onRejectGotoStepId: 'tstep-3' },
    ],
    _count: { instances: 1 },
  },
];

export const mockInstances = [
  {
    id: 'inst-201',
    companyId: 'comp-1',
    templateId: 'tpl-101',
    title: 'Vendor Contract Q4 Approval',
    status: 'Active',
    currentStepId: 'istep-2',
    steps: [
      { id: 'istep-1', templateStepId: 'tstep-1', status: 'Approved', templateStep: { stepOrder: 1, name: 'Document Submission' } },
      { id: 'istep-2', templateStepId: 'tstep-2', status: 'Pending', templateStep: { stepOrder: 2, name: 'Executive Approval' } },
    ],
  },
  {
    id: 'inst-202',
    companyId: 'comp-1',
    templateId: 'tpl-101',
    title: 'Policy Revision 2026',
    status: 'Draft',
    currentStepId: null,
    steps: [
      { id: 'istep-3', templateStepId: 'tstep-1', status: 'Pending', templateStep: { stepOrder: 1, name: 'Document Submission' } },
      { id: 'istep-4', templateStepId: 'tstep-2', status: 'Pending', templateStep: { stepOrder: 2, name: 'Executive Approval' } },
    ],
  },
];

/**
 * Creates a mock apiClient router that simulates network calls with envelope wrapping.
 * @param {Object} options Configuration overrides
 */
export function createMockClient(options = {}) {
  const templates = [...(options.templates || mockTemplates)];
  const instances = [...(options.instances || mockInstances)];

  return async function mockApiClient(endpoint, reqOptions = {}) {
    const method = (reqOptions.method || 'GET').toUpperCase();
    const cleanUrl = endpoint.replace('/api/', '/').replace(/^\/+/, '');

    // 1. Process Templates Routes
    if (cleanUrl === 'process-templates') {
      if (method === 'GET') {
        return { data: templates };
      }
      if (method === 'POST') {
        const body = typeof reqOptions.body === 'string' ? JSON.parse(reqOptions.body) : reqOptions.body;
        const newTemplate = {
          id: `tpl-${Date.now()}`,
          companyId: 'comp-1',
          name: body.name,
          version: body.version || 1,
          isActive: true,
          steps: (body.steps || []).map((s, idx) => ({ id: `tstep-${Date.now()}-${idx}`, ...s })),
          _count: { instances: 0 },
        };
        templates.push(newTemplate);
        return { data: newTemplate };
      }
    }

    if (cleanUrl.startsWith('process-templates/')) {
      const parts = cleanUrl.split('/');
      const templateId = parts[1];

      // POST /process-templates/:id/steps (canonical)
      if (parts[2] === 'steps' && method === 'POST') {
        const tpl = templates.find((t) => t.id === templateId);
        if (!tpl) {
          const err = new Error('Template not found');
          err.status = 404;
          throw err;
        }
        const body = typeof reqOptions.body === 'string' ? JSON.parse(reqOptions.body) : reqOptions.body;
        const newStep = { id: `tstep-${Date.now()}`, ...body };
        tpl.steps = tpl.steps || [];
        tpl.steps.push(newStep);
        return { data: newStep };
      }

      const tplIndex = templates.findIndex((t) => t.id === templateId);
      if (tplIndex === -1) {
        const err = new Error('Template not found');
        err.status = 404;
        throw err;
      }

      if (method === 'GET') {
        return { data: templates[tplIndex] };
      }
      if (method === 'PATCH') {
        const body = typeof reqOptions.body === 'string' ? JSON.parse(reqOptions.body) : reqOptions.body;
        templates[tplIndex] = { ...templates[tplIndex], ...body };
        return { data: templates[tplIndex] };
      }
      if (method === 'DELETE') {
        templates.splice(tplIndex, 1);
        return { success: true };
      }
    }

    // 2. Process Instances Routes
    if (cleanUrl.startsWith('process-instances')) {
      if (cleanUrl === 'process-instances' || cleanUrl.startsWith('process-instances?')) {
        if (method === 'GET') {
          return { data: instances };
        }
        if (method === 'POST') {
          const body = typeof reqOptions.body === 'string' ? JSON.parse(reqOptions.body) : reqOptions.body;
          const newInstance = {
            id: `inst-${Date.now()}`,
            companyId: 'comp-1',
            templateId: body.templateId,
            title: body.title,
            status: 'Draft',
            currentStepId: null,
            steps: [],
          };
          instances.push(newInstance);
          return { data: newInstance };
        }
      }

      const parts = cleanUrl.split('/');
      const instanceId = parts[1]?.split('?')[0];
      const instIndex = instances.findIndex((i) => i.id === instanceId);
      if (instIndex === -1) {
        const err = new Error('Instance not found');
        err.status = 404;
        throw err;
      }

      if (method === 'GET') {
        return { data: instances[instIndex] };
      }
      if (method === 'PATCH') {
        const body = typeof reqOptions.body === 'string' ? JSON.parse(reqOptions.body) : reqOptions.body;
        instances[instIndex] = { ...instances[instIndex], ...body };
        return { data: instances[instIndex] };
      }
      if (method === 'DELETE') {
        instances.splice(instIndex, 1);
        return { success: true };
      }
    }

    // 3. Process Steps & Action Routes
    if (cleanUrl.startsWith('process-instance-steps/')) {
      const parts = cleanUrl.split('/');
      const stepId = parts[1];
      if (parts[2] === 'action' && method === 'PATCH') {
        const body = typeof reqOptions.body === 'string' ? JSON.parse(reqOptions.body) : reqOptions.body;
        return {
          data: {
            id: stepId,
            status: body.status || 'Approved',
            actionedAt: new Date().toISOString(),
          },
        };
      }
    }

    const unhandled = new Error(`Unhandled mock route: ${method} ${endpoint}`);
    unhandled.status = 404;
    throw unhandled;
  };
}


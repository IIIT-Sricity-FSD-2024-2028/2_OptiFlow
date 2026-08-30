// js/data/pm-data-store.js
// ─────────────────────────────────────────────────────────────
// All reads delegate to window.Helpers.getState() for centralized
// snake_case → camelCase mapping. All IDs sent to the API are
// pure integers (no 'u' or 'EMP-' prefixes).
// ─────────────────────────────────────────────────────────────
(function (global) {
  "use strict";

  /** Preserve string UUIDs or numeric IDs cleanly. */
  const parseId = (id) => (id == null ? null : String(id).trim());

  async function getAllProjects() {
    try {
      const state = await window.Helpers.getState();
      return state.projects || [];
    } catch {
      return [];
    }
  }

  async function getAllTasks() {
    try {
      const state = await window.Helpers.getState();
      return state.tasks || [];
    } catch {
      return [];
    }
  }

  async function getProjectById(id) {
    try {
      const state = await window.Helpers.getState();
      const targetId = parseId(id);
      return state.projects.find(p => String(p.id || p.projectId) === targetId) || null;
    } catch {
      return null;
    }
  }

  async function getTaskById(id) {
    try {
      const state = await window.Helpers.getState();
      const targetId = parseId(id);
      return state.tasks.find(t => String(t.id || t.taskId) === targetId) || null;
    } catch {
      return null;
    }
  }

  async function addTask(payload) {
    try {
      const mapped = {
        title:           payload.title,
        projectId:       parseId(payload.projectId),
        assignedToId:    parseId(payload.assignedTo || payload.assignedToId),
        createdById:     parseId(payload.createdBy || window.Auth?.getSession()?.id),
        priority:        payload.priority   || 'Medium',
        status:          payload.status     || 'Active',
        estimatedHours: Number(payload.estimatedHours) || 0,
        dueDate:        payload.dueDate    || null,
      };
      return await window.Helpers.api.request('/tasks', 'POST', mapped);
    } catch (e) {
      console.warn("PMStore.addTask failed", e);
      throw e;
    }
  }

  async function updateTask(id, patch) {
    try {
      const targetId = parseId(id);
      return await window.Helpers.api.request(`/tasks/${targetId}`, 'PATCH', patch);
    } catch (e) {
      console.warn("PMStore.updateTask failed", e);
      throw e;
    }
  }

  async function deleteProject(id) {
    try {
      const targetId = parseId(id);
      return await window.Helpers.api.request(`/projects/${targetId}`, 'DELETE');
    } catch (e) {
      console.warn("PMStore.deleteProject failed", e);
      throw e;
    }
  }

  async function submitEvidence(payload) {
    try {
      const mapped = {
        userId:        parseId(payload.userId || window.Auth?.getSession()?.id),
        taskId:        parseId(payload.taskId),
        violationId:   parseId(payload.violationId),
        title:         payload.title       || 'Evidence',
        evidenceType:  payload.evidenceType || 'Document',
        fileUrl:       payload.fileUrl     || '',
        notes:         payload.notes       || '',
        status:        'Pending',
      };
      return await window.Helpers.api.request('/evidence', 'POST', mapped);
    } catch (e) {
      console.warn("PMStore.submitEvidence failed", e);
      throw e;
    }
  }

  const PMStore = {
    getAllProjects,
    getAllTasks,
    getProjectById,
    getTaskById,
    addTask,
    updateTask,
    deleteProject,
    submitEvidence,
  };

  global.PMStore = PMStore;
  global.initializePMDatabase = () => {};

})(window);

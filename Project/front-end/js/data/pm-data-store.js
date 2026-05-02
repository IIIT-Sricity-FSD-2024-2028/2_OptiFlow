// js/data/pm-data-store.js
// ─────────────────────────────────────────────────────────────
// All reads delegate to window.Helpers.getState() for centralized
// snake_case → camelCase mapping. All IDs sent to the API are
// pure integers (no 'u' or 'EMP-' prefixes).
// ─────────────────────────────────────────────────────────────
(function (global) {
  "use strict";

  /** Strip any non-numeric chars and parse to int. */
  const toInt = (id) => parseInt(String(id).replace(/[^0-9]/g, ''), 10);

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
      const numericId = toInt(id);
      return state.projects.find(p => p.projectId === numericId) || null;
    } catch {
      return null;
    }
  }

  async function getTaskById(id) {
    try {
      const state = await window.Helpers.getState();
      const numericId = toInt(id);
      return state.tasks.find(t => t.taskId === numericId) || null;
    } catch {
      return null;
    }
  }

  async function addTask(payload) {
    try {
      // Rule 1: All IDs must be pure integers
      const mapped = {
        title:           payload.title,
        project_id:      toInt(payload.projectId),
        assigned_to:     payload.assignedTo ? toInt(payload.assignedTo) : null,
        created_by:      payload.createdBy  ? toInt(payload.createdBy)  : 1,
        priority:        payload.priority   || 'Medium',
        status:          'Pending',           // Rule 3: exact backend enum
        estimated_hours: payload.estimatedHours || 0,
        due_date:        payload.dueDate    || null,
      };
      return await window.Helpers.api.request('/tasks', 'POST', mapped);
    } catch (e) {
      console.warn("PMStore.addTask failed", e);
      throw e;
    }
  }

  async function updateTask(id, patch) {
    try {
      const numericId = toInt(id);
      // Rule 3: normalize status enums before sending
      if (patch.status) {
        const statusMap = {
          open:        'Pending',
          in_progress: 'In_Progress',
          resolved:    'Completed',
          closed:      'Completed',
          in_review:   'In_Review',
          blocked:     'Blocked',
          cancelled:   'Cancelled',
        };
        patch.status = statusMap[patch.status.toLowerCase()] || patch.status;
      }
      return await window.Helpers.api.request(`/tasks/${numericId}`, 'PATCH', patch);
    } catch (e) {
      console.warn("PMStore.updateTask failed", e);
      throw e;
    }
  }

  async function deleteProject(id) {
    try {
      const numericId = toInt(id);
      return await window.Helpers.api.request(`/projects/${numericId}`, 'DELETE');
    } catch (e) {
      console.warn("PMStore.deleteProject failed", e);
      throw e;
    }
  }

  async function submitEvidence(payload) {
    try {
      const mapped = {
        user_id:       payload.userId      ? toInt(payload.userId)  : null,
        task_id:       payload.taskId      ? toInt(payload.taskId)  : null,
        violation_id:  payload.violationId ? toInt(payload.violationId) : null,
        title:         payload.title       || 'Evidence',
        evidence_type: payload.evidenceType || 'Document',
        file_url:      payload.fileUrl     || '',
        notes:         payload.notes       || '',
        status:        'Pending',           // Rule 3: exact backend EvidenceStatus enum
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
  global.initializePMDatabase = () => { console.log("PMStore runs on backend REST API now."); };

})(window);

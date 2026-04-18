// js/data/pm-data-store.js
(function (global) {
  "use strict";

  async function getAllProjects() {
    try {
      const projects = await window.Helpers.api.request('/projects');
      return projects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        department: p.department_id === 2 ? 'IT Security' : 'Operations',
        status: p.status
      }));
    } catch {
      return [];
    }
  }

  async function getAllTasks() {
    try {
      const tasks = await window.Helpers.api.request('/tasks');
      return tasks.map(t => ({
        id: t.id,
        projectId: t.project_id,
        title: t.title,
        assignedUserId: t.assigned_to ? `u${t.assigned_to}` : null,
        status: t.status,
        priority: t.priority
      }));
    } catch {
      return [];
    }
  }

  async function addTask(payload) {
    try {
      const mapped = {
        title: payload.title,
        project_id: payload.projectId,
        assigned_to: payload.assignedUserId ? parseInt(payload.assignedUserId.replace('u', '')) : null,
        priority: payload.priority,
        status: payload.status || 'Pending'
      };
      return await window.Helpers.api.request('/tasks', 'POST', mapped);
    } catch (e) {
      console.warn("Failed to add task", e);
    }
  }

  async function submitEvidence(payload) {
    try {
      const mapped = {
        task_id: payload.taskId,
        submitted_by: payload.submittedBy ? parseInt(payload.submittedBy.replace('u', '')) : null,
        file_url: payload.fileUrl,
        status: payload.status || 'Pending Review'
      };
      return await window.Helpers.api.request('/evidence', 'POST', mapped);
    } catch(e) {
      console.warn("Failed to submit evidence", e);
    }
  }

  const PMStore = {
    getAllProjects,
    getAllTasks,
    addTask,
    submitEvidence
  };

  global.PMStore = PMStore;
  global.initializePMDatabase = () => { console.log("PMStore runs on backend REST API now."); };

})(window);

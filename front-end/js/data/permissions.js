// js/data/permissions.js
const PERMISSIONS = {
  superuser: ["all"],
  hr_admin: ["view:employees", "crud:employees", "view:departments"],
  pm: ["crud:projects", "crud:tasks", "view:team"],
  team_leader: ["view:tasks", "crud:subtasks", "view:team"],
  compliance: ["crud:rules", "crud:violations", "view:evidence"],
  member: ["view:tasks", "update:task_status"],
};

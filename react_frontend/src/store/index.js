import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { resetStore } from "./core/resetStore";

// M1
import complianceRules from "./complianceRules";
import complianceViolations from "./complianceViolations";
import complianceCategories from "./complianceCategories";
import complianceBindings from "./complianceBindings";
import evidence from "./evidence";
import auditLogs from "./auditLogs";
import executive from "./executive";
// M2
import auth from "./auth";
import platformCompanies from "./platformCompanies";
import platformPlans from "./platformPlans";
import platformSubscriptions from "./platformSubscriptions";
import platformAdminUsers from "./platformAdminUsers";
import platformSupportAccess from "./platformSupportAccess";
import platformAuditLogs from "./platformAuditLogs";
import platformMetrics from "./platformMetrics";
// M3
import projects from "./projects";
import tasks from "./tasks";
import subtasks from "./subtasks";
import escalations from "./escalations";
// M4
import processTemplates from "./processTemplates";
import processInstances from "./processInstances";
import notifications from "./notifications";
import attachments from "./attachments";
// M5
import users from "./users";
import roles from "./roles";
import roleAssignments from "./roleAssignments";
import branches from "./branches";
import teams from "./teams";

const appReducer = combineReducers({
  complianceRules, complianceViolations, complianceCategories, complianceBindings,
  evidence, auditLogs, executive,
  auth, platformCompanies, platformPlans, platformSubscriptions,
  platformAdminUsers, platformSupportAccess, platformAuditLogs, platformMetrics,
  projects, tasks, subtasks, escalations,
  processTemplates, processInstances, notifications, attachments,
  users, roles, roleAssignments, branches, teams,
});

// Logout: passing `undefined` makes every slice return its initial state.
const rootReducer = (state, action) =>
  appReducer(action.type === resetStore.type ? undefined : state, action);

// A factory, so each test can build a fresh store.
export function makeStore(preloadedState) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefault) =>
      getDefault({
        // Upload thunks receive a File as their argument. Ignore that one path;
        // the check itself stays on.
        serializableCheck: { ignoredActionPaths: ["meta.arg"] },
      }),
    // The 403 toast listener middleware is added later with .prepend(listener.middleware).
  });
}

export const store = makeStore();
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks, selectTasksStatus, selectTasksError } from '../../../store/tasks';
import { fetchSubtasks, selectSubtasksStatus, selectSubtasksError } from '../../../store/subtasks';
import { fetchUsers, selectUsersStatus, selectUsersError } from '../../../store/users';
import { fetchProjects, selectProjectsStatus, selectProjectsError } from '../../../store/projects';
import { fetchEscalations, selectEscalationsStatus, selectEscalationsError } from '../../../store/escalations';
import { fetchEvidence, selectEvidenceStatus, selectEvidenceError } from '../../../store/evidence';
import { fetchComplianceBindings, selectComplianceBindingsStatus, selectComplianceBindingsError } from '../../../store/complianceBindings';
import { fetchComplianceViolations, selectComplianceViolationsStatus, selectComplianceViolationsError } from '../../../store/complianceViolations';

export const memberReads = {
  tasks: { action: () => fetchTasks(), status: selectTasksStatus, error: selectTasksError },
  subtasks: { action: () => fetchSubtasks(), status: selectSubtasksStatus, error: selectSubtasksError },
  users: { action: () => fetchUsers(), status: selectUsersStatus, error: selectUsersError },
  projects: { action: () => fetchProjects(), status: selectProjectsStatus, error: selectProjectsError },
  escalations: { action: () => fetchEscalations(), status: selectEscalationsStatus, error: selectEscalationsError },
  evidence: { action: () => fetchEvidence({ force: true }), status: selectEvidenceStatus, error: selectEvidenceError },
  complianceBindings: { action: () => fetchComplianceBindings({ force: true }), status: selectComplianceBindingsStatus, error: selectComplianceBindingsError },
  complianceViolations: { action: () => fetchComplianceViolations({ force: true }), status: selectComplianceViolationsStatus, error: selectComplianceViolationsError },
};

export function useMemberReads(reads) {
  const dispatch = useDispatch();
  useEffect(() => {
    for (const read of reads) dispatch(read.action());
  }, [dispatch, reads]);
  const loading = useSelector(state => reads.some(read => ['idle', 'loading'].includes(read.status(state))));
  const error = useSelector(state => reads.map(read => read.error(state)).find(Boolean)?.message);
  return { loading, error };
}

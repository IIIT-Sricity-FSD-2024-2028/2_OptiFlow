import { buildWorkSlice, createWorkAdapter } from '../work/entitySlice';
import { createProject, deleteProject, fetchProjectById, fetchProjects, updateProject } from './thunks';

export const projectsAdapter = createWorkAdapter();

const projectsSlice = buildWorkSlice({
  name: 'projects',
  adapter: projectsAdapter,
  thunks: {
    list: fetchProjects,
    getById: fetchProjectById,
    create: createProject,
    update: updateProject,
    remove: deleteProject,
  },
});

export const { clearMutation: clearProjectMutation } = projectsSlice.actions;
export default projectsSlice.reducer;

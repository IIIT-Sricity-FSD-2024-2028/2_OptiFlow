import { buildWorkSlice, createWorkAdapter } from '../work/entitySlice';
import {
  createEscalation,
  deleteEscalation,
  fetchEscalationById,
  fetchEscalations,
  updateEscalation,
} from './thunks';

export const escalationsAdapter = createWorkAdapter();

const escalationsSlice = buildWorkSlice({
  name: 'escalations',
  adapter: escalationsAdapter,
  thunks: {
    list: fetchEscalations,
    getById: fetchEscalationById,
    create: createEscalation,
    update: updateEscalation,
    remove: deleteEscalation,
  },
});

export const { clearMutation: clearEscalationMutation } = escalationsSlice.actions;
export default escalationsSlice.reducer;

// Re-export the canonical decorator from core/guards so that existing
// controller imports of this path continue to work without change.
export { Roles, ROLES_KEY } from '../guards/roles.decorator';
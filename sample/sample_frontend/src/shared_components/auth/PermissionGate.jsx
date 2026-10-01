import { useAuth } from '../../context/AuthContext';

/**
 * PermissionGate
 * ──────────────
 * Hard action suppression gate. Returns null (completely unrenders from DOM)
 * when the current user does not have the required roles or permissions.
 * 
 * Usage:
 *   <PermissionGate roles={['Project_Manager', 'Compliance_Officer']}>
 *     <ApproveButton />
 *   </PermissionGate>
 *
 *   <PermissionGate permissions={['approve', 'reject']}>
 *     <ActionBar />
 *   </PermissionGate>
 *
 *   <PermissionGate roles={['SuperUser']} fallback={<p>Access denied</p>}>
 *     <AdminPanel />
 *   </PermissionGate>
 */
export default function PermissionGate({ children, roles = [], permissions = [], requireAll = false, fallback = null }) {
  const { hasRole, hasPermission } = useAuth();

  const roleAllowed = roles.length === 0 || (requireAll ? roles.every(r => hasRole(r)) : roles.some(r => hasRole(r)));
  const permAllowed = permissions.length === 0 || (requireAll ? permissions.every(p => hasPermission(p)) : permissions.some(p => hasPermission(p)));

  if (!roleAllowed || !permAllowed) {
    return fallback;
  }

  return children;
}

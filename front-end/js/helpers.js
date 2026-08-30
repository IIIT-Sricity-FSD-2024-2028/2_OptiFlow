/**
 * updateSidebar
 * ─────────────
 * Dynamically hides or shows sidebar navigation items based on the logged-in
 * user's role and the 'data-allowed-roles' attribute on DOM elements.
 */
function updateSidebar() {
    const currentUserStr = sessionStorage.getItem('currentUser');
    if (!currentUserStr) return; 

    const currentUser = JSON.parse(currentUserStr);
    
    // Attempt to read the canonical role label first, fallback to slugs/IDs
    const userRole = currentUser.roleLabel || currentUser.assignedRole || currentUser.role || currentUser.roleId || currentUser.roleSlug || '';
    const normalizedUserRole = String(userRole || '').trim().toLowerCase();
    
    // Select all elements that declare role restrictions
    const restrictedItems = document.querySelectorAll('[data-allowed-roles]');
    
    restrictedItems.forEach(item => {
        const allowedRolesAttr = item.getAttribute('data-allowed-roles');
        if (!allowedRolesAttr) return; 
        
        // Split by comma and normalize each allowed role
        const allowedRoles = allowedRolesAttr.split(',').map(role => role.trim().toLowerCase());
        
        // Strictly segregate System Admin vs Company Owner vs others
        const isSystemAdmin = normalizedUserRole === 'system admin' || normalizedUserRole === 'system_admin';
        const isCompanyOwner = normalizedUserRole === 'company owner' || normalizedUserRole === 'company_owner' || normalizedUserRole === 'superuser';
        const isAdminConsolePage = window.location.pathname.toLowerCase().includes('/admin-console/');

        // Block non–System Admin from Admin Console pages
        if (isAdminConsolePage && !isSystemAdmin) {
            window.location.href = '../superuser/dashboard.html';
            return;
        }
        
        let shouldHide = false;
        if (isSystemAdmin) {
            if (!allowedRoles.includes('system admin') && !allowedRoles.includes('system_admin')) {
                shouldHide = true;
            }
        } else if (isCompanyOwner) {
            if (!allowedRoles.includes('company owner') && !allowedRoles.includes('company_owner') && !allowedRoles.includes('superuser')) {
                shouldHide = true;
            }
        } else {
            if (!allowedRoles.includes(normalizedUserRole)) {
                shouldHide = true;
            }
        }
        
        if (shouldHide) {
            item.style.display = 'none';
        } else {
            item.style.display = ''; // Reset to default display
        }
    });
}

// Automatically run on page load
document.addEventListener('DOMContentLoaded', updateSidebar);

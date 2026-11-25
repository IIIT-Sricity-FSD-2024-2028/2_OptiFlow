export function resolveTeamLead(user, allUsers = []) {
  if (!user && (!allUsers || allUsers.length === 0)) {
    return { fullName: 'Team Lead' };
  }

  const currentUserId = String(user?.id || user?.userId || '');
  const selfUser = allUsers.find(
    (u) => String(u.id || u.userId) === currentUserId || (user?.email && u.email?.toLowerCase() === user.email?.toLowerCase())
  );

  const managerId = selfUser?.managerUserId || selfUser?.manager?.id || user?.managerUserId;
  let myLeader = null;
  if (managerId) {
    myLeader = allUsers.find((u) => String(u.id || u.userId) === String(managerId));
  }
  if (!myLeader && selfUser?.manager) {
    myLeader = selfUser.manager;
  }

  if (!myLeader) {
    myLeader = allUsers.find((u) => {
      const r = String(u.role || u.roleName || u.roleLabel || u.roleSlug || u.jobTitle || '').toLowerCase();
      return r.includes('team_lead') || r.includes('team_leader') || r.includes('lead');
    });
  }

  return myLeader || { fullName: 'Team Lead' };
}

/**
 * Safe list unwrapping for API responses and TM/TL task filters (post–getState shapes).
 * Include before helpers.js on enduser dashboards that need TasksStore filters.
 */
(function defineTasksStore(global) {
  function unwrapApiList(res) {
    let v = res;
    if (v && !Array.isArray(v) && typeof v === "object" && Array.isArray(v.data)) {
      v = v.data;
    }
    return Array.isArray(v) ? v : [];
  }

  function parseUserId(sessionLike) {
    if (sessionLike == null) return null;
    return String(sessionLike.id ?? sessionLike.user_id ?? sessionLike.userId ?? "").trim() || null;
  }

  /** TM execution: tasks assigned to this user (supports UUID & numeric strings). */
  function filterExecutionTasksForMember(tasks, userId) {
    const targetId = String(userId || "").trim();
    if (!targetId) return [];
    return (tasks || []).filter((t) => {
      const assignee = String(t.assignedToId || t.assignedTo || t.assigned_to || "").trim();
      return assignee === targetId;
    });
  }

  /** Direct report user ids for a team leader (supports UUID & numeric strings). */
  function teamMemberUserIds(users, tlUserId) {
    const targetTlId = String(tlUserId || "").trim();
    if (!targetTlId) return [];
    return (users || [])
      .filter((u) => {
        const mgr = String(u.managerUserId || u.managerId || u.reportsTo || u.manager_id || "").trim();
        return mgr === targetTlId;
      })
      .map((u) => String(u.userId || u.id).trim())
      .filter(Boolean);
  }

  /** Tasks assigned to anyone on the TL’s team (direct reports). */
  function filterTeamOverviewTasksForLeader(tasks, teamMemberIds) {
    const idSet = new Set((teamMemberIds || []).map((id) => String(id).trim()));
    return (tasks || []).filter((t) => {
      const assignee = String(t.assignedToId || t.assignedTo || t.assigned_to || "").trim();
      return idSet.has(assignee);
    });
  }

  /** Tasks team members submitted for TL approval (modern + legacy statuses). */
  function filterReviewQueueForLeader(tasks, teamMemberIds) {
    const review = new Set(["In_Review", "Pending_TL_Review"]);
    return filterTeamOverviewTasksForLeader(tasks, teamMemberIds).filter((t) =>
      review.has(String(t.status)),
    );
  }

  /** Parse IDs from string/UUID or numeric values without stripping non-digits. */
  function strictId(value) {
    if (value == null) return null;
    const str = String(value).trim();
    return str || null;
  }

  global.TasksStore = {
    unwrapApiList,
    parseUserId,
    parseNumericUserId: parseUserId,
    strictNumericId: strictId,
    strictId,
    filterExecutionTasksForMember,
    teamMemberUserIds,
    filterTeamOverviewTasksForLeader,
    filterReviewQueueForLeader,
  };
})(typeof window !== "undefined" ? window : globalThis);

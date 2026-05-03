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

  function parseNumericUserId(sessionLike) {
    if (sessionLike == null) return null;
    if (typeof sessionLike.rawId === "number" && Number.isFinite(sessionLike.rawId)) {
      return sessionLike.rawId;
    }
    const id =
      sessionLike.id !== undefined
        ? sessionLike.id
        : sessionLike.user_id !== undefined
          ? sessionLike.user_id
          : sessionLike.userId;
    if (typeof id === "number" && Number.isFinite(id)) return id;
    if (typeof id === "string" && /^\d+$/.test(String(id).trim())) return parseInt(id, 10);
    const digits = parseInt(String(id).replace(/\D/g, ""), 10);
    return Number.isFinite(digits) ? digits : null;
  }

  /** TM execution: only tasks strictly assigned to this user (integer id). */
  function filterExecutionTasksForMember(tasks, userId) {
    const uid = typeof userId === "number" ? userId : parseNumericUserId({ id: userId });
    if (!Number.isFinite(uid)) return [];
    return (tasks || []).filter((t) => Number(t.assignedTo) === uid);
  }

  /** Direct report user ids for a team leader (integer manager_id). */
  function teamMemberUserIds(users, tlNumericId) {
    const tl = Number(tlNumericId);
    if (!Number.isFinite(tl)) return [];
    return (users || [])
      .filter((u) => Number(u.managerId) === tl)
      .map((u) => Number(u.userId))
      .filter(Number.isFinite);
  }

  /** Tasks assigned to anyone on the TL’s team (direct reports). */
  function filterTeamOverviewTasksForLeader(tasks, teamMemberIds) {
    const idSet = new Set(teamMemberIds || []);
    return (tasks || []).filter((t) => idSet.has(Number(t.assignedTo)));
  }

  /** Tasks team members submitted for TL approval (modern + legacy statuses). */
  function filterReviewQueueForLeader(tasks, teamMemberIds) {
    const review = new Set(["In_Review", "Pending_TL_Review"]);
    return filterTeamOverviewTasksForLeader(tasks, teamMemberIds).filter((t) =>
      review.has(String(t.status)),
    );
  }

  /** Parse IDs from mixed formats (handles "u5", CSV noise) — digits only via regex. */
  function strictNumericId(value) {
    const n = parseInt(String(value == null ? "" : value).replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  global.TasksStore = {
    unwrapApiList,
    parseNumericUserId,
    strictNumericId,
    filterExecutionTasksForMember,
    teamMemberUserIds,
    filterTeamOverviewTasksForLeader,
    filterReviewQueueForLeader,
  };
})(typeof window !== "undefined" ? window : globalThis);

// Shared utility functions and role matrices for OptiFlow Org Chart & Threaded Hierarchy

export const ROLE_RANK = {
  company_owner: 0,
  superuser: 0,
  system_admin: 0,
  hr_manager: 1,
  access_governance: 1,
  compliance_officer: 1,
  process_admin: 1,
  branch_manager: 1,
  project_manager: 2,
  team_lead: 3,
  team_leader: 3,
  team_member: 4,
};


// FAANG-level tier chips (Executive, Admin, Lead, Member, etc.)
export const ROLE_LEVEL_LABELS = {
  company_owner: "Executive",
  superuser: "Admin",
  system_admin: "Admin",
  hr_manager: "People Ops",
  access_governance: "Governance",
  compliance_officer: "Compliance",
  process_admin: "Operations",
  branch_manager: "Director",
  project_manager: "PM Lead",
  team_lead: "Team Lead",
  team_leader: "Team Lead",
  team_member: "Member",
};

export const ROLE_BADGE_STYLES = {
  company_owner: "bg-slate-900 text-white border-slate-700",
  superuser: "bg-slate-800 text-slate-100 border-slate-700",
  system_admin: "bg-slate-800 text-slate-100 border-slate-700",
  hr_manager: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  access_governance: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  compliance_officer: "bg-rose-50 text-rose-700 border-rose-200/80",
  process_admin: "bg-amber-50 text-amber-700 border-amber-200/80",
  branch_manager: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  project_manager: "bg-blue-50 text-blue-700 border-blue-200/80",
  team_lead: "bg-purple-50 text-purple-700 border-purple-200/80",
  team_leader: "bg-purple-50 text-purple-700 border-purple-200/80",
  team_member: "bg-slate-100 text-slate-700 border-slate-200/80",
};

export const AVATAR_PALETTE = [
  "#2563eb", // blue-600
  "#0f172a", // slate-900
  "#059669", // emerald-600
  "#7c3aed", // violet-600
  "#0891b2", // cyan-600
  "#d97706", // amber-600
  "#475569", // slate-600
  "#dc2626", // red-600
];

export function getAvatarColor(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function getInitials(name = "") {
  return (
    name
      .split(" ")
      .map((n) => n[0] || "")
      .join("")
      .substring(0, 2)
      .toUpperCase() || "??"
  );
}

/**
 * Resolves accurate functional corporate job titles based on role, squad affiliation, and explicit titles.
 * Eliminates generic "Team Member / Team Member" repetition.
 */
export function resolveFunctionalTitle(user, roleSlug, teamName) {
  const customTitle = (user.jobTitle || "").trim();
  if (
    customTitle &&
    !customTitle.toLowerCase().includes("team member") &&
    !customTitle.toLowerCase().includes("personnel")
  ) {
    return customTitle;
  }

  const nameLower = (user.fullName || user.name || "").toLowerCase();
  const emailLower = (user.email || "").toLowerCase();

  // Executive tier
  if (roleSlug === "company_owner") {
    if (nameLower.includes("alice") || emailLower.includes("ceo") || nameLower.includes("ceo")) {
      return "Chief Executive Officer";
    }
    if (nameLower.includes("victor")) {
      return "Chief Technology Officer";
    }
    return "Executive Director";
  }

  if (roleSlug === "system_admin" || roleSlug === "superuser") {
    return "Infrastructure & Systems Engineer";
  }

  if (roleSlug === "hr_manager" || roleSlug === "access_governance") {
    return "People Operations Manager";
  }

  if (roleSlug === "compliance_officer") {
    return "Risk & Compliance Specialist";
  }

  if (roleSlug === "process_admin") {
    return "Process Automation Specialist";
  }

  if (roleSlug === "branch_manager") {
    return "Regional Branch Director";
  }

  if (roleSlug === "project_manager") {
    return "Technical Project Manager";
  }

  if (roleSlug === "team_lead" || roleSlug === "team_leader") {
    if (teamName?.toLowerCase().includes("engineering")) {
      return "Engineering Team Lead";
    }
    if (teamName?.toLowerCase().includes("sales") || teamName?.toLowerCase().includes("operations")) {
      return "Operations Team Lead";
    }
    return "Squad Team Lead";
  }

  // team_member (Individual contributors)
  if (teamName?.toLowerCase().includes("engineering")) {
    return "Software Engineer";
  }
  if (teamName?.toLowerCase().includes("sales") || teamName?.toLowerCase().includes("operations")) {
    return "Operations Specialist";
  }
  if (teamName?.toLowerCase().includes("support") || teamName?.toLowerCase().includes("admin")) {
    return "Support Analyst";
  }

  return "Associate Specialist";
}

/**
 * Normalizes user objects from Express backend into uniform hierarchy nodes.
 * Accurately extracts `managerUserId` and primary role slug from `roleAssignments`.
 */
export function normalizeEmployees(users = [], teams = []) {
  return users.map((u) => {
    // 1. Role Resolution
    const primaryRole = u.roleAssignments?.[0]?.role;
    const rawRole =
      primaryRole?.name ||
      primaryRole?.label ||
      u.roleName ||
      u.roleSlug ||
      u.role ||
      "team_member";
    const roleSlug = rawRole.toLowerCase().replace(/[\s-]+/g, "_");

    // 2. Team & Branch Affiliation
    const teamAffiliation = u.teamMembers?.[0]?.team;
    const teamId = teamAffiliation?.id || null;
    const teamName = teamAffiliation?.name || null;
    const branchName =
      teamAffiliation?.branch?.name || u.branch?.name || null;
    const branchId = teamAffiliation?.branch?.id || u.branchId || null;

    // 3. Manager ID Resolution (Express/Prisma returns managerUserId or manager.id)
    let managerId = u.managerUserId || u.managerId || u.manager?.id || null;
    if (managerId) managerId = String(managerId);

    // Fallback: If an unassigned team member lacks managerId, associate with team leader
    if (!managerId && teamId) {
      const matchedTeam = teams.find((t) => t.id === teamId);
      if (matchedTeam && Array.isArray(matchedTeam.teamMembers)) {
        const lead = matchedTeam.teamMembers.find(
          (tm) =>
            tm.role?.toLowerCase() === "lead" ||
            tm.roleInTeam?.toLowerCase() === "lead" ||
            tm.user?.roleAssignments?.[0]?.role?.name === "team_lead" ||
            tm.user?.roleAssignments?.[0]?.role?.name === "team_leader"
        );
        if (lead && lead.userId && String(lead.userId) !== String(u.id)) {
          managerId = String(lead.userId);
        }
      }
    }

    const functionalTitle = resolveFunctionalTitle(u, roleSlug, teamName);
    const roleLevel = ROLE_LEVEL_LABELS[roleSlug] || "Member";

    const name = u.fullName || u.name || "Unknown";
    const initials = getInitials(name);
    const avatarColor = getAvatarColor(name);
    const avatarUrl = u.avatar || u.profilePicture || u.avatarUrl || null;

    return {
      id: String(u.id),
      name,
      email: u.email || "",
      jobTitle: functionalTitle,
      roleLevel,
      roleSlug,
      role: roleLevel,
      rank: ROLE_RANK[roleSlug] ?? 4,
      managerId,
      teamId,
      teamName,
      branchId,
      branchName,
      isActive: u.isActive !== false,
      initials,
      avatarColor,
      avatarUrl,
      raw: u,
      children: [],
    };
  });
}

/**
 * Builds recursive organizational tree from normalized employees with cycle detection.
 * Returns root nodes (CEO / Company Owner / highest rank) and any detached nodes.
 */
export function buildHierarchy(employees = []) {
  if (!employees.length) return { rootNodes: [], independentNodes: [] };

  // Clone objects so we do not mutate across re-renders
  const byId = new Map(
    employees.map((e) => [String(e.id), { ...e, children: [] }])
  );

  const roots = [];
  const unattached = [];

  // Pass 1: Attach children to parents inside this filtered scope
  byId.forEach((node) => {
    const parentId = node.managerId ? String(node.managerId) : null;
    if (parentId && byId.has(parentId) && parentId !== node.id) {
      byId.get(parentId).children.push(node);
    } else if (node.rank <= 1 || !parentId) {
      // Top executives or anyone without a manager within scope
      roots.push(node);
    } else {
      unattached.push(node);
    }
  });

  // Pass 2: Break cyclic references
  function breakCycles(node, ancestors = new Set()) {
    ancestors.add(node.id);
    node.children = (node.children || []).filter((child) => {
      if (ancestors.has(child.id)) {
        console.warn(`[OrgTree] Cycle detected & severed: ${node.name} -> ${child.name}`);
        return false;
      }
      breakCycles(child, new Set(ancestors));
      return true;
    });

    // Sort children by rank (higher rank first) then name
    node.children.sort((a, b) => {
      if ((a.rank ?? 4) !== (b.rank ?? 4)) {
        return (a.rank ?? 4) - (b.rank ?? 4);
      }
      return a.name.localeCompare(b.name);
    });
  }

  // Pass 3: If no executive root found (circular island), promote highest rank
  if (roots.length === 0 && byId.size > 0) {
    const candidates = Array.from(byId.values()).sort(
      (a, b) => (a.rank ?? 4) - (b.rank ?? 4)
    );
    if (candidates[0]) roots.push(candidates[0]);
  }

  roots.forEach((r) => breakCycles(r));
  roots.sort((a, b) => {
    if ((a.rank ?? 4) !== (b.rank ?? 4)) {
      return (a.rank ?? 4) - (b.rank ?? 4);
    }
    return a.name.localeCompare(b.name);
  });

  return { rootNodes: roots, independentNodes: unattached };
}

/**
 * Calculates total direct + indirect reports count under a node.
 */
export function countDescendants(node) {
  if (!node.children || node.children.length === 0) return 0;
  return (
    node.children.length +
    node.children.reduce((acc, child) => acc + countDescendants(child), 0)
  );
}

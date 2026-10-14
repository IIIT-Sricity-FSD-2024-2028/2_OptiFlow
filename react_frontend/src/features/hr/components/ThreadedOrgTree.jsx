import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Building2,
  Users,
  ChevronsDown,
  ChevronsUp,
  User,
} from "lucide-react";
import styles from "./ThreadedOrgTree.module.css";
import { PATHS } from "../../../app/paths";
import {
  normalizeEmployees,
  buildHierarchy,
  countDescendants,
  ROLE_BADGE_STYLES,
} from "./orgTreeUtils";

function matchesFilter(node, query) {
  if (!query) return false;
  const q = query.toLowerCase();
  return (
    node.name.toLowerCase().includes(q) ||
    node.email.toLowerCase().includes(q) ||
    node.role.toLowerCase().includes(q) ||
    (node.teamName && node.teamName.toLowerCase().includes(q)) ||
    (node.branchName && node.branchName.toLowerCase().includes(q)) ||
    (node.jobTitle && node.jobTitle.toLowerCase().includes(q))
  );
}

function hasMatchingDescendant(node, query) {
  if (!query) return false;
  if (matchesFilter(node, query)) return true;
  return (node.children || []).some((child) =>
    hasMatchingDescendant(child, query)
  );
}

function ThreadCommentNode({
  node,
  depth = 0,
  searchQuery,
  onSelectUser,
  globalExpandState,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (globalExpandState === "all_expanded") {
      setIsCollapsed(false);
    } else if (globalExpandState === "all_collapsed") {
      setIsCollapsed(depth > 0);
    }
  }, [globalExpandState, depth]);

  const descendantMatch = useMemo(() => {
    return searchQuery ? hasMatchingDescendant(node, searchQuery) : false;
  }, [node, searchQuery]);

  useEffect(() => {
    if (searchQuery && descendantMatch) {
      setIsCollapsed(false);
    }
  }, [searchQuery, descendantMatch]);

  const isSelfMatch = searchQuery ? matchesFilter(node, searchQuery) : false;
  const directReports = node.children ? node.children.length : 0;
  const totalReports = useMemo(() => countDescendants(node), [node]);

  const badgeStyle =
    ROLE_BADGE_STYLES[node.roleSlug] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className={styles.threadItem}>
      {isCollapsed && directReports > 0 ? (
        <div
          className={styles.collapsedBar}
          onClick={() => setIsCollapsed(false)}
          title="Click to expand branch"
        >
          <span className={styles.toggleBtn}>+</span>
          <div
            className={styles.avatar}
            style={{ backgroundColor: node.avatarColor }}
          >
            {node.avatarUrl ? (
              <img
                src={node.avatarUrl}
                alt={node.name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <User className="w-3 h-3 text-white" />
            )}
          </div>
          <span className="font-semibold text-slate-900 text-xs">{node.name}</span>
          <span className={`${styles.roleBadge} ${badgeStyle}`}>{node.roleLevel}</span>
          <span className="text-xs text-slate-500">{node.jobTitle}</span>
          {node.branchName && (
            <span className={styles.branchBadge}>
              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
              {node.branchName}
            </span>
          )}
          <span className="text-xs text-slate-400">
            — {directReports} direct ({totalReports} total) hidden
          </span>
        </div>
      ) : (
        <div
          className={`${styles.commentRow} ${
            isSelfMatch ? styles.commentRowHighlighted : ""
          }`}
        >
          <div className={styles.commentLeft}>
            {directReports > 0 ? (
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className={styles.toggleBtn}
                title="Collapse branch"
              >
                −
              </button>
            ) : (
              <span className={styles.leafDot} />
            )}

            <div
              className={styles.avatar}
              style={{ backgroundColor: node.avatarColor }}
              title={node.name}
              onClick={() => onSelectUser(node.id)}
            >
              {node.avatarUrl ? (
                <img
                  src={node.avatarUrl}
                  alt={node.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-white" />
              )}
            </div>

            <div className={styles.personStack}>
              {/* Line 1: Primary Identity & Distinct Badges */}
              <div className={styles.linePrimary}>
                <div className={styles.userNameWrapper}>
                  <span
                    onClick={() => onSelectUser(node.id)}
                    className={styles.userName}
                    title={node.email || node.name}
                  >
                    {node.name}
                  </span>
                  {node.email && (
                    <span className={styles.emailTooltip}>{node.email}</span>
                  )}
                </div>

                <span className={`${styles.roleBadge} ${badgeStyle}`}>
                  {node.roleLevel}
                </span>

                {node.teamName && (
                  <span className={styles.squadBadge}>
                    {node.teamName}
                  </span>
                )}

                {node.branchName && (
                  <span className={styles.branchBadge}>
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    {node.branchName}
                  </span>
                )}
              </div>

              {/* Line 2: Professional Designation & Context */}
              <div className={styles.lineSecondary}>
                <span className={styles.jobTitle}>{node.jobTitle}</span>
              </div>
            </div>
          </div>

          <div className={styles.commentRight}>
            {directReports > 0 && (
              <span className={styles.reportsBadge}>
                {directReports} {directReports === 1 ? "report" : "reports"}
                {totalReports > directReports && (
                  <span className="text-slate-400 font-normal"> ({totalReports} total)</span>
                )}
              </span>
            )}

            <button
              type="button"
              onClick={() => onSelectUser(node.id)}
              className={styles.profileAction}
              title="View employee profile"
            >
              <span className="inline-flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>Profile &rarr;</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Children replies */}
      {!isCollapsed && directReports > 0 && (
        <div className={styles.repliesContainer}>
          {node.children.map((child) => (
            <ThreadCommentNode
              key={child.id}
              node={child}
              depth={depth + 1}
              searchQuery={searchQuery}
              onSelectUser={onSelectUser}
              globalExpandState={globalExpandState}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ThreadedOrgTree({ users = [], branches = [], teams = [] }) {
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [globalExpandState, setGlobalExpandState] = useState("all_expanded");

  const normalizedEmployees = useMemo(() => {
    return normalizeEmployees(users, teams);
  }, [users, teams]);

  const filteredEmployees = useMemo(() => {
    if (selectedBranch === "all") return normalizedEmployees;
    return normalizedEmployees.filter(
      (e) => e.branchId === selectedBranch || e.branchName === selectedBranch
    );
  }, [normalizedEmployees, selectedBranch]);

  const { rootNodes, independentNodes } = useMemo(() => {
    return buildHierarchy(filteredEmployees);
  }, [filteredEmployees]);

  const handleSelectUser = (userId) => {
    navigate(PATHS.HR.USER_DETAIL.replace(":id", userId));
  };

  return (
    <div className={styles.container}>
      {/* High-Density Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className={styles.branchSelect}
            >
              <option value="all">All Regional Branches ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.searchBox}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search personnel, role, squad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        <div className={styles.toolbarRight}>
          <span className="text-xs text-slate-500 font-medium">
            Workforce: <strong className="text-slate-900 font-semibold">{filteredEmployees.length}</strong>
          </span>

          <button
            type="button"
            onClick={() => setGlobalExpandState("all_expanded")}
            className={styles.toolbarBtn}
            title="Expand All"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
            Expand All
          </button>

          <button
            type="button"
            onClick={() => setGlobalExpandState("all_collapsed")}
            className={styles.toolbarBtn}
            title="Collapse Subtrees"
          >
            <ChevronsUp className="w-3.5 h-3.5" />
            Collapse All
          </button>
        </div>
      </div>

      {/* Reddit Comment Thread Canvas */}
      <div className={styles.threadCanvas}>
        {rootNodes.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <span className="text-sm font-medium">No personnel found for this filter</span>
          </div>
        ) : (
          rootNodes.map((root) => (
            <ThreadCommentNode
              key={root.id}
              node={root}
              depth={0}
              searchQuery={searchQuery}
              onSelectUser={handleSelectUser}
              globalExpandState={globalExpandState}
            />
          ))
        )}

        {/* Independent specialists without manager */}
        {independentNodes.length > 0 && (
          <div className={styles.indieSection}>
            <div className={styles.indieTitle}>
              Independent Personnel ({independentNodes.length})
            </div>
            {independentNodes.map((node) => {
              const badgeStyle =
                ROLE_BADGE_STYLES[node.roleSlug] || "bg-slate-100 text-slate-700 border-slate-200";
              return (
                <div key={node.id} className={styles.commentRow}>
                  <div className={styles.commentLeft}>
                    <span className={styles.leafDot} />
                    <div
                      className={styles.avatar}
                      style={{ backgroundColor: node.avatarColor }}
                      title={node.name}
                      onClick={() => handleSelectUser(node.id)}
                    >
                      {node.avatarUrl ? (
                        <img
                          src={node.avatarUrl}
                          alt={node.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <div className={styles.personStack}>
                      <div className={styles.linePrimary}>
                        <div className={styles.userNameWrapper}>
                          <span
                            onClick={() => handleSelectUser(node.id)}
                            className={styles.userName}
                            title={node.email || node.name}
                          >
                            {node.name}
                          </span>
                          {node.email && (
                            <span className={styles.emailTooltip}>{node.email}</span>
                          )}
                        </div>
                        <span className={`${styles.roleBadge} ${badgeStyle}`}>
                          {node.roleLevel}
                        </span>
                        {node.teamName && (
                          <span className={styles.squadBadge}>{node.teamName}</span>
                        )}
                        {node.branchName && (
                          <span className={styles.branchBadge}>
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            {node.branchName}
                          </span>
                        )}
                      </div>
                      <div className={styles.lineSecondary}>
                        <span className={styles.jobTitle}>{node.jobTitle}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.commentRight}>
                    <button
                      type="button"
                      onClick={() => handleSelectUser(node.id)}
                      className={styles.profileAction}
                      title="View employee profile"
                    >
                      Profile &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ThreadedOrgTree;

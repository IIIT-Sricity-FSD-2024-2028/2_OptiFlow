import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ZoomIn, ZoomOut, Building2, Users, User } from "lucide-react";
import styles from "./OrgTree.module.css";
import { PATHS } from "../../../app/paths";
import {
  normalizeEmployees,
  buildHierarchy,
  ROLE_BADGE_STYLES,
} from "./orgTreeUtils";

// Recursive Tree Node Renderer
function TreeNode({ node, isRoot = false, onSelectUser }) {
  const badgeClass =
    ROLE_BADGE_STYLES[node.roleSlug] || "bg-slate-100 text-slate-700 border-slate-200";

  const directReports = node.children ? node.children.length : 0;

  return (
    <div className={styles.treeNode}>
      <div className={styles.nodeCardWrap}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectUser(node.id)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectUser(node.id)}
          className={`${styles.empCard} ${isRoot ? styles.empCardRoot : ""}`}
          title={`Click to view ${node.name}'s profile`}
        >
          <span className={styles.profileCornerIcon} title="View employee profile">
            <User className="w-3.5 h-3.5" />
          </span>
          <div
            className={styles.cardAvatar}
            style={{ backgroundColor: node.avatarColor }}
          >
            {node.avatarUrl ? (
              <img
                src={node.avatarUrl}
                alt={node.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>
          <div className={styles.cardName}>{node.name}</div>
          <div className={styles.cardTeam}>
            {node.jobTitle}
          </div>
          <span className={`${styles.cardRoleBadge} ${badgeClass}`}>
            {node.teamName || node.roleLevel}
          </span>
          {directReports > 0 && (
            <div>
              <span className={styles.cardReportsCount}>
                <Users className="w-2.5 h-2.5" />
                {directReports} {directReports === 1 ? "report" : "reports"}
              </span>
            </div>
          )}
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <ul className={styles.treeChildren}>
          {node.children.map((child) => (
            <li key={child.id}>
              <TreeNode
                node={child}
                isRoot={false}
                onSelectUser={onSelectUser}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OrgTree({ users = [], branches = [], teams = [] }) {
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [zoomLevel, setZoomLevel] = useState(1);

  // 1. Normalize employees with proper managerUserId & roleAssignments mapping
  const normalizedEmployees = useMemo(() => {
    return normalizeEmployees(users, teams);
  }, [users, teams]);

  // 2. Filter employees by branch
  const filteredEmployees = useMemo(() => {
    if (selectedBranch === "all") return normalizedEmployees;
    return normalizedEmployees.filter(
      (e) => e.branchId === selectedBranch || e.branchName === selectedBranch
    );
  }, [normalizedEmployees, selectedBranch]);

  // 3. Construct Org Tree with cycle prevention
  const { rootNodes, independentNodes } = useMemo(() => {
    return buildHierarchy(filteredEmployees);
  }, [filteredEmployees]);

  const handleSelectUser = (userId) => {
    navigate(PATHS.HR.USER_DETAIL.replace(":id", userId));
  };

  return (
    <div className="space-y-4">
      {/* Org Tree Toolbar: Macro Scoping & Canvas Controls */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Branch Scope Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="all">All Regional Branches ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Headcount Telemetry & Canvas Zoom Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500">
            Headcount:{" "}
            <strong className="text-slate-900 font-semibold">
              {filteredEmployees.length}
            </strong>{" "}
            active
          </span>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.6, Math.round((z - 0.1) * 10) / 10))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="px-2 py-0.5 text-[11px] font-mono text-slate-600 hover:text-slate-900 rounded"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.4, Math.round((z + 0.1) * 10) / 10))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Org Chart Tree Container */}
      <div className={styles.treeScrollWrapper}>
        {rootNodes.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">
              No Employees in Hierarchy
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select another branch filter or onboard personnel with designated reporting leads.
            </p>
          </div>
        ) : (
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
          >
            {/* Primary Stem Branches */}
            <div className={styles.treeRoot}>
              {rootNodes.map((root) => (
                <TreeNode
                  key={root.id}
                  node={root}
                  isRoot={true}
                  onSelectUser={handleSelectUser}
                />
              ))}
            </div>

            {/* Independent Personnel / Individual Contributors (if any) */}
            {independentNodes.length > 0 && (
              <>
                <div className={styles.indieDivider}>
                  <span>Independent & Individual Contributors ({independentNodes.length})</span>
                </div>
                <div className={styles.indieGrid}>
                  {independentNodes.map((node) => (
                    <div
                      key={node.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectUser(node.id)}
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") && handleSelectUser(node.id)
                      }
                      className={styles.empCard}
                      title={`Click to view ${node.name}'s profile`}
                    >
                      <span className={styles.profileCornerIcon} title="View employee profile">
                        <User className="w-3.5 h-3.5" />
                      </span>
                      <div
                        className={styles.cardAvatar}
                        style={{ backgroundColor: node.avatarColor }}
                      >
                        {node.avatarUrl ? (
                          <img
                            src={node.avatarUrl}
                            alt={node.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className={styles.cardName}>{node.name}</div>
                      <div className={styles.cardTeam}>
                        {node.jobTitle}
                      </div>
                      <span
                        className={`${styles.cardRoleBadge} ${
                          ROLE_BADGE_STYLES[node.roleSlug] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {node.teamName || node.roleLevel}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrgTree;

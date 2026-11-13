import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PATHS } from "../../../app/paths";
import { apiClient } from "../../../services/api/client";
import { useAuth } from "../../../context/AuthContext";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Modal } from "../../../shared/components/Modal";
import { Pagination } from "../../../shared/components/Pagination";
import { useToast } from "../../../shared/components/Toast";
import { ManageRuleScopesModal } from "../components/ManageRuleScopesModal";
import {
  Plus,
  Loader2,
  Edit2,
  BookOpen,
  Tags,
  Link2,
  Power,
  PowerOff,
  Clock,
  ShieldAlert,
  UserCheck,
  Layers,
  Building2,
  FolderGit2,
} from "lucide-react";

const PAGE_SIZE = 10;

const DEFAULT_SLA_BY_SEVERITY = {
  Critical: 4,
  High: 24,
  Medium: 72,
  Low: 168,
};

export default function ComplianceRules() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategoryId = searchParams.get("categoryId") || "ALL";
  const [activeStatus, setActiveStatus] = useState("ALL"); // "ALL" | "ACTIVE" | "INACTIVE"
  const [scopeFilter, setScopeFilter] = useState("MyRules"); // "MyRules" | "All"

  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [selectedRuleForScopes, setSelectedRuleForScopes] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    severity: "Medium",
    categoryId: "",
    assignedOfficerId: "",
    slaHours: 72,
    isActive: true,
    scopeType: "Company",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesResponse, categoriesResponse, usersResponse, projectsResponse] = await Promise.all([
        apiClient("/compliance-rules").catch(() => []),
        apiClient("/compliance-categories").catch(() => []),
        apiClient("/users").catch(() => []),
        apiClient("/projects").catch(() => []),
      ]);

      setRules(Array.isArray(rulesResponse) ? rulesResponse : []);
      const catList = Array.isArray(categoriesResponse)
        ? categoriesResponse
        : categoriesResponse?.data || [];
      setCategories(catList);
      const uList = Array.isArray(usersResponse)
        ? usersResponse
        : usersResponse?.data || [];
      setUsers(uList);
      const pList = Array.isArray(projectsResponse)
        ? projectsResponse
        : projectsResponse?.data || [];
      setProjects(pList);
    } catch (err) {
      console.error("Failed to load compliance rules and categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🟢 DYNAMIC CATEGORIES: Automatically reflects whether we are in "My Assigned Rules" or "All Rules"
  const dynamicCategories = useMemo(() => {
    if (scopeFilter === "MyRules") {
      const myCats = categories.filter((c) => (c.ownerId || c.owner?.id) === user?.id);
      return myCats.length > 0 ? myCats : categories;
    }
    return categories;
  }, [categories, scopeFilter, user?.id]);

  // If activeCategoryId is not in dynamicCategories, reset to ALL
  useEffect(() => {
    if (activeCategoryId !== "ALL") {
      const exists = dynamicCategories.some((c) => c.id === activeCategoryId);
      if (!exists) {
        setSearchParams({});
      }
    }
  }, [dynamicCategories, activeCategoryId, setSearchParams]);

  // Project map for resolving scope IDs to readable names
  const projectMap = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => map.set(String(p.id), p.name));
    return map;
  }, [projects]);

  const handleOpenCreate = () => {
    setEditingRuleId(null);
    const myCats = categories.filter((c) => (c.ownerId || c.owner?.id) === user?.id);
    const defaultCat = myCats[0]?.id || categories[0]?.id || "";

    setFormData({
      name: "",
      description: "",
      severity: "Medium",
      categoryId: activeCategoryId !== "ALL" ? activeCategoryId : defaultCat,
      assignedOfficerId: user?.id || "",
      slaHours: DEFAULT_SLA_BY_SEVERITY["Medium"] || 72,
      isActive: true,
      scopeType: "Company",
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (rule) => {
    setEditingRuleId(rule.id);
    const existingBinding =
      rule.bindings && rule.bindings.length > 0
        ? rule.bindings[0].scopeType
        : "Company";

    setFormData({
      name: rule.name,
      description: rule.description || "",
      severity: rule.severity || "Medium",
      categoryId: rule.categoryId || rule.category?.id || "",
      assignedOfficerId: rule.assignedOfficerId || rule.assignedOfficer?.id || "",
      slaHours: rule.slaHours ?? DEFAULT_SLA_BY_SEVERITY[rule.severity] ?? 72,
      isActive: rule.isActive,
      scopeType: existingBinding,
    });
    setIsOpen(true);
  };

  const handleSeverityChange = (e) => {
    const sev = e.target.value;
    const autoSla = DEFAULT_SLA_BY_SEVERITY[sev] || 72;
    setFormData((prev) => ({
      ...prev,
      severity: sev,
      slaHours: autoSla,
    }));
  };

  const handleToggleActive = async (rule) => {
    const newStatus = !rule.isActive;
    const previousRules = [...rules];

    setRules(
      rules.map((r) => (r.id === rule.id ? { ...r, isActive: newStatus } : r))
    );

    try {
      await apiClient(`/compliance-rules/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newStatus }),
      });
      toast.success(
        newStatus
          ? `Rule "${rule.name}" activated and enforcing.`
          : `Rule "${rule.name}" safely deactivated.`
      );
      fetchData();
    } catch (err) {
      setRules(previousRules);
      toast.error(`Failed to update rule status: ${err.message}`);
    }
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();

    const catObj = categories.find((c) => c.id === formData.categoryId);
    const previousRules = [...rules];
    const optimisticRule = {
      id: editingRuleId || `temp-${Date.now()}`,
      ...formData,
      category: catObj || null,
      bindings: [{ scopeType: formData.scopeType }],
    };

    if (editingRuleId) {
      setRules(rules.map((r) => (r.id === editingRuleId ? optimisticRule : r)));
    } else {
      setRules([...rules, optimisticRule]);
    }

    setIsOpen(false);

    try {
      if (editingRuleId) {
        await apiClient(`/compliance-rules/${editingRuleId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            severity: formData.severity,
            categoryId: formData.categoryId || null,
            assignedOfficerId: formData.assignedOfficerId || null,
            slaHours: Number(formData.slaHours) || 72,
            isActive: formData.isActive,
          }),
        });
      } else {
        const newRule = await apiClient("/compliance-rules", {
          method: "POST",
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            severity: formData.severity,
            categoryId: formData.categoryId || null,
            assignedOfficerId: formData.assignedOfficerId || null,
            slaHours: Number(formData.slaHours) || 72,
            isActive: formData.isActive,
          }),
        });

        await apiClient("/compliance-bindings", {
          method: "POST",
          body: JSON.stringify({
            ruleId: newRule.id,
            scopeType: formData.scopeType,
          }),
        });
      }

      fetchData();
    } catch (error) {
      setRules(previousRules);
      console.error("Failed to save rule:", error);
      toast.error("Failed to save rule: " + error.message);
    }
  };

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      // 1. Scope filter: MyRules vs All
      if (scopeFilter === "MyRules") {
        const officerId = r.assignedOfficerId || r.assignedOfficer?.id || r.category?.ownerId;
        if (officerId && officerId !== user?.id) {
          return false;
        }
      }

      // 2. Category filter
      const matchesCategory =
        activeCategoryId === "ALL" ||
        r.categoryId === activeCategoryId ||
        r.category?.id === activeCategoryId;

      // 3. Status filter
      const matchesStatus =
        activeStatus === "ALL" ||
        (activeStatus === "ACTIVE" && r.isActive) ||
        (activeStatus === "INACTIVE" && !r.isActive);

      return matchesCategory && matchesStatus;
    });
  }, [rules, scopeFilter, activeCategoryId, activeStatus, user?.id]);

  const paginatedRules = filteredRules.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const myRulesCount = rules.filter((r) => {
    const officerId = r.assignedOfficerId || r.assignedOfficer?.id || r.category?.ownerId;
    return !officerId || officerId === user?.id;
  }).length;

  // Essential columns without unnecessary column bloat
  const columns = [
    {
      header: "RULE NAME & DESCRIPTION",
      accessor: "name",
      render: (row) => (
        <div className="flex flex-col max-w-[220px]">
          <span
            onClick={() => navigate(`/compliance/rules/${row.id}`)}
            className="font-semibold text-[13px] text-blue-600 hover:text-blue-800 cursor-pointer truncate"
            title={row.name}
          >
            {row.name}
          </span>
          <span className="text-xs text-slate-500 line-clamp-1 mt-0.5" title={row.description}>
            {row.description || "No description provided"}
          </span>
        </div>
      ),
    },
    {
      header: "REGULATORY DOMAIN",
      accessor: "category",
      render: (row) => {
        const catName = row.category?.name;
        if (!catName) {
          return (
            <span className="text-xs text-gray-400 italic">Unassigned</span>
          );
        }
        return (
          <button
            onClick={() => {
              setSearchParams({
                categoryId: row.category.id,
                categoryName: catName,
              });
            }}
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer text-left"
          >
            {catName}
          </button>
        );
      },
    },
    {
      header: "ENFORCED SCOPES",
      accessor: "bindings",
      render: (row) => {
        const bindingsList = row.bindings || [];
        if (bindingsList.length === 0) {
          return (
            <button
              onClick={() => setSelectedRuleForScopes(row)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-medium transition-colors cursor-pointer"
              title="Click to attach an enforcement target"
            >
              <Plus size={11} />
              <span>Bind Scope</span>
            </button>
          );
        }

        const firstBinding = bindingsList[0];
        let label = "Company-Wide (All)";
        if (firstBinding.scopeType === "Project") {
          label = projectMap.get(firstBinding.scopeId) || `Project #${firstBinding.scopeId.substring(0, 8)}`;
        } else if (firstBinding.scopeType === "Team") {
          label = `Team #${firstBinding.scopeId.substring(0, 8)}`;
        }

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedRuleForScopes(row)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                firstBinding.scopeType === "Company"
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
              }`}
              title="Click to manage policy scopes"
            >
              {firstBinding.scopeType === "Company" ? <Building2 size={11} className="text-slate-500" /> : <FolderGit2 size={11} className="text-blue-500" />}
              <span className="truncate max-w-[120px]">{label}</span>
            </button>

            {bindingsList.length > 1 && (
              <button
                onClick={() => setSelectedRuleForScopes(row)}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                title="View all attached scopes"
              >
                +{bindingsList.length - 1}
              </button>
            )}
          </div>
        );
      },
    },
    {
      header: "OWNING OFFICER",
      accessor: "officer",
      render: (row) => {
        const officer = row.assignedOfficer || row.category?.owner;
        const isMe = officer?.id === user?.id;
        return officer ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">
              {officer.fullName || officer.email}
            </span>
            {isMe && (
              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded-full">
                You
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Global Org</span>
        );
      },
    },
    {
      header: "SEVERITY & SLA",
      accessor: "severity",
      render: (row) => {
        const colors = {
          Critical: "danger",
          High: "warning",
          Medium: "default",
          Low: "info",
        };
        const sla = row.slaHours ?? DEFAULT_SLA_BY_SEVERITY[row.severity] ?? 72;
        return (
          <div className="flex items-center gap-1.5">
            <Badge status={colors[row.severity] || "default"}>
              {row.severity}
            </Badge>
            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-0.5">
              <Clock size={11} className="text-slate-400" />
              {sla}h
            </span>
          </div>
        );
      },
    },
    {
      header: "STATUS",
      accessor: "isActive",
      render: (row) => (
        <Badge status={row.isActive ? "success" : "default"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "ACTIONS",
      accessor: "actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          {/* Compact Icon for Scope Management */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedRuleForScopes(row)}
            title="Manage Enforced Scopes"
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5"
          >
            <Link2 size={15} />
          </Button>

          {/* Toggle Power */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(row)}
            title={row.isActive ? "Deactivate Rule" : "Activate Rule"}
            className={`p-1.5 ${
              row.isActive
                ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            {row.isActive ? <PowerOff size={15} /> : <Power size={15} />}
          </Button>

          {/* Edit Rule */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row)}
            title="Edit Rule"
            className="p-1.5 text-slate-500 hover:text-slate-800"
          >
            <Edit2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Compliance Rules Engine</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure automated policy constraints, SLA thresholds, and attach scope boundaries to projects.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate} className="flex items-center gap-1.5 self-start">
          <Plus size={16} />
          <span>New Compliance Rule</span>
        </Button>
      </div>

      {/* Scope and Dynamic Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        {/* Rules Ownership Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setScopeFilter("MyRules");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              scopeFilter === "MyRules"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <UserCheck size={14} />
            <span>My Assigned Rules ({myRulesCount})</span>
          </button>

          <button
            onClick={() => {
              setScopeFilter("All");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              scopeFilter === "All"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Layers size={14} />
            <span>All Organization Rules ({rules.length})</span>
          </button>
        </div>

        {/* Dynamic Category & Status Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Automatically Dynamic Category Filter */}
          <select
            value={activeCategoryId}
            onChange={(e) => setSearchParams(e.target.value === "ALL" ? {} : { categoryId: e.target.value })}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">
              {scopeFilter === "MyRules" ? "All My Domains" : "All Company Domains"}
            </option>
            {dynamicCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={activeStatus}
            onChange={(e) => setActiveStatus(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          <Link
            to={PATHS.COMPLIANCE.CATEGORIES}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Tags size={13} className="text-slate-400" />
            <span>Domains</span>
          </Link>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            {scopeFilter === "MyRules" ? "Rules in Your Regulatory Domain" : "All Organization Rules"} ({filteredRules.length})
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {filteredRules.length} Rules Enforcing
          </span>
        </div>
        <div className="p-0">
          <Table
            columns={columns}
            data={paginatedRules}
            emptyMessage={
              scopeFilter === "MyRules"
                ? "No rules assigned to your regulatory domain. Switch to All Organization Rules to view or assign rules."
                : "No compliance rules found matching the selected criteria."
            }
          />
        </div>
        <div className="border-t border-slate-100 px-4">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredRules.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Inline Scope Management Modal */}
      <ManageRuleScopesModal
        isOpen={Boolean(selectedRuleForScopes)}
        onClose={() => setSelectedRuleForScopes(null)}
        rule={selectedRuleForScopes}
        onUpdated={fetchData}
      />

      {/* Create / Edit Rule Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingRuleId ? "Edit Compliance Rule" : "Create Compliance Rule"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRule}>
              {editingRuleId ? "Save Changes" : "Create Rule"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveRule} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Rule Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mandatory 2-Reviewer Pull Request Policy"
              className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">
                Regulatory Domain / Category *
              </label>
              <select
                required
                className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white font-medium text-slate-800"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.ownerId === user?.id ? "(Your Domain)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">
                Assigned Compliance Officer
              </label>
              <select
                className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white font-medium text-slate-800"
                value={formData.assignedOfficerId}
                onChange={(e) => setFormData({ ...formData, assignedOfficerId: e.target.value })}
              >
                <option value="">-- Category Default --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email} {u.id === user?.id ? "(You)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">
                Severity Level
              </label>
              <select
                className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                value={formData.severity}
                onChange={handleSeverityChange}
              >
                <option value="Critical">Critical (4h SLA)</option>
                <option value="High">High (24h SLA)</option>
                <option value="Medium">Medium (72h SLA)</option>
                <option value="Low">Low (168h SLA)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">
                Remediation SLA (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="720"
                className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                value={formData.slaHours}
                onChange={(e) => setFormData({ ...formData, slaHours: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Description & Remediation Guidance
            </label>
            <textarea
              rows={3}
              placeholder="What this rule enforces and what evidence or action resolves it..."
              className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <button type="submit" className="hidden">
            Submit
          </button>
        </form>
      </Modal>
    </div>
  );
}

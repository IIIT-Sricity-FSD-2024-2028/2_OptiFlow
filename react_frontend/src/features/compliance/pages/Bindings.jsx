import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { PATHS } from "../../../app/paths";
import { apiClient } from "../../../services/api/client";
import { useAuth } from "../../../context/AuthContext";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Pagination } from "../../../shared/components/Pagination";
import { CreateBindingModal } from "../components/CreateBindingModal";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { 
  Plus, 
  Loader2, 
  Link2, 
  Unlink, 
  BookOpen, 
  Tags, 
  UserCheck, 
  Layers, 
  Building2, 
  FolderGit2, 
  Info,
  Clock
} from "lucide-react";
import { useToast } from "../../../shared/components/Toast";

const PAGE_SIZE = 10;

export default function ComplianceBindings() {
  const toast = useToast();
  const { user } = useAuth();

  const [bindings, setBindings] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [bindingToUnbind, setBindingToUnbind] = useState(null);
  const [isUnbinding, setIsUnbinding] = useState(false);

  // Scope filter: "MyDomain" vs "All"
  const [scopeFilter, setScopeFilter] = useState("MyDomain");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bindingsRes, rulesRes] = await Promise.all([
        apiClient("/compliance-bindings").catch(() => []),
        apiClient("/compliance-rules").catch(() => []),
      ]);

      setBindings(Array.isArray(bindingsRes) ? bindingsRes : bindingsRes?.data || []);
      const rulesList = Array.isArray(rulesRes) ? rulesRes : rulesRes?.data || [];
      setRules(rulesList);
      if (rulesList.length > 0 && !selectedRuleId) {
        setSelectedRuleId(rulesList[0].id);
      }
    } catch (err) {
      console.error("Failed to load compliance bindings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUnbind = (binding) => {
    setBindingToUnbind(binding);
  };

  const handleConfirmUnbind = async () => {
    if (!bindingToUnbind) return;
    try {
      setIsUnbinding(true);
      await apiClient(`/compliance-bindings/${bindingToUnbind.id}`, { method: "DELETE" });
      const scopeLabel = bindingToUnbind.scopeName || (bindingToUnbind.scopeType === "Company" ? "All (Company-wide)" : bindingToUnbind.scopeId);
      toast.success(`Unbound rule from ${scopeLabel}.`);
      setBindingToUnbind(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to unbind: " + err.message);
    } finally {
      setIsUnbinding(false);
    }
  };

  // Filter bindings by domain ownership
  const filteredBindings = useMemo(() => {
    if (scopeFilter === "MyDomain") {
      return bindings.filter((b) => {
        const officerId =
          b.rule?.assignedOfficerId ||
          b.rule?.assignedOfficer?.id ||
          b.rule?.category?.ownerId;
        return !officerId || officerId === user?.id;
      });
    }
    return bindings;
  }, [bindings, scopeFilter, user?.id]);

  const columns = [
    {
      header: "ENFORCED RULE",
      accessor: "rule",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[13px] text-slate-800">
            {row.rule?.name || `Rule #${row.ruleId}`}
          </span>
          <span className="text-xs text-slate-500 line-clamp-1">
            {row.rule?.category?.name ? `Domain: ${row.rule.category.name}` : (row.rule?.description || "No description")}
          </span>
        </div>
      ),
    },
    {
      header: "TARGET / SCOPE",
      accessor: "scopeName",
      render: (row) => (
        <div className="flex items-center gap-1.5 font-medium text-[13px] text-slate-800">
          {row.scopeType === "Company" ? <Building2 size={13} className="text-slate-400" /> : <FolderGit2 size={13} className="text-blue-500" />}
          <span>{row.scopeName || (row.scopeType === "Company" ? "All (Company-wide)" : row.scopeId)}</span>
        </div>
      ),
    },
    {
      header: "SCOPE TYPE",
      accessor: "scopeType",
      render: (row) => (
        <Badge status={row.scopeType === "Company" ? "default" : "info"}>
          {row.scopeType}
        </Badge>
      ),
    },
    {
      header: "BOUND BY",
      accessor: "createdBy",
      render: (row) => {
        const creator = row.createdBy;
        const isMe = creator?.id === user?.id;
        return (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
              {creator ? (creator.fullName || creator.email) : "System Baseline"}
              {isMe && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded-full">You</span>}
            </span>
            <span className="text-[11px] text-slate-400">
              {row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Active"}
            </span>
          </div>
        );
      },
    },
    {
      header: "SEVERITY",
      accessor: "severity",
      render: (row) => (
        <Badge
          status={
            row.rule?.severity === "Critical" || row.rule?.severity === "High"
              ? "danger"
              : row.rule?.severity === "Medium"
              ? "warning"
              : "info"
          }
        >
          {row.rule?.severity || "Medium"}
        </Badge>
      ),
    },
    {
      header: "ACTIONS",
      accessor: "actions",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1.5 cursor-pointer"
          onClick={() => handleUnbind(row)}
        >
          <Unlink size={14} />
          <span>Unbind</span>
        </Button>
      ),
    },
  ];

  const paginatedBindings = filteredBindings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const myBindingsCount = bindings.filter((b) => {
    const officerId =
      b.rule?.assignedOfficerId ||
      b.rule?.assignedOfficer?.id ||
      b.rule?.category?.ownerId;
    return !officerId || officerId === user?.id;
  }).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Rules & Scope Governance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Map automated compliance rules to entire companies, specific projects, or teams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            className="inline-flex items-center gap-1.5 shadow-xs"
            onClick={() => setIsModalOpen(true)}
            disabled={rules.length === 0}
          >
            <Plus size={15} />
            <span>Add Scope Binding</span>
          </Button>
        </div>
      </header>

      {/* Modern Workflow Info Notice */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2.5">
          <Info size={16} className="text-blue-600 shrink-0" />
          <span>
            <strong>Streamlined Policy Management:</strong> You can now attach or unbind project scopes directly from any policy on the{" "}
            <Link to={PATHS.COMPLIANCE.RULES} className="underline font-bold text-blue-700 hover:text-blue-900">
              Rules page
            </Link>{" "}
            via the new <strong>Manage Scopes</strong> button.
          </span>
        </div>
      </div>

      {/* Scope Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setScopeFilter("MyDomain");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              scopeFilter === "MyDomain"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <UserCheck size={14} />
            <span>My Policy Domain ({myBindingsCount})</span>
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
            <span>All Organization Enforcements ({bindings.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={PATHS.COMPLIANCE.RULES}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <BookOpen size={14} className="text-slate-400" />
            <span>View Rules</span>
          </Link>
          <Link
            to={PATHS.COMPLIANCE.CATEGORIES}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Tags size={14} className="text-slate-400" />
            <span>Domains</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            {scopeFilter === "MyDomain" ? "Bindings in Your Regulatory Domain" : "All Enforced Boundaries"} ({filteredBindings.length})
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {filteredBindings.length} Active Targets
          </span>
        </div>
        <div className="p-0">
          <Table
            columns={columns}
            data={paginatedBindings}
            loading={loading}
            emptyMessage={
              scopeFilter === "MyDomain"
                ? "No active scope bindings configured for your policies. Attach a project target to start enforcement."
                : "No active scope bindings found."
            }
          />
        </div>
        <div className="border-t border-slate-100 px-4">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredBindings.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {rules.length > 0 && (
        <CreateBindingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          ruleId={selectedRuleId || rules[0]?.id}
          onBindingCreated={fetchData}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(bindingToUnbind)}
        title="Unbind Scope"
        message={`Are you sure you want to unbind "${bindingToUnbind?.rule?.name || 'this rule'}" from "${bindingToUnbind?.scopeName || (bindingToUnbind?.scopeType === 'Company' ? 'All (Company-wide)' : bindingToUnbind?.scopeId)}"? Future events will stop being evaluated against this rule.`}
        confirmText="Unbind Scope"
        variant="danger"
        loading={isUnbinding}
        onConfirm={handleConfirmUnbind}
        onCancel={() => setBindingToUnbind(null)}
      />
    </div>
  );
}

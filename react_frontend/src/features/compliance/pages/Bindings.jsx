import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PATHS } from "../../../app/paths";
import { apiClient } from "../../../services/api/client";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Pagination } from "../../../shared/components/Pagination";
import { CreateBindingModal } from "../components/CreateBindingModal";
import { Plus, Loader2, Link2, Unlink, BookOpen, Tags, Info } from "lucide-react";
import { useToast } from "../../../shared/components/Toast";

const PAGE_SIZE = 10;

export default function ComplianceBindings() {
  const toast = useToast();
  const [bindings, setBindings] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  const handleUnbind = async (binding) => {
    const scopeLabel = binding.scopeName || (binding.scopeType === "Company" ? "All (Company-wide)" : binding.scopeId);
    const ruleLabel = binding.rule?.name || `Rule #${binding.ruleId}`;
    if (!window.confirm(`Unbind "${ruleLabel}" from "${scopeLabel}"? Future events will no longer be evaluated against this rule. Past violations remain safely in audit history.`)) return;
    try {
      await apiClient(`/compliance-bindings/${binding.id}`, { method: "DELETE" });
      toast.success(`Unbound rule from ${scopeLabel}.`);
      fetchData();
    } catch (err) {
      toast.error("Failed to unbind: " + err.message);
    }
  };

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
            {row.rule?.description || "No description"}
          </span>
        </div>
      ),
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
      header: "SCOPE TYPE",
      accessor: "scopeType",
      render: (row) => (
        <Badge status={row.scopeType === "Company" ? "default" : "info"}>
          {row.scopeType}
        </Badge>
      ),
    },
    {
      header: "TARGET / PROJECT SCOPE",
      accessor: "scopeName",
      render: (row) => (
        <span className="font-medium text-[13px] text-slate-700">
          {row.scopeName || (row.scopeType === "Company" ? "All (Company-wide)" : row.scopeId)}
        </span>
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
          <span>Unbind Scope</span>
        </Button>
      ),
    },
  ];

  const paginatedBindings = bindings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Rules & Policy Governance
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

      {/* Policy Domain Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Link
          to={PATHS.COMPLIANCE.RULES}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <BookOpen size={14} className="text-slate-400" />
          <span>Active Rules ({rules.length})</span>
        </Link>
        <Link
          to={PATHS.COMPLIANCE.CATEGORIES}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Tags size={14} className="text-slate-400" />
          <span>Regulatory Categories</span>
        </Link>
        <Link
          to={PATHS.COMPLIANCE.BINDINGS}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-xs"
        >
          <Link2 size={14} />
          <span>Scope Bindings ({bindings.length})</span>
        </Link>
      </div>

      {/* Governance Guidance Banner */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-xl flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2.5">
          <Info size={16} className="text-blue-600 shrink-0" />
          <span>
            <strong>Scope Binding Governance:</strong> Unbinding a scope safely discontinues future rule evaluation for that target without deleting historical violation records or evidence files.
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Active Enforced Bindings ({bindings.length})</h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {bindings.length} Enforcements
          </span>
        </div>
        <div className="p-0">
          <Table
            columns={columns}
            data={paginatedBindings}
            loading={loading}
            emptyMessage="No active scope bindings configured yet. Add a binding to enforce rules on projects."
          />
        </div>
        <div className="border-t border-slate-100 px-4">
          <Pagination
            currentPage={currentPage}
            totalItems={bindings.length}
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
    </div>
  );
}

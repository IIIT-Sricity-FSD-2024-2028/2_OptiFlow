import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/api/client";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { CreateBindingModal } from "../components/CreateBindingModal";
import { Plus, Loader2, Link2, Trash2 } from "lucide-react";

export default function ComplianceBindings() {
  const [bindings, setBindings] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState("");

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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this scope binding?")) return;
    try {
      await apiClient(`/compliance-bindings/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert("Failed to delete binding: " + err.message);
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
          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          onClick={() => handleDelete(row.id)}
        >
          <Trash2 size={15} className="mr-1 inline" />
          Remove
        </Button>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto bg-[#f0f4f8] min-h-screen text-[#1a2332]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1a2332] mb-1">Scope Bindings</h1>
          <p className="text-sm text-slate-500">
            Map automated compliance rules to entire companies, specific projects, or teams.
          </p>
        </div>

        <div className="mt-4 md:mt-0">
          <Button
            variant="primary"
            className="flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
            disabled={rules.length === 0}
          >
            <Plus size={16} />
            Add Scope Binding
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#e2e8f0] shadow-sm overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-[#e2e8f0] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-blue-600" />
            <h2 className="text-[15px] font-bold text-[#1a2332]">Active Enforced Bindings ({bindings.length})</h2>
          </div>
        </div>
        <div className="p-0">
          <Table
            columns={columns}
            data={bindings}
            loading={loading}
            emptyMessage="No active scope bindings configured yet. Add a binding to enforce rules on projects."
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

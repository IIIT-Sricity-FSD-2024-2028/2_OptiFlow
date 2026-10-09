import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/api/client";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Modal } from "../../../shared/components/Modal";
import { Plus, Loader2 } from "lucide-react";

export default function ComplianceRules() {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    severity: "Medium",
    isActive: true,
    scopeType: "Company", // Added for bindings
  });

  const fetchRules = async () => {
    try {
      const rulesResponse = await apiClient("/compliance-rules");
      setRules(Array.isArray(rulesResponse) ? rulesResponse : []);
    } catch (err) {
      console.log("Failed to load rules", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenCreate = () => {
    setEditingRuleId(null);
    setFormData({ name: "", description: "", severity: "Medium", isActive: true, scopeType: "Company" });
    setIsOpen(true);
  };

  const handleOpenEdit = (rule) => {
    setEditingRuleId(rule.id);
    // Try to find an existing binding to pre-populate the scope
    const existingBinding = rule.bindings && rule.bindings.length > 0 ? rule.bindings[0].scopeType : "Company";
    
    setFormData({
      name: rule.name,
      description: rule.description || "",
      severity: rule.severity || "Medium",
      isActive: rule.isActive,
      scopeType: existingBinding,
    });
    setIsOpen(true);
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    
    const previousRules = [...rules];
    const optimisticRule = {
      id: editingRuleId || `temp-${Date.now()}`,
      ...formData,
      bindings: [{ scopeType: formData.scopeType }]
    };

    if (editingRuleId) {
      setRules(rules.map(r => r.id === editingRuleId ? optimisticRule : r));
    } else {
      setRules([...rules, optimisticRule]);
    }
    
    setIsOpen(false);

    try {
      if (editingRuleId) {
        // 1. Update the Rule
        await apiClient(`/compliance-rules/${editingRuleId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            severity: formData.severity,
            isActive: formData.isActive
          }),
        });
        
        // Note: For a robust V2, you'd also want to PATCH the binding here, 
        // but for MVP, we just update the rule itself.
        
      } else {
        // 1. Create the Rule
        const newRule = await apiClient("/compliance-rules", {
          method: "POST",
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            severity: formData.severity,
            isActive: formData.isActive
          }),
        });
        
        // 2. Immediately Create the Binding so the engine actually runs it!
        await apiClient("/compliance-bindings", {
          method: "POST",
          body: JSON.stringify({
            ruleId: newRule.id,
            scopeType: formData.scopeType,
            // scopeId will default to companyId in the backend if omitted for 'Company' scope
          })
        });
      }
      
      fetchRules();
    } catch (error) {
      setRules(previousRules);
      console.log("Failed to save rule : ", error);
      alert("Failed to save rule: " + error.message);
    }
  };

  const columns = [
    {
      header: "RULE NAME",
      accessor: "name",
      render: (row) => (
        <span 
          onClick={() => navigate(`/compliance/rules/${row.id}`)}
          className="font-semibold text-[13px] text-blue-600 hover:text-blue-800 cursor-pointer"
        >
          {row.name}
        </span>
      ),
    },
    { header: "DESCRIPTION", accessor: "description" },
    {
      header: "SEVERITY",
      accessor: "severity",
      render: (row) => (
        <Badge
          status={
            row.severity === "High" || row.severity === "Critical"
              ? "danger"
              : row.severity === "Medium"
                ? "warning"
                : "info"
          }
        >
          {row.severity}
        </Badge>
      ),
    },
    {
      header: "SCOPE",
      accessor: "scope",
      render: (row) => {
        const binding = row.bindings && row.bindings.length > 0 ? row.bindings[0].scopeType : 'None';
        return <Badge status={binding !== 'None' ? 'info' : 'default'}>{binding}</Badge>;
      }
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
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-[#f0f4f8] min-h-screen text-[#1a2332]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1a2332] mb-1">
            Compliance Policies
          </h1>
          <p className="text-sm text-gray-500">
            Manage the automated rules that scan your workspace.
          </p>
        </div>

        <div className="mt-4 md:mt-0">
          <Button
            variant="primary"
            className="flex items-center gap-2"
            onClick={handleOpenCreate}
          >
            <Plus size={16} />
            Create New Rule
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#e2e8f0] shadow-sm overflow-hidden mb-8">
        <div className="p-0">
          <Table
            columns={columns}
            data={rules}
            emptyMessage="No compliance rules found. Create one to start scanning."
          />
        </div>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingRuleId ? "Edit Compliance Rule" : "Create New Compliance Rule"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRule}>
              {editingRuleId ? "Save Changes" : "Save Rule"}
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
              className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Description *
            </label>
            <textarea
              required
              rows={3}
              className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">
                Severity
              </label>
              <select
                className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

          </div>

          <div className="flex items-center justify-between mt-2 p-3 bg-gray-50 border border-gray-100 rounded-lg">
            <div className="flex flex-col">
              <label htmlFor="isActive" className="text-sm font-semibold text-slate-700">
                Rule is Active
              </label>
              <span className="text-xs text-gray-500">Enable or disable this rule</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                id="isActive" 
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <button type="submit" className="hidden">
            Submit
          </button>
        </form>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/api/client";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Table from "../../../shared/components/Table";
import { CreateBindingModal } from "../components/CreateBindingModal";
import { ResolveViolationModal } from "../components/ResolveViolationModal";
import { Modal } from "../../../shared/components/Modal";

const formatActionString = (str) => {
  if (!str) return "Unknown Action";
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const renderCriteria = (criteria) => {
  if (!criteria) return <span className="text-gray-400 italic">No automated criteria configured.</span>;

  if (criteria.trigger && criteria.requirement) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-blue-600 text-xs tracking-wider">IF</span>
          <Badge variant="neutral">{criteria.trigger.field}</Badge>
          <span className="text-gray-600 text-sm font-medium">changes to</span>
          <Badge variant="info">{criteria.trigger.transitionTo}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-600 text-xs tracking-wider">THEN</span>
          <span className="text-gray-600 text-sm font-medium">engine will enforce</span>
          <Badge variant="warning">{formatActionString(criteria.requirement.type)}</Badge>
        </div>
      </div>
    );
  }

  if (criteria.field && criteria.operator) {
    const operatorMap = {
      eq: "must equal",
      neq: "must not equal",
      lt: "must be strictly less than",
      gt: "must be strictly greater than",
      lte: "must be less than or equal to",
      gte: "must be greater than or equal to"
    };
    return (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-blue-600 text-xs tracking-wider">ENFORCE</span>
        <Badge variant="neutral">{criteria.field}</Badge>
        <span className="text-gray-600 text-sm font-medium">{operatorMap[criteria.operator] || criteria.operator}</span>
        <Badge variant="info">{String(criteria.value)}</Badge>
      </div>
    );
  }

  return <pre className="text-xs text-gray-700 font-mono bg-white p-2 rounded border border-gray-200">{JSON.stringify(criteria, null, 2)}</pre>;
};

const RuleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rule, setRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isBindingModalOpen, setIsBindingModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: "", description: "", severity: "Medium", isActive: true });

  useEffect(() => {
    fetchRule();
  }, [id]);

  const fetchRule = async () => {
    try {
      setLoading(true);
      const data = await apiClient(`/compliance-rules/${id}`);
      setRule(data);
    } catch (err) {
      console.error("Failed to load rule details", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = () => {
    setEditFormData({
      name: rule.name,
      description: rule.description || "",
      severity: rule.severity || "Medium",
      isActive: rule.isActive
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await apiClient(`/compliance-rules/${id}`, {
        method: "PUT",
        body: JSON.stringify(editFormData),
      });
      setIsEditModalOpen(false);
      fetchRule();
    } catch (err) {
      console.error("Failed to update rule:", err);
      alert("Failed to update rule");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="p-6 text-center text-gray-500">
        Rule not found.
        <Button onClick={() => navigate("/compliance/rules")} variant="ghost" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Rules
        </Button>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rule Configuration</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-8">
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{rule.description || "No description provided."}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900">{rule.category?.name || "Uncategorized"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Severity</dt>
                <dd className="mt-1">
                  <Badge variant={rule.severity === "High" || rule.severity === "Critical" ? "error" : "warning"}>
                    {rule.severity}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <Badge variant={rule.isActive ? "success" : "neutral"}>
                    {rule.isActive ? "Active" : "Inactive"}
                  </Badge>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 mb-2">Engine Evaluation Criteria</dt>
                <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  {renderCriteria(rule.criteria)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 mb-2">Action on Fail</dt>
                <dd className="mt-1 text-sm">
                  <Badge variant="error">{formatActionString(rule.actionOnFail || "BLOCK_TRANSITION")}</Badge>
                </dd>
              </div>
            </dl>
          </div>
        );
      case "bindings":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Rule Bindings</h3>
                <p className="text-sm text-gray-500">Define where and to whom this rule applies.</p>
              </div>
              <Button onClick={() => setIsBindingModalOpen(true)}>Add Binding</Button>
            </div>
            
            {rule.bindings && rule.bindings.length > 0 ? (
              <Table 
                columns={[
                  { header: "SCOPE TYPE", accessor: "scopeType" },
                  { header: "SCOPE NAME", accessor: "scopeName", render: (row) => row.scopeName || "All (Company-wide)" },
                  { header: "ACTIONS", accessor: "actions", render: (row) => <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">Remove</Button> }
                ]}
                data={rule.bindings}
              />
            ) : (
              <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                No bindings found. This rule will not be evaluated by the compliance engine until bound.
              </div>
            )}
          </div>
        );
      case "violations":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Active Violations</h3>
                <p className="text-sm text-gray-500">Entities currently failing this rule.</p>
              </div>
            </div>
            
            {rule.violations && rule.violations.length > 0 ? (
              <Table 
                columns={[
                  { header: "ENTITY", accessor: "entityName", render: (row) => row.entityName || `${row.entityType} #${row.entityId.substring(0,8)}` },
                  { header: "SEVERITY", accessor: "severity", render: (row) => <Badge variant="error">{row.severity}</Badge> },
                  { header: "STATUS", accessor: "status", render: (row) => <Badge variant="warning">{row.status}</Badge> },
                  { 
                    header: "ACTIONS", 
                    accessor: "actions", 
                    render: (row) => (
                      <Button 
                        variant={row.status === 'Resolved' ? 'ghost' : 'warning'} 
                        size="sm"
                        onClick={() => setSelectedViolation(row)}
                        disabled={row.status === 'Resolved'}
                      >
                        {row.status === 'Resolved' ? 'Resolved' : 'Manual Override'}
                      </Button>
                    ) 
                  }
                ]}
                data={rule.violations}
              />
            ) : (
              <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                No active violations found. Good job!
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/compliance/rules")}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{rule.name}</h1>
              <Badge variant={rule.isActive ? "success" : "neutral"}>
                {rule.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">Manage rule configuration, scope bindings, and view violation history.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleOpenEdit}>Edit Rule</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {["Overview", "Bindings", "Violations"].map((tab) => {
            const tabId = tab.toLowerCase();
            const isActive = activeTab === tabId;
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`
                  whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                  ${isActive 
                    ? "border-[#10b981] text-[#10b981]" 
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {tab}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>

      <CreateBindingModal 
        isOpen={isBindingModalOpen}
        onClose={() => setIsBindingModalOpen(false)}
        ruleId={rule.id}
        onBindingCreated={fetchRule}
      />

      <ResolveViolationModal
        isOpen={!!selectedViolation}
        onClose={() => setSelectedViolation(null)}
        violation={selectedViolation}
        onResolved={fetchRule}
      />

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Compliance Rule"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Rule Name *
            </label>
            <input
              type="text"
              required
              className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
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
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Severity
            </label>
            <select
              className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              value={editFormData.severity}
              onChange={(e) => setEditFormData({ ...editFormData, severity: e.target.value })}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="flex items-center justify-between mt-2 p-3 bg-gray-50 border border-gray-100 rounded-lg">
            <div className="flex flex-col">
              <label htmlFor="editIsActive" className="text-sm font-semibold text-slate-700">
                Rule is Active
              </label>
              <span className="text-xs text-gray-500">Enable or disable this rule</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                id="editIsActive" 
                checked={editFormData.isActive}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
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
};

export default RuleDetail;

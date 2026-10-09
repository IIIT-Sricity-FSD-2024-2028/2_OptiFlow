import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/api/client";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Table from "../../../shared/components/Table";
import { CreateBindingModal } from "../components/CreateBindingModal";
import { ResolveViolationModal } from "../components/ResolveViolationModal";

const RuleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rule, setRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isBindingModalOpen, setIsBindingModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState(null);

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
                <dt className="text-sm font-medium text-gray-500">Engine Evaluation Criteria (JSON)</dt>
                <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-4 rounded-md border border-gray-200 overflow-auto max-h-48 font-mono">
                  {rule.criteria ? JSON.stringify(rule.criteria, null, 2) : "No machine-readable criteria defined."}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Action on Fail</dt>
                <dd className="mt-1 text-sm font-medium text-red-600">
                  {rule.actionOnFail || "BLOCK_TRANSITION"}
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
                        variant="ghost" 
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
          <Button variant="outline">Edit Rule</Button>
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
    </div>
  );
};

export default RuleDetail;

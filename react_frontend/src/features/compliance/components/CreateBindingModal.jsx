import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import { apiClient } from "../../../services/api/client";
import { createComplianceBinding } from "../../../store/complianceBindings";
import { Loader2 } from "lucide-react";

export function CreateBindingModal({
  isOpen,
  onClose,
  ruleId,
  rules = [],
  onBindingCreated,
}) {
  const dispatch = useDispatch();
  const [selectedRuleId, setSelectedRuleId] = useState(ruleId || "");
  const [scopeType, setScopeType] = useState("Company");
  const [scopeId, setScopeId] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [fetchingOptions, setFetchingOptions] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedRuleId(ruleId || rules[0]?.id || "");
      setScopeType("Company");
      setScopeId("");
      setError(null);
    }
  }, [isOpen, ruleId, rules]);

  useEffect(() => {
    // 1. CLEAR options and exit if Company
    if (scopeType === "Company") {
      setOptions([]);
      setScopeId("");
      return;
    }

    // 2. Fetch data with proper loading/error states
    async function fetchData() {
      setFetchingOptions(true);
      setError(null);
      try {
        if (scopeType === "Project") {
          const projects = await apiClient("/projects");
          setOptions(Array.isArray(projects) ? projects : projects?.data || []);
        } else if (scopeType === "Team") {
          const teams = await apiClient("/teams");
          setOptions(Array.isArray(teams) ? teams : teams?.data || []);
        } else if (scopeType === "Branch") {
          const branches = await apiClient("/branches");
          setOptions(Array.isArray(branches) ? branches : branches?.data || []);
        }
      } catch (err) {
        console.error(`Failed to fetch ${scopeType}s`, err);
        setError(`Failed to load ${scopeType.toLowerCase()}s.`);
      } finally {
        setFetchingOptions(false);
      }
    }
    
    fetchData();
  }, [scopeType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetRuleId = ruleId || selectedRuleId;
    if (!targetRuleId) {
      setError("Please select a compliance rule.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 3. Construct payload dynamically
      const payload = {
        ruleId: targetRuleId,
        scopeType,
      };
      
      // Only attach scopeId if it's not a Company-wide binding
      if (scopeType !== "Company") {
        payload.scopeId = scopeId;
      }

      await dispatch(createComplianceBinding(payload)).unwrap();
      
      onBindingCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create binding", err);
      setError(err.message || "An error occurred while creating the binding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Rule Binding"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading || (scopeType !== "Company" && !scopeId)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Binding
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {!ruleId && rules.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compliance Rule
            </label>
            <select
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
              value={selectedRuleId}
              onChange={(e) => setSelectedRuleId(e.target.value)}
              required
            >
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scope Type
          </label>
          <select
            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            value={scopeType}
            onChange={(e) => {
              setScopeType(e.target.value);
              setScopeId(""); 
            }}
          >
            <option value="Company">Company-wide (All)</option>
            <option value="Branch">Specific Branch</option>
            <option value="Team">Specific Team</option>
            <option value="Project">Specific Project</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Determines what entities this rule applies to.
          </p>
        </div>

        {/* 4. Conditional Rendering with Styling and Array Mapping */}
        {scopeType !== "Company" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              Select {scopeType}
              {fetchingOptions && <Loader2 className="h-3 w-3 animate-spin ml-2 text-gray-400" />}
            </label>
            <select
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-500"
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              required
              disabled={fetchingOptions}
            >
              <option value="">
                {fetchingOptions ? "Loading..." : `Select a ${scopeType}...`}
              </option>
              
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name || opt.fullName || opt.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </form>
    </Modal>
  );
}

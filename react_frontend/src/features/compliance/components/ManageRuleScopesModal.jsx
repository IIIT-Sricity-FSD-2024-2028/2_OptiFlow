import React, { useState, useEffect } from "react";
import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import { Badge } from "../../../shared/components/Badge";
import { apiClient } from "../../../services/api/client";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../shared/components/Toast";
import {
  Plus,
  Trash2,
  Loader2,
  Building2,
  FolderGit2,
  Users,
  User,
  Link2,
  Unlink,
  ShieldCheck,
  Clock,
  AlertCircle,
} from "lucide-react";

export function ManageRuleScopesModal({ isOpen, onClose, rule, onUpdated }) {
  const { user } = useAuth();
  const toast = useToast();

  const [bindings, setBindings] = useState([]);
  const [loadingBindings, setLoadingBindings] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [unbindingId, setUnbindingId] = useState(null);

  // Form states for adding scope
  const [scopeType, setScopeType] = useState("Company");
  const [scopeId, setScopeId] = useState("");
  const [targetOptions, setTargetOptions] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  const fetchBindings = async () => {
    if (!rule) return;
    try {
      setLoadingBindings(true);
      const res = await apiClient(`/compliance-bindings?ruleId=${rule.id}`);
      const list = Array.isArray(res) ? res : res?.data || [];
      setBindings(list);
    } catch (err) {
      console.error("Failed to load rule bindings:", err);
    } finally {
      setLoadingBindings(false);
    }
  };

  useEffect(() => {
    if (isOpen && rule) {
      fetchBindings();
      setScopeType("Company");
      setScopeId("");
    }
  }, [isOpen, rule]);

  // Fetch targets when scopeType changes
  useEffect(() => {
    if (scopeType === "Company") {
      setTargetOptions([]);
      setScopeId("");
      return;
    }

    async function loadTargets() {
      setLoadingTargets(true);
      try {
        if (scopeType === "Project") {
          const res = await apiClient("/projects");
          setTargetOptions(Array.isArray(res) ? res : res?.data || []);
        } else if (scopeType === "Team") {
          const res = await apiClient("/teams");
          setTargetOptions(Array.isArray(res) ? res : res?.data || []);
        } else if (scopeType === "User") {
          const res = await apiClient("/users");
          setTargetOptions(Array.isArray(res) ? res : res?.data || []);
        }
      } catch (err) {
        console.error(`Failed to load ${scopeType} targets:`, err);
      } finally {
        setLoadingTargets(false);
      }
    }

    loadTargets();
  }, [scopeType]);

  const handleAddBinding = async (e) => {
    e.preventDefault();
    if (!rule) return;
    if (scopeType !== "Company" && !scopeId) {
      toast.error(`Please select a specific ${scopeType} target.`);
      return;
    }

    setIsAdding(true);
    try {
      const payload = {
        ruleId: rule.id,
        scopeType,
        scopeId: scopeType === "Company" ? user?.companyId || "" : scopeId,
      };

      await apiClient("/compliance-bindings", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success(`Scope successfully attached to ${rule.name}.`);
      setScopeType("Company");
      setScopeId("");
      await fetchBindings();
      if (onUpdated) onUpdated();
    } catch (err) {
      toast.error(`Failed to attach scope: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUnbind = async (bindingId, targetName) => {
    setUnbindingId(bindingId);
    try {
      await apiClient(`/compliance-bindings/${bindingId}`, {
        method: "DELETE",
      });
      toast.success(`Removed enforcement on ${targetName}.`);
      await fetchBindings();
      if (onUpdated) onUpdated();
    } catch (err) {
      toast.error(`Failed to unbind: ${err.message}`);
    } finally {
      setUnbindingId(null);
    }
  };

  if (!rule) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Enforced Policy Scopes"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-5 text-sm text-slate-800">
        {/* Rule Summary Header */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Target Policy
              </span>
              <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                {rule.name}
              </h3>
            </div>
            <Badge
              status={
                rule.severity === "Critical" || rule.severity === "High"
                  ? "danger"
                  : "default"
              }
            >
              {rule.severity} ({rule.slaHours || 72}h SLA)
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {rule.description ||
              "Automated compliance constraint evaluating project deliverables."}
          </p>
        </div>

        {/* Active Enforced Scopes List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-blue-600" />
              <span>Active Target Boundaries ({bindings.length})</span>
            </label>
            <span className="text-[11px] text-slate-400">
              Where this rule is currently evaluated
            </span>
          </div>

          {loadingBindings ? (
            <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="animate-spin w-4 h-4 text-blue-600" />
              <span className="text-xs">Loading active scopes...</span>
            </div>
          ) : bindings.length === 0 ? (
            <div className="p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-center text-xs text-slate-400">
              <AlertCircle className="w-5 h-5 mx-auto mb-1 text-slate-300" />
              This rule has no active scope bindings. It sits idle and will not
              evaluate any projects until a target is attached below.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {bindings.map((b) => {
                const targetName =
                  b.scopeName ||
                  (b.scopeType === "Company"
                    ? "All (Company-wide)"
                    : b.scopeId);
                const isCompany = b.scopeType === "Company";
                const boundBy = b.createdBy?.fullName || b.createdBy?.email;
                const isMe = b.createdBy?.id === user?.id;

                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 shrink-0">
                        {isCompany ? (
                          <Building2 size={14} />
                        ) : b.scopeType === "Team" ? (
                          <Users size={14} />
                        ) : (
                          <FolderGit2 size={14} />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-slate-900 truncate">
                            {targetName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-mono text-slate-600 uppercase">
                            {b.scopeType}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          {boundBy ? (
                            <span>
                              Bound by {boundBy} {isMe ? "(You)" : ""}
                            </span>
                          ) : (
                            <span>Initial System Baseline</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnbind(b.id, targetName)}
                      disabled={unbindingId === b.id}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors shrink-0 ml-2"
                      title="Unbind target scope"
                    >
                      {unbindingId === b.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Scope Section */}
        <div className="border-t border-slate-200 pt-4">
          <form onSubmit={handleAddBinding} className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Plus size={14} className="text-blue-600" />
              <span>Attach New Target Scope</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Scope Boundary Type
                </label>
                <select
                  value={scopeType}
                  onChange={(e) => {
                    setScopeType(e.target.value);
                    setScopeId("");
                  }}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Company">Company-wide (All Projects)</option>
                  <option value="Project">Specific Project</option>
                  <option value="Team">Specific Team</option>
                  <option value="User">Specific User</option>
                </select>
              </div>

              {scopeType !== "Company" && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Select {scopeType} Target
                  </label>
                  <select
                    value={scopeId}
                    onChange={(e) => setScopeId(e.target.value)}
                    required
                    disabled={loadingTargets}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingTargets
                        ? "Loading targets..."
                        : `-- Select a ${scopeType} --`}
                    </option>
                    {targetOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name || opt.fullName || opt.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isAdding || (scopeType !== "Company" && !scopeId)}
              className="w-full flex items-center justify-center gap-1.5 mt-2"
            >
              {isAdding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus size={13} />
              )}
              <span>
                {isAdding
                  ? "Attaching Scope..."
                  : "Attach Target Scope to Policy"}
              </span>
            </Button>
          </form>
        </div>
      </div>
    </Modal>
  );
}

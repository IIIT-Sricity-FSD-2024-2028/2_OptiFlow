import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  UserPlus,
  FolderKanban,
  CheckCircle2,
  Circle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  X,
  Compass,
} from "lucide-react";
import { PATHS } from "../../../app/paths";

export function GuidedQuickstartChecklist({
  metrics = {},
  companyName = "your organization",
  companyId = "",
}) {
  const navigate = useNavigate();
  const storageKey = `optiflow_quickstart_dismissed_${companyId || "default"}`;

  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });

  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    totalBranches = 0,
    totalTeams = 0,
    totalUsers = 0,
    totalProjects = 0,
    subscriptionStatus = "Active",
    trialEndsAt = null,
  } = metrics;

  // Step completions based on live system metrics
  const step1Done = totalBranches > 0;
  const step2Done = totalTeams > 0;
  const step3Done = totalUsers > 1; // Owner is 1 user; > 1 means members invited
  const step4Done = totalProjects > 0;

  const steps = [
    {
      id: 1,
      title: "Set Up Headquarters / Branch",
      description:
        "Establish physical or regional branch units to structure squads and compliance boundaries.",
      isDone: step1Done,
      path: PATHS.HR.BRANCHES,
      icon: Building2,
      actionText: step1Done ? "Manage Branches" : "Create First Branch",
    },
    {
      id: 2,
      title: "Assemble Your Delivery Squad",
      description:
        "Group team members into agile squads (e.g. Core Engineering) and designate a Team Lead.",
      isDone: step2Done,
      path: PATHS.HR.TEAMS,
      icon: Users,
      actionText: step2Done ? "Manage Squads" : "Create First Squad",
    },
    {
      id: 3,
      title: "Invite Team Members",
      description:
        "Add engineers, designers, or compliance reviewers to participate in milestone deliverables.",
      isDone: step3Done,
      path: PATHS.EXECUTIVE.EMPLOYEES,
      icon: UserPlus,
      actionText: step3Done ? "View Directory" : "Invite Colleagues",
    },
    {
      id: 4,
      title: "Launch Your First Project",
      description:
        "Define milestones, assign squads, and attach compliance gates for evidence reviews.",
      isDone: step4Done,
      path: PATHS.EXECUTIVE.PROJECTS,
      icon: FolderKanban,
      actionText: step4Done ? "View Projects" : "New Project",
    },
  ];

  const completedCount = steps.filter((s) => s.isDone).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const isAllComplete = completedCount === steps.length;

  // Trial countdown calculation
  const isTrial = subscriptionStatus === "Trialing" || Boolean(trialEndsAt);
  const daysRemaining = trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(trialEndsAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 14;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
  };

  const handleRestore = () => {
    setIsDismissed(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  // If user dismissed it, show a discreet reactivation chip
  if (isDismissed) {
    return (
      <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-900 shadow-2xs">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-blue-600" />
          <span className="font-semibold">Setup Guide</span>
          <span className="text-slate-400">•</span>
          <span className="text-blue-700">
            {completedCount} of {steps.length} steps completed (
            {progressPercent}%)
          </span>
        </div>
        <button
          type="button"
          onClick={handleRestore}
          className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
        >
          Re-open Checklist →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-50/80 via-indigo-50/30 to-white p-5 lg:p-6 shadow-xs space-y-5 transition-all">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              Quickstart Guide
            </span>
            {isTrial && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                14-Day Free Trial · {daysRemaining} day
                {daysRemaining === 1 ? "" : "s"} remaining
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {isAllComplete
              ? `Workspace ready for ${companyName}!`
              : `Welcome! Let's get ${companyName} up and running`}
          </h2>
          <p className="text-xs text-slate-600">
            {isAllComplete
              ? "All 4 setup steps are complete. Your organization is operational with live delivery squads and compliance gates."
              : "Complete these 4 foundational steps to start tracking delivery squads and automated compliance reviews."}
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
            title={isCollapsed ? "Expand checklist" : "Collapse checklist"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
            title="Dismiss checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-700">Setup Progress</span>
          <span className="text-blue-700">
            {completedCount} of {steps.length} completed ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isAllComplete
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-blue-600 to-indigo-600"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist Grid (Collapsed / Expanded) */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {steps.map((step, index) => {
            const Icon = step.icon;
            // Identify first pending step as currently recommended
            const isNextAction =
              !step.isDone &&
              steps.slice(0, index).every((prev) => prev.isDone);

            return (
              <div
                key={step.id}
                className={`relative flex flex-col justify-between rounded-xl p-4 transition-all ${
                  step.isDone
                    ? "bg-white/85 border border-emerald-200/90 shadow-2xs"
                    : isNextAction
                      ? "bg-white border-2 border-blue-600 shadow-sm ring-3 ring-blue-500/10"
                      : "bg-white/60 border border-slate-200/80"
                }`}
              >
                {/* Step Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        step.isDone
                          ? "bg-emerald-100 text-emerald-700"
                          : isNextAction
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {step.isDone ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Done
                      </span>
                    ) : isNextAction ? (
                      <span className="inline-flex items-center text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                        Next Step
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400">
                        Step {step.id}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Step Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={step.path}
                    className={`inline-flex items-center gap-1 text-xs font-bold transition-all ${
                      step.isDone
                        ? "text-slate-600 hover:text-blue-600"
                        : isNextAction
                          ? "text-blue-700 hover:text-blue-900 underline underline-offset-2"
                          : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>{step.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Helpful Tip */}
      {!isCollapsed && !isAllComplete && (
        <div className="pt-2 border-t border-blue-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <p>
            💡 <strong className="text-slate-700">Pro Tip:</strong> Once your
            first project is launched, deliverables will automatically trigger
            Team Lead reviews and compliance gates before marking tasks
            complete.
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-slate-400 hover:text-slate-600 underline self-start sm:self-auto cursor-pointer"
          >
            Don't show this again
          </button>
        </div>
      )}
    </div>
  );
}

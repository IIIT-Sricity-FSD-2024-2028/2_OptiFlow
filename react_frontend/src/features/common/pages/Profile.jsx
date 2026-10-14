import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../shared/components/Toast";
import {
  AVATAR_PALETTES,
  getUserAvatarPalette,
  setUserAvatarPalette,
} from "../../../shared/utils/avatarColor";
import {
  Building2,
  Mail,
  ArrowLeft,
  Copy,
  Check,
  UserCircle,
  Briefcase,
} from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [copiedKey, setCopiedKey] = useState(null);
  const [currentPalette, setCurrentPalette] = useState(() =>
    getUserAvatarPalette(user),
  );

  useEffect(() => {
    setCurrentPalette(getUserAvatarPalette(user));
  }, [user]);

  const formattedRole = user?.role
    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "User";

  const companyName =
    user?.company?.legalName || user?.company?.name || "Acme Corporation";

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSelectPalette = (palette) => {
    setCurrentPalette(palette);
    setUserAvatarPalette(user, palette.id);
    toast.success(`Profile theme updated to ${palette.name}`);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8 text-slate-900">
      {/* Top Header & Breadcrumb */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Console</span>
        </button>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
          My Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Manage your enterprise governance credentials, organization identity,
          and system access.
        </p>
      </div>

      {/* Main Profile Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div
            className={`w-20 h-20 rounded-2xl ${currentPalette.gradient} ${currentPalette.text} flex items-center justify-center font-bold text-2xl shadow-sm ring-4 ${currentPalette.ring} transition-all duration-300 shrink-0`}
          >
            {getInitials(user?.fullName || user?.email)}
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">
                {user?.fullName || "User Account"}
              </h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                {formattedRole}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600 pt-1">
              <span className="flex items-center gap-2">
                <Mail size={15} className="text-slate-400 shrink-0" />
                <span>{user?.email}</span>
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="flex items-center gap-2">
                <Building2 size={15} className="text-slate-400 shrink-0" />
                <span>{companyName}</span>
              </span>
            </div>

            {/* Shades in a line without text names */}
            <div className="flex items-center gap-1.5 pt-2">
              {AVATAR_PALETTES.map((palette) => {
                const isSelected = currentPalette.id === palette.id;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => handleSelectPalette(palette)}
                    aria-label={palette.name}
                    className={`w-5 h-5 rounded-full ${palette.gradient} transition-transform flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? "ring-1 ring-offset-0.98 ring-slate-500 scale-110 shadow-xs"
                        : "hover:scale-110 opacity-75 hover:opacity-100"
                    }`}
                  >
                    {isSelected && (
                      <Check size={10} className="text-white drop-shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Active Session
          </span>
        </div>
      </div>

      {/* Structured Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Account Information */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <UserCircle size={18} className="text-slate-700" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Account Information
            </h3>
          </div>
          <dl className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center py-2">
              <dt className="text-slate-500 font-medium">Full Name</dt>
              <dd className="font-semibold text-slate-900 text-sm">
                {user?.fullName || "—"}
              </dd>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-slate-100">
              <dt className="text-slate-500 font-medium">Email Address</dt>
              <dd className="font-semibold text-slate-900 text-sm">
                {user?.email || "—"}
              </dd>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-slate-100">
              <dt className="text-slate-500 font-medium">User Identifier</dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  {user?.id ? `${user.id.substring(0, 16)}…` : "—"}
                </span>
                {user?.id && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(user.id, "userId")}
                    className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Copy full User ID"
                  >
                    {copiedKey === "userId" ? (
                      <Check size={14} className="text-emerald-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Card 2: Organization & Scope */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <Briefcase size={18} className="text-slate-700" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Organization & Scope
            </h3>
          </div>
          <dl className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center py-2">
              <dt className="text-slate-500 font-medium">Organization</dt>
              <dd className="font-semibold text-slate-900 text-sm">
                {companyName}
              </dd>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-slate-100">
              <dt className="text-slate-500 font-medium">Assigned Role</dt>
              <dd className="font-semibold text-slate-900 text-sm">
                {formattedRole}
              </dd>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-slate-100">
              <dt className="text-slate-500 font-medium">Tenant Identifier</dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  {user?.companyId
                    ? `${user.companyId.substring(0, 16)}…`
                    : "—"}
                </span>
                {user?.companyId && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(user.companyId, "tenantId")}
                    className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Copy full Tenant ID"
                  >
                    {copiedKey === "tenantId" ? (
                      <Check size={14} className="text-emerald-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

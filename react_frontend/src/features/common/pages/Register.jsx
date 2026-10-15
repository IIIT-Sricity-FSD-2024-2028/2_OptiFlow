import React, { useState } from "react";
import { PATHS } from "../../../app/paths";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/api/client";
import {
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Check,
  AlertCircle,
  TrendingUp,
  BarChart3,
} from "lucide-react";

const COMPANY_SIZES = [
  { label: "1 – 10", value: "1-10" },
  { label: "11 – 50", value: "11-50" },
  { label: "51 – 250", value: "51-250" },
  { label: "250+", value: "250+" },
];

const INDUSTRIES = [
  "Software & Technology",
  "Financial Services & Fintech",
  "Healthcare & Life Sciences",
  "Manufacturing & Supply Chain",
  "Professional Services",
  "Retail & Consumer",
  "Other",
];

const FREE_EMAIL_PROVIDERS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
];

export default function Register() {
  const [companyLegalName, setCompanyLegalName] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [companySize, setCompanySize] = useState("11-50");
  const [industry, setIndustry] = useState("Software & Technology");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const navigate = useNavigate();

  // Generated workspace slug preview
  const workspaceSlug =
    companyLegalName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 28) || "your-company";

  // Check if work email looks like free webmail
  const emailDomain = ownerEmail.includes("@")
    ? ownerEmail.split("@")[1].toLowerCase().trim()
    : "";
  const isFreeEmail = FREE_EMAIL_PROVIDERS.includes(emailDomain);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!companyLegalName.trim()) {
      setError("Please enter your organization or workspace name.");
      return;
    }
    if (!ownerFullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!ownerEmail.trim()) {
      setError("Please enter your work email.");
      return;
    }
    if (isFreeEmail) {
      setError(
        "Registration is restricted to corporate domains. Please use your official company email (e.g., name@company.com).",
      );
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both password entries.");
      return;
    }
    if (!termsAccepted) {
      setError(
        "Please agree to the Terms of Service and Privacy Policy to proceed.",
      );
      return;
    }

    setIsProcessing(true);

    try {
      const payload = {
        companyLegalName: companyLegalName.trim(),
        ownerFullName: ownerFullName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        password,
        companySize,
        industry,
      };

      const response = await apiClient("/auth/register-company", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response?.token) {
        sessionStorage.setItem("authToken", response.token);
        sessionStorage.setItem("isPlatform", "false");
      }

      setIsProcessing(false);
      setRegistrationComplete(true);
    } catch (err) {
      setError(
        err.message ||
          "Registration failed. Please check your information and try again.",
      );
      setIsProcessing(false);
    }
  };

  // Success / Welcome Screen
  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans text-[#0F172A] antialiased">
        <header className="p-6 sm:p-8 flex justify-between items-center max-w-5xl mx-auto w-full">
          <Link to="/" className="inline-block">
            <img
              src="/assets/images/logo.svg"
              alt="OfficeSync"
              className="h-6 w-auto"
            />
          </Link>
          <Link
            to={PATHS.PUBLIC.LOGIN}
            className="text-xs font-semibold text-[#204991] hover:text-[#0B1F4D] transition-colors"
          >
            Sign in
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[480px] bg-white border border-[#E2E8F0] rounded-2xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(11,31,77,0.06)] text-center space-y-6">
            <div className="w-14 h-14 bg-[#EFF6FF] text-[#204991] rounded-2xl flex items-center justify-center mx-auto border border-[#BFDBFE]">
              <CheckCircle2 className="w-7 h-7 text-[#204991]" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-[#1E40AF] bg-[#DBEAFE] rounded-full">
                Workspace Provisioned
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                Welcome to OfficeSync
              </h1>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Your organization workspace{" "}
                <span className="font-semibold text-[#0F172A]">
                  "{companyLegalName}"
                </span>{" "}
                has been configured with an active 14-day evaluation license.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-[#64748B]">
                <span>Admin User:</span>
                <span className="font-semibold text-[#0F172A]">
                  {ownerFullName}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#64748B]">
                <span>Corporate Email:</span>
                <span className="font-mono text-[#0F172A]">{ownerEmail}</span>
              </div>
              <div className="flex justify-between items-center text-[#64748B]">
                <span>Assigned Role:</span>
                <span className="font-medium text-[#204991] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  System Admin (Company Owner)
                </span>
              </div>
              <div className="flex justify-between items-center text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                <span>Evaluation License:</span>
                <span className="font-semibold text-[#16A34A] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                  Active 14-Day Trial
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/executive/dashboard";
                }}
                className="w-full py-3 px-4 bg-[#0B1F4D] hover:bg-[#162F72] text-white rounded-xl text-xs font-semibold transition-all duration-150 shadow-[0_2px_8px_rgba(11,31,77,0.18)] hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Launch Executive Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                to={PATHS.PUBLIC.LOGIN}
                className="block text-center text-xs text-[#64748B] hover:text-[#0F172A] font-medium"
              >
                Return to Login
              </Link>
            </div>
          </div>
        </main>

        <footer className="p-6 text-center text-xs text-[#94A3B8]">
          © 2026 OfficeSync, Inc. Enterprise Operational Governance.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row font-sans text-[#0F172A] antialiased">
      {/* ======================================================== */}
      {/* LEFT COLUMN: Clean, Minimalist Enterprise Showcase        */}
      {/* ======================================================== */}
      <aside className="hidden lg:flex lg:w-[44%] xl:w-[42%] bg-[#0B1F4D] text-white flex-col justify-between p-12 lg:p-16 xl:p-20 border-r border-[#162F72] select-none">
        {/* Brand Top Header */}
        <div className="w-full max-w-md mx-auto">
          <Link to="/" className="inline-block">
            <img
              src="/assets/images/logo.svg"
              alt="OfficeSync"
              className="h-7 w-auto brightness-0 invert"
            />
          </Link>
        </div>

        {/* Core Narrative & Live Analytics Preview */}
        <div className="my-auto space-y-6 w-full max-w-md mx-auto">
          <div className="space-y-2.5">
            <h2 className="text-3xl xl:text-4xl font-semibold tracking-tight text-white leading-tight">
              The operational system for modern organizations.
            </h2>
            <p className="text-sm text-blue-200/80 leading-relaxed font-normal">
              Unify squad delivery, automated compliance, and multi-branch
              governance in one workspace.
            </p>
          </div>

          {/* 3 Ultra-Clean Single-Line Capabilities */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2.5 text-xs text-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              <span>Cross-branch squad & milestone tracking</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              <span>Automated compliance gates & policy sign-offs</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              <span>Tamper-evident audit logs for every decision</span>
            </div>
          </div>

          {/* Executive Workstream Telemetry */}
          <div className="bg-[#06122C] border border-[#162A5A] rounded-xl p-4.5 shadow-2xl space-y-4 mt-20">
            {/* Top Metric Row */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block font-sans">
                  Task Completion Rate
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-semibold text-white tracking-tight tabular-nums font-sans">
                    94.2%
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">
                    ↑ 3.8%
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    vs last cycle
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block font-sans">
                  Audit Events
                </span>
                <span className="text-xs text-slate-300 font-mono tabular-nums block mt-1">
                  #48,912 recorded
                </span>
              </div>
            </div>

            {/* Smooth Telemetry Sparkline */}
            <div className="space-y-1 pt-0.5">
              <div className="h-16 w-full">
                <svg
                  viewBox="0 0 320 64"
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    <linearGradient
                      id="telemetryGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#3B82F6"
                        stopOpacity="0.25"
                      />
                      <stop
                        offset="100%"
                        stopColor="#3B82F6"
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>
                  {/* Subtle grid lines */}
                  <line
                    x1="0"
                    y1="16"
                    x2="320"
                    y2="16"
                    stroke="#132347"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <line
                    x1="0"
                    y1="40"
                    x2="320"
                    y2="40"
                    stroke="#132347"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />

                  {/* Gradient Area */}
                  <path
                    d="M 0,52 C 45,50 75,38 110,36 C 150,34 185,24 220,22 C 260,20 285,14 320,10 L 320,64 L 0,64 Z"
                    fill="url(#telemetryGrad)"
                  />
                  {/* Trend Line */}
                  <path
                    d="M 0,52 C 45,50 75,38 110,36 C 150,34 185,24 220,22 C 260,20 285,14 320,10"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {/* Endpoint marker */}
                  <circle cx="320" cy="10" r="3" fill="#60A5FA" />
                </svg>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono tracking-tight pt-0.5">
                <span>Sprint 11</span>
                <span>Sprint 12</span>
                <span>Sprint 13</span>
                <span className="text-slate-200 font-medium">
                  Sprint 14 (Active)
                </span>
              </div>
            </div>

            {/* Branch Delivery Status Row */}
            <div className="pt-2 border-t border-[#132347] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-200 font-medium">
                    Central Headquarters
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-slate-300 tabular-nums text-[11px]">
                  <span>42 tasks</span>
                  <span className="text-white font-semibold">96.4%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-slate-200 font-medium">
                    Regional Operations
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-slate-300 tabular-nums text-[11px]">
                  <span>38 tasks</span>
                  <span className="text-white font-semibold">91.8%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Understated Baseline Footer */}
        <div className="w-full max-w-md mx-auto pt-6 border-t border-[#162F72] flex items-center justify-between text-xs text-blue-200/50">
          <span>Enterprise Workspace</span>
          <span>14-day evaluation license</span>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: Clean, Notion-Grade Registration Form       */}
      {/* ======================================================== */}
      <section className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-[#FAFAFA] overflow-y-auto">
        {/* Top Header */}
        <header className="flex justify-between items-center max-w-[460px] mx-auto w-full mb-6">
          <Link to="/" className="lg:hidden inline-flex items-center gap-2">
            <img
              src="/assets/images/logo.svg"
              alt="OfficeSync"
              className="h-6 w-auto"
            />
          </Link>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-[#475569]">
            <span>Already have an account?</span>
            <Link
              to={PATHS.PUBLIC.LOGIN}
              className="font-semibold text-[#204991] hover:text-[#0B1F4D] hover:underline"
            >
              Sign in
            </Link>
          </div>
        </header>

        {/* Main Registration Card */}
        <div className="w-full max-w-[460px] mx-auto my-auto bg-white border border-[#E2E8F0] rounded-2xl p-7 sm:p-9 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_10px_30px_rgba(11,31,77,0.04)] space-y-6">
          {/* Form Header */}
          <div className="space-y-1.5 text-left">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Create organization workspace
            </h1>
            <p className="text-xs text-[#64748B]">
              Deploy your team workspace. Free 14-day evaluation included.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] rounded-xl text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          <form className="space-y-4 text-left" onSubmit={handleRegister}>
            {/* 1. Workspace / Legal Name */}
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                Organization / Workspace Name{" "}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={companyLegalName}
                onChange={(e) => setCompanyLegalName(e.target.value)}
                placeholder="Acme Corporation"
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#204991] focus:ring-2 focus:ring-[#204991]/15 transition-all"
              />
              {/* Workspace URL Slug Preview */}
              <div className="mt-1 text-xs text-[#64748B] flex items-center gap-1 font-mono">
                <span className="text-[#94A3B8]">Workspace URL:</span>
                <span className="text-[#204991] font-medium">
                  app.officesync.io/{workspaceSlug}
                </span>
              </div>
            </div>

            {/* 2. Owner Full Name */}
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                Your Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={ownerFullName}
                onChange={(e) => setOwnerFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#204991] focus:ring-2 focus:ring-[#204991]/15 transition-all"
              />
            </div>

            {/* 3. Work Email */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-[#334155]">
                  Corporate Work Email <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-[#64748B]">B2B verification</span>
              </div>
              <input
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="jane@company.com"
                className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none transition-all ${
                  isFreeEmail
                    ? "border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20"
                    : "border-[#CBD5E1] focus:border-[#204991] focus:ring-2 focus:ring-[#204991]/15"
                }`}
              />
              {isFreeEmail ? (
                <p className="mt-1 text-xs text-amber-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Corporate domains required. Personal emails (@{emailDomain})
                  are restricted.
                </p>
              ) : (
                <p className="mt-1 text-xs text-[#64748B]">
                  Please use your corporate work address. Public webmail
                  providers are restricted.
                </p>
              )}
            </div>

            {/* 4. Company Size - Segmented Chips */}
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Workforce Size <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0]">
                {COMPANY_SIZES.map((size) => {
                  const isSelected = companySize === size.value;
                  return (
                    <button
                      key={size.value}
                      type="button"
                      onClick={() => setCompanySize(size.value)}
                      className={`py-1.5 text-center text-xs rounded-md transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white text-[#0F172A] shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {size.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Industry Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                Primary Industry / Domain{" "}
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#204991] focus:ring-2 focus:ring-[#204991]/15 transition-all cursor-pointer"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Password & 7. Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength="8"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full pl-3 pr-8 py-2 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#204991] focus:ring-2 focus:ring-[#204991]/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] p-0.5 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength="8"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={`w-full pl-3 pr-8 py-2 bg-white border rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none transition-all ${
                      confirmPassword && password !== confirmPassword
                        ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-400/20"
                        : "border-[#CBD5E1] focus:border-[#204991] focus:ring-2 focus:ring-[#204991]/15"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] p-0.5 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Validation Feedback */}
            {password && confirmPassword && (
              <div className="text-xs pt-0.5">
                {password === confirmPassword ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Passwords match
                  </span>
                ) : (
                  <span className="text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Passwords do not
                    match
                  </span>
                )}
              </div>
            )}

            {/* 8. Terms & Conditions Agreement Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 text-xs text-[#475569] cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#CBD5E1] text-[#204991] focus:ring-[#204991] focus:ring-offset-0 transition-colors cursor-pointer"
                />
                <span className="leading-relaxed text-xs">
                  I agree to OfficeSync's{" "}
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-[#204991] font-semibold hover:underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-[#204991] font-semibold hover:underline"
                  >
                    Privacy Policy
                  </a>
                  , including automated audit event logging.
                </span>
              </label>
            </div>

            {/* 9. Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-2.5 px-4 bg-[#0B1F4D] hover:bg-[#162F72] text-white rounded-lg text-xs font-semibold transition-all duration-150 shadow-[0_1px_3px_rgba(11,31,77,0.12)] hover:shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>
                  {isProcessing
                    ? "Setting up workspace..."
                    : "Create Organization Workspace"}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quiet Reassurance */}
            <div className="flex items-center justify-center gap-4 text-xs text-[#94A3B8] pt-1">
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" /> 14-day free trial
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" /> No credit card
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" /> Instant setup
              </span>
            </div>
          </form>
        </div>

        {/* Quiet Bottom Footer */}
        <footer className="text-center text-xs text-[#94A3B8] pt-6">
          OfficeSync Platform • Enterprise Squad Tracking & Governance
        </footer>
      </section>
    </div>
  );
}

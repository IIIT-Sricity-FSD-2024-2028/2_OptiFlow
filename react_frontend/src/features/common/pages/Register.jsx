import React, { useState } from "react";
import { PATHS } from "../../../app/paths";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/api/client";
import {
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Briefcase,
  Users,
} from "lucide-react";

export default function Register() {
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [companyLegalName, setCompanyLegalName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [industry, setIndustry] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!companySize) {
      setError("Please select your company size.");
      return;
    }

    if (!industry) {
      setError("Please select your industry or primary use case.");
      return;
    }

    setIsProcessing(true);

    try {
      const payload = {
        companyLegalName,
        ownerFullName,
        ownerEmail,
        password,
        companySize,
        industry,
      };

      const response = await apiClient("/auth/register-company", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      sessionStorage.setItem("authToken", response.token);
      sessionStorage.setItem("isPlatform", "false");

      setIsProcessing(false);
      setVerificationSent(true);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
      setIsProcessing(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
            <Mail className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Check your email</h2>
            <p className="text-sm text-slate-600 mt-2">
              We've sent an activation link to <span className="font-semibold text-slate-900">{ownerEmail}</span>.
              Please click the link to verify your corporate domain and activate your workspace.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => alert("Verification email re-sent!")}
              className="w-full py-2.5 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              Resend verification email
            </button>

            <div className="pt-4 border-t border-slate-100">
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 font-medium mb-3">
                Development Mode: Bypass email verification to continue testing immediately.
              </div>
              <button
                type="button"
                onClick={() => { window.location.href = "/"; }}
                className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              >
                Proceed to Dashboard (Dev Bypass)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Brand & Value Proposition Sidebar */}
      <aside className="hidden md:flex w-2/5 lg:w-1/3 bg-slate-900 text-white p-10 lg:p-12 flex-col justify-between border-r border-slate-800 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Link to="/" className="inline-block mb-10">
            <img
              src="/assets/images/logo-light.svg"
              alt="OfficeSync"
              className="h-8 w-auto"
            />
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            14-Day Free Trial · Full Access
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Centralized operations & compliance for modern enterprises.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Structure your organization into regional branches and delivery squads. Automate audit-ready evidence reviews on every milestone.
          </p>

          {/* Key Value Points */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            {[
              {
                title: "Branch & Squad Topology",
                desc: "Organize teams by physical or logical regional units with strict role boundaries.",
              },
              {
                title: "Automated Compliance Gates",
                desc: "Enforce audit evidence uploads and compliance sign-offs before tasks complete.",
              },
              {
                title: "Executive Pulse Telemetry",
                desc: "Single-pane visibility over portfolio delivery, blocker escalations, and risk posture.",
              },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{feature.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Testimonial Quote */}
        <div className="relative z-10 pt-8 border-t border-slate-800/80">
          <div className="flex items-center gap-1 text-amber-400 text-xs mb-2">
            ★★★★★
          </div>
          <p className="text-xs text-slate-300 italic leading-relaxed">
            "OfficeSync centralized delivery across 4 regional branches and cut our compliance review cycle by over 60%."
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              SC
            </div>
            <div>
              <p className="text-xs font-bold text-white">Sarah Chen</p>
              <p className="text-[11px] text-slate-400">VP of Operations, FinScale Tech</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Registration Form */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-white">
        <div className="max-w-xl w-full">
          {/* Mobile Logo */}
          <div className="text-center md:hidden mb-6">
            <Link to="/" className="inline-block">
              <img
                src="/assets/images/logo.svg"
                alt="OfficeSync"
                className="h-7 w-auto mx-auto"
              />
            </Link>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Enterprise Setup
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Create your corporate workspace
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Start your 14-day free trial. No credit card required.
            </p>
          </div>

          {error && (
            <div className="p-4 mb-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-rose-600 mt-1.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleRegister}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Workspace Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={companyLegalName}
                    onChange={(e) => setCompanyLegalName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={ownerFullName}
                    onChange={(e) => setOwnerFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Company Size
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
                  >
                    <option value="" disabled>Select workforce size...</option>
                    <option value="1-10">1 - 10 employees</option>
                    <option value="11-50">11 - 50 employees</option>
                    <option value="51-250">51 - 250 employees</option>
                    <option value="250+">250+ enterprise employees</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Industry / Domain
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
                  >
                    <option value="" disabled>Select industry...</option>
                    <option value="Software & Technology">Software & Technology</option>
                    <option value="Financial Services">Financial Services & Fintech</option>
                    <option value="Healthcare & Medical">Healthcare & Medical</option>
                    <option value="Manufacturing & Logistics">Manufacturing & Logistics</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength="8"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 px-4 mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isProcessing ? "Creating Workspace..." : "Create Workspace & Start 14-Day Free Trial"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Already have an account?{" "}
              <Link to={PATHS.PUBLIC.LOGIN} className="text-blue-600 font-bold hover:underline">
                Sign in
              </Link>
            </span>
            <span className="text-slate-400">
              SOC-2 Type II Certified · 256-bit Encryption
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

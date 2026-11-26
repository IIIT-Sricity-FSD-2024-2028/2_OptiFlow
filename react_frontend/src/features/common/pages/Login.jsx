import React, { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { PATHS } from "../../../app/paths";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../../../shared/components/Toast";
import {
  Building2,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [platformMode, setPlatformMode] = useState(false);
  const { login, platformLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // Explains why the user landed here (SEC-M2-11): an expired session is not a silent redirect.
  const NOTICES = {
    session_expired: "Your session has ended. Please sign in again.",
    plan_expired: "Your company's plan is not active. Please contact your administrator.",
  };
  const notice = NOTICES[searchParams.get("reason")] || "";

  const switchMode = (toPlatform) => {
    setPlatformMode(toPlatform);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      // SEC-M2-13: platform administrators use their own endpoint; company users use /auth/login.
      if (platformMode) await platformLogin({ email, password });
      else await login({ email, password });
      navigate("/");
    } catch (err) {
      setError("Login Failed : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        platformMode
          ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100"
          : "bg-gradient-to-br from-slate-50 via-blue-50/60 to-indigo-50/70 text-slate-900"
      }`}
    >
      {/* Top Bar */}
      <header className="w-full max-w-6xl mx-auto flex justify-between items-center px-6 sm:px-8 py-5">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-xs transition-colors ${
              platformMode
                ? "bg-emerald-500 text-slate-950"
                : "bg-indigo-600 text-white"
            }`}
          >
            O
          </span>
          <span className="text-lg font-bold tracking-tight">OfficeSync</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link
            to="/"
            className={`transition-colors ${
              platformMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-indigo-600"
            }`}
          >
            Home
          </Link>
          <Link
            to="/contact"
            className={`transition-colors ${
              platformMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-indigo-600"
            }`}
          >
            Contact
          </Link>
        </nav>
      </header>

      {/* Main Split Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6">
        <div
          className={`w-full max-w-4xl rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 transition-all duration-300 ${
            platformMode
              ? "bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/40"
              : "bg-white border border-slate-200/80 shadow-xl shadow-slate-900/5"
          }`}
        >
          {/* Left Context Brand Panel */}
          <div
            className={`md:col-span-5 p-8 flex flex-col justify-between transition-colors duration-300 ${
              platformMode
                ? "bg-gradient-to-br from-slate-800 via-slate-900 to-emerald-950/60 text-white border-b md:border-b-0 md:border-r border-slate-700/70"
                : "bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 text-white"
            }`}
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-white/15 backdrop-blur-xs text-white/95">
                {platformMode ? (
                  <>
                    <ShieldCheck size={13} className="text-emerald-300" />
                    <span>Platform Control Plane</span>
                  </>
                ) : (
                  <>
                    <Building2 size={13} className="text-blue-200" />
                    <span>Workspace Portal</span>
                  </>
                )}
              </div>

              <h2 className="text-2xl font-bold leading-snug tracking-tight">
                {platformMode
                  ? "Multi-Tenant Platform Governance"
                  : "Aligned Delivery & Compliance Governance"}
              </h2>

              <p className="text-xs leading-relaxed text-white/80">
                {platformMode
                  ? "Sign in with elevated platform credentials to provision tenants, audit company subscriptions, and inspect system telemetry."
                  : "One workspace for Project Managers, Team Leads, Team Members, and Compliance Officers to ship audited deliverables."}
              </p>
            </div>

            <div className="mt-8 space-y-2.5 text-xs text-white/90">
              {(platformMode
                ? [
                    "Dedicated platform administrator authentication",
                    "Tenant subscription & quota provisioning",
                    "Audited support access controls",
                  ]
                : [
                    "Subtask execution & evidence verification",
                    "Two-tier Team Lead & PM signoff workflow",
                    "Automated policy & SLA compliance tracking",
                  ]
              ).map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    size={14}
                    className={`shrink-0 mt-0.5 ${platformMode ? "text-emerald-300" : "text-blue-200"}`}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="md:col-span-7 p-7 sm:p-9 flex flex-col justify-center">
            {/* Portal Mode Switcher */}
            <div
              className={`grid grid-cols-2 p-1 rounded-xl mb-6 border ${
                platformMode
                  ? "bg-slate-800/80 border-slate-700"
                  : "bg-slate-100 border-slate-200/80"
              }`}
              role="tablist"
              aria-label="Sign in portal mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!platformMode}
                onClick={() => switchMode(false)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !platformMode
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Building2 size={14} />
                <span>Organization User</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={platformMode}
                onClick={() => switchMode(true)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  platformMode
                    ? "bg-emerald-500 text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheck size={14} />
                <span>Platform Admin</span>
              </button>
            </div>

            <div className="mb-6">
              <h1
                className={`text-xl font-bold tracking-tight ${
                  platformMode ? "text-white" : "text-slate-900"
                }`}
              >
                {platformMode ? "Platform administrator sign in" : "Sign in to your account"}
              </h1>
              <p
                className={`text-xs mt-1 ${
                  platformMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {platformMode
                  ? "Enter your administrator credentials to access the platform console."
                  : "Enter your organization email and password to continue."}
              </p>
            </div>

            {notice && !error && (
              <div className="mb-5 p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className={`mb-5 p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                  platformMode
                    ? "bg-rose-950/70 text-rose-200 border-rose-800/80"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                <AlertCircle size={15} className="text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div>
                <label
                  htmlFor="login-email"
                  className={`block text-xs font-semibold mb-1.5 ${
                    platformMode ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  Work Email
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                      platformMode ? "text-slate-400" : "text-slate-400"
                    }`}
                  />
                  <input
                    id="login-email"
                    type="email"
                    placeholder={platformMode ? "admin@optiflow.io" : "name@company.com"}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full h-11 pl-10 pr-3.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 ${
                      platformMode
                        ? "bg-slate-800/90 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500/25"
                        : "bg-slate-50/70 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20"
                    }`}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="login-password"
                  className={`block text-xs font-semibold mb-1.5 ${
                    platformMode ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full h-11 pl-10 pr-10 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 ${
                      platformMode
                        ? "bg-slate-800/90 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500/25"
                        : "bg-slate-50/70 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors cursor-pointer ${
                      platformMode
                        ? "text-slate-400 hover:text-slate-200"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Keep me signed in + Forgot */}
              {!platformMode && (
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Keep me signed in</span>
                  </label>
                  <Link
                    to={PATHS.PUBLIC.FORGOT_PASSWORD}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-60 ${
                  platformMode
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {!platformMode && (
                <>
                  <div className="relative flex items-center justify-center my-4 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    <div className="w-full h-px bg-slate-200"></div>
                    <span className="bg-white px-3 shrink-0">OR</span>
                    <div className="w-full h-px bg-slate-200"></div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        "Enterprise SSO (SAML/Okta) integration is coming soon! Contact Sales to upgrade your plan.",
                      )
                    }
                    className="w-full h-10 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex justify-center items-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                  >
                    Sign in with Organization SSO
                  </button>
                </>
              )}
            </form>

            <div
              className={`text-center mt-5 text-xs ${
                platformMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {platformMode ? (
                <button
                  type="button"
                  onClick={() => switchMode(false)}
                  className="text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Back to company sign in
                </button>
              ) : (
                <>
                  New organization?{" "}
                  <Link
                    to={PATHS.PUBLIC.REGISTER}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Register your company
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`w-full max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 px-6 sm:px-8 py-5 text-xs ${
          platformMode ? "text-slate-500" : "text-slate-500"
        }`}
      >
        <div>© 2026 OfficeSync Inc. All rights reserved.</div>
        <div className="space-x-4">
          <Link to="#" className="hover:underline">
            Privacy Policy
          </Link>
          <Link to="#" className="hover:underline">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}

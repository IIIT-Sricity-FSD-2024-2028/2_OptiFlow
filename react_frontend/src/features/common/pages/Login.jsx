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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#0F172A] antialiased">
      {/* Top Bar */}
      <header className="w-full max-w-6xl mx-auto flex justify-between items-center px-6 sm:px-8 py-5">
        <Link to="/" className="inline-flex items-center">
          <img
            src="/assets/images/logo.svg"
            alt="OfficeSync"
            className="h-6 w-auto"
          />
        </Link>
        <nav className="flex items-center gap-6 text-xs sm:text-sm font-medium text-[#475569]">
          <Link to="/" className="hover:text-[#0B1F4D] transition-colors">
            Home
          </Link>
          <Link to="/contact" className="hover:text-[#0B1F4D] transition-colors">
            Contact
          </Link>
        </nav>
      </header>

      {/* Main Split Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4">
        <div className="w-full max-w-[860px] bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-[0_4px_24px_rgba(11,31,77,0.06)]">
          {/* Left Brand Panel */}
          <aside
            className={`md:col-span-5 p-8 flex flex-col justify-between text-white transition-colors duration-200 select-none ${
              platformMode
                ? "bg-[#0F172A] border-b md:border-b-0 md:border-r border-[#1E293B]"
                : "bg-[#0B1F4D] border-b md:border-b-0 md:border-r border-[#162F72]"
            }`}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <img
                  src="/assets/images/logo.svg"
                  alt="OfficeSync"
                  className="h-6 w-auto brightness-0 invert"
                />
              </div>

              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase ${
                  platformMode
                    ? "bg-[#1E293B] text-blue-200 border border-[#334155]"
                    : "bg-[#162F72] text-blue-100 border border-[#204991]"
                }`}
              >
                {platformMode ? (
                  <>
                    <ShieldCheck size={13} className="text-blue-300" />
                    <span>Platform Control Plane</span>
                  </>
                ) : (
                  <>
                    <Building2 size={13} className="text-blue-200" />
                    <span>Organization Workspace</span>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white leading-snug">
                  {platformMode
                    ? "Platform administration & tenant governance."
                    : "Operational tracking & verified compliance."}
                </h2>
                <p className="text-xs leading-relaxed text-blue-100/80">
                  {platformMode
                    ? "Sign in with platform administrator credentials to manage tenant provisioning, subscriptions, and system audit logs."
                    : "Unify project execution, Team Lead reviews, and compliance attestations in one workspace."}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 space-y-2.5 text-xs text-blue-100/90">
              {(platformMode
                ? [
                    "Dedicated platform admin session scope",
                    "Tenant quota & plan governance",
                    "Audited support access controls",
                  ]
                : [
                    "Subtask delivery & evidence tracking",
                    "Two-tier Team Lead & PM signoff",
                    "Automated policy & SLA enforcement",
                  ]
              ).map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-blue-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>

          {/* Right Form Panel */}
          <div className="md:col-span-7 p-7 sm:p-9 flex flex-col justify-center bg-white">
            {/* Portal Mode Switcher */}
            <div
              className="grid grid-cols-2 p-1 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] mb-6"
              role="tablist"
              aria-label="Sign in portal mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!platformMode}
                onClick={() => switchMode(false)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  !platformMode
                    ? "bg-white text-[#0B1F4D] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
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
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  platformMode
                    ? "bg-[#0F172A] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <ShieldCheck size={14} />
                <span>Platform Admin</span>
              </button>
            </div>

            <div className="mb-5">
              <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
                {platformMode ? "Platform administrator sign in" : "Sign in to your account"}
              </h1>
              <p className="text-xs text-[#64748B] mt-1">
                {platformMode
                  ? "Enter your administrator credentials to open the platform console."
                  : "Enter your work email and password to access your workspace."}
              </p>
            </div>

            {notice && !error && (
              <div className="mb-4 p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-medium flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-4 p-3 bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5] rounded-lg text-xs font-medium flex items-center gap-2"
              >
                <AlertCircle size={15} className="text-[#EF4444] shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-[#334155] mb-1.5"
                >
                  Work Email
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                  />
                  <input
                    id="login-email"
                    type="email"
                    placeholder={platformMode ? "admin@optiflow.io" : "name@company.com"}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#204991] focus:ring-2 focus:ring-[#204991]/15 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#334155] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                  />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 pl-9 pr-10 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#204991] focus:ring-2 focus:ring-[#204991]/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#0F172A] rounded transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Keep me signed in + Forgot */}
              {!platformMode && (
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-[#475569]">
                    <input
                      type="checkbox"
                      className="rounded border-[#CBD5E1] text-[#204991] focus:ring-[#204991]"
                    />
                    <span>Keep me signed in</span>
                  </label>
                  <Link
                    to={PATHS.PUBLIC.FORGOT_PASSWORD}
                    className="text-[#204991] font-semibold hover:text-[#0B1F4D] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full h-10 rounded-lg text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-60 ${
                  platformMode
                    ? "bg-[#0F172A] hover:bg-[#1E293B]"
                    : "bg-[#0B1F4D] hover:bg-[#162F72]"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              {!platformMode && (
                <>
                  <div className="relative flex items-center justify-center my-4 text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">
                    <div className="w-full h-px bg-[#E2E8F0]"></div>
                    <span className="bg-white px-3 shrink-0">OR</span>
                    <div className="w-full h-px bg-[#E2E8F0]"></div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        "Enterprise SSO (SAML/Okta) integration is coming soon! Contact Sales to upgrade your plan.",
                      )
                    }
                    className="w-full h-10 bg-white text-[#0F172A] border border-[#CBD5E1] rounded-lg text-xs font-semibold flex justify-center items-center gap-2 hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    Sign in with Organization SSO
                  </button>
                </>
              )}
            </form>

            <div className="text-center mt-5 text-xs text-[#64748B]">
              {platformMode ? (
                <button
                  type="button"
                  onClick={() => switchMode(false)}
                  className="text-[#204991] font-semibold hover:text-[#0B1F4D] hover:underline cursor-pointer"
                >
                  Back to company sign in
                </button>
              ) : (
                <>
                  New organization?{" "}
                  <Link
                    to={PATHS.PUBLIC.REGISTER}
                    className="text-[#204991] font-semibold hover:text-[#0B1F4D] hover:underline"
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
      <footer className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 px-6 sm:px-8 py-5 text-xs text-[#94A3B8]">
        <div>© 2026 OfficeSync Inc. All rights reserved.</div>
        <div className="space-x-4">
          <Link to="#" className="hover:text-[#64748B]">
            Privacy Policy
          </Link>
          <Link to="#" className="hover:text-[#64748B]">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}

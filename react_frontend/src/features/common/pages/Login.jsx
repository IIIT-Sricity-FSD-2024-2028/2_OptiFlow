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
  AlertCircle,
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
      setError(err.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 antialiased">
      {/* Header */}
      <header className="w-full max-w-5xl mx-auto flex justify-between items-center px-6 py-5">
        <Link to="/" className="inline-flex items-center">
          <img
            src="/assets/images/logo.svg"
            alt="OfficeSync"
            className="h-7 w-auto"
          />
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-slate-900 transition-colors">
            Home
          </Link>
          <Link to="/contact" className="hover:text-slate-900 transition-colors">
            Contact
          </Link>
        </nav>
      </header>

      {/* Main Centered Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[440px] bg-white border border-slate-200 rounded-xl shadow-sm p-7 sm:p-9">
          {/* High-Contrast Mode Tabs */}
          <div
            className="grid grid-cols-2 p-1 rounded-lg bg-slate-100 border border-slate-200 mb-6"
            role="tablist"
            aria-label="Account type"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!platformMode}
              onClick={() => switchMode(false)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                !platformMode
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 size={15} className={!platformMode ? "text-blue-600" : "text-slate-400"} />
              <span>Workspace</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={platformMode}
              onClick={() => switchMode(true)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                platformMode
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck size={15} className={platformMode ? "text-slate-900" : "text-slate-400"} />
              <span>Platform Admin</span>
            </button>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {platformMode ? "Platform admin sign in" : "Sign in to OfficeSync"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {platformMode
                ? "Use your OfficeSync administrator credentials."
                : "Welcome back. Enter your email and password."}
            </p>
          </div>

          {notice && !error && (
            <div className="mb-5 p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-medium flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium flex items-center gap-2"
            >
              <AlertCircle size={15} className="text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {platformMode ? "Admin Email" : "Email"}
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="login-email"
                  type="email"
                  placeholder={platformMode ? "admin@officesync.com" : "name@company.com"}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-9 pr-10 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {!platformMode && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  <span>Keep me signed in</span>
                </label>
                <Link
                  to={PATHS.PUBLIC.FORGOT_PASSWORD}
                  className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full h-10 rounded-lg text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 ${
                platformMode
                  ? "bg-slate-900 hover:bg-slate-800"
                  : "bg-[#2563EB] hover:bg-[#1D4ED8]"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>{platformMode ? "Sign in as Admin" : "Sign In"}</span>
              )}
            </button>

            {!platformMode && (
              <>
                <div className="relative flex items-center justify-center my-4 text-xs text-slate-400">
                  <div className="w-full h-px bg-slate-200"></div>
                  <span className="bg-white px-3 shrink-0">or</span>
                  <div className="w-full h-px bg-slate-200"></div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      "Enterprise SSO (SAML/Okta) integration is coming soon! Contact Sales to upgrade your plan.",
                    )
                  }
                  className="w-full h-10 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm font-medium flex justify-center items-center hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Sign in with SSO
                </button>
              </>
            )}
          </form>

          <div className="text-center mt-6 text-xs text-slate-500">
            {platformMode ? (
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="text-blue-600 font-medium hover:text-blue-700 hover:underline cursor-pointer"
              >
                Back to workspace sign in
              </button>
            ) : (
              <>
                New organization?{" "}
                <Link
                  to={PATHS.PUBLIC.REGISTER}
                  className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
                >
                  Register your company
                </Link>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 px-6 py-5 text-xs text-slate-400">
        <div>© 2026 OfficeSync. All rights reserved.</div>
        <div className="space-x-4">
          <Link to="#" className="hover:text-slate-600">
            Privacy Policy
          </Link>
          <Link to="#" className="hover:text-slate-600">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}

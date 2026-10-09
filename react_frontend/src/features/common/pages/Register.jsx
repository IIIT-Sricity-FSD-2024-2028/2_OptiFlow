import React, { useState } from "react";
import { PATHS } from "../../../app/paths";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/api/client";

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
        companyLegalName, // Note: Label is "Workspace Name" but field is still companyLegalName for API compatibility
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
      setError(
        err.message || "Registration failed. Please try again."
      );
      setIsProcessing(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row items-center justify-center p-8">
        <div className="max-w-md w-full bg-white p-10 rounded-xl shadow-sm border border-slate-200 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Check your email</h2>
          <p className="text-gray-600 mb-8">
            We've sent a verification link to <span className="font-semibold text-gray-900">{ownerEmail}</span>.
            Please click the link to verify your business domain and activate your workspace.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => {
                alert("Verification email re-sent!");
              }}
              className="w-full p-3 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Resend email
            </button>
            
            <div className="pt-6 border-t border-gray-200 mt-6">
              <p className="text-xs text-amber-600 mb-3 font-medium px-4 py-2 bg-amber-50 rounded">
                Development Mode: Bypass email verification to continue testing.
              </p>
              <button
                onClick={() => {
                  window.location.href = "/";
                }}
                className="w-full p-3 bg-slate-900 text-white rounded-md text-sm font-semibold hover:bg-slate-800 transition-colors"
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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="hidden md:flex w-1/3 bg-blue-900 text-white p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white shadow-lg">
              O
            </div>
            <span className="text-2xl font-bold tracking-tight">OptiFlow</span>
          </div>
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Start your 14-day free trial.
          </h2>
          <p className="text-blue-200 text-lg mb-8 leading-relaxed">
            No credit card required. Invite your team and experience seamless operations instantly.
          </p>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-8 bg-white relative">
        <div className="max-w-xl w-full relative z-10">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create your workspace
            </h1>
            <p className="text-gray-500">
              Set up your environment and get started in seconds.
            </p>
          </div>

          {error && (
            <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <form
            className="space-y-5"
            onSubmit={handleRegister}
          >
            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={companyLegalName}
                  onChange={(e) => setCompanyLegalName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-shadow"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  value={ownerFullName}
                  onChange={(e) => setOwnerFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Work Email
              </label>
              <input
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-shadow"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Company Size
                </label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white"
                >
                  <option value="" disabled>Select size...</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-250">51-250 employees</option>
                  <option value="250+">250+ employees</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white"
                >
                  <option value="" disabled>Select industry...</option>
                  <option value="Software & Technology">Software & Technology</option>
                  <option value="Healthcare & Medical">Healthcare & Medical</option>
                  <option value="Financial Services">Financial Services</option>
                  <option value="Manufacturing & Logistics">Manufacturing & Logistics</option>
                  <option value="Professional Services">Professional Services (Legal, Consulting)</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength="8"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full p-3 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full p-3.5 mt-6 bg-blue-600 text-white rounded-md text-base font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isProcessing ? "Creating Workspace..." : "Start 14-Day Free Trial"}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to={PATHS.PUBLIC.LOGIN}
              className="text-blue-600 font-semibold hover:underline"
            >
              Sign in instead
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

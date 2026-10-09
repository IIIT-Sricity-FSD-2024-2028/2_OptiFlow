import React, { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { PATHS } from "../../../app/paths";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password });
      navigate("/");
    } catch (error) {
      setError("Login Failed : " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex flex-col font-sans">
      {/* Auth Header */}
      <header className="flex justify-between items-center px-8 py-6">
        <div className="text-xl font-bold text-gray-800">OfficeSync</div>
        <nav className="space-x-6">
          <Link
            to="/"
            className="text-gray-800 font-medium hover:text-blue-600"
          >
            Home
          </Link>
          <Link
            to="/contact"
            className="text-gray-800 font-medium hover:text-blue-600"
          >
            Contact
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex justify-center items-center p-8">
        <div className="bg-white p-10 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.05)] w-full max-w-[480px]">
          <div className="text-center mb-8">
            <p className="uppercase text-xs text-blue-600 font-bold tracking-wider mb-2">
              Welcome Back
            </p>
            <h1 className="text-2xl text-gray-900 font-bold">
              Sign in to your account
            </h1>
          </div>
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Work Email
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              {/* relative wrapper is key for absolute positioning inside it */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  // pr-10 adds padding to the right so text doesn't hide under the eye icon
                  className="w-full p-3 pr-10 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-gray-900 focus:outline-none"
                >
                  {showPassword ? (
                    // Eye Slash Icon (Visible -> hide)
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    // Eye Icon (Hidden -> show)
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Keep me signed in */}
            <div className="flex items-center justify-between text-sm mt-2">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="mr-2" />
                <span className="text-gray-600">Keep me signed in</span>
              </label>
              <Link
                to={PATHS.PUBLIC.FORGOT_PASSWORD}
                className="text-blue-600 font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full p-3.5 mt-4 bg-blue-600 text-white rounded-md text-base font-semibold hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>

            <div className="relative flex items-center justify-center my-6 text-sm text-gray-500">
              <div className="absolute w-[40%] h-px bg-gray-200 left-0"></div>
              <span className="bg-white px-2">OR</span>
              <div className="absolute w-[40%] h-px bg-gray-200 right-0"></div>
            </div>

            <button
              type="button"
              onClick={() => alert("Enterprise SSO (SAML/Okta) integration is coming soon! Contact Sales to upgrade your plan.")}
              className="w-full p-3.5 bg-white text-gray-900 border border-gray-300 rounded-md font-semibold flex justify-center items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              Sign in with Organization SSO
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-gray-500">
            New organization?{" "}
            <Link
              to={PATHS.PUBLIC.REGISTER}
              className="text-blue-600 font-semibold hover:underline"
            >
              Register your company
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex justify-between px-8 py-6 text-xs text-gray-500">
        <div>© 2026 OfficeSync Inc. All rights reserved.</div>
        <div className="space-x-4">
          <Link to="#" className="hover:text-gray-700">
            Privacy Policy
          </Link>
          <Link to="#" className="hover:text-gray-700">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}

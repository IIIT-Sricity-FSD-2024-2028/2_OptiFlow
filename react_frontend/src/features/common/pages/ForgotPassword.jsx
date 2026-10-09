import React, { useState } from 'react';
import { PATHS } from '../../../app/paths';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      // Simulate an API call to the backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStatus('success');
      setMessage('If an account exists for that email, we have sent password reset instructions.');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex flex-col font-sans">
      
      {/* Auth Header */}
      <header className="flex justify-between items-center px-8 py-6">
        <div className="text-xl font-bold text-gray-800">OfficeSync</div>
        <nav className="space-x-6">
          <Link to="/" className="text-gray-800 font-medium hover:text-blue-600">Home</Link>
          <Link to="/contact" className="text-gray-800 font-medium hover:text-blue-600">Contact</Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex justify-center items-center p-8">
        <div className="bg-white p-10 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.05)] w-full max-w-[480px]">
          
          <div className="text-center mb-8">
            <p className="uppercase text-xs text-blue-600 font-bold tracking-wider mb-2">
              Account Recovery
            </p>
            <h1 className="text-2xl text-gray-900 font-bold">
              Reset your password
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Enter your work email address and we'll send you a link to reset your password.
            </p>
          </div>

          {status === 'error' && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm text-center font-medium">
              {message}
            </div>
          )}

          {status === 'success' && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded text-sm text-center font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {message}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                disabled={status === 'loading'}
                className="w-full p-3 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || email.trim() === ''}
              className="w-full p-3.5 mt-4 bg-blue-600 text-white rounded-md text-base font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex justify-center items-center"
            >
              {status === 'loading' ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="text-center mt-6 text-sm">
            <Link to={PATHS.PUBLIC.LOGIN} className="text-blue-600 font-medium hover:underline flex justify-center items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back to Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex justify-between px-8 py-6 text-xs text-gray-500">
        <div>© 2026 OfficeSync Inc. All rights reserved.</div>
        <div className="space-x-4">
          <Link to="#" className="hover:text-gray-700">Privacy Policy</Link>
          <Link to="#" className="hover:text-gray-700">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}

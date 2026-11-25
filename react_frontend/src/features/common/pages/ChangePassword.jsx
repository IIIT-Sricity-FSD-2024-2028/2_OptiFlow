import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { changePassword, platformChangePassword } from "../../../services/api/auth";
import { setSession } from "../../../services/auth/session";
import { Button } from "../../../shared/components/Button";
import { PATHS } from "../../../app/paths";

// Company users: 8 characters. Platform administrators: 10 (the server enforces both).
const MIN_LENGTH = 8;
const PLATFORM_MIN_LENGTH = 10;

/**
 * First sign-in with a temporary password (company owner provisioned by a platform admin, user
 * created by HR, a new platform administrator). The server blocks every other request until the password is replaced.
 * A successful change returns a fresh token (the old one is revoked), so the session is stored
 * again and the app reloads from "/" to pick up the cleared flag.
 */
export default function ChangePassword() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  if (!user) return <Navigate to={PATHS.PUBLIC.LOGIN} replace />;
  if (!user.mustChangePassword) return <Navigate to="/" replace />;

  const isPlatform = Boolean(user.isPlatform);
  const minLength = isPlatform ? PLATFORM_MIN_LENGTH : MIN_LENGTH;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < minLength) {
      setError(`New password must be at least ${minLength} characters.`);
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from the temporary one.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setWorking(true);
    try {
      const change = isPlatform ? platformChangePassword : changePassword;
      const res = await change({ currentPassword, newPassword });
      if (res?.token) setSession(res.token, isPlatform);
      window.location.assign("/");
    } catch (err) {
      setError(err.message || "Could not change the password. Try again.");
      setWorking(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-5 text-slate-900">
        <div>
          <h1 className="text-xl font-bold">Choose a new password</h1>
          <p className="text-sm text-slate-600 mt-1">
            You signed in with a temporary password. Set your own to continue.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="current-password" className="block text-xs font-semibold text-slate-700 mb-1">Temporary password</label>
            <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 mb-1">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-between">
            <Button type="submit" variant="primary" disabled={working}>
              {working ? "Saving..." : "Change password"}
            </Button>
            <button type="button" onClick={logout} className="text-sm font-medium text-slate-500 hover:text-slate-800">
              Sign out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

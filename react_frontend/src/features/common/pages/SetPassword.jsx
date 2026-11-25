import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { setPassword } from "../../../services/api/auth";
import { Button } from "../../../shared/components/Button";
import { PATHS } from "../../../app/paths";

const MIN_LENGTH = 8;

/**
 * Public page behind the owner invite link a platform admin hands over when provisioning a company
 * (/set-password?token=...). No session is needed: the one-time token in the URL is the proof.
 * After it succeeds the owner signs in with the new password.
 */
export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState(token ? "ready" : "missing"); // ready | working | done | failed | missing
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setStatus("working");
    try {
      await setPassword({ token, password });
      setStatus("done");
    } catch (err) {
      setError(err.message || "This link is invalid or has expired. Ask your administrator for a new one.");
      setStatus("failed");
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-5 text-slate-900">
        <h1 className="text-xl font-bold">Set your password</h1>

        {status === "missing" && (
          <p className="text-sm text-red-600">This link is incomplete. Open the link you were given again.</p>
        )}

        {(status === "ready" || status === "working" || status === "failed") && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Choose a password for your OfficeSync account. It must be at least {MIN_LENGTH} characters.
            </p>
            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 mb-1">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <Button type="submit" variant="primary" disabled={status === "working"}>
              {status === "working" ? "Saving..." : "Set password"}
            </Button>
          </form>
        )}

        {status === "done" && (
          <p className="text-sm text-emerald-700">Your password is set. You can now sign in.</p>
        )}

        {(status === "done" || status === "missing") && (
          <Link to={PATHS.PUBLIC.LOGIN} className="inline-block text-sm font-medium text-blue-700 hover:text-blue-900">
            Go to sign in
          </Link>
        )}
      </div>
    </div>
  );
}

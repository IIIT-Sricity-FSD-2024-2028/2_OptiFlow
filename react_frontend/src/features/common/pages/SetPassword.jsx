import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { PATHS } from "../../../app/paths";
import { setPasswordWithToken } from "../../../store/auth";
import { FormField, Input } from "../../../shared/components/FormField";
import { Button } from "../../../shared/components/Button";

// Target of the one-time set-password link that the Platform Admin gets when provisioning a
// company (APP_BASE_URL/set-password?token=...). The new owner never receives a password; they
// choose one here, then sign in. Redeeming the link also invalidates it.
export default function SetPassword() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("The password must be at least 8 characters long.");
    if (password !== confirm) return setError("The two passwords do not match.");
    setSaving(true);
    try {
      await dispatch(setPasswordWithToken({ token, password })).unwrap();
      setDone(true);
    } catch (err) {
      setError(err?.message || "This link is invalid or has expired. Ask your platform administrator for a new one.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            {done ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <KeyRound className="w-6 h-6" />}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {done ? "Password saved" : "Choose your password"}
          </h1>
          <p className="text-sm text-slate-500">
            {done
              ? "Your account is ready. Sign in with your email and the password you just chose."
              : "Set the password for your new OptiFlow account."}
          </p>
        </div>

        {!token && !done && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
            This page needs the link you were sent. Open the full link, or ask your administrator for a new one.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            {error}
          </div>
        )}

        {done ? (
          <Link
            to={PATHS.PUBLIC.LOGIN}
            className="block w-full text-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to Sign In
          </Link>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <FormField label="New password" required>
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                disabled={saving || !token}
                required
              />
            </FormField>
            <FormField label="Confirm password" required>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                disabled={saving || !token}
                required
              />
            </FormField>
            <Button type="submit" className="w-full" disabled={saving || !token}>
              {saving ? "Saving…" : "Save password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

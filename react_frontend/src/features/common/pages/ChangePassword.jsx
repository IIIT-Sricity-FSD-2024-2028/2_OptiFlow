import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../shared/components/Toast";
import { FormField, Input } from "../../../shared/components/FormField";
import { Button } from "../../../shared/components/Button";

// First sign-in step for people whose password was chosen by HR or an executive (or reset by
// them). Until it is replaced the API refuses every other call with PASSWORD_CHANGE_REQUIRED,
// so the route guards send flagged users here before any dashboard loads.
export default function ChangePassword() {
  const { user, changePassword, logout } = useAuth();
  const isPlatform = Boolean(user?.isPlatform);
  const minLength = isPlatform ? 10 : 8;
  const toast = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const forced = Boolean(user?.mustChangePassword);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!currentPassword) return setError("Enter the temporary password you were given.");
    if (newPassword.length < minLength) return setError(`The new password must be at least ${minLength} characters long.`);
    if (newPassword === currentPassword) return setError("Choose a password different from the temporary one.");
    if (newPassword !== confirm) return setError("The two new passwords do not match.");
    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success("Password set. Welcome aboard!");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.message || "Could not change the password.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {forced ? "Set your password" : "Change password"}
          </h1>
          <p className="text-sm text-slate-500">
            {forced
              ? `Hi ${user?.fullName?.split(" ")[0] || "there"}, your account was created with a temporary password. Choose your own to continue.`
              : "Enter your current password and choose a new one."}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <FormField label={forced ? "Temporary password" : "Current password"} required>
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={saving}
              required
            />
          </FormField>
          <FormField label="New password" required>
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={minLength}
              disabled={saving}
              required
            />
          </FormField>
          <FormField label="Confirm new password" required>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={minLength}
              disabled={saving}
              required
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : "Save password and continue"}
          </Button>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> At least {minLength} characters
          </span>
          <button type="button" onClick={logout} className="font-semibold text-slate-600 hover:text-slate-900">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

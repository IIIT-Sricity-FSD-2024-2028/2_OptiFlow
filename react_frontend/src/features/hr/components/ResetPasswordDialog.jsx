import { useState } from "react";
import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import { FormField, Input } from "../../../shared/components/FormField";
import { apiClient } from "../../../services/api/client";

// Readable temporary passwords: no 0/O/1/l/I look-alikes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateTemporaryPassword(length = 12) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/**
 * Admin-assisted password reset (no outgoing email yet).
 * Sets a temporary password through PATCH /users/:id. The backend signs the user out everywhere
 * and makes them choose their own password at the next sign-in. The admin shares the temporary
 * password privately (in person, chat or phone); it is shown here once and never stored.
 */
export function ResetPasswordDialog({ employee, onClose, onReset }) {
  const [password, setPassword] = useState(() => generateTemporaryPassword());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState("");
  const [copied, setCopied] = useState(false);

  if (!employee) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (password.trim().length < 8) {
      setError("The temporary password must be at least 8 characters long.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiClient(`/users/${employee.id}`, {
        method: "PATCH",
        body: { password: password.trim() },
      });
      setIssued(password.trim());
      onReset?.();
    } catch (err) {
      setError(err?.message || "Could not reset the password.");
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(issued);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the password is still selectable on screen */
    }
  };

  return (
    <Modal
      isOpen
      onClose={saving ? undefined : onClose}
      title={issued ? "Temporary password issued" : "Reset password"}
      footer={
        issued ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" form="reset-password-form" variant="danger" disabled={saving}>
              {saving ? "Resetting…" : "Reset password"}
            </Button>
          </>
        )
      }
    >
      {issued ? (
        <div className="space-y-4 text-sm">
          <p className="text-slate-600">
            Share this temporary password with <strong>{employee.fullName}</strong> privately. They will be
            asked to choose their own password as soon as they sign in. It is shown only now.
          </p>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="font-mono text-base font-semibold text-slate-900 select-all">{issued}</span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-slate-500">Sign-in email: {employee.email}</p>
        </div>
      ) : (
        <form id="reset-password-form" onSubmit={submit} className="space-y-4 text-sm">
          <p className="text-slate-600">
            <KeyRound className="mr-1 inline h-4 w-4 text-amber-600" />
            {employee.fullName} will be signed out on all devices and must replace this temporary password
            at their next sign-in.
          </p>
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
              {error}
            </div>
          )}
          <FormField label="Temporary password" required hint="Minimum 8 characters">
            <div className="flex gap-2">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                disabled={saving}
                className="font-mono"
                required
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPassword(generateTemporaryPassword())}
                disabled={saving}
                title="Generate another"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </FormField>
        </form>
      )}
    </Modal>
  );
}

export default ResetPasswordDialog;

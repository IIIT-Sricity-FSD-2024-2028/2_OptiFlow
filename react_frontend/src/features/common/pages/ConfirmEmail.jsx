import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/api/client";
import { Button } from "../../../shared/components/Button";
import { PATHS } from "../../../app/paths";

/**
 * Public page behind the link sent by POST /users/me/email-change (SEC-M5-06).
 * Works without a session: the signed one-time token in the URL is the proof.
 * Confirming signs out every session, so the user signs in again with the new address.
 *
 * Needs a public route: { path: "/confirm-email", element: <ConfirmEmail /> } in
 * app/router/index.jsx (owned outside Member 5).
 */
export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState(token ? "ready" : "missing");
  const [message, setMessage] = useState("");

  const handleConfirm = async () => {
    setStatus("working");
    try {
      const res = await apiClient("/users/email-change/confirm", {
        method: "POST",
        body: { token },
      });
      setMessage(res?.message || "Email address updated. Please sign in again with your new address.");
      setStatus("done");
    } catch (err) {
      setMessage(err.message || "This email confirmation link is invalid or has expired.");
      setStatus("failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-5 text-slate-900">
        <h1 className="text-xl font-bold">Confirm your new email address</h1>

        {status === "missing" && (
          <p className="text-sm text-red-600">This link is incomplete. Open the link from the email again.</p>
        )}

        {(status === "ready" || status === "working") && (
          <>
            <p className="text-sm text-slate-600">
              Confirm to make this the email address of your OptiFlow account. You will be signed out
              everywhere and can sign in again with the new address.
            </p>
            <Button variant="primary" onClick={handleConfirm} disabled={status === "working"}>
              {status === "working" ? "Confirming..." : "Confirm email change"}
            </Button>
          </>
        )}

        {status === "done" && <p className="text-sm text-emerald-700">{message}</p>}
        {status === "failed" && <p className="text-sm text-red-600">{message}</p>}

        {(status === "done" || status === "failed" || status === "missing") && (
          <Link to={PATHS.PUBLIC.LOGIN} className="inline-block text-sm font-medium text-blue-700 hover:text-blue-900">
            Go to sign in
          </Link>
        )}
      </div>
    </div>
  );
}

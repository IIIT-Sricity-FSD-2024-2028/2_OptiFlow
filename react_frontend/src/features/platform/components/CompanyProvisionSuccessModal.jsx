import { useState } from 'react';
import { CheckCircle2, Copy, Check, ExternalLink, LogIn, Link2, User, ShieldCheck, Clock } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../../app/paths';

// The owner never gets a password from the platform: the account is created with a random one
// and the owner chooses their own through a one-time set-password link. With no outgoing email
// yet, this screen is where the platform admin picks the link up to send it to the owner.
// (It used to show a hard-coded "OptiFlow@2026!" that was never the real password.)
export function CompanyProvisionSuccessModal({ isOpen, result, onClose }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  if (!result) return null;

  const email = result.owner?.email || '';
  const link = result.setPasswordUrl || '';
  const expiresAt = result.setPasswordExpiresAt ? new Date(result.setPasswordExpiresAt) : null;
  const emailed = Boolean(result.inviteEmail?.delivered) && result.inviteEmail?.provider !== 'console';

  const handleCopyInvite = async () => {
    const text = `Your OptiFlow account is ready.\nSign-in email: ${email}\nChoose your password here (one-time link${
      expiresAt ? `, valid until ${expiresAt.toLocaleString()}` : ''
    }):\n${link}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked: the link stays selectable on screen */
    }
  };

  const handleGoToLogin = () => {
    onClose();
    navigate(PATHS.PUBLIC.LOGIN);
  };

  const handleGoToCompany = () => {
    onClose();
    if (result.company?.id) {
      navigate(PATHS.PLATFORM.COMPANY_DETAIL.replace(':id', result.company.id));
    } else {
      navigate(PATHS.PLATFORM.COMPANIES);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Company Provisioned Successfully"
      className="max-w-lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleGoToLogin}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Go to Login</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Back to Companies
            </button>
            <button
              type="button"
              onClick={handleGoToCompany}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5"
            >
              <span>View Company</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">{result.company?.legalName}</span> has been created with plan tier{' '}
            <span className="font-semibold">{result.subscription?.plan?.name || 'Assigned Tier'}</span>.
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Company Owner Invitation</span>
            </div>
            <button
              type="button"
              onClick={handleCopyInvite}
              disabled={!link}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Invitation'}</span>
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Login Email
              </span>
              <span className="font-mono font-semibold text-slate-900 select-all">{email}</span>
            </div>

            <div className="py-1 border-b border-slate-200/60 space-y-1">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-slate-400" />
                Set-password link (one-time)
              </span>
              {link ? (
                <p className="font-mono text-[11px] text-slate-900 break-all select-all">{link}</p>
              ) : (
                <p className="text-rose-600">No link was returned. Re-issue the invite from the company page.</p>
              )}
            </div>

            {expiresAt && (
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Expires
                </span>
                <span className="font-semibold text-slate-900">{expiresAt.toLocaleString()}</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            {emailed
              ? 'The invitation was also emailed to the owner.'
              : 'Email is not set up, so send this link to the owner yourself. It is shown only once.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}

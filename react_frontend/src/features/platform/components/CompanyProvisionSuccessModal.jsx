import { useState } from 'react';
import { CheckCircle2, Copy, Check, ExternalLink, LogIn, Key, User, ShieldCheck } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../../app/paths';

export function CompanyProvisionSuccessModal({ isOpen, result, onClose }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  if (!result) return null;

  const email = result.owner?.email || '';
  const password = result.initialPassword || 'OptiFlow@2026!';

  const handleCopyCredentials = () => {
    const credText = `Email: ${email}\nPassword: ${password}\nRole: Executive (System Admin)\nPortal: Executive Dashboard`;
    navigator.clipboard.writeText(credText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
              <span>Executive Administrator Credentials</span>
            </div>
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy All'}</span>
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

            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                Password
              </span>
              <span className="font-mono font-semibold text-slate-900 select-all">{password}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Landing Portal</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                Executive Dashboard
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { CheckCircle2, Copy, Check, ExternalLink } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../../app/paths';

export function CompanyProvisionSuccessModal({ isOpen, result, onClose }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  if (!result) return null;

  const handleCopyLink = () => {
    if (result.setPasswordUrl) {
      navigator.clipboard.writeText(result.setPasswordUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
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
        <div className="flex items-center justify-end gap-3 w-full">
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

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Owner One-Time Set Password Link
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Share this secure setup link with <strong>{result.owner?.email}</strong> to activate their account.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={result.setPasswordUrl || ''}
              className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700 select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { Shield, Copy, Check } from 'lucide-react';

export function AdminCredentialsView({ temporaryPassword, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!temporaryPassword) return;
    navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-1">
        <p className="font-bold flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-amber-600" /> Temporary Credentials Generated
        </p>
        <p className="text-[11px] leading-relaxed">
          Provide this one-time password to the administrator. They will be forced to change it upon first login. It will not be shown again.
        </p>
      </div>

      <div>
        <label className="block font-semibold text-slate-600 mb-1">Temporary Password</label>
        <div className="flex items-center gap-2 p-3 bg-slate-900 text-emerald-400 font-mono text-sm rounded-xl">
          <span className="flex-1 select-all">{temporaryPassword}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1 text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs"
        >
          Done
        </button>
      </div>
    </div>
  );
}

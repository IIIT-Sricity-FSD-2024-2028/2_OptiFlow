import { Eye, PauseCircle, PlayCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../app/paths';

export function CompanyActionMenu({ company, onRequestStatusChange }) {
  const detailUrl = PATHS.PLATFORM.COMPANY_DETAIL.replace(':id', company.id);

  return (
    <div className="flex items-center justify-end gap-1.5">
      {/* View Details Link */}
      <Link
        to={detailUrl}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg shadow-2xs transition-all"
        title="View Company Details"
      >
        <Eye className="w-3.5 h-3.5 text-slate-500" />
        <span>Details</span>
      </Link>

      {/* Contextual Status Transition Buttons */}
      {company.status === 'Active' && (
        <>
          <button
            type="button"
            onClick={() => onRequestStatusChange(company, 'Suspended')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-colors cursor-pointer"
            title="Suspend Company"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Suspend</span>
          </button>
          <button
            type="button"
            onClick={() => onRequestStatusChange(company, 'Closed')}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition-colors cursor-pointer"
            title="Close Company"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Close</span>
          </button>
        </>
      )}

      {company.status === 'Suspended' && (
        <>
          <button
            type="button"
            onClick={() => onRequestStatusChange(company, 'Active')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer"
            title="Reactivate Company"
          >
            <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Reactivate</span>
          </button>
          <button
            type="button"
            onClick={() => onRequestStatusChange(company, 'Closed')}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition-colors cursor-pointer"
            title="Close Company"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Close</span>
          </button>
        </>
      )}

      {company.status === 'Closed' && (
        <span className="text-[11px] font-medium text-slate-400 italic px-2 py-0.5">
          Terminated
        </span>
      )}
    </div>
  );
}

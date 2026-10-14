import { useState } from 'react';
import { Code, Eye } from 'lucide-react';

export function AuditDiffViewer({ before, after }) {
  const [showFullJson, setShowFullJson] = useState(false);

  const beforeObj = before && typeof before === 'object' ? before : {};
  const afterObj = after && typeof after === 'object' ? after : {};

  const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));
  const changedKeys = allKeys.filter(
    (key) => JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key])
  );

  const displayKeys = showFullJson ? allKeys : (changedKeys.length > 0 ? changedKeys : allKeys);

  const renderVal = (v) => {
    if (v === undefined) return <span className="text-slate-300 italic font-mono text-[10px]">undefined</span>;
    if (v === null) return <span className="text-slate-400 font-mono text-[10px]">null</span>;
    if (typeof v === 'object') return <pre className="font-mono text-[10px] whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre>;
    if (typeof v === 'boolean') return <span className="font-mono font-bold text-amber-600">{String(v)}</span>;
    return <span className="font-mono text-[11px] break-all">{String(v)}</span>;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800">
          State Changes ({changedKeys.length} field{changedKeys.length !== 1 ? 's' : ''} modified)
        </span>
        <button
          type="button"
          onClick={() => setShowFullJson(!showFullJson)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
        >
          {showFullJson ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
          <span>{showFullJson ? 'Show only modified fields' : 'Show full payload'}</span>
        </button>
      </div>

      {displayKeys.length === 0 ? (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
          No structured before/after payload recorded for this event.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
          <div className="grid grid-cols-12 bg-slate-50 p-2.5 font-semibold text-slate-500 text-[11px]">
            <div className="col-span-4">Field</div>
            <div className="col-span-4">Before</div>
            <div className="col-span-4">After</div>
          </div>
          {displayKeys.map((key) => {
            const isChanged = JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key]);
            return (
              <div
                key={key}
                className={`grid grid-cols-12 p-2.5 items-start gap-2 ${
                  isChanged ? 'bg-amber-50/30' : ''
                }`}
              >
                <div className="col-span-4 font-mono font-semibold text-slate-700 truncate" title={key}>
                  {key}
                  {isChanged && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
                </div>
                <div className={`col-span-4 p-1.5 rounded ${isChanged ? 'bg-rose-50 text-rose-900 border border-rose-200/60' : 'text-slate-600'}`}>
                  {renderVal(beforeObj[key])}
                </div>
                <div className={`col-span-4 p-1.5 rounded ${isChanged ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/60 font-semibold' : 'text-slate-600'}`}>
                  {renderVal(afterObj[key])}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

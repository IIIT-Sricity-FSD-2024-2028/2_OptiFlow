// Team Lead dashboard: blockers filed by the team. Presentational only.
import { Badge } from '../../../../shared/components/Badge';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { getBadgeStatus } from './statusDisplay';

export function EscalationWatch({ escalations }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">
          Team escalation watch
        </h2>

        <p className="text-xs text-gray-500 mt-1">
          Blockers filed by your team
        </p>
      </div>

      <div className="p-5 max-h-[380px] overflow-y-auto">

        {escalations.length === 0 ? (
          <EmptyState
            title="No escalations"
            description="When blockers are reported, they will appear here."
          />
        ) : (
          <div className="divide-y divide-gray-100">

            {escalations.map((escalation) => (
              <div
                key={escalation.id}
                className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
              >

                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {escalation.title}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {escalation.createdAt
                      ? new Date(escalation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : '—'}{' '}
                    ·{' '}
                    {escalation.blockerType || '—'}
                  </p>
                </div>

                <Badge status={escalation.status === 'Resolved' ? 'success' : getBadgeStatus(escalation.status)}>
                  {escalation.status || 'Open'}
                </Badge>

              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}

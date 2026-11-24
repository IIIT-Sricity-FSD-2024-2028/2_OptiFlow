import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotifications, markNotificationRead, markAllNotificationsRead,
  selectAllNotifications, selectUnreadCount,
  selectNotificationsStatus, selectNotificationsError, selectNotificationMutations,
} from '../../../store/notifications';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../shared/components/Button';
import { Loader } from '../../../shared/components/Loader';
import {
  Bell,
  CheckCheck,
  ShieldAlert,
  Shield,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';

// Notification.type values; the API has no category or priority fields.
const WORK_TYPES = ['Task', 'Review', 'Escalation'];
const isComplianceType = (n) => n.type === 'Compliance';
const isWorkType = (n) => WORK_TYPES.includes(n.type);

export default function Notifications() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const userId = user?.id;
  const notifications = useSelector(selectAllNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const status = useSelector(selectNotificationsStatus);
  const error = useSelector(selectNotificationsError);
  const mutations = useSelector(selectNotificationMutations);
  const loading = ['idle', 'loading'].includes(status) && !notifications.length;
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    if (userId) dispatch(fetchNotifications({ userId }));
  }, [dispatch, userId]);

  const handleMarkAsRead = (id, e) => {
    e?.stopPropagation();
    return dispatch(markNotificationRead(id));
  };

  const handleMarkAllRead = () => dispatch(markAllNotificationsRead());

  const handleNavigate = async (n) => {
    if (!n.isRead) {
      handleMarkAsRead(n.id);
    }
    if (n.linkUrl) {
      navigate(n.linkUrl);
    }
  };

  const filteredList = notifications.filter(n => {
    if (activeFilter === 'UNREAD') return !n.isRead;
    if (activeFilter === 'COMPLIANCE') return isComplianceType(n);
    if (activeFilter === 'WORK') return isWorkType(n);
    return true;
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-blue-600" />
            Notification Center
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Audit alerts, compliance remediation notices, and team task updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 shrink-0"
          >
            <CheckCheck size={16} />
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setActiveFilter('UNREAD')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeFilter === 'UNREAD'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setActiveFilter('COMPLIANCE')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeFilter === 'COMPLIANCE'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Compliance ({notifications.filter(isComplianceType).length})
        </button>
        <button
          onClick={() => setActiveFilter('WORK')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeFilter === 'WORK'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Work Tasks ({notifications.filter(isWorkType).length})
        </button>
      </div>

      {/* Notifications Feed */}
      {error && (
        <div role="alert" className="bg-white border border-rose-200 rounded-xl p-6 text-center">
          <AlertTriangle size={32} className="mx-auto text-rose-500 mb-2" />
          <h3 className="font-bold text-slate-800 text-sm">Notifications could not be loaded</h3>
          <p className="text-xs text-slate-500 mt-1">{error.message || String(error)}</p>
          {userId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => dispatch(fetchNotifications({ userId, force: true }))}
              className="mt-3"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <Loader />
          <p className="text-xs mt-3">Loading notifications...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">All caught up!</h3>
          <p className="text-xs text-slate-500 mt-1">
            No notifications matching the selected filter.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-xs overflow-hidden">
          {filteredList.map((n) => {
            const isUrgent = n.type === 'Escalation' || n.priority === 'URGENT';
            const isCompliance = isComplianceType(n);

            return (
              <div
                key={n.id}
                onClick={() => handleNavigate(n)}
                className={`p-4 sm:p-5 transition-colors cursor-pointer flex items-start gap-4 hover:bg-slate-50/80 ${
                  !n.isRead ? 'bg-blue-50/30' : ''
                }`}
              >
                {/* Icon Column */}
                <div className="shrink-0 mt-0.5">
                  {isUrgent ? (
                    <span className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-2xs">
                      <ShieldAlert size={18} />
                    </span>
                  ) : isCompliance ? (
                    <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-2xs">
                      <Shield size={18} />
                    </span>
                  ) : (
                    <span className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                      <Bell size={18} />
                    </span>
                  )}
                </div>

                {/* Main Body */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {n.title}
                      </span>
                      {n.type && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {n.type}
                        </span>
                      )}
                      {isUrgent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                          URGENT
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
                      <Clock size={12} />
                      {new Date(n.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {n.message}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500 font-medium">
                      {n.senderName ? `Attributed to: ${n.senderName}` : 'System Generated'}
                    </span>

                    <div className="flex items-center gap-2">
                      {!n.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          disabled={mutations['read:' + n.id]?.status === 'loading'}
                          className="text-slate-500 hover:text-slate-800 font-medium text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                      {n.linkUrl && (
                        <span className="text-blue-600 font-semibold inline-flex items-center gap-1 hover:underline">
                          View details <ExternalLink size={12} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

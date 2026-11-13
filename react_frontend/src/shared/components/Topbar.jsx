import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PATHS } from '../../app/paths';
import { useAuth } from '../../context/AuthContext';
import { getUserAvatarPalette } from '../utils/avatarColor';
import { apiClient } from '../../services/api/client';
import { 
  Building2, 
  Shield, 
  ChevronDown, 
  User, 
  LogOut, 
  Bell,
  CheckCheck,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export const Topbar = ({ title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [avatarPalette, setAvatarPalette] = useState(() => getUserAvatarPalette(user));
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiClient('/notifications');
      const list = res.data || (Array.isArray(res) ? res : []);
      setNotifications(list);
      setUnreadCount(typeof res.unreadCount === 'number' ? res.unreadCount : list.filter(n => !n.isRead).length);
    } catch (err) {
      // Fail silently for background bell polling
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s background sync
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    setAvatarPalette(getUserAvatarPalette(user));
    const handlePaletteChange = () => {
      setAvatarPalette(getUserAvatarPalette(user));
    };
    window.addEventListener('optiflow:avatar_color_change', handlePaletteChange);
    return () => window.removeEventListener('optiflow:avatar_color_change', handlePaletteChange);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiClient('/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.isRead) {
        await apiClient(`/notifications/${n.id}/read`, { method: 'PATCH' });
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (_) {}

    setIsNotifOpen(false);
    if (n.linkUrl) {
      navigate(n.linkUrl);
    }
  };

  const formattedRole = user?.isPlatform
    ? 'Platform Admin'
    : user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'User';

  const companyName = user?.isPlatform
    ? 'OptiFlow Platform'
    : user?.company?.legalName || user?.company?.name || user?.companyName || 'Acme Corporation';

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const diff = (Date.now() - new Date(timestamp).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-6 lg:px-8 flex items-center justify-between flex-shrink-0 z-20">
      {/* Left: Organization & Workspace Breadcrumb */}
      <div className="flex items-center gap-2.5 text-sm select-none">
        {user?.isPlatform ? (
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-500" />
              OptiFlow Platform
            </span>
            <span className="text-slate-300 font-light">/</span>
            <span className="text-slate-600 font-medium text-sm">
              {title || 'Console'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              {companyName}
            </span>
            <span className="text-slate-300 font-light">/</span>
            <span className="text-slate-600 font-medium text-sm">
              {title || `${formattedRole} Portal`}
            </span>
          </div>
        )}
      </div>

      {/* Right Controls: Notification Bell + User Profile */}
      <div className="flex items-center gap-3">
        {/* Interactive Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            aria-label="View notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full shadow-xs animate-in zoom-in-50 duration-150">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Popover Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Header */}
              <div className="p-3.5 bg-slate-50/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer"
                  >
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Scrollable Notification List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <Bell size={28} className="mx-auto text-slate-300 mb-2" />
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => {
                    const isUrgent = n.priority === 'URGENT';
                    const isHigh = n.priority === 'HIGH';
                    const isCompliance = n.category === 'COMPLIANCE';

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 transition-colors cursor-pointer flex gap-3 text-left hover:bg-slate-50 ${
                          !n.isRead ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        {/* Leading Category / Priority Icon */}
                        <div className="shrink-0 mt-0.5">
                          {isUrgent ? (
                            <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                              <ShieldAlert size={14} />
                            </span>
                          ) : isCompliance ? (
                            <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                              <Shield size={14} />
                            </span>
                          ) : (
                            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                              <Bell size={14} />
                            </span>
                          )}
                        </div>

                        {/* Message Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-semibold text-xs text-slate-900 truncate">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {formatRelativeTime(n.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>

                          {/* Attribution Footer */}
                          <div className="mt-1.5 flex items-center gap-2">
                            {n.senderName && (
                              <span className="text-[10px] text-slate-400 font-medium truncate">
                                By {n.senderName}
                              </span>
                            )}
                            {n.priority && n.priority !== 'NORMAL' && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                isUrgent ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {n.priority}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Unread Indicator Dot */}
                        {!n.isRead && (
                          <div className="shrink-0 self-center">
                            <span className="w-2 h-2 rounded-full bg-blue-600 block"></span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-slate-50 text-center border-t border-slate-100">
                <Link
                  to={PATHS.COMMON.NOTIFICATIONS}
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
                >
                  <span>View all notifications</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Trigger Pill & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all duration-150 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            aria-label="Account menu"
            aria-expanded={isOpen}
          >
            {/* Avatar Icon with Initials */}
            <div className={`w-8 h-8 rounded-full ${avatarPalette.gradient} ${avatarPalette.text} flex items-center justify-center font-bold text-xs tracking-wide shadow-2xs ring-1 ring-black/10`}>
              {getInitials(user?.fullName || user?.email)}
            </div>

            {/* First Name */}
            <span className="text-sm font-medium text-slate-800 group-hover:text-slate-900 transition-colors hidden sm:inline">
              {user?.fullName ? user.fullName.split(' ')[0] : 'Account'}
            </span>

            <ChevronDown
              size={15}
              className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Elite Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Header: User & Tenant Identity */}
              <div className="p-4 bg-slate-50/70">
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-full ${avatarPalette.gradient} ${avatarPalette.text} flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ring-2 ring-white`}>
                    {getInitials(user?.fullName || user?.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {user?.fullName || 'User'}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{user?.isPlatform ? 'Environment' : 'Workspace'}</span>
                  <span className="text-slate-800 font-semibold truncate max-w-[150px]">
                    {companyName}
                  </span>
                </div>
              </div>

              {/* Menu Links */}
              <div className="p-1.5">
                <Link
                  to={user?.isPlatform ? PATHS.PLATFORM.PROFILE : PATHS.COMMON.PROFILE}
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors group"
                >
                  <User size={16} className="text-slate-400 group-hover:text-slate-700" />
                  <span>My Profile</span>
                </Link>
                <Link
                  to={PATHS.COMMON.NOTIFICATIONS}
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors group"
                >
                  <Bell size={16} className="text-slate-400 group-hover:text-slate-700" />
                  <span>Notification Center</span>
                </Link>
              </div>

              {/* Sign Out */}
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50/60 rounded-xl transition-colors group text-left cursor-pointer"
                >
                  <LogOut size={16} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;

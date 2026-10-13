import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../app/paths';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  Shield, 
  ChevronDown, 
  User, 
  LogOut, 
  ExternalLink 
} from 'lucide-react';

export const Topbar = ({ title }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formattedRole = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'User';

  const companyName = user?.company?.legalName || user?.company?.name || 'Acme Corporation';

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between flex-shrink-0 z-20">
      {/* Left: Organization & Workspace Breadcrumb */}
      <div className="flex items-center gap-2 text-sm select-none">
        {user?.isPlatform ? (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-slate-500" />
              OptiFlow Platform
            </span>
            <span className="text-slate-300 font-light">/</span>
            <span className="text-slate-500 font-medium text-xs">
              {title || 'Console'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-500" />
              {companyName}
            </span>
            <span className="text-slate-300 font-light">/</span>
            <span className="text-slate-500 font-medium text-xs">
              {title || `${formattedRole} Portal`}
            </span>
          </div>
        )}
      </div>

      {/* Right: User Trigger Pill & Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all duration-150 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          aria-label="Account menu"
          aria-expanded={isOpen}
        >
          {/* Avatar Icon with Initials */}
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-[11px] tracking-wide ring-1 ring-slate-900/10">
            {getInitials(user?.fullName || user?.email)}
          </div>

          {/* First Name */}
          <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition-colors hidden sm:inline">
            {user?.fullName ? user.fullName.split(' ')[0] : 'Account'}
          </span>

          <ChevronDown
            size={12}
            className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Elite Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg ring-1 ring-black/5 divide-y divide-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Header: User & Tenant Identity */}
            <div className="p-3.5 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-slate-900/10">
                  {getInitials(user?.fullName || user?.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user?.fullName || 'User'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Workspace</span>
                <span className="text-slate-700 font-semibold truncate max-w-[140px]">
                  {companyName}
                </span>
              </div>
            </div>

            {/* Menu Links */}
            <div className="p-1">
              <Link
                to={PATHS.COMMON.PROFILE}
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors group"
              >
                <User size={14} className="text-slate-400 group-hover:text-slate-600" />
                <span>My Profile</span>
              </Link>
            </div>

            {/* Sign Out */}
            <div className="p-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50/60 rounded-lg transition-colors group text-left cursor-pointer"
              >
                <LogOut size={14} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;

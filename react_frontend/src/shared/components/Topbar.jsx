import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../app/paths';
import { useAuth } from '../../context/AuthContext';
import { getUserAvatarPalette } from '../utils/avatarColor';
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
  const [avatarPalette, setAvatarPalette] = useState(() => getUserAvatarPalette(user));
  const dropdownRef = useRef(null);

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

      {/* Right: User Trigger Pill & Dropdown */}
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
                <span className="text-slate-500 font-medium">Workspace</span>
                <span className="text-slate-800 font-semibold truncate max-w-[150px]">
                  {companyName}
                </span>
              </div>
            </div>

            {/* Menu Links */}
            <div className="p-1.5">
              <Link
                to={PATHS.COMMON.PROFILE}
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors group"
              >
                <User size={16} className="text-slate-400 group-hover:text-slate-700" />
                <span>My Profile</span>
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
    </header>
  );
};

export default Topbar;

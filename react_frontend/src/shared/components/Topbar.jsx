import React, { useState, useRef, useEffect } from 'react';
import { Bell, User, Settings, Shield, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Topbar.module.css';

export const Topbar = ({ title, onNotificationClick }) => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formattedRole = user?.role
    ? user.role.replace(/_/g, ' ')
    : 'User';

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.leftSection}>
        <span className={styles.badge}>
          <span className={styles.roleDot}></span>
          {title || formattedRole}
        </span>
      </div>

      <div className={styles.topbarActions}>
        <button
          type="button"
          className={styles.notificationBtn}
          onClick={onNotificationClick}
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className={styles.bellDot}></span>
        </button>

        <div className={styles.avatarContainer} ref={dropdownRef}>
          <button 
            className={styles.avatarBtn} 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className={styles.avatarCircle}>
              {getInitials(user?.fullName || user?.email)}
            </div>
          </button>

          {isDropdownOpen && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownName}>{user?.fullName || 'User'}</div>
                <div className={styles.dropdownEmail}>{user?.email || 'user@optiflow.io'}</div>
                <div className={styles.dropdownRole}>{formattedRole}</div>
              </div>
              
              <div className={styles.dropdownDivider}></div>
              
              <button className={styles.dropdownItem}>
                <User size={16} /> My Profile
              </button>
              <button className={styles.dropdownItem}>
                <Settings size={16} /> Account Settings
              </button>
              
              <div className={styles.dropdownDivider}></div>
              
              <button className={styles.dropdownItem}>
                <Shield size={16} /> Security
              </button>
              <button className={styles.dropdownItem}>
                <HelpCircle size={16} /> Help & Support
              </button>
              
              <div className={styles.dropdownDivider}></div>
              
              <button className={styles.dropdownItemLogout} onClick={logout}>
                <LogOut size={16} /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;

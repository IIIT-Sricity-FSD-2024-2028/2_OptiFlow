import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import styles from './Sidebar.module.css';
import logoImg from '../../assets/logo_light.png';

/**
 * Reusable Sidebar component
 * @param {Array} navItems - Navigation links array [{ label, path, icon }]
 * @param {string} title - Workspace or platform brand title
 */
export const Sidebar = ({ navItems = [], title = 'OptiFlow' }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <aside
      className={`${styles.sidebar} ${
        collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded
      }`}
    >
      {/* Brand Header */}
      <div className={styles.sidebarHeader}>
        {!collapsed && (
          <div className={styles.brandWrapper}>
            <img src={logoImg} alt={title} className={styles.brandLogo} />
          </div>
        )}

        <button
          className={styles.toggleBtn}
          onClick={toggleSidebar}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <LucideIcons.PanelLeftOpen size={18} /> : <LucideIcons.PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className={styles.navContainer}>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            const IconComponent = LucideIcons[item.icon] || LucideIcons.Circle;

            return (
              <li
                key={item.path}
                className={styles.navItem}
                onMouseEnter={() => collapsed && setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                  }
                >
                  <div className={styles.iconWrapper}>
                    <IconComponent size={20} />
                  </div>
                  {!collapsed && <span className={styles.linkLabel}>{item.label}</span>}
                </NavLink>

                {/* Tooltip when collapsed */}
                {collapsed && hoveredItem === item.path && (
                  <div className={styles.tooltip}>{item.label}</div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
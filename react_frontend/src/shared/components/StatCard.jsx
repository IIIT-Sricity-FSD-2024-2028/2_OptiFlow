import React from 'react';
import styles from './StatCard.module.css';
import { Loader } from './Loader'; // Assuming a Loader component exists or I can use a simple skeleton.

export const StatCard = ({
  label, title, value, trend, trendDirection, hint, subtitle, icon,
  loading = false, warning = false, onClick, className = '',
}) => {
  if (loading) {
    return (
      <div className={`${styles.card} ${className}`}>
        <div className="animate-pulse flex flex-col space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-3 bg-slate-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const trendColor = trendDirection === 'up' ? 'text-emerald-500' : 
                     trendDirection === 'down' ? 'text-rose-500' : 'text-slate-500';

  const displayTitle = title || label;
  const displaySubtitle = subtitle || hint;

  const cardClasses = [
    styles.card,
    onClick ? 'cursor-pointer hover:border-blue-400 hover:shadow-md transition-all' : '',
    warning ? 'border-amber-300 bg-amber-50/50' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className={styles.header}>
        <div className={styles.title}>{displayTitle}</div>
        {icon && (
          <div className={styles.iconWrapper}>
            {React.isValidElement(icon) ? (
              icon
            ) : typeof icon === 'function' || (typeof icon === 'object' && icon !== null && icon.$$typeof) ? (
              React.createElement(icon, { className: 'w-5 h-5' })
            ) : null}
          </div>
        )}
      </div>
      <div className={styles.body}>
        <div className={`${styles.value} ${warning ? 'text-amber-700' : ''}`}>{value}</div>
        {trend && (
          <div className={`${styles.trend} ${trendColor}`}>
            {trend}
          </div>
        )}
      </div>
      {displaySubtitle && (
        <div className={styles.subtitle}>
          {typeof displaySubtitle === 'string' ? (
            <span className="text-slate-400">{displaySubtitle}</span>
          ) : (
            displaySubtitle
          )}
        </div>
      )}
    </div>
  );
};


export default StatCard;

import React from 'react';
import styles from './StatCard.module.css';
import { Loader } from './Loader'; // Assuming a Loader component exists or I can use a simple skeleton.

export const StatCard = ({ label, title, value, trend, trendDirection, hint, icon, loading = false }) => {
  if (loading) {
    return (
      <div className={styles.card}>
        <div className="animate-pulse flex flex-col space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-3 bg-slate-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // Set trend color based on direction
  const trendColor = trendDirection === 'up' ? 'text-emerald-500' : 
                     trendDirection === 'down' ? 'text-rose-500' : 'text-slate-500';

  const displayTitle = title || label;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>{displayTitle}</div>
        {icon && <div className={styles.iconWrapper}>{icon}</div>}
      </div>
      <div className={styles.body}>
        <div className={styles.value}>{value}</div>
        {trend && (
          <div className={`${styles.trend} ${trendColor}`}>
            {trend}
          </div>
        )}
      </div>
      {hint && (
        <div className={styles.subtitle}>
          <span className="text-slate-400">{hint}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;

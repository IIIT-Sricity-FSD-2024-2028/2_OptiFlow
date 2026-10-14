import React from "react";

// WHY: Badge visually communicates status, priority, or severity levels.
// Clean, modern soft design (typical of top SaaS platforms like Stripe/Vercel).

const THEMES = {
  // Status themes
  active: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  operational: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  
  pending: "bg-amber-50 text-amber-700 border-amber-200/80",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200/80",
  review: "bg-amber-50 text-amber-700 border-amber-200/80",
  warning: "bg-amber-50 text-amber-700 border-amber-200/80",
  
  failed: "bg-rose-50 text-rose-700 border-rose-200/80",
  blocked: "bg-rose-50 text-rose-700 border-rose-200/80",
  danger: "bg-rose-50 text-rose-700 border-rose-200/80",
  critical: "bg-rose-50 text-rose-700 border-rose-200/80",
  urgent: "bg-rose-50 text-rose-700 border-rose-200/80",

  info: "bg-blue-50 text-blue-700 border-blue-200/80",
  
  draft: "bg-slate-100 text-slate-700 border-slate-200/80",
  neutral: "bg-slate-100 text-slate-700 border-slate-200/80",
  inactive: "bg-slate-100 text-slate-600 border-slate-200/80",
  low: "bg-slate-100 text-slate-700 border-slate-200/80",
  medium: "bg-amber-50 text-amber-700 border-amber-200/80",
  high: "bg-rose-50 text-rose-700 border-rose-200/80",

  // Default fallback
  default: "bg-slate-100 text-slate-700 border-slate-200/80",
};

export const Badge = ({
  value,
  children,
  type = "status",
  status,
  variant,
  pulse = false,
  dot = false,
  className = "",
  ...props
}) => {
  const content = children !== undefined && children !== null ? children : (value ?? "");
  
  const statusKey = String(status || variant || (children ? value : null) || content)
    .toLowerCase()
    .trim()
    .replace(/[\s-]/g, "_");
  
  const themeMap = {
    error: 'failed',
    success: 'active',
    neutral: 'default',
    warning: 'pending',
  };
  
  const mappedKey = themeMap[statusKey] || statusKey;
  const baseClasses = THEMES[mappedKey] || THEMES.default;
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium leading-normal border ${baseClasses} ${className}`}
      {...props}
    >
      {content}
    </span>
  );
};

export default Badge;

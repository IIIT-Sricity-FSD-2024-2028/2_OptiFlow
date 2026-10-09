// WHY: Badge visually communicates status, priority, or severity levels.
// Clean, modern soft design (typical of top SaaS platforms like Stripe/Vercel).

const THEMES = {
  // Status themes
  active: "bg-emerald-50 text-emerald-700",
  approved: "bg-emerald-50 text-emerald-700",
  operational: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  
  pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-amber-50 text-amber-700",
  review: "bg-amber-50 text-amber-700",
  
  failed: "bg-rose-50 text-rose-700",
  blocked: "bg-rose-50 text-rose-700",
  danger: "bg-rose-50 text-rose-700",
  critical: "bg-rose-50 text-rose-700",
  urgent: "bg-rose-50 text-rose-700",

  info: "bg-blue-50 text-blue-700",
  
  draft: "bg-slate-100 text-slate-700",
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-rose-50 text-rose-700",

  // Default fallback
  default: "bg-slate-100 text-slate-700",
};

export const Badge = ({
  value,
  children,
  type = "status",
  status,
  variant,
  pulse = false,
  dot = false, // Ignored in simple design
  className = "",
  ...props
}) => {
  const content = value ?? children ?? "";
  
  const statusKey = String(status || variant || content).toLowerCase().trim().replace(/[\s-]/g, "_");
  
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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] font-medium tracking-tight ${baseClasses} ${className}`}
      {...props}
    >
      {content}
    </span>
  );
};

export default Badge;

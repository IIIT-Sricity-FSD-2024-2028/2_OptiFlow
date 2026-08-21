import { useState, useRef, useEffect, useMemo } from "react";
import {
  Bell,
  X,
  CheckCheck,
  Settings,
  ShieldAlert,
  FileCheck2,
  AlertTriangle,
  FileText,
  BookOpen,
  Search,
  Sparkles,
  Clock,
  MoreHorizontal,
  BellOff,
} from "lucide-react";

type NotificationTone = "critical" | "warning" | "info" | "success";
type NotificationModule = "Evidence" | "Violations" | "Reports" | "Rules" | "Audit";

interface NotificationItem {
  id: string;
  tone: NotificationTone;
  module: NotificationModule;
  title: string;
  message: string;
  time: string;
  minutesAgo: number;
  read: boolean;
  actor?: string;
}

const seedNotifications: NotificationItem[] = [
  {
    id: "n1",
    tone: "critical",
    module: "Violations",
    title: "Violation escalated to Legal",
    message: "VLN-2041 · Unauthorized data export — moved to Tier-1 review.",
    time: "2m ago",
    minutesAgo: 2,
    read: false,
    actor: "Auto-escalation engine",
  },
  {
    id: "n2",
    tone: "warning",
    module: "Evidence",
    title: "12 evidence items awaiting review",
    message: "SOC 2 control batch from Engineering is ready for triage.",
    time: "14m ago",
    minutesAgo: 14,
    read: false,
    actor: "Maya Chen",
  },
  {
    id: "n3",
    tone: "warning",
    module: "Audit",
    title: "Anomaly detected in Audit Log",
    message: "5 failed admin sign-ins from a new device in 90 seconds.",
    time: "38m ago",
    minutesAgo: 38,
    read: false,
    actor: "Anomaly detector",
  },
  {
    id: "n4",
    tone: "info",
    module: "Reports",
    title: "Quarterly SOX report is ready",
    message: "Q1 2026 generation complete — 84 pages, 12.4 MB.",
    time: "1h ago",
    minutesAgo: 60,
    read: false,
  },
  {
    id: "n5",
    tone: "info",
    module: "Rules",
    title: "Rule RUL-118 was updated",
    message: "Threshold for vendor DPA evidence raised to 30 days.",
    time: "3h ago",
    minutesAgo: 180,
    read: true,
    actor: "Daniel Park",
  },
  {
    id: "n6",
    tone: "success",
    module: "Evidence",
    title: "Evidence batch approved",
    message: "All 8 access-review attestations were signed off.",
    time: "Yesterday",
    minutesAgo: 1500,
    read: true,
    actor: "You",
  },
];

const moduleIcon: Record<NotificationModule, typeof Bell> = {
  Evidence: FileCheck2,
  Violations: ShieldAlert,
  Reports: FileText,
  Rules: BookOpen,
  Audit: AlertTriangle,
};

const toneStyles: Record<
  NotificationTone,
  { dot: string; iconWrap: string; label: string }
> = {
  critical: {
    dot: "bg-destructive",
    iconWrap: "bg-destructive/10 text-destructive",
    label: "Critical",
  },
  warning: {
    dot: "bg-warning",
    iconWrap: "bg-warning/15 text-warning-foreground",
    label: "Warning",
  },
  info: {
    dot: "bg-primary",
    iconWrap: "bg-primary/10 text-primary",
    label: "Info",
  },
  success: {
    dot: "bg-success",
    iconWrap: "bg-success/10 text-success",
    label: "Done",
  },
};

type Tab = "All" | "Unread" | "Critical";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(seedNotifications);
  const [tab, setTab] = useState<Tab>("All");
  const [quietMode, setQuietMode] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const unreadCount = items.filter((n) => !n.read).length;
  const criticalCount = items.filter((n) => n.tone === "critical" && !n.read).length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    let list = items;
    if (tab === "Unread") list = list.filter((n) => !n.read);
    if (tab === "Critical") list = list.filter((n) => n.tone === "critical");
    return list;
  }, [items, tab]);

  // Group by Today / Earlier
  const grouped = useMemo(() => {
    const today = filtered.filter((n) => n.minutesAgo < 24 * 60);
    const earlier = filtered.filter((n) => n.minutesAgo >= 24 * 60);
    return { today, earlier };
  }, [filtered]);

  const markAllRead = () => setItems((p) => p.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) =>
    setItems((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const dismiss = (id: string) => setItems((p) => p.filter((n) => n.id !== id));

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative h-9 w-9 rounded-lg hover:bg-secondary grid place-items-center transition-colors"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Subtle backdrop catcher for mobile */}
          <div className="fixed inset-0 z-30 md:hidden" aria-hidden />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notification center"
            className="absolute right-0 top-[calc(100%+10px)] z-40 w-[380px] max-w-[calc(100vw-2rem)] origin-top-right animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          >
            {/* Caret */}
            <div className="absolute -top-1.5 right-3.5 h-3 w-3 rotate-45 rounded-[2px] bg-card border-l border-t border-border" />

            <div className="rounded-2xl bg-card border border-border shadow-2xl shadow-black/10 overflow-hidden flex flex-col max-h-[560px]">
              {/* Header */}
              <div className="px-4 pt-4 pb-3 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold tracking-tight text-foreground">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-[10.5px] font-semibold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQuietMode((v) => !v)}
                      title={quietMode ? "Quiet mode on" : "Quiet mode off"}
                      className={`h-7 w-7 rounded-md grid place-items-center transition-colors ${
                        quietMode
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <BellOff className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={markAllRead}
                      disabled={unreadCount === 0}
                      className="h-7 px-2 rounded-md text-[11.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:hover:bg-transparent inline-flex items-center gap-1"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all
                    </button>
                    <button
                      onClick={() => setOpen(false)}
                      className="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-secondary/70">
                  {(["All", "Unread", "Critical"] as Tab[]).map((t) => {
                    const count =
                      t === "All"
                        ? items.length
                        : t === "Unread"
                        ? unreadCount
                        : criticalCount;
                    const active = tab === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 h-7 rounded-md text-[11.5px] font-medium transition-all inline-flex items-center justify-center gap-1.5 ${
                          active
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t}
                        <span
                          className={`text-[10px] px-1 rounded ${
                            active ? "bg-secondary text-muted-foreground" : "text-muted-foreground/70"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quiet mode banner */}
              {quietMode && (
                <div className="px-4 py-2 bg-warning/10 border-b border-warning/20 flex items-center gap-2 text-[11.5px] text-warning-foreground">
                  <BellOff className="h-3.5 w-3.5" />
                  Quiet mode is on — only critical alerts will surface.
                </div>
              )}

              {/* Feed */}
              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="mx-auto h-10 w-10 rounded-full bg-secondary grid place-items-center mb-3">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-[13px] font-medium text-foreground">All clear</div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">
                      No notifications match this filter.
                    </div>
                  </div>
                ) : (
                  <>
                    {grouped.today.length > 0 && (
                      <Group label="Today" items={grouped.today} onRead={markRead} onDismiss={dismiss} />
                    )}
                    {grouped.earlier.length > 0 && (
                      <Group
                        label="Earlier"
                        items={grouped.earlier}
                        onRead={markRead}
                        onDismiss={dismiss}
                      />
                    )}
                  </>
                )}
              </div>

              {/* AI tip */}
              {filtered.length > 0 && (
                <div className="px-4 py-2.5 border-t border-border bg-gradient-to-r from-primary/5 via-transparent to-transparent flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-[11.5px] text-muted-foreground">
                    AI ranked <span className="font-medium text-foreground">VLN-2041</span> as
                    your top priority.
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="px-3 py-2 border-t border-border flex items-center justify-between bg-background/50">
                <button className="h-7 px-2 rounded-md text-[11.5px] font-medium text-primary hover:bg-primary/10 transition-colors">
                  View all activity
                </button>
                <button className="h-7 px-2 rounded-md text-[11.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Group({
  label,
  items,
  onRead,
  onDismiss,
}: {
  label: string;
  items: NotificationItem[];
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <div>
      <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
        <Clock className="h-3 w-3 text-muted-foreground/70" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex-1 h-px bg-border/60" />
      </div>
      <ul>
        {items.map((n) => (
          <NotificationRow key={n.id} item={n} onRead={onRead} onDismiss={onDismiss} />
        ))}
      </ul>
    </div>
  );
}

function NotificationRow({
  item,
  onRead,
  onDismiss,
}: {
  item: NotificationItem;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const Icon = moduleIcon[item.module];
  const tone = toneStyles[item.tone];
  return (
    <li
      onClick={() => onRead(item.id)}
      className={`group relative flex gap-3 px-4 py-3 cursor-pointer transition-colors border-l-2 ${
        item.read
          ? "border-transparent hover:bg-secondary/50"
          : "border-primary bg-primary/[0.03] hover:bg-primary/[0.06]"
      }`}
    >
      <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${tone.iconWrap}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {!item.read && (
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${tone.dot}`} />
            )}
            <span className="text-[12.5px] font-semibold text-foreground truncate leading-tight">
              {item.title}
            </span>
          </div>
          <span className="text-[10.5px] text-muted-foreground shrink-0 tabular-nums">
            {item.time}
          </span>
        </div>
        <p className="text-[11.5px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
          {item.message}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80 px-1.5 py-0.5 rounded bg-secondary/80">
            {item.module}
          </span>
          {item.actor && (
            <span className="text-[10.5px] text-muted-foreground/80 truncate">
              {item.actor}
            </span>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-card/95 backdrop-blur rounded-md border border-border shadow-sm px-0.5 py-0.5">
        {!item.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRead(item.id);
            }}
            title="Mark as read"
            className="h-6 w-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <CheckCheck className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(item.id);
          }}
          title="Dismiss"
          className="h-6 w-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <X className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          title="More"
          className="h-6 w-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <MoreHorizontal className="h-3 w-3" />
        </button>
      </div>
    </li>
  );
}

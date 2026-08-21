import {
  LayoutDashboard,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  ScrollText,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import logo from "@/assets/logo-light.svg";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
  badge?: string | null;
  tone?: "danger" | "default";
};

const workspaceNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Evidence", icon: FileCheck2, to: "/evidence", badge: "23" },
  { label: "Violations", icon: AlertTriangle, to: "/violations", badge: "7", tone: "danger" },
  { label: "Rules", icon: ShieldCheck, to: "/rules", badge: "128" },
];

const insightsNav: NavItem[] = [
  { label: "Reports", icon: BarChart3, to: "/reports" },
  { label: "Audit Log", icon: ScrollText, to: "/audit" },
];

const secondary = [{ label: "Settings", icon: Settings }];

export function Sidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden lg:flex flex-col w-[260px] shrink-0 bg-sidebar-bg text-sidebar-fg sticky top-0 h-screen border-r border-sidebar-border-subtle/60">
      {/* Branding header */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="OfficeSync"
            className="h-7 w-auto object-contain block select-none"
            draggable={false}
          />
        </div>
      </div>

      <div className="mx-5 h-px bg-sidebar-border-subtle/60" />

      {/* Nav */}
      <nav className="px-3 mt-5 flex-1 overflow-y-auto">
        <NavGroup label="Workspace" items={workspaceNav} currentPath={currentPath} />
        <NavGroup label="Insights" items={insightsNav} currentPath={currentPath} className="mt-5" />

        <div className="mt-6 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-fg-muted/80">
          System
        </div>
        <div className="space-y-0.5">
          {secondary.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="group w-full relative flex items-center gap-3 pl-3 pr-2.5 py-2 rounded-lg text-[13px] text-sidebar-fg hover:bg-sidebar-bg-elevated/70 hover:text-white transition-all"
              >
                <Icon className="h-4 w-4 text-sidebar-fg-muted group-hover:text-white transition-colors" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* User footer */}
      <div className="mt-3 mx-3 mb-3 rounded-xl bg-sidebar-bg-elevated/60 ring-1 ring-inset ring-white/[0.04] p-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-[12px] font-semibold text-white">
              EM
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-sidebar-bg-elevated" />
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[12.5px] font-medium text-white truncate">Elena Martins</div>
            <div className="mt-0.5">
              <span className="inline-flex items-center text-[9px] font-semibold uppercase tracking-[0.1em] text-primary-foreground bg-primary/30 px-1.5 py-0.5 rounded">
                Compliance Officer
              </span>
            </div>
          </div>
          <button
            aria-label="Sign out"
            className="h-7 w-7 rounded-md grid place-items-center text-sidebar-fg-muted hover:text-white hover:bg-sidebar-bg-elevated transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  items,
  currentPath,
  className = "",
}: {
  label: string;
  items: NavItem[];
  currentPath: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-fg-muted/80">
        {label}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = currentPath === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`group relative flex items-center gap-3 pl-3 pr-2.5 py-2 rounded-lg text-[13px] transition-all ${
                active
                  ? "bg-sidebar-bg-elevated text-white font-medium"
                  : "text-sidebar-fg hover:bg-sidebar-bg-elevated/70 hover:text-white"
              }`}
            >
              {/* Active accent bar */}
              <span
                className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full transition-all ${
                  active ? "bg-sidebar-active opacity-100" : "opacity-0"
                }`}
              />
              <Icon
                className={`h-4 w-4 transition-colors ${
                  active
                    ? "text-sidebar-active"
                    : "text-sidebar-fg-muted group-hover:text-white"
                }`}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md transition-colors ${
                    item.tone === "danger"
                      ? "bg-destructive/25 text-destructive-soft ring-1 ring-inset ring-destructive/30"
                      : active
                      ? "bg-sidebar-active/20 text-white ring-1 ring-inset ring-sidebar-active/30"
                      : "bg-sidebar-bg/80 text-sidebar-fg-muted ring-1 ring-inset ring-white/[0.04] group-hover:text-white"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

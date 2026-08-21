

### File: src\routes\index.tsx
```tsx
import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/compliance/Sidebar";
import { Topbar } from "@/components/compliance/Topbar";
import { ComplianceScore } from "@/components/compliance/ComplianceScore";
import { StatCards } from "@/components/compliance/StatCards";
import { TrendChart } from "@/components/compliance/TrendChart";
import { RiskByDepartment } from "@/components/compliance/RiskByDepartment";
import { AlertsList } from "@/components/compliance/AlertsList";
import { AuditFeed } from "@/components/compliance/AuditFeed";
import { QuickActions } from "@/components/compliance/QuickActions";
import { EvidenceQueue } from "@/components/compliance/EvidenceQueue";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Compliance Overview · OfficeSync" },
      {
        name: "description",
        content:
          "OfficeSync compliance dashboard — monitor health, violations, evidence, audit activity and risk across your organization.",
      },
    ],
  }),
});

function Dashboard() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 px-6 lg:px-8 py-7 space-y-6 max-w-[1500px] w-full mx-auto">
          {/* Hero header */}
          <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <div className="text-[12px] font-medium text-primary mb-1.5">Good morning, Elena</div>
              <h1 className="text-[26px] md:text-[28px] font-semibold tracking-tight text-foreground leading-tight">
                Compliance overview
              </h1>
              <p className="text-[13.5px] text-muted-foreground mt-1.5 max-w-xl">
                A real-time pulse of your organization's controls, evidence and risk posture.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[12px]">
              <div className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-success-soft text-success font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                All systems monitored
              </div>
            </div>
          </section>

          {/* Top row: score + stats */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <ComplianceScore />
            <div className="lg:col-span-1">
              <QuickActions />
            </div>
          </section>

          <section>
            <StatCards />
          </section>

          {/* Trend + risk */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <TrendChart />
            <RiskByDepartment />
          </section>

          {/* Alerts + audit */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <AlertsList />
            <AuditFeed />
          </section>

          {/* Evidence */}
          <section>
            <EvidenceQueue />
          </section>

          <footer className="pt-4 pb-2 text-center text-[11.5px] text-muted-foreground">
            OfficeSync Compliance · synced 2 minutes ago
          </footer>
        </main>
      </div>
    </div>
  );
}

```


### File: src\components\compliance\Sidebar.tsx
```tsx
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

```


### File: src\assets\logo-light.svg
```tsx
<svg width="260" height="37" viewBox="0 0 260 37" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M27.4971 18.1465L27.3076 18.0986C27.137 18.0556 26.9666 18.0121 26.791 17.9678C26.4567 17.8424 26.3146 17.7881 26.1885 17.7129C26.0605 17.6365 25.9449 17.5362 25.6689 17.2949L25.666 17.292C24.9101 16.6517 23.9787 16.3494 23.0273 16.208C22.0778 16.067 21.0852 16.0831 20.1992 16.0967C19.9965 16.0961 19.7938 16.0963 19.585 16.0957H19.582C18.4749 16.1032 17.4791 16.2022 16.4004 16.4629C15.6431 16.6122 14.8841 16.6003 14.0771 16.5928H14.0732C13.9103 16.5943 13.7469 16.5951 13.5791 16.5967C12.5009 16.5932 11.659 16.4305 10.6914 15.9834C10.2699 15.5089 10.241 15.0038 10.252 14.2988C10.3424 13.485 10.474 12.8731 10.9424 12.252C11.572 11.823 12.052 11.6309 12.8096 11.6309H13.0596V11.1797C15.3687 10.4924 17.5035 10.2668 19.9414 10.2529C20.0947 10.252 20.2484 10.251 20.4062 10.25C22.4363 10.2558 24.2215 10.4601 26.126 11.1094L26.1289 11.1104C26.3096 11.1691 26.4906 11.2275 26.6768 11.2881C28.2465 11.8079 29.4577 12.4148 30.6953 13.457L30.6982 13.459C30.875 13.6034 30.8758 13.6039 31.0547 13.75V13.751C32.9274 15.3102 34.0047 17.0121 34.8848 19.2422V19.2432C34.936 19.3727 34.9872 19.5023 35.04 19.6357V19.6367C36.2026 22.6834 35.8482 26.0954 34.6133 29.0977C34.3792 29.5645 34.0566 29.9345 33.6777 30.3545L33.6602 30.375L33.6465 30.3984C33.5612 30.5485 33.4764 30.6992 33.3887 30.8535C32.9582 31.4928 32.4151 31.9372 31.7764 32.4551L31.7754 32.4561C31.5883 32.6093 31.5872 32.6093 31.3975 32.7646C30.4999 33.4854 29.5941 34.0577 28.5439 34.5498L28.5303 34.5566L28.5176 34.5645C28.2747 34.7167 28.2698 34.7202 28.0322 34.8691C26.5234 35.6693 25.0919 35.7724 23.3398 35.7471H22.6836C20.1428 35.7306 17.6249 35.15 15.4658 33.8594V33.4043L15.2568 33.3691C15.1472 33.3507 15.0375 33.3324 14.9248 33.3135C13.9338 33.0139 13.1813 32.1921 12.6387 31.3008C12.3651 30.3517 12.274 29.6217 12.6865 28.7549C12.8335 28.5711 12.8414 28.5628 13.0049 28.3584L13.0068 28.3555C13.0853 28.2546 13.1628 28.1531 13.2432 28.0498C13.6044 27.8013 14.0818 27.6726 14.6055 27.625C15.1307 27.5773 15.6815 27.6128 16.1641 27.6738C16.7246 27.8585 17.2526 28.1017 17.7871 28.3643L18.333 28.6357L18.7393 28.8369C18.9094 28.9251 18.9108 28.9262 19.0869 29.0176L19.0957 29.0225L19.1045 29.0264C21.3749 29.9877 24.1724 29.9165 26.4531 29.0693L26.4668 29.0645L26.4805 29.0576C27.239 28.668 27.5839 28.2468 28.0322 27.6006C28.2145 27.4558 28.225 27.4487 28.4297 27.2861L28.4482 27.2715L28.4639 27.2539C29.4335 26.1318 29.6064 24.5973 29.5605 23.2529V23.2412L29.5586 23.2305L29.5127 22.9268C29.4244 22.428 29.2777 21.962 29.1025 21.502L28.8809 20.9512C28.8338 20.8278 28.7867 20.7043 28.7383 20.5771L28.7363 20.5723C28.4326 19.8161 28.0595 19.348 27.4971 18.8145V18.1465Z" fill="#E8F0FF"/>
<path d="M27.4971 18.1465L27.3076 18.0986C27.137 18.0556 26.9666 18.0121 26.791 17.9678C26.4567 17.8424 26.3146 17.7881 26.1885 17.7129C26.0605 17.6365 25.9449 17.5362 25.6689 17.2949L25.666 17.292C24.9101 16.6517 23.9787 16.3494 23.0273 16.208C22.0778 16.067 21.0852 16.0831 20.1992 16.0967C19.9965 16.0961 19.7938 16.0963 19.585 16.0957H19.582C18.4749 16.1032 17.4791 16.2022 16.4004 16.4629C15.6431 16.6122 14.8841 16.6003 14.0771 16.5928H14.0732C13.9103 16.5943 13.7469 16.5951 13.5791 16.5967C12.5009 16.5932 11.659 16.4305 10.6914 15.9834C10.2699 15.5089 10.241 15.0038 10.252 14.2988C10.3424 13.485 10.474 12.8731 10.9424 12.252C11.572 11.823 12.052 11.6309 12.8096 11.6309H13.0596V11.1797C15.3687 10.4924 17.5035 10.2668 19.9414 10.2529C20.0947 10.252 20.2484 10.251 20.4062 10.25C22.4363 10.2558 24.2215 10.4601 26.126 11.1094L26.1289 11.1104C26.3096 11.1691 26.4906 11.2275 26.6768 11.2881C28.2465 11.8079 29.4577 12.4148 30.6953 13.457L30.6982 13.459C30.875 13.6034 30.8758 13.6039 31.0547 13.75V13.751C32.9274 15.3102 34.0047 17.0121 34.8848 19.2422V19.2432C34.936 19.3727 34.9872 19.5023 35.04 19.6357V19.6367C36.2026 22.6834 35.8482 26.0954 34.6133 29.0977C34.3792 29.5645 34.0566 29.9345 33.6777 30.3545L33.6602 30.375L33.6465 30.3984C33.5612 30.5485 33.4764 30.6992 33.3887 30.8535C32.9582 31.4928 32.4151 31.9372 31.7764 32.4551L31.7754 32.4561C31.5883 32.6093 31.5872 32.6093 31.3975 32.7646C30.4999 33.4854 29.5941 34.0577 28.5439 34.5498L28.5303 34.5566L28.5176 34.5645C28.2747 34.7167 28.2698 34.7202 28.0322 34.8691C26.5234 35.6693 25.0919 35.7724 23.3398 35.7471H22.6836C20.1428 35.7306 17.6249 35.15 15.4658 33.8594V33.4043L15.2568 33.3691C15.1472 33.3507 15.0375 33.3324 14.9248 33.3135C13.9338 33.0139 13.1813 32.1921 12.6387 31.3008C12.3651 30.3517 12.274 29.6217 12.6865 28.7549C12.8335 28.5711 12.8414 28.5628 13.0049 28.3584L13.0068 28.3555C13.0853 28.2546 13.1628 28.1531 13.2432 28.0498C13.6044 27.8013 14.0818 27.6726 14.6055 27.625C15.1307 27.5773 15.6815 27.6128 16.1641 27.6738C16.7246 27.8585 17.2526 28.1017 17.7871 28.3643L18.333 28.6357L18.7393 28.8369C18.9094 28.9251 18.9108 28.9262 19.0869 29.0176L19.0957 29.0225L19.1045 29.0264C21.3749 29.9877 24.1724 29.9165 26.4531 29.0693L26.4668 29.0645L26.4805 29.0576C27.239 28.668 27.5839 28.2468 28.0322 27.6006C28.2145 27.4558 28.225 27.4487 28.4297 27.2861L28.4482 27.2715L28.4639 27.2539C29.4335 26.1318 29.6064 24.5973 29.5605 23.2529V23.2412L29.5586 23.2305L29.5127 22.9268C29.4244 22.428 29.2777 21.962 29.1025 21.502L28.8809 20.9512C28.8338 20.8278 28.7867 20.7043 28.7383 20.5771L28.7363 20.5723C28.4326 19.8161 28.0595 19.348 27.4971 18.8145V18.1465Z" stroke="#3B82F6" stroke-width="0.5"/>
<path d="M27.4971 18.1465L27.3076 18.0986C27.137 18.0556 26.9666 18.0121 26.791 17.9678C26.4567 17.8424 26.3146 17.7881 26.1885 17.7129C26.0605 17.6365 25.9449 17.5362 25.6689 17.2949L25.666 17.292C24.9101 16.6517 23.9787 16.3494 23.0273 16.208C22.0778 16.067 21.0852 16.0831 20.1992 16.0967C19.9965 16.0961 19.7938 16.0963 19.585 16.0957H19.582C18.4749 16.1032 17.4791 16.2022 16.4004 16.4629C15.6431 16.6122 14.8841 16.6003 14.0771 16.5928H14.0732C13.9103 16.5943 13.7469 16.5951 13.5791 16.5967C12.5009 16.5932 11.659 16.4305 10.6914 15.9834C10.2699 15.5089 10.241 15.0038 10.252 14.2988C10.3424 13.485 10.474 12.8731 10.9424 12.252C11.572 11.823 12.052 11.6309 12.8096 11.6309H13.0596V11.1797C15.3687 10.4924 17.5035 10.2668 19.9414 10.2529C20.0947 10.252 20.2484 10.251 20.4062 10.25C22.4363 10.2558 24.2215 10.4601 26.126 11.1094L26.1289 11.1104C26.3096 11.1691 26.4906 11.2275 26.6768 11.2881C28.2465 11.8079 29.4577 12.4148 30.6953 13.457L30.6982 13.459C30.875 13.6034 30.8758 13.6039 31.0547 13.75V13.751C32.9274 15.3102 34.0047 17.0121 34.8848 19.2422V19.2432C34.936 19.3727 34.9872 19.5023 35.04 19.6357V19.6367C36.2026 22.6834 35.8482 26.0954 34.6133 29.0977C34.3792 29.5645 34.0566 29.9345 33.6777 30.3545L33.6602 30.375L33.6465 30.3984C33.5612 30.5485 33.4764 30.6992 33.3887 30.8535C32.9582 31.4928 32.4151 31.9372 31.7764 32.4551L31.7754 32.4561C31.5883 32.6093 31.5872 32.6093 31.3975 32.7646C30.4999 33.4854 29.5941 34.0577 28.5439 34.5498L28.5303 34.5566L28.5176 34.5645C28.2747 34.7167 28.2698 34.7202 28.0322 34.8691C26.5234 35.6693 25.0919 35.7724 23.3398 35.7471H22.6836C20.1428 35.7306 17.6249 35.15 15.4658 33.8594V33.4043L15.2568 33.3691C15.1472 33.3507 15.0375 33.3324 14.9248 33.3135C13.9338 33.0139 13.1813 32.1921 12.6387 31.3008C12.3651 30.3517 12.274 29.6217 12.6865 28.7549C12.8335 28.5711 12.8414 28.5628 13.0049 28.3584L13.0068 28.3555C13.0853 28.2546 13.1628 28.1531 13.2432 28.0498C13.6044 27.8013 14.0818 27.6726 14.6055 27.625C15.1307 27.5773 15.6815 27.6128 16.1641 27.6738C16.7246 27.8585 17.2526 28.1017 17.7871 28.3643L18.333 28.6357L18.7393 28.8369C18.9094 28.9251 18.9108 28.9262 19.0869 29.0176L19.0957 29.0225L19.1045 29.0264C21.3749 29.9877 24.1724 29.9165 26.4531 29.0693L26.4668 29.0645L26.4805 29.0576C27.239 28.668 27.5839 28.2468 28.0322 27.6006C28.2145 27.4558 28.225 27.4487 28.4297 27.2861L28.4482 27.2715L28.4639 27.2539C29.4335 26.1318 29.6064 24.5973 29.5605 23.2529V23.2412L29.5586 23.2305L29.5127 22.9268C29.4244 22.428 29.2777 21.962 29.1025 21.502L28.8809 20.9512C28.8338 20.8278 28.7867 20.7043 28.7383 20.5771L28.7363 20.5723C28.4326 19.8161 28.0595 19.348 27.4971 18.8145V18.1465Z" stroke="#002885" stroke-width="0.5"/>
<path d="M12.9355 0.25C14.0217 0.254166 14.9136 0.361767 15.9092 0.743164L15.9121 0.744141C16.3245 0.895815 16.7246 0.984632 17.1367 1.06934C17.8521 1.26912 18.1391 1.49897 18.7373 1.9873L18.7637 2.00781L18.793 2.02148C19.083 2.15192 19.3765 2.27458 19.6709 2.39258V2.39355C20.401 2.69781 20.8755 3.03372 21.3818 3.63184C21.6589 4.47952 21.6455 5.34675 21.4316 6.23145C21.0814 6.79085 20.6082 7.14512 19.9863 7.45605C18.3454 7.61322 17.1191 7.60414 15.8193 6.64453L15.8125 6.63867L15.8047 6.63379C14.6461 5.90023 13.3931 5.85769 12.1387 5.85547H12.1396C11.9192 5.84848 11.919 5.84893 11.6943 5.8418V5.84082H11.6875C9.85707 5.83159 8.5584 6.68607 7.30078 7.85352L7.28516 7.86914C6.16259 9.11531 5.96525 10.5468 5.98047 12.0459L5.99805 12.6924L5.99902 12.7031C6.07875 13.6281 6.20864 14.5679 6.67188 15.4424L6.70117 15.499L6.75488 15.5342C6.93065 15.6495 7.10686 15.7645 7.28711 15.8828C7.36511 16.0154 7.44311 16.1486 7.52344 16.2852L7.52734 16.292C8.17849 17.3274 9.09873 17.767 10.1533 18.1777C10.3599 18.2592 10.5664 18.3409 10.7793 18.4248L10.7812 18.4258C10.9474 18.4894 10.9966 18.5079 11.0957 18.5459V19.001L11.3408 19.0059L13.6035 19.0371C13.9812 19.0413 14.3593 19.0483 14.7383 19.0557H14.7412C16.222 19.0668 17.5284 18.9254 18.9648 18.5605C19.5422 18.4251 20.1036 18.3601 20.6865 18.3369L21.2793 18.3262C21.4998 18.3262 21.5024 18.3261 21.7227 18.3262L22.0879 18.3457C22.4355 18.3733 22.733 18.4274 23.0088 18.5244C23.369 18.6512 23.7055 18.8566 24.0723 19.1924C24.3631 19.544 24.5307 19.8148 24.627 20.0967C24.7225 20.3764 24.7538 20.6854 24.748 21.123C24.5713 21.8834 24.0067 22.3314 23.3672 22.9609L23.3516 22.9756L23.3389 22.9932C23.2473 23.1214 23.1557 23.25 23.0615 23.3818C22.6675 23.8655 22.0534 24.1102 21.3359 24.248C20.6071 24.388 19.8642 24.4062 19.1709 24.4893C17.0658 24.7053 14.6869 24.8649 12.3936 24.6436C10.2425 24.4359 8.18406 23.895 6.50098 22.7666L6.16992 22.5332C6.05331 22.4383 5.93655 22.3429 5.81641 22.2451C5.6591 22.111 5.5634 22.0291 5.44531 21.9541C5.33197 21.8821 5.19985 21.8167 4.97461 21.707C4.27525 21.2449 3.78668 20.6113 3.21191 19.9287L3.20801 19.9248L2.92676 19.6045H2.92773C2.44701 19.0543 2.05004 18.5001 1.68848 17.8691L1.68457 17.8623L1.68066 17.8564L1.37891 17.3926C-0.0374692 14.8948 0.0339794 11.2964 0.743164 8.53418C1.57599 5.67509 3.67461 3.24422 6.24805 1.64648C8.09577 0.693433 9.87361 0.283725 11.9209 0.256836H12.3398C12.5363 0.254636 12.7332 0.252266 12.9355 0.25Z" fill="#E8F0FF" stroke="#3B82F6" stroke-width="0.5"/>
<path d="M56.17 30.36C54.61 30.36 53.15 30.08 51.79 29.52C50.45 28.94 49.27 28.14 48.25 27.12C47.23 26.08 46.43 24.86 45.85 23.46C45.27 22.04 44.98 20.49 44.98 18.81C44.98 17.13 45.27 15.59 45.85 14.19C46.43 12.77 47.23 11.55 48.25 10.53C49.27 9.49 50.45 8.69 51.79 8.13C53.15 7.57 54.61 7.29 56.17 7.29C57.73 7.29 59.18 7.58 60.52 8.16C61.88 8.72 63.07 9.52 64.09 10.56C65.11 11.58 65.91 12.79 66.49 14.19C67.07 15.59 67.36 17.13 67.36 18.81C67.36 20.49 67.07 22.04 66.49 23.46C65.91 24.86 65.11 26.08 64.09 27.12C63.07 28.14 61.88 28.94 60.52 29.52C59.18 30.08 57.73 30.36 56.17 30.36ZM56.17 28.11C57.47 28.11 58.65 27.87 59.71 27.39C60.79 26.91 61.72 26.24 62.5 25.38C63.28 24.52 63.88 23.53 64.3 22.41C64.74 21.29 64.96 20.09 64.96 18.81C64.96 17.55 64.74 16.36 64.3 15.24C63.88 14.12 63.28 13.13 62.5 12.27C61.72 11.41 60.79 10.74 59.71 10.26C58.65 9.78 57.47 9.54 56.17 9.54C54.87 9.54 53.68 9.78 52.6 10.26C51.54 10.74 50.62 11.41 49.84 12.27C49.06 13.13 48.45 14.12 48.01 15.24C47.59 16.36 47.38 17.55 47.38 18.81C47.38 20.09 47.59 21.29 48.01 22.41C48.45 23.53 49.06 24.52 49.84 25.38C50.62 26.24 51.55 26.91 52.63 27.39C53.71 27.87 54.89 28.11 56.17 28.11ZM73.2979 30V16.17H70.0879V13.92H73.2979V12.48C73.2979 11.36 73.5479 10.42 74.0479 9.66C74.5479 8.88 75.2079 8.29 76.0279 7.89C76.8479 7.49 77.7279 7.29 78.6679 7.29C78.8679 7.29 79.0979 7.31 79.3579 7.35C79.6179 7.37 79.8279 7.4 79.9879 7.44V9.48C79.8479 9.44 79.6579 9.42 79.4179 9.42C79.1779 9.4 79.0079 9.39 78.9079 9.39C77.9479 9.39 77.1479 9.62 76.5079 10.08C75.8679 10.54 75.5479 11.34 75.5479 12.48V13.92H84.5779V16.17H75.5479V30H73.2979ZM94.1779 30V13.92H96.4279V30H94.1779ZM84.7879 30V16.17H81.5779V13.92H84.7879V12.48C84.7879 11.36 85.0379 10.42 85.5379 9.66C86.0379 8.88 86.6979 8.29 87.5179 7.89C88.3379 7.49 89.2179 7.29 90.1579 7.29C90.3579 7.29 90.5879 7.31 90.8479 7.35C91.1079 7.37 91.3179 7.4 91.4779 7.44V9.48C91.3379 9.44 91.1479 9.42 90.9079 9.42C90.6679 9.4 90.4979 9.39 90.3979 9.39C89.4379 9.39 88.6379 9.62 87.9979 10.08C87.3579 10.54 87.0379 11.34 87.0379 12.48V13.92H96.0679V16.17H87.0379V30H84.7879ZM107.943 30.36C106.363 30.36 104.973 29.99 103.773 29.25C102.573 28.51 101.633 27.51 100.953 26.25C100.273 24.97 99.9332 23.53 99.9332 21.93C99.9332 20.33 100.273 18.9 100.953 17.64C101.633 16.38 102.573 15.39 103.773 14.67C104.973 13.93 106.363 13.56 107.943 13.56C108.943 13.56 109.883 13.74 110.763 14.1C111.643 14.46 112.423 14.95 113.103 15.57C113.783 16.17 114.293 16.87 114.633 17.67L112.593 18.72C112.193 17.86 111.583 17.16 110.763 16.62C109.943 16.08 109.003 15.81 107.943 15.81C106.883 15.81 105.923 16.08 105.063 16.62C104.223 17.14 103.553 17.87 103.053 18.81C102.573 19.73 102.333 20.78 102.333 21.96C102.333 23.12 102.573 24.17 103.053 25.11C103.553 26.03 104.223 26.76 105.063 27.3C105.923 27.84 106.883 28.11 107.943 28.11C109.003 28.11 109.933 27.84 110.733 27.3C111.553 26.76 112.173 26.04 112.593 25.14L114.633 26.25C114.293 27.03 113.783 27.73 113.103 28.35C112.423 28.97 111.643 29.46 110.763 29.82C109.883 30.18 108.943 30.36 107.943 30.36ZM125.901 30.36C124.401 30.36 123.041 30 121.821 29.28C120.621 28.54 119.671 27.53 118.971 26.25C118.271 24.97 117.921 23.52 117.921 21.9C117.921 20.28 118.261 18.85 118.941 17.61C119.621 16.35 120.541 15.36 121.701 14.64C122.881 13.92 124.201 13.56 125.661 13.56C126.821 13.56 127.851 13.78 128.751 14.22C129.671 14.64 130.451 15.22 131.091 15.96C131.731 16.68 132.221 17.5 132.561 18.42C132.901 19.32 133.071 20.25 133.071 21.21C133.071 21.41 133.061 21.64 133.041 21.9C133.021 22.14 132.991 22.39 132.951 22.65H119.361V20.55H131.661L130.581 21.45C130.761 20.35 130.631 19.37 130.191 18.51C129.771 17.63 129.161 16.94 128.361 16.44C127.561 15.92 126.661 15.66 125.661 15.66C124.661 15.66 123.731 15.92 122.871 16.44C122.031 16.96 121.371 17.69 120.891 18.63C120.411 19.55 120.221 20.65 120.321 21.93C120.221 23.21 120.421 24.33 120.921 25.29C121.441 26.23 122.141 26.96 123.021 27.48C123.921 28 124.881 28.26 125.901 28.26C127.081 28.26 128.071 27.98 128.871 27.42C129.671 26.86 130.321 26.16 130.821 25.32L132.741 26.34C132.421 27.06 131.931 27.73 131.271 28.35C130.611 28.95 129.821 29.44 128.901 29.82C128.001 30.18 127.001 30.36 125.901 30.36ZM144.899 30.36C143.479 30.36 142.189 30.09 141.029 29.55C139.869 29.01 138.889 28.29 138.089 27.39C137.289 26.47 136.719 25.46 136.379 24.36L138.539 23.55C139.059 25.07 139.869 26.23 140.969 27.03C142.069 27.81 143.379 28.2 144.899 28.2C145.859 28.2 146.699 28.05 147.419 27.75C148.159 27.43 148.729 26.99 149.129 26.43C149.529 25.87 149.729 25.22 149.729 24.48C149.729 23.38 149.429 22.53 148.829 21.93C148.229 21.33 147.369 20.87 146.249 20.55L142.229 19.35C140.649 18.89 139.429 18.12 138.569 17.04C137.729 15.96 137.309 14.73 137.309 13.35C137.309 12.17 137.599 11.13 138.179 10.23C138.759 9.31 139.549 8.59 140.549 8.07C141.569 7.55 142.719 7.29 143.999 7.29C145.339 7.29 146.539 7.54 147.599 8.04C148.679 8.52 149.589 9.16 150.329 9.96C151.069 10.76 151.599 11.65 151.919 12.63L149.819 13.47C149.339 12.15 148.589 11.15 147.569 10.47C146.569 9.79 145.389 9.45 144.029 9.45C143.169 9.45 142.409 9.6 141.749 9.9C141.109 10.2 140.609 10.63 140.249 11.19C139.889 11.75 139.709 12.41 139.709 13.17C139.709 14.09 139.999 14.92 140.579 15.66C141.159 16.38 142.049 16.92 143.249 17.28L146.789 18.33C148.549 18.85 149.879 19.6 150.779 20.58C151.679 21.56 152.129 22.79 152.129 24.27C152.129 25.47 151.819 26.53 151.199 27.45C150.599 28.35 149.749 29.06 148.649 29.58C147.569 30.1 146.319 30.36 144.899 30.36ZM156.763 36.6C156.443 36.6 156.113 36.57 155.773 36.51C155.453 36.47 155.133 36.39 154.813 36.27V34.17C155.013 34.19 155.263 34.22 155.563 34.26C155.883 34.32 156.203 34.35 156.523 34.35C157.503 34.35 158.253 34.14 158.773 33.72C159.293 33.32 159.803 32.54 160.303 31.38L161.323 28.98L161.263 30.96L154.453 13.92H156.883L162.463 27.99H161.833L167.383 13.92H169.873L162.523 32.04C162.203 32.82 161.793 33.56 161.293 34.26C160.813 34.96 160.203 35.52 159.463 35.94C158.723 36.38 157.823 36.6 156.763 36.6ZM172.517 30V13.92H174.767V17.04L174.257 16.92C174.657 15.88 175.307 15.06 176.207 14.46C177.127 13.86 178.187 13.56 179.387 13.56C180.527 13.56 181.547 13.82 182.447 14.34C183.367 14.86 184.087 15.58 184.607 16.5C185.147 17.4 185.417 18.42 185.417 19.56V30H183.167V20.43C183.167 19.45 182.987 18.62 182.627 17.94C182.287 17.26 181.797 16.74 181.157 16.38C180.537 16 179.817 15.81 178.997 15.81C178.177 15.81 177.447 16 176.807 16.38C176.167 16.74 175.667 17.27 175.307 17.97C174.947 18.65 174.767 19.47 174.767 20.43V30H172.517ZM197.064 30.36C195.484 30.36 194.094 29.99 192.894 29.25C191.694 28.51 190.754 27.51 190.074 26.25C189.394 24.97 189.054 23.53 189.054 21.93C189.054 20.33 189.394 18.9 190.074 17.64C190.754 16.38 191.694 15.39 192.894 14.67C194.094 13.93 195.484 13.56 197.064 13.56C198.064 13.56 199.004 13.74 199.884 14.1C200.764 14.46 201.544 14.95 202.224 15.57C202.904 16.17 203.414 16.87 203.754 17.67L201.714 18.72C201.314 17.86 200.704 17.16 199.884 16.62C199.064 16.08 198.124 15.81 197.064 15.81C196.004 15.81 195.044 16.08 194.184 16.62C193.344 17.14 192.674 17.87 192.174 18.81C191.694 19.73 191.454 20.78 191.454 21.96C191.454 23.12 191.694 24.17 192.174 25.11C192.674 26.03 193.344 26.76 194.184 27.3C195.044 27.84 196.004 28.11 197.064 28.11C198.124 28.11 199.054 27.84 199.854 27.3C200.674 26.76 201.294 26.04 201.714 25.14L203.754 26.25C203.414 27.03 202.904 27.73 202.224 28.35C201.544 28.97 200.764 29.46 199.884 29.82C199.004 30.18 198.064 30.36 197.064 30.36Z" fill="#E8F0FF"/>
</svg>

```


### File: src\components\compliance\Topbar.tsx
```tsx
import { Search, Plus, ChevronDown, Calendar } from "lucide-react";
import { NotificationCenter } from "./NotificationCenter";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-4 px-8 h-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-muted-foreground">Compliance</span>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-foreground font-medium">Overview</span>
        </div>

        {/* Search */}
        <div className="ml-6 flex-1 max-w-md relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search policies, rules, evidence…"
            className="w-full h-9 pl-9 pr-16 rounded-lg bg-secondary border border-transparent focus:border-ring focus:bg-card focus:outline-none text-[13px] placeholder:text-muted-foreground transition-colors"
          />
          <kbd className="hidden md:inline-flex items-center absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </div>

        <div className="flex items-center gap-2">
          <button className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg text-[12.5px] text-muted-foreground hover:bg-secondary transition-colors">
            <Calendar className="h-3.5 w-3.5" />
            Last 30 days
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <NotificationCenter />

          <button className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-card">
            <Plus className="h-3.5 w-3.5" />
            New report
          </button>
        </div>
      </div>
    </header>
  );
}

```


### File: src\components\compliance\NotificationCenter.tsx
```tsx
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

```


### File: src\components\compliance\ComplianceScore.tsx
```tsx
import { TrendingUp, ArrowUpRight } from "lucide-react";

const breakdown = [
  { label: "Data privacy", score: 96, tone: "success" },
  { label: "Financial", score: 91, tone: "success" },
  { label: "HR policies", score: 78, tone: "warning" },
  { label: "Vendor risk", score: 64, tone: "danger" },
];

export function ComplianceScore() {
  const score = 87;
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6 lg:col-span-2">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Compliance health
          </div>
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
            Organization score
          </h3>
        </div>
        <button className="text-[12px] font-medium text-primary hover:underline flex items-center gap-1">
          Full report
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
        {/* Radial */}
        <div className="relative h-36 w-36 mx-auto">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="none" className="text-muted" />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="url(#scoreGrad)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700"
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.55 0.19 258)" />
                <stop offset="100%" stopColor="oklch(0.68 0.16 200)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-[34px] font-semibold tracking-tight text-foreground leading-none tabular-nums">
                {score}
              </div>
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mt-1">
                of 100
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 text-[12px] text-success font-medium mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            +4.2 pts vs. last month
          </div>
          {breakdown.map((b) => (
            <div key={b.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-foreground/80">{b.label}</span>
                <span className="font-semibold tabular-nums text-foreground">{b.score}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    b.tone === "success" ? "bg-success" : b.tone === "warning" ? "bg-warning" : "bg-destructive"
                  }`}
                  style={{ width: `${b.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

```


### File: src\components\compliance\StatCards.tsx
```tsx
import { AlertTriangle, FileCheck2, ShieldCheck, ArrowDownRight, ArrowUpRight } from "lucide-react";

const stats = [
  {
    label: "Pending evidence",
    value: "23",
    delta: "-8",
    deltaTone: "down-good",
    sub: "since last week",
    icon: FileCheck2,
    accent: "primary",
  },
  {
    label: "Active violations",
    value: "7",
    delta: "+2",
    deltaTone: "up-bad",
    sub: "2 high severity",
    icon: AlertTriangle,
    accent: "danger",
  },
  {
    label: "Active policies",
    value: "128",
    delta: "+5",
    deltaTone: "up-good",
    sub: "3 awaiting review",
    icon: ShieldCheck,
    accent: "success",
  },
];

export function StatCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((s) => {
        const Icon = s.icon;
        const Arrow = s.deltaTone.startsWith("up") ? ArrowUpRight : ArrowDownRight;
        const tone =
          s.deltaTone === "up-bad"
            ? "text-destructive bg-destructive-soft"
            : s.deltaTone === "down-good" || s.deltaTone === "up-good"
            ? "text-success bg-success-soft"
            : "text-muted-foreground bg-muted";
        const iconBg =
          s.accent === "primary"
            ? "bg-primary-soft text-primary"
            : s.accent === "danger"
            ? "bg-destructive-soft text-destructive"
            : "bg-success-soft text-success";
        return (
          <div
            key={s.label}
            className="bg-card rounded-2xl border border-border shadow-card p-5 hover:shadow-elevated transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`h-9 w-9 rounded-xl grid place-items-center ${iconBg}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-0.5 ${tone}`}>
                <Arrow className="h-3 w-3" />
                {s.delta}
              </span>
            </div>
            <div className="text-[12px] text-muted-foreground">{s.label}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-[28px] font-semibold tracking-tight text-foreground tabular-nums leading-none">
                {s.value}
              </div>
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-2">{s.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

```


### File: src\components\compliance\TrendChart.tsx
```tsx
const data = [
  { m: "Jan", score: 78, viol: 14 },
  { m: "Feb", score: 80, viol: 12 },
  { m: "Mar", score: 79, viol: 15 },
  { m: "Apr", score: 82, viol: 11 },
  { m: "May", score: 84, viol: 9 },
  { m: "Jun", score: 83, viol: 10 },
  { m: "Jul", score: 85, viol: 8 },
  { m: "Aug", score: 86, viol: 7 },
  { m: "Sep", score: 84, viol: 9 },
  { m: "Oct", score: 87, viol: 7 },
  { m: "Nov", score: 88, viol: 6 },
  { m: "Dec", score: 87, viol: 7 },
];

export function TrendChart() {
  const W = 640;
  const H = 220;
  const padX = 28;
  const padY = 24;
  const minS = 70;
  const maxS = 95;
  const xStep = (W - padX * 2) / (data.length - 1);
  const yFor = (v: number) => H - padY - ((v - minS) / (maxS - minS)) * (H - padY * 2);
  const points = data.map((d, i) => [padX + i * xStep, yFor(d.score)] as const);
  const path = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${points[points.length - 1][0]},${H - padY} L${points[0][0]},${H - padY} Z`;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6 lg:col-span-2">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Trends
          </div>
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
            Compliance score over time
          </h3>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary text-[12px]">
          {["12M", "6M", "30D", "7D"].map((p, i) => (
            <button
              key={p}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                i === 0 ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-5 mb-2 text-[11.5px]">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-muted-foreground">Compliance score</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warning" />
          <span className="text-muted-foreground">Violations detected</span>
        </div>
      </div>

      <div className="w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.55 0.19 258)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="oklch(0.55 0.19 258)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid */}
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1={padX}
              x2={W - padX}
              y1={padY + (i * (H - padY * 2)) / 3}
              y2={padY + (i * (H - padY * 2)) / 3}
              stroke="oklch(0.92 0.012 250)"
              strokeDasharray="3 4"
            />
          ))}
          {/* Bars (violations) */}
          {data.map((d, i) => {
            const bh = (d.viol / 16) * 60;
            return (
              <rect
                key={d.m}
                x={padX + i * xStep - 4}
                y={H - padY - bh}
                width={8}
                height={bh}
                rx={2}
                fill="oklch(0.78 0.15 75)"
                opacity={0.45}
              />
            );
          })}
          <path d={area} fill="url(#areaGrad)" />
          <path d={path} fill="none" stroke="oklch(0.55 0.19 258)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          {points.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="3.5" fill="white" stroke="oklch(0.55 0.19 258)" strokeWidth="2" />
            </g>
          ))}
          {/* X labels */}
          {data.map((d, i) => (
            <text
              key={d.m}
              x={padX + i * xStep}
              y={H - 4}
              textAnchor="middle"
              fontSize="10"
              fill="oklch(0.52 0.03 256)"
            >
              {d.m}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

```


### File: src\components\compliance\RiskByDepartment.tsx
```tsx
const rows = [
  { dept: "Finance", risk: 22, level: "Low", trend: -3, color: "success" },
  { dept: "Engineering", risk: 38, level: "Low", trend: -1, color: "success" },
  { dept: "Marketing", risk: 54, level: "Medium", trend: +6, color: "warning" },
  { dept: "Sales", risk: 61, level: "Medium", trend: +2, color: "warning" },
  { dept: "Operations", risk: 78, level: "High", trend: +9, color: "danger" },
  { dept: "Legal", risk: 18, level: "Low", trend: 0, color: "success" },
];

export function RiskByDepartment() {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Risk profile
          </div>
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
            By department
          </h3>
        </div>
        <button className="text-[12px] text-muted-foreground hover:text-foreground">View all</button>
      </div>

      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.dept} className="space-y-1.5">
            <div className="flex items-center justify-between text-[12.5px]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{r.dept}</span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    r.color === "success"
                      ? "bg-success-soft text-success"
                      : r.color === "warning"
                      ? "bg-warning-soft text-warning-foreground"
                      : "bg-destructive-soft text-destructive"
                  }`}
                >
                  {r.level}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-foreground/80">{r.risk}</span>
                <span
                  className={`text-[10.5px] tabular-nums ${
                    r.trend > 0 ? "text-destructive" : r.trend < 0 ? "text-success" : "text-muted-foreground"
                  }`}
                >
                  {r.trend > 0 ? "+" : ""}
                  {r.trend}
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  r.color === "success" ? "bg-success" : r.color === "warning" ? "bg-warning" : "bg-destructive"
                }`}
                style={{ width: `${r.risk}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

```


### File: src\components\compliance\AlertsList.tsx
```tsx
import { AlertTriangle, ShieldAlert, FileWarning, Lock } from "lucide-react";

const alerts = [
  {
    icon: ShieldAlert,
    severity: "Critical",
    title: "Unauthorized data export detected",
    meta: "Operations · 8 min ago",
    tone: "danger",
  },
  {
    icon: Lock,
    severity: "High",
    title: "MFA disabled for 3 admin accounts",
    meta: "Engineering · 42 min ago",
    tone: "danger",
  },
  {
    icon: FileWarning,
    severity: "Medium",
    title: "Vendor contract missing DPA addendum",
    meta: "Procurement · 2 h ago",
    tone: "warning",
  },
  {
    icon: AlertTriangle,
    severity: "Medium",
    title: "Policy conflict: Retention vs. GDPR-22",
    meta: "Legal · 5 h ago",
    tone: "warning",
  },
];

export function AlertsList() {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6 lg:col-span-2">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Live monitoring
          </div>
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
            Recent alerts
          </h3>
        </div>
        <button className="text-[12px] text-primary font-medium hover:underline">View all alerts</button>
      </div>

      <div className="space-y-1">
        {alerts.map((a, i) => {
          const Icon = a.icon;
          const tone =
            a.tone === "danger"
              ? "bg-destructive-soft text-destructive"
              : "bg-warning-soft text-warning-foreground";
          return (
            <div
              key={i}
              className="group flex items-start gap-3 px-3 py-3 -mx-3 rounded-xl hover:bg-secondary/60 transition-colors cursor-pointer"
            >
              <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${tone}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      a.tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning-foreground"
                    }`}
                  >
                    {a.severity}
                  </span>
                </div>
                <div className="text-[13px] font-medium text-foreground truncate">{a.title}</div>
                <div className="text-[11.5px] text-muted-foreground mt-0.5">{a.meta}</div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 text-[11.5px] font-medium text-primary transition-opacity">
                Review →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

```


### File: src\components\compliance\AuditFeed.tsx
```tsx
const events = [
  { who: "Sarah Chen", action: "approved evidence", target: "SOC2-CC6.1", time: "2 min ago", initials: "SC", color: "from-rose-400 to-rose-600" },
  { who: "System", action: "auto-flagged violation", target: "PII export rule", time: "8 min ago", initials: "SY", color: "from-slate-400 to-slate-600" },
  { who: "Marcus Liu", action: "updated policy", target: "Data retention v3.2", time: "27 min ago", initials: "ML", color: "from-blue-400 to-blue-600" },
  { who: "Elena Martins", action: "generated report", target: "Q4 compliance summary", time: "1 h ago", initials: "EM", color: "from-violet-400 to-violet-600" },
  { who: "Priya Shah", action: "added rule", target: "ISO 27001 A.9.4", time: "3 h ago", initials: "PS", color: "from-emerald-400 to-emerald-600" },
  { who: "System", action: "synced control", target: "Okta identity provider", time: "5 h ago", initials: "SY", color: "from-slate-400 to-slate-600" },
];

export function AuditFeed() {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Audit trail
          </div>
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
            Activity feed
          </h3>
        </div>
        <button className="text-[12px] text-muted-foreground hover:text-foreground">Export</button>
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" aria-hidden />
        <ul className="space-y-4">
          {events.map((e, i) => (
            <li key={i} className="relative flex items-start gap-3 pl-0">
              <div
                className={`relative z-10 h-8 w-8 rounded-full bg-gradient-to-br ${e.color} grid place-items-center text-[10.5px] font-semibold text-white ring-4 ring-card`}
              >
                {e.initials}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="text-[12.5px] text-foreground leading-snug">
                  <span className="font-medium">{e.who}</span>{" "}
                  <span className="text-muted-foreground">{e.action}</span>{" "}
                  <span className="font-medium">{e.target}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{e.time}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

```


### File: src\components\compliance\QuickActions.tsx
```tsx
import { FileText, ShieldPlus, ClipboardCheck, Download, Users, Sparkles } from "lucide-react";

const actions = [
  { icon: FileText, label: "New report" },
  { icon: ShieldPlus, label: "Add policy" },
  { icon: ClipboardCheck, label: "Run audit" },
  { icon: Users, label: "Invite reviewer" },
  { icon: Download, label: "Export evidence" },
];

export function QuickActions() {
  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-[oklch(0.27_0.05_260)] to-[oklch(0.22_0.045_260)] text-white shadow-elevated relative overflow-hidden">
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-[oklch(0.68_0.16_200)]/20 blur-2xl" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-3.5 w-3.5 text-[oklch(0.78_0.12_220)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Quick actions</span>
        </div>
        <h3 className="text-[17px] font-semibold tracking-tight mb-5">What would you like to do?</h3>

        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors"
              >
                <div className="h-7 w-7 rounded-lg bg-white/10 grid place-items-center group-hover:bg-primary/40 transition-colors">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[12.5px] font-medium">{a.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-5 border-t border-white/10">
          <div className="flex items-center justify-between text-[12px]">
            <div>
              <div className="text-white/60">Next audit</div>
              <div className="font-medium mt-0.5">SOC 2 Type II — Mar 14</div>
            </div>
            <button className="px-2.5 py-1 rounded-md bg-white text-foreground text-[11.5px] font-semibold hover:bg-white/90 transition-colors">
              Prepare
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

```


### File: src\components\compliance\EvidenceQueue.tsx
```tsx
const items = [
  { id: "EV-2104", title: "Access review — Production DB", owner: "M. Liu", framework: "SOC 2", due: "Today", status: "Review", tone: "warning" },
  { id: "EV-2103", title: "Encryption attestation Q4", owner: "S. Chen", framework: "ISO 27001", due: "Tomorrow", status: "Pending", tone: "muted" },
  { id: "EV-2099", title: "Vendor SOC report — Stripe", owner: "P. Shah", framework: "SOC 2", due: "Mar 12", status: "Review", tone: "warning" },
  { id: "EV-2097", title: "Backup restoration test log", owner: "E. Martins", framework: "ISO 27001", due: "Mar 14", status: "Approved", tone: "success" },
  { id: "EV-2095", title: "Incident response tabletop", owner: "M. Liu", framework: "HIPAA", due: "Mar 18", status: "Pending", tone: "muted" },
];

export function EvidenceQueue() {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Evidence queue
          </div>
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
            Pending review
          </h3>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary text-[12px]">
          {["All", "Mine", "Overdue"].map((t, i) => (
            <button
              key={t}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                i === 0 ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden -mx-2">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-medium px-2 pb-2.5">Evidence</th>
              <th className="text-left font-medium px-2 pb-2.5 hidden md:table-cell">Framework</th>
              <th className="text-left font-medium px-2 pb-2.5 hidden lg:table-cell">Owner</th>
              <th className="text-left font-medium px-2 pb-2.5">Due</th>
              <th className="text-left font-medium px-2 pb-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-border hover:bg-secondary/50 transition-colors cursor-pointer">
                <td className="px-2 py-3">
                  <div className="font-medium text-foreground">{it.title}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">{it.id}</div>
                </td>
                <td className="px-2 py-3 hidden md:table-cell">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary-soft text-primary text-[11px] font-medium">
                    {it.framework}
                  </span>
                </td>
                <td className="px-2 py-3 hidden lg:table-cell text-muted-foreground">{it.owner}</td>
                <td className="px-2 py-3 text-foreground/80">{it.due}</td>
                <td className="px-2 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                      it.tone === "success"
                        ? "text-success"
                        : it.tone === "warning"
                        ? "text-warning-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        it.tone === "success" ? "bg-success" : it.tone === "warning" ? "bg-warning" : "bg-muted-foreground"
                      }`}
                    />
                    {it.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

```
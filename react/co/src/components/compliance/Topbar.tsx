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

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

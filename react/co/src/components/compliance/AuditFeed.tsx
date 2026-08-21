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

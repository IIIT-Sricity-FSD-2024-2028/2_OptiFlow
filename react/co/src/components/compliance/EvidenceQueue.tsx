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

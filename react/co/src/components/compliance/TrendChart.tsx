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

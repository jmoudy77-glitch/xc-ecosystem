// components/performance/map/AthleteTrajectoryStrip.tsx
type Orb = {
  name: string;
  status: "green" | "yellow" | "red";
};

const demo: Orb[] = [
  { name: "Mason B.", status: "green" },
  { name: "Sophia M.", status: "yellow" },
  { name: "Noah W.", status: "green" },
  { name: "Mia T.", status: "red" },
  { name: "Isabella M.", status: "yellow" },
  { name: "Logan A.", status: "green" },
];

function orbTintClasses(status: Orb["status"]) {
  switch (status) {
    case "green":
      return "from-emerald-300/25 via-emerald-500/25 to-emerald-600/25 ring-emerald-200/40";
    case "yellow":
      return "from-amber-300/25 via-amber-500/25 to-amber-600/25 ring-amber-200/40";
    case "red":
      return "from-rose-300/25 via-rose-500/25 to-rose-600/25 ring-rose-200/40";
  }
}

function orbGlowClasses(status: Orb["status"]) {
  switch (status) {
    case "green":
      return "bg-emerald-400/20";
    case "yellow":
      return "bg-amber-400/20";
    case "red":
      return "bg-rose-400/20";
  }
}

export default function AthleteTrajectoryStrip() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Athlete Health</h2>
        <div className="text-xs text-muted-foreground">
          Each orb reflects individual trajectory health. Group patterns are emergent.
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {demo.map((a) => (
          <button
            key={a.name}
            type="button"
            className="flex flex-col items-center gap-2 rounded-xl px-3 py-3 hover:bg-accent/30 transition min-w-[108px]"
            title={a.name}
          >
            <div className="relative">
              {/* soft bloom behind the orb */}
              <div
                aria-hidden
                className={[
                  "absolute -inset-2 rounded-full blur-md",
                  orbGlowClasses(a.status),
                ].join(" ")}
              />

              {/* glass orb */}
              <div
                className={[
                  "relative h-10 w-10 rounded-full overflow-hidden",
                  "ring-1 shadow-sm",
                  "bg-gradient-to-br",
                  orbTintClasses(a.status),
                  // glass depth
                  "shadow-[inset_0_10px_18px_rgba(255,255,255,0.16),inset_0_-14px_22px_rgba(0,0,0,0.35)]",
                ].join(" ")}
              >
                {/* specular highlight */}
                <div
                  aria-hidden
                  className="absolute left-1 top-1 h-4 w-5 -rotate-12 rounded-full bg-white/40 blur-[0.2px]"
                />

                {/* secondary highlight sweep */}
                <div
                  aria-hidden
                  className="absolute -left-2 -top-1 h-10 w-10 rounded-full bg-gradient-to-br from-white/20 via-white/5 to-transparent"
                />

                {/* rim light */}
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-full ring-1 ring-white/20"
                />

                {/* subtle bottom vignette for spherical read */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{a.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
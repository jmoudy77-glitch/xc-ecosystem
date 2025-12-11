// app/programs/[programId]/dashboard/page.tsx
import Link from "next/link";

export default async function ProgramDashboardPage({
  params,
}: {
  params: { programId: string };
}) {
  const { programId } = params;

  // Later: load real snapshots (practice, recruiting, alerts, etc.)
  // For now, this is just layout + placeholder cards.

  return (
    <div className="space-y-6">
      {/* Top row: calendar + recruiting alerts */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* This week - practices */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                This week&apos;s practices
              </h2>
              <p className="text-[11px] text-slate-500">
                Read-only snapshot of this week&apos;s schedule. Click a day to
                open the full training view.
              </p>
            </div>
            <Link
              href={`/programs/${programId}/seasons/current/practice`}
              className="rounded-full border border-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-emerald-500 hover:text-emerald-200"
            >
              Open training
            </Link>
          </div>

          <div className="mt-3 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>This week</span>
              <span className="font-mono text-[10px] text-slate-500">
                Mon – Sun
              </span>
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1.5 text-[10px]">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                <div
                  key={label}
                  className="flex flex-col items-center rounded-md border border-slate-800/80 bg-slate-950/80 px-1.5 py-1.5"
                >
                  <span className="text-[9px] uppercase tracking-wide text-slate-500">
                    {label}
                  </span>
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-700" />
                  <span className="mt-1 text-[9px] text-slate-500">
                    0 sessions
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              Practice data will populate this grid automatically as you build your schedule.
            </p>
          </div>
        </div>

        {/* Recruiting alerts */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Recruiting alerts
          </h2>
          <p className="text-[11px] text-slate-500">
            New inquiries, priority recruits, and offers that need attention.
          </p>
          <div className="mt-3 space-y-2 text-[11px] text-slate-300">
            <div className="rounded-md border border-slate-800 bg-slate-950/60 px-2 py-2 text-slate-400">
              No recruiting alerts yet. As your staff adds recruits and updates their stages,
              urgent items will surface here automatically.
            </div>
          </div>
        </div>
      </section>

      {/* Middle row: athlete + communications */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Athlete alerts */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Athlete alerts
          </h2>
          <p className="text-[11px] text-slate-500">
            Health flags, missing info, or training gaps that need a coach
            touch.
          </p>
          <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/60 px-2 py-2 text-[11px] text-slate-400">
            No active athlete alerts. As training load, health flags, or missing info are detected,
            they will surface here.
          </div>
        </div>

        {/* Communications */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Communications
          </h2>
          <p className="text-[11px] text-slate-500">
            Recent announcements and scheduled messages for athletes and staff.
          </p>
          <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/60 px-2 py-2 text-[11px] text-slate-400">
            Messaging center coming soon. For now, manage announcements and reminders
            from your existing tools; this panel will evolve into your unified inbox.
          </div>
        </div>

        {/* Pipeline snapshot */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Recruiting pipeline
          </h2>
          <p className="text-[11px] text-slate-500">
            High-level view of your recruiting board by pipeline stage.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            {["New", "Evaluating", "Priority", "Offer out", "Committed", "Archived"].map(
              (label) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1.5"
                >
                  <span>{label}</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    0
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Bottom row: activity feed */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Recent activity
            </h2>
            <p className="text-[11px] text-slate-500">
              A log of key changes across training, recruiting, and roster
              management.
            </p>
          </div>
        </div>
        <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/60 px-2 py-2 text-[11px] text-slate-400">
          Activity feed coming soon. This will become a running log of key changes across
          training, recruiting, and roster management for your staff.
        </div>
      </section>
    </div>
  );
}
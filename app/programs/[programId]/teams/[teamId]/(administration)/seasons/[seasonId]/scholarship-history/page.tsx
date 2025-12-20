import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PageProps = {
  params: Promise<{
    programId: string;
    teamId: string;
    seasonId: string;
  }>;
};

function formatCurrency(value: number | null, currency: string = "USD") {
  if (value === null || isNaN(value)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

export default async function ScholarshipHistoryPage({ params }: PageProps) {
  const { programId, teamId, seasonId } = await params;

  //
  // LOAD PROGRAM + TEAM + SEASON
  //
  const { data: seasonRow } = await supabaseAdmin
    .from("team_seasons")
    .select(
      `
      id,
      season_label,
      season_year,
      roster_lock_date,
      scholarship_currency
    `
    )
    .eq("id", seasonId)
    .maybeSingle();

  const seasonLabel =
    seasonRow?.season_label ??
    (seasonRow?.season_year
      ? `Season ${seasonRow.season_year}`
      : "Season");

  const currency = seasonRow?.scholarship_currency ?? "USD";

  //
  // LOAD HISTORY (all rows)
  //
  const { data: historyRows } = await supabaseAdmin
    .from("season_budget_history")
    .select(
      `
        id,
        team_season_id,
        changed_by_user_id,
        old_equiv,
        new_equiv,
        old_amount,
        new_amount,
        notes,
        created_at,
        users:users!changed_by_user_id ( first_name, last_name ),
        program_members ( role )
      `
    )
    .eq("team_season_id", seasonId)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Link
                  href="/dashboard"
                  className="hover:text-slate-200"
                >
                  Dashboard
                </Link>
                <span>›</span>

                <Link
                  href={`/programs/${programId}`}
                  className="hover:text-slate-200"
                >
                  Program
                </Link>
                <span>›</span>

                <Link
                  href={`/programs/${programId}/teams/${teamId}`}
                  className="hover:text-slate-200"
                >
                  Team
                </Link>
                <span>›</span>

                <Link
                  href={`/programs/${programId}/teams/${teamId}/seasons/${seasonId}`}
                  className="hover:text-slate-200"
                >
                  {seasonLabel}
                </Link>

                <span>›</span>
                <span>Scholarship History</span>
              </div>

              <h1 className="mt-1 text-base font-semibold text-slate-100">
                Scholarship Budget History
              </h1>

              <p className="mt-1 text-[11px] text-slate-500">
                Complete audit trail of all scholarship budget changes for{" "}
                {seasonLabel}.
              </p>
            </div>

            {/* CSV Export */}
            <Link
              href={`/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/scholarship-history/export`}
              className="rounded-md border border-sky-600 bg-sky-900/40 px-3 py-1 text-[11px] text-sky-200 hover:bg-sky-800/60"
            >
              Export CSV
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Governing Body Lock Date */}
        {seasonRow?.roster_lock_date && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-[12px]">
            <p className="text-slate-300">
              Governing body lock date:{" "}
              <span className="font-semibold text-slate-100">
                {new Date(seasonRow.roster_lock_date).toLocaleDateString()}
              </span>
            </p>
          </div>
        )}

        {/* HISTORY LIST */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Full Budget Change Log
          </p>

          {(!historyRows || historyRows.length === 0) && (
            <p className="mt-4 text-[12px] text-slate-500">
              No scholarship budget changes have been recorded yet.
            </p>
          )}

          <div className="mt-4 space-y-4">
            {(historyRows ?? []).map((h) => {
              const userRecord = Array.isArray(h.users) ? h.users[0] : h.users;
              const coachName =
                userRecord?.first_name && userRecord?.last_name
                  ? `${userRecord.first_name} ${userRecord.last_name}`
                  : "Unknown";

              const roleRecord = Array.isArray(h.program_members) ? h.program_members[0] : h.program_members;
              const role =
                roleRecord?.role?.replace("_", " ")?.toUpperCase() ?? "COACH";

              const eqDiff =
                h.new_equiv !== null && h.old_equiv !== null
                  ? Number(h.new_equiv - h.old_equiv)
                  : null;

              const amtDiff =
                h.new_amount !== null && h.old_amount !== null
                  ? Number(h.new_amount - h.old_amount)
                  : null;

              return (
                <div
                  key={h.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-[12px]"
                >
                  {/* Timestamp + Coach */}
                  <p className="text-slate-300">
                    <span className="font-semibold text-slate-100">
                      {new Date(h.created_at).toLocaleString()}
                    </span>{" "}
                    — {coachName}{" "}
                    <span className="text-slate-400 text-[10px]">
                      ({role})
                    </span>
                  </p>

                  {/* Values */}
                  <div className="mt-2 grid grid-cols-2 gap-3 text-[11px]">
                    {/* Equivalency */}
                    <div>
                      <span className="text-slate-400">Equivalency: </span>
                      {h.old_equiv} → {h.new_equiv}{" "}
                      {eqDiff !== null && (
                        <span
                          className={
                            eqDiff > 0
                              ? "text-emerald-300"
                              : eqDiff < 0
                              ? "text-rose-300"
                              : "text-slate-400"
                          }
                        >
                          ({eqDiff > 0 ? "+" : ""}
                          {eqDiff})
                        </span>
                      )}
                    </div>

                    {/* Dollar Amount */}
                    <div>
                      <span className="text-slate-400">Amount: </span>
                      {formatCurrency(h.old_amount, currency)} →{" "}
                      {formatCurrency(h.new_amount, currency)}{" "}
                      {amtDiff !== null && (
                        <span
                          className={
                            amtDiff > 0
                              ? "text-emerald-300"
                              : amtDiff < 0
                              ? "text-rose-300"
                              : "text-slate-400"
                          }
                        >
                          ({amtDiff > 0 ? "+" : ""}
                          {formatCurrency(amtDiff, currency)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {h.notes && (
                    <p className="mt-2 text-[11px] text-slate-400 italic">
                      Notes: {h.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
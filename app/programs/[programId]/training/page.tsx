// app/programs/[programId]/training/page.tsx
// Program Training hub (server component)

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PageProps = {
  params: Promise<{
    programId: string;
  }>;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

export default async function ProgramTrainingPage({ params }: PageProps) {
  const { programId } = await params;

  const supabase = await supabaseServerComponent();

  //
  // 1) Auth
  //
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[ProgramTraining] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  //
  // 2) Ensure viewer user row exists (same pattern as overview/staff/teams)
  //
  const { data: existingUserRow, error: userSelectError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userSelectError) {
    console.error("[ProgramTraining] users select error:", userSelectError);
    throw new Error("Failed to load viewer user record");
  }

  let viewerUserRow = existingUserRow;

  if (!viewerUserRow) {
    const {
      data: insertedUser,
      error: userInsertError,
    } = await supabaseAdmin
      .from("users")
      .insert({
        auth_id: authId,
        email: authUser.email ?? null,
      })
      .select("id, auth_id, email")
      .single();

    if (userInsertError) {
      console.error(
        "[ProgramTraining] Failed to create viewer user row:",
        userInsertError,
      );
      throw new Error("Failed to create user record");
    }

    viewerUserRow = insertedUser;
  }

  const viewerUserId = viewerUserRow.id as string;

  //
  // 3) Membership & program basic info
  //
  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select(
      `
      id,
      role,
      program_id,
      programs!inner (
        id,
        name
      )
    `,
    )
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[ProgramTraining] membership error:", membershipError);
    throw new Error("Failed to load membership");
  }

  if (!membershipRow || !membershipRow.programs) {
    // Not a member of this program → bounce to dashboard
    redirect("/dashboard");
  }

  const programsRel = (membershipRow as any).programs;
  const programRecord = Array.isArray(programsRel)
    ? programsRel[0]
    : programsRel;

  const programName = (programRecord?.name as string) ?? "Program";

  const actingRole: string | null = (membershipRow.role as string) ?? null;
  const isManager =
    actingRole !== null &&
    MANAGER_ROLES.includes(actingRole.toLowerCase() as any);

  //
  // 4) (Future) Load training summary data
  //
  // In the zip this page was mostly layout. For now, we keep it as a
  // structured hub that we can later wire into:
  //   - practice_plans / practice_groups
  //   - workouts / workout_steps
  //   - athlete_training_sessions
  //

  return (
    <div className="space-y-4">
      {/* Header / context card */}
      <section className="rounded-xl border border-subtle bg-brand-soft p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <span>›</span>
              <Link
                href={`/programs/${programId}`}
                className="hover:underline"
              >
                {programName}
              </Link>
              <span>›</span>
              <span>Training</span>
            </div>

            <h1 className="mt-1 text-sm font-semibold text-slate-100">
              Training &amp; practice workspace
            </h1>
            <p className="mt-1 text-[11px] text-muted">
              Central hub for practice plans, workouts, and training templates
              for this program. This will eventually connect directly into the
              weather-aware practice scheduler and athlete training logs.
            </p>
          </div>

          <div className="hidden text-right text-[11px] text-muted sm:block">
            <p>
              Your role:{" "}
              <span className="font-mono text-[11px] text-slate-100">
                {actingRole ?? "unknown"}
              </span>
            </p>
            <p className="mt-1">
              Manager privileges:{" "}
              <span className="font-mono text-[11px] text-slate-100">
                {isManager ? "yes" : "no"}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Main training panels */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Practice planner */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border border-subtle bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-100">
                  Practice planner
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Plan daily practices by group, assign workouts, and tie them
                  to your season roster. Future: integrate weather snapshots and
                  WBGT-based heat policies directly into each practice.
                </p>
              </div>
              <div className="hidden text-[11px] text-muted sm:flex sm:flex-col sm:items-end">
                <span className="rounded-full border border-subtle px-2 py-0.5">
                  Roadmap: full practice scheduler
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-[11px] text-muted sm:grid-cols-2">
              <div className="rounded-lg border border-subtle bg-surface/70 p-3">
                <p className="text-[11px] font-semibold text-slate-100">
                  Today&apos;s / upcoming practices
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Future: list of upcoming practices with quick access to
                  groups, assigned workouts, and weather snapshots.
                </p>
              </div>
              <div className="rounded-lg border border-subtle bg-surface/70 p-3">
                <p className="text-[11px] font-semibold text-slate-100">
                  Group assignments
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Future: drag-and-drop grouping by event group or training
                  focus, linked directly to your team season rosters.
                </p>
              </div>
            </div>
          </div>

          {/* Athlete training logs */}
          <div className="rounded-xl border border-subtle bg-surface p-5">
            <p className="text-xs font-semibold text-slate-100">
              Athlete training logs
            </p>
            <p className="mt-1 text-[11px] text-muted">
              This area will surface individual sessions from{" "}
              <code className="font-mono text-[10px]">
                athlete_training_sessions
              </code>{" "}
              as an at-a-glance view of what your athletes are actually doing
              (coach-assigned and self-assigned).
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
              <span className="rounded-full border border-subtle px-2 py-0.5">
                Coach-assigned vs self-assigned
              </span>
              <span className="rounded-full border border-subtle px-2 py-0.5">
                RPE &amp; volume trends
              </span>
              <span className="rounded-full border border-subtle px-2 py-0.5">
                Availability &amp; injury flags
              </span>
            </div>
          </div>
        </div>

        {/* Right column: workouts/templates */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-subtle bg-surface p-5">
            <p className="text-xs font-semibold text-slate-100">
              Workouts &amp; templates
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Library of reusable workouts and training event templates for this
              program. In the roadmap, these tie directly into your practice
              planner and athlete sessions.
            </p>
            <ul className="mt-2 space-y-1 text-[11px] text-muted">
              <li>• System and program-specific workouts</li>
              <li>• Event-specific training blocks</li>
              <li>• Copy / adapt for new seasons</li>
            </ul>
            <div className="mt-3">
              <Link
                href="#"
                className="inline-flex items-center rounded-full bg-brand px-3 py-1.5 text-[11px] font-medium text-slate-950 hover:bg-brand-soft"
              >
                Open workouts library
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-subtle bg-surface p-5">
            <p className="text-xs font-semibold text-slate-100">
              Weather &amp; heat policies (roadmap)
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Future: snapshot WBGT readings, heat policy recommendations, and
              practice adjustments for each session, using{" "}
              <code className="font-mono text-[10px]">
                practice_weather_snapshots
              </code>{" "}
              and{" "}
              <code className="font-mono text-[10px]">
                heat_policies
              </code>
              .
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}
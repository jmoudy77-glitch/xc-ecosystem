// app/programs/[programId]/recruiting/page.tsx
// Program Recruiting hub (server component)

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PageProps = {
  params: Promise<{
    programId: string;
  }>;
};

type ViewerUser = {
  id: string;
  auth_id: string;
  email: string | null;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

export default async function ProgramRecruitingPage({ params }: PageProps) {
  const { programId } = await params;

  const supabase = await supabaseServerComponent();

  // 1) Auth
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[ProgramRecruiting] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  // 2) Viewer user row
  const { data: viewerRow, error: viewerError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (viewerError) {
    console.error("[ProgramRecruiting] viewer users error:", viewerError);
    throw new Error("Failed to load viewer user");
  }

  if (!viewerRow) {
    redirect("/dashboard");
  }

  const viewerUser = viewerRow as ViewerUser;
  const viewerUserId = viewerUser.id as string;

  // 3) Membership & program basic info
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
    console.error("[ProgramRecruiting] membership error:", membershipError);
    throw new Error("Failed to load membership");
  }

  if (!membershipRow || !membershipRow.programs) {
    redirect("/dashboard");
  }

  const programsRel = (membershipRow as any).programs;
  const programRecord = Array.isArray(programsRel) ? programsRel[0] : programsRel;
  const programName = (programRecord?.name as string) ?? "Program";

  const actingRole: string | null = (membershipRow.role as string) ?? null;
  const isManager =
    actingRole !== null &&
    MANAGER_ROLES.includes(actingRole.toLowerCase() as any);

  // (Future: we’ll hydrate these panels from real data;
  // for now this is layout + theming.)

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
              <span>Recruiting</span>
            </div>

            <h1 className="mt-1 text-sm font-semibold text-slate-100">
              Recruiting workspace
            </h1>
            <p className="mt-1 text-[11px] text-muted">
              Unified board for recruits, classes, pipeline projections, and
              communication touchpoints for this program.
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

      {/* Main recruiting panels */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Board / columns */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border border-subtle bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-100">
                  Recruiting board
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Kanban-style overview of your pipeline by stage (new,
                  evaluating, priority, offer out, committed, archived).
                </p>
              </div>
              <div className="hidden text-[11px] text-muted sm:flex sm:flex-col sm:items-end">
                <span className="rounded-full border border-subtle px-2 py-0.5">
                  Roadmap: drag-and-drop board
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-[11px] text-muted sm:grid-cols-3">
              <div className="rounded-lg border border-subtle bg-surface/70 p-3">
                <p className="text-[11px] font-semibold text-slate-100">
                  Current class
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Snapshot of the class you&apos;re actively building (e.g.
                  2026). Future: live counts by stage and scholarship usage.
                </p>
              </div>
              <div className="rounded-lg border border-subtle bg-surface/70 p-3">
                <p className="text-[11px] font-semibold text-slate-100">
                  Next class
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Early pipeline for the next class so you don&apos;t lose 
                  track while closing the current one.
                </p>
              </div>
              <div className="rounded-lg border border-subtle bg-surface/70 p-3">
                <p className="text-[11px] font-semibold text-slate-100">
                  Transfer portal
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Future: direct integration with your internal transfer
                  board and athlete entries.
                </p>
              </div>
            </div>
          </div>

          {/* Pipeline + AI row */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-subtle bg-surface p-5">
              <p className="text-xs font-semibold text-slate-100">
                Class &amp; pipeline health
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Future: tracking of projected points, commit probabilities, and
                class balance by event group, graduation year, and scholarship
                usage.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
                <span className="rounded-full border border-subtle px-2 py-0.5">
                  Class targets
                </span>
                <span className="rounded-full border border-subtle px-2 py-0.5">
                  Event group balance
                </span>
                <span className="rounded-full border border-subtle px-2 py-0.5">
                  Scholarship alignment
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-subtle bg-surface p-5">
              <p className="text-xs font-semibold text-slate-100">
                AI scout tools (roadmap)
              </p>
              <p className="mt-1 text-[11px] text-muted">
                This area will surface AI-generated scout scores, commit
                probabilities, and class-level projections once the AI modules
                are turned on for your plan.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
                <span className="rounded-full border border-subtle px-2 py-0.5">
                  Scout Score
                </span>
                <span className="rounded-full border border-subtle px-2 py-0.5">
                  Commit Probability
                </span>
                <span className="rounded-full border border-subtle px-2 py-0.5">
                  Pipeline Projection
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: actions / guides */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-subtle bg-surface p-5">
            <p className="text-xs font-semibold text-slate-100">
              Quick actions
            </p>
            <ul className="mt-2 space-y-1 text-[11px] text-muted">
              <li>• Import recruits from CSV or a data provider</li>
              <li>• Invite your staff to share a unified board</li>
              <li>• Set class targets by event group</li>
            </ul>
            <div className="mt-3">
              <Link
                href="#"
                className="inline-flex items-center rounded-full bg-brand px-3 py-1.5 text-[11px] font-medium text-slate-950 hover:bg-brand-soft"
              >
                Go to recruiting board
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-subtle bg-surface p-5">
            <p className="text-xs font-semibold text-slate-100">
              Communication &amp; notes
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Future: unified view of messages, touchpoints, and coach notes
              tied back to each recruit.
            </p>
            <ul className="mt-2 space-y-1 text-[11px] text-muted">
              <li>• Email + text logging</li>
              <li>• Call and visit notes</li>
              <li>• Compliance-friendly audit trails</li>
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
// app/programs/[programId]/communications/page.tsx
// Program Communications hub (server component)

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

export default async function ProgramCommunicationsPage({ params }: PageProps) {
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
    console.warn(
      "[ProgramCommunications] auth.getUser error:",
      authError.message,
    );
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  //
  // 2) Ensure viewer user row exists (same pattern as other program pages)
  //
  const { data: existingUserRow, error: userSelectError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userSelectError) {
    console.error(
      "[ProgramCommunications] users select error:",
      userSelectError,
    );
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
        "[ProgramCommunications] Failed to create viewer user row:",
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
    console.error(
      "[ProgramCommunications] membership error:",
      membershipError,
    );
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
  // 4) (Future) Communications data
  //
  // For now this page is a themed hub to plug in later:
  //   - outbound messages to athletes / parents / staff
  //   - recruit-touchpoint logging
  //   - announcement history and templates
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
              <span>Communications</span>
            </div>

            <h1 className="mt-1 text-sm font-semibold text-slate-100">
              Communications hub
            </h1>
            <p className="mt-1 text-[11px] text-muted">
              Centralize messages, announcements, and recruit touchpoints so the
              whole staff stays in sync on who was contacted, when, and how.
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

      {/* Main layout: left = program communications, right = recruiting tie-in */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Left / main column */}
        <div className="md:col-span-2 space-y-4">
          {/* Broadcasts / announcements */}
          <div className="rounded-xl border border-subtle bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-100">
                  Team &amp; parent announcements
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Roadmap: send and track announcements across email / text for
                  athletes, parents, and staff, with a single source of truth
                  for what went out and when.
                </p>
              </div>
              <div className="hidden text-[11px] text-muted sm:flex sm:flex-col sm:items-end">
                <span className="rounded-full border border-subtle px-2 py-0.5">
                  Roadmap: multi-channel blasts
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-[11px] text-muted sm:grid-cols-2">
              <div className="rounded-lg border border-subtle bg-surface/70 p-3">
                <p className="text-[11px] font-semibold text-slate-100">
                  Upcoming announcements
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Future: scheduled messages tied to practices, meets, and key
                  recruiting milestones.
                </p>
              </div>
              <div className="rounded-lg border border-subtle bg-surface/70 p-3">
                <p className="text-[11px] font-semibold text-slate-100">
                  Recent activity
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Future: timeline of what messages were sent, who they went to,
                  and delivery status.
                </p>
              </div>
            </div>
          </div>

          {/* Staff + internal notes */}
          <div className="rounded-xl border border-subtle bg-surface p-5">
            <p className="text-xs font-semibold text-slate-100">
              Internal staff notes
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Roadmap: lightweight internal notes and @mentions between staff
              that tie back to rosters, practices, and recruits without mixing
              with athlete-facing messages.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
              <span className="rounded-full border border-subtle px-2 py-0.5">
                Notes on recruits
              </span>
              <span className="rounded-full border border-subtle px-2 py-0.5">
                Notes on athletes
              </span>
              <span className="rounded-full border border-subtle px-2 py-0.5">
                Staff-only channels
              </span>
            </div>
          </div>
        </div>

        {/* Right / sidebar column */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-subtle bg-surface p-5">
            <p className="text-xs font-semibold text-slate-100">
              Recruiting touchpoints
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Future: unified view of communication history with each recruit,
              aligned with your recruiting board and staff assignments.
            </p>
            <ul className="mt-2 space-y-1 text-[11px] text-muted">
              <li>• Email / text log for each recruit</li>
              <li>• Call and visit tracking</li>
              <li>• Notes shared across staff</li>
            </ul>
            <div className="mt-3">
              <Link
                href={`/programs/${programId}/recruiting`}
                className="inline-flex items-center rounded-full border border-subtle bg-surface/70 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-brand-soft"
              >
                Go to recruiting workspace
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-subtle bg-surface p-5">
            <p className="text-xs font-semibold text-slate-100">
              Templates &amp; guardrails
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Roadmap: message templates for common scenarios (visit invites,
              thank-you notes, check-ins) plus guardrails for compliance and
              consistent tone from your staff.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}
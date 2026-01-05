// app/programs/[programId]/(athletic)/recruiting/page.tsx
// Recruiting M1 (server component): recruitable deficits only + stabilization status bands

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import RecruitingM1Client from "./RecruitingM1Client";
import { readRecruitingM1View } from "@/app/actions/recruiting/readRecruitingM1View";

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

  if (!membershipRow || !(membershipRow as any).programs) {
    redirect("/dashboard");
  }

  const programsRel = (membershipRow as any).programs;
  const programRecord = Array.isArray(programsRel) ? programsRel[0] : programsRel;
  const programName = (programRecord?.name as string) ?? "Program";

  const actingRole: string | null = ((membershipRow as any).role as string) ?? null;
  const isManager =
    actingRole !== null &&
    MANAGER_ROLES.includes(actingRole.toLowerCase() as any);

  // 4) Recruiting M1 read model (recruitable deficits only, derived from Program Health canonical snapshots)
  const model = await readRecruitingM1View(programId);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-subtle bg-brand-soft p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <span>›</span>
              <Link href={`/programs/${programId}`} className="hover:underline">
                {programName}
              </Link>
              <span>›</span>
              <span>Recruiting</span>
            </div>

            <h1 className="mt-1 text-sm font-semibold text-slate-100">
              Recruiting workspace
            </h1>
            <p className="mt-1 text-[11px] text-muted">
              Stabilize your roster for this season by addressing recruitable deficits.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/app/programs/${programId}/recruiting/discovery`}
                className="rounded-md border border-subtle bg-surface/60 px-3 py-2 text-[11px] font-semibold text-slate-100 hover:bg-surface/80"
              >
                Open Discovery Portal
              </Link>
              <div className="text-[11px] text-muted">
                Stage recruits into Surfaced/Favorites, then drag into stabilization slots.
              </div>
            </div>
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

      <RecruitingM1Client model={model} />
    </div>
  );
}

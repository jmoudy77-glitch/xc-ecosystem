// app/dashboard/programs/[programId]/page.tsx
// Program overview scoped to a single program, using server-side Supabase.

import { notFound, redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";


type ProgramOverviewPageProps = {
  params: Promise<{ programId: string }>;
};

export default async function ProgramOverviewPage({
  params,
}: ProgramOverviewPageProps) {
  const { programId } = await params;

  const supabase = await supabaseServerComponent();

  // 1) Auth user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn(
      "[ProgramOverview] auth.getUser error:",
      authError.message || authError
    );
  }

  if (!user) {
    redirect("/login");
  }

  // 2) Verify membership + load program via supabaseAdmin
  const { data: membership, error: membershipError } = await supabaseAdmin
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
    `
    )
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "[ProgramOverview] program_members select error:",
      membershipError
    );
  }

  if (!membership || !membership.programs) {
    // User is not attached to this program, or it doesn't exist.
    notFound();
  }

  const programRecord = (membership as any).programs as { name: string | null } | null;
  const programName: string = programRecord?.name ?? "Unnamed Program";
  const userRole: string = (membership as any).role ?? "member";

  // 3) Render overview
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {programName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Program overview for{" "}
          <span className="font-mono text-xs">{programId}</span>.
        </p>
        <p className="text-xs text-muted-foreground">
          Your role in this program: <span className="font-semibold">{userRole}</span>
        </p>
      </header>

      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">
          This will become the central overview for this specific program:
          roster summary, recruiting snapshot, upcoming tasks, and key alerts.
        </p>
        <p className="text-sm text-muted-foreground">
          Use the navigation above to manage staff, teams &amp; divisions,
          inquiries, and your recruiting board.
        </p>
      </section>
    </div>
  );
}

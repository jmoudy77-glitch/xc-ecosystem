// app/dashboard/programs/[programId]/recruiting/page.tsx
// Server-side Recruiting Board page with auth + membership validation.

import { redirect, notFound } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PageProps = {
  params: Promise<{ programId: string }>;
};

export default async function ProgramRecruitingPage({ params }: PageProps) {
  const { programId } = await params;

  const supabase = await supabaseServerComponent();

  // 1) Auth user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[ProgramRecruiting] auth.getUser error:", authError.message);
  }

  if (!user) {
    redirect("/login");
  }

  // 2) Validate membership + get program name
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
      "[ProgramRecruiting] program_members select error:",
      membershipError
    );
  }

  if (!membership || !(membership as any).programs) {
    notFound();
  }

  const programName =
    (membership as any).programs?.name ?? "Unnamed Program";

  // 3) Render recruiting board (empty state for now)
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Recruiting Board
        </h1>
        <p className="text-sm text-slate-300">
          Athletes who have been officially attached to{" "}
          <span className="font-semibold">{programName}</span> as recruits.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-sm font-medium text-slate-100">No recruits yet.</p>
        <p className="mt-1 text-sm text-slate-300">
          When you convert an athlete inquiry or manually attach an athlete as a
          recruit, they&apos;ll appear here.
        </p>
      </section>
    </div>
  );
}

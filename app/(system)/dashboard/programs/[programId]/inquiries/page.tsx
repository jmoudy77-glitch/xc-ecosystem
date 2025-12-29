// app/dashboard/programs/[programId]/inquiries/page.tsx
// Server-side Program Inquiries page with membership validation.

import { redirect, notFound } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PageProps = {
  params: Promise<{ programId: string }>;
};

export default async function ProgramInquiriesPage({ params }: PageProps) {
  const { programId } = await params;

  const supabase = await supabaseServerComponent();

  // 1) Auth user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[ProgramInquiries] auth.getUser error:", authError.message);
  }

  if (!user) {
    redirect("/login");
  }

  // 2) Validate membership
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
      "[ProgramInquiries] program_members error:",
      membershipError
    );
  }

  if (!membership || !(membership as any).programs) {
    notFound();
  }

  const programName =
    (membership as any).programs?.name ?? "Unnamed Program";

  // 3) Render inquiries UI (empty state for now)
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">
          Inquiries
        </h1>
        <p className="text-sm text-slate-400">
          Athletes who have contacted or shown interest in the {programName} program.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-sm text-slate-200 font-medium">
          No inquiries yet.
        </p>
        <p className="mt-1 text-sm text-slate-300">
          When an athlete reaches out or requests contact, they&apos;ll appear here.
        </p>
      </section>
    </div>
  );
}

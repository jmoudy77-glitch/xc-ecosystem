// app/programs/[programId]/athletes/page.tsx

import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { supabaseServer } from "@/lib/supabaseServer";
import { getProgramAthletes } from "@/lib/athletes";

import AthletesClient from "./AthletesClient";

/**
 * Coach-facing Athletes page (program-scoped)
 * Data flow: DB → API → lib → page → client
 */
export default async function AthletesPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const cookieStore = (await cookies()) as any;
  const { programId } = await params;

  const { supabase } = supabaseServer({ cookies: cookieStore });

  // Auth user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    notFound();
  }

  // Map auth user -> app user (public.users)
  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (appUserError || !appUser) {
    notFound();
  }

  // Program access check (coach membership)
  const { data: membership, error: membershipError } = await supabase
    .from("program_members")
    .select("id")
    .eq("program_id", programId)
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (membershipError || !membership) {
    notFound();
  }

  const athletes = await getProgramAthletes(programId);

  return (
    <div className="bg-transparent">
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 sm:px-6">
        {/* Header / context card (matches Training) */}
        <section className="rounded-xl ring-1 ring-panel panel-muted p-5 text-[var(--foreground)]">
          <div className="flex items-start justify-between gap-4 border-l-2 border-subtle pl-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                <span>Dashboard</span>
                <span>›</span>
                <span>Program</span>
                <span>›</span>
                <span>Athletes</span>
              </div>

              <h1 className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                Program athletes
              </h1>
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Coach-facing athlete profiles for this program. Navigate by event group,
                review performance and training history, and capture notes without turning
                this area into roster management.
              </p>
            </div>
          </div>
        </section>

        {/* Main athletes workspace */}
        <section className="bg-transparent p-0 text-[var(--foreground)]">
          <Suspense fallback={<div className="p-6 text-muted">Loading athletes…</div>}>
            <AthletesClient programId={programId} initialAthletes={athletes} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
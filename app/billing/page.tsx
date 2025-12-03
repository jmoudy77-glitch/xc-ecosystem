// app/billing/page.tsx
// Athlete billing page wrapper.
// - Redirects unauthenticated users to /login
// - If user is "coach only" (program memberships, no athlete sub),
//   show a friendly message + link to program billing instead of athlete billing UI.

import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AthleteBillingPageClient from "./AthleteBillingPageClient";

type AthleteSubscription = {
  planCode: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
} | null;

export default async function AthleteBillingPage() {
  const supabase = await supabaseServerComponent();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[/billing] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  // 1) Ensure a row exists in public.users for this auth_id
  const { data: existingUserRow, error: userSelectError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userSelectError) {
    console.error("[/billing] users select error:", userSelectError);
    throw new Error("Failed to load user record");
  }

  let userRow = existingUserRow;

  if (!userRow) {
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
      console.error("[/billing] Failed to create user row:", userInsertError);
      throw new Error("Failed to create user record");
    }

    userRow = insertedUser;
  }

  const userId = userRow.id as string;

  // 2) Load latest athlete subscription (if any)
  const { data: subs, error: subsError } = await supabaseAdmin
    .from("athlete_subscriptions")
    .select(
      "id, status, current_period_end, plan_code, stripe_subscription_id"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (subsError) {
    console.error("[/billing] athlete_subscriptions select error:", subsError);
  }

  let subscription: AthleteSubscription = null;

  if (subs && subs.length > 0) {
    const row = subs[0] as any;
    subscription = {
      planCode: row.plan_code ?? null,
      status: row.status ?? null,
      currentPeriodEnd: row.current_period_end
        ? new Date(row.current_period_end).toISOString()
        : null,
    };
  }

  const hasAthleteSub = !!subscription;

  // 3) Check program memberships to see if they are a coach
  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from("program_members")
    .select(
      `
      program_id,
      programs!inner (
        id,
        name
      )
    `
    )
    .eq("user_id", userId);

  if (membershipsError) {
    console.error("[/billing] program_members select error:", membershipsError);
  }

  const programMemberships =
    (memberships as any[] | null | undefined) ?? [];

  const hasProgramMemberships = programMemberships.length > 0;

  // "Coach only" = has program memberships but no personal athlete subscription yet
  const isCoachOnly = hasProgramMemberships && !hasAthleteSub;

  // 4) If coach-only, show a simple server-rendered message instead
  if (isCoachOnly) {
    const firstProgram = programMemberships[0];
    const firstProgramId: string | undefined = firstProgram?.program_id;
    const firstProgramName: string =
      firstProgram?.programs?.name ?? "your program";

    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-2xl font-semibold text-slate-900">
            Personal billing not available for coach-only accounts
          </h1>
          <p className="mt-3 text-sm text-slate-700">
            Your account is currently attached to one or more programs as a
            coach. Personal athlete billing is intended for individual athletes
            managing their own tools and insights.
          </p>

          {firstProgramId && (
            <p className="mt-4 text-sm text-slate-700">
              To manage billing for{" "}
              <span className="font-semibold">{firstProgramName}</span>, go to
              your program billing page:
            </p>
          )}

          {firstProgramId && (
            <div className="mt-3">
              <a
                href={`/programs/${firstProgramId}/billing`}
                className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 hover:bg-black"
              >
                Go to program billing
              </a>
            </div>
          )}

          {!firstProgramId && (
            <p className="mt-4 text-sm text-slate-700">
              You can access your program billing from the dashboard under the
              appropriate program.
            </p>
          )}
        </main>
      </div>
    );
  }

  // 5) Otherwise, render athlete billing UI
  return (
    <AthleteBillingPageClient
      userId={userId}
      email={authUser.email ?? null}
      subscription={subscription}
    />
  );
}
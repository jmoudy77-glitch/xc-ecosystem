// app/billing/page.tsx
// Server-side athlete billing page wrapper.
// Redirects unauthenticated users to /login.

import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AthleteBillingPageClient from "./AthleteBillingPageClient";

type AthleteSubscription = {
  planCode: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
};

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

  // Ensure a row exists in public.users for this auth_id
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

  // Load latest athlete subscription (if any)
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

  let subscription: AthleteSubscription | null = null;

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

  return (
    <AthleteBillingPageClient
      userId={userId}
      email={authUser.email ?? null}
      subscription={subscription}
    />
  );
}
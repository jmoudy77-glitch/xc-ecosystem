// app/programs/[programId]/account/page.tsx
// User account page rendered inside the ProgramLayout shell

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PageProps = {
  params: Promise<{
    programId: string;
  }>;
};

export default async function ProgramScopedAccountPage({ params }: PageProps) {
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
      "[ProgramScopedAccountPage] auth.getUser error:",
      authError.message,
    );
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  //
  // 2) Ensure user row exists in public.users
  //
  const { data: existingUserRow, error: userSelectError } = await supabaseAdmin
    .from("users")
    .select(
      "id, auth_id, email, avatar_url, subscription_tier, billing_status",
    )
    .eq("auth_id", authId)
    .maybeSingle();

  if (userSelectError) {
    console.error(
      "[ProgramScopedAccountPage] users select error:",
      userSelectError,
    );
    throw new Error("Failed to load account record");
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
      .select(
        "id, auth_id, email, avatar_url, subscription_tier, billing_status",
      )
      .single();

    if (userInsertError) {
      console.error(
        "[ProgramScopedAccountPage] Failed to create user row:",
        userInsertError,
      );
      throw new Error("Failed to create account record");
    }

    userRow = insertedUser;
  }

  const email = (userRow.email as string | null) ?? authUser.email ?? "";
  const avatarUrl = (userRow.avatar_url as string | null) ?? null;
  const subscriptionTier = (userRow.subscription_tier as string | null) ?? "free";
  const billingStatus = (userRow.billing_status as string | null) ?? "none";

  return (
    <div className="space-y-4">
      {/* Header / breadcrumb inside the program shell */}
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
                Program
              </Link>
              <span>›</span>
              <span>Account</span>
            </div>

            <h1 className="mt-1 text-sm font-semibold text-slate-100">
              Your account
            </h1>
            <p className="mt-1 text-[11px] text-muted">
              Manage your profile, personal subscription, and security settings.
              This is your individual account, shown here inside the program
              workspace for continuity.
            </p>
          </div>

          <div className="hidden text-right text-[11px] text-muted sm:block">
            <p className="font-mono text-[11px] text-slate-100">{email}</p>
            <p className="mt-1">
              User tier:{" "}
              <span className="font-mono text-[11px] text-slate-100">
                {subscriptionTier}
              </span>
            </p>
            <p className="mt-1">
              Billing status:{" "}
              <span className="font-mono text-[11px] text-slate-100">
                {billingStatus}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Main layout: profile + subscription + security skeleton */}
      <section className="grid gap-4 md:grid-cols-[1.4fr,1fr]">
        {/* Left column: profile + preferences */}
        <div className="space-y-4">
          {/* Profile card */}
          <div className="rounded-xl border border-subtle bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Profile
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-subtle bg-brand-soft text-xs font-semibold text-slate-100">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{email ? email[0]?.toUpperCase() : "U"}</span>
                )}
              </div>
              <div className="text-[11px]">
                <p className="font-mono text-[11px] text-slate-100">{email}</p>
                <p className="mt-1 text-muted">
                  Future: edit display name, avatar, and contact preferences.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-subtle px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-surface/80"
              >
                Edit profile (roadmap)
              </button>
            </div>
          </div>

          {/* Preferences / notifications (skeleton) */}
          <div className="rounded-xl border border-subtle bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Notifications &amp; preferences
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Future: control how you receive updates about practices, rosters,
              recruiting activity, and billing.
            </p>
            <ul className="mt-3 space-y-1 text-[11px] text-muted">
              <li>• Practice &amp; schedule reminders</li>
              <li>• Recruiting board activity</li>
              <li>• Program billing alerts</li>
            </ul>
          </div>
        </div>

        {/* Right column: personal subscription + security */}
        <div className="space-y-4">
          {/* Personal subscription (user-level, not program-level) */}
          <section className="rounded-xl border border-subtle bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Personal subscription
            </p>
            <p className="mt-1 text-[11px] text-muted">
              This is your user-level plan (for personal tools or athlete
              access), separate from any program subscriptions you manage.
            </p>

            <div className="mt-3 space-y-1 text-[11px]">
              <p>
                Tier:{" "}
                <span className="font-mono text-[11px] text-slate-100">
                  {subscriptionTier}
                </span>
              </p>
              <p>
                Status:{" "}
                <span className="font-mono text-[11px] text-slate-100">
                  {billingStatus}
                </span>
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-brand px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-brand-soft"
              >
                Manage personal plan (roadmap)
              </button>
            </div>
          </section>

          {/* Security skeleton */}
          <section className="rounded-xl border border-subtle bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Security
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Future: password management, sign-in methods, and two-factor
              authentication controls.
            </p>
            <ul className="mt-3 space-y-1 text-[11px] text-muted">
              <li>• Change password (via auth provider)</li>
              <li>• Manage login methods</li>
              <li>• Two-factor authentication (2FA)</li>
            </ul>
          </section>
        </div>
      </section>
    </div>
  );
}
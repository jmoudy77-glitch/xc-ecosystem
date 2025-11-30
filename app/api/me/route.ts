// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PlanCode } from "@/lib/billingPlans";

/**
 * /api/me
 *
 * Returns the authenticated user's core profile and billing context.
 *
 * Responsibilities:
 * - Ensure a row exists in the public.users table for the auth user
 * - Load basic user info
 * - Load any athlete-level subscription (athlete_subscriptions)
 * - Optionally load program memberships and program-level subscriptions
 *
 * This route is intentionally conservative and focuses on returning
 * enough data for the Billing UI and top-level "who am I?" context.
 */

type RoleHint = "coach" | "athlete" | "both" | "unknown";

type BillingSummary = {
  planCode: PlanCode | null;
  status: string | null;
  currentPeriodEnd: string | null;
};

type ProgramBillingSummary = BillingSummary & {
  programId: string;
  programName: string | null;
};

export async function GET(_req: NextRequest) {
  try {
    const { supabase } = await supabaseServer();

    // 1) Get auth user from Supabase
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[/api/me] Failed to load auth user:", authError);
      return NextResponse.json(
        { error: "Failed to load auth user" },
        { status: 500 },
      );
    }

    if (!authUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const authId = authUser.id;

    // 2) Ensure a row exists in public.users for this auth user.
    // We use supabaseAdmin to bypass RLS on insert.
    const { data: existingUsers, error: userSelectError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("auth_id", authId)
      .limit(1);

    if (userSelectError) {
      console.error("[/api/me] Failed to select user row:", userSelectError);
      return NextResponse.json(
        { error: "Failed to load user record" },
        { status: 500 },
      );
    }

    let appUser = existingUsers?.[0] ?? null;

    if (!appUser) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("users")
        .insert({
          auth_id: authId,
          email: authUser.email,
          name: authUser.user_metadata?.full_name ?? authUser.email,
        })
        .select("*")
        .limit(1);

      if (insertError || !inserted || inserted.length === 0) {
        console.error("[/api/me] Failed to create user row:", insertError);
        return NextResponse.json(
          { error: "Failed to create user record" },
          { status: 500 },
        );
      }

      appUser = inserted[0];
    }

    const userId: string = appUser.id;

    // 3) Determine a basic role hint from relationships (very simple heuristic for now).
    let roleHint: RoleHint = "unknown";

    // If this user has any athlete profile, they are at least an athlete.
    const { data: athleteProfiles, error: athleteError } = await supabaseAdmin
      .from("athletes")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (athleteError) {
      console.error("[/api/me] Failed to lookup athlete profile:", athleteError);
    }

    const isAthlete = !!athleteProfiles && athleteProfiles.length > 0;

    // If this user has any memberships (legacy org-based), we treat them as coach as well.
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (membershipsError) {
      console.error("[/api/me] Failed to lookup memberships:", membershipsError);
    }

    const isCoach = !!memberships && memberships.length > 0;

    if (isCoach && isAthlete) roleHint = "both";
    else if (isCoach) roleHint = "coach";
    else if (isAthlete) roleHint = "athlete";

    // 4) Load athlete-level subscription (if any)
    let athleteBilling: BillingSummary | null = null;

    const {
      data: athleteSubs,
      error: athleteSubsError,
    } = await supabaseAdmin
      .from("athlete_subscriptions")
      .select("plan_code, status, current_period_end")
      .eq("user_id", userId)
      .order("current_period_end", { ascending: false })
      .limit(1);

    if (athleteSubsError) {
      console.error(
        "[/api/me] Failed to load athlete_subscriptions:",
        athleteSubsError,
      );
    } else if (athleteSubs && athleteSubs.length > 0) {
      const sub = athleteSubs[0] as {
        plan_code: PlanCode | null;
        status: string | null;
        current_period_end: string | null;
      };

      athleteBilling = {
        planCode: sub.plan_code ?? null,
        status: sub.status ?? null,
        currentPeriodEnd: sub.current_period_end,
      };
    }

    // 5) Load program memberships (for now we derive from legacy memberships + programs if present).
    //    Once you introduce a dedicated user_programs table, this should query that instead.
    const programBillings: ProgramBillingSummary[] = [];

    // Step 5a: get organizations the user belongs to (legacy)
    const {
      data: orgMemberships,
      error: orgMembershipsError,
    } = await supabaseAdmin
      .from("memberships")
      .select("organization_id")
      .eq("user_id", userId);

    if (orgMembershipsError) {
      console.error(
        "[/api/me] Failed to load org memberships:",
        orgMembershipsError,
      );
    }

    const organizationIds: string[] =
      orgMemberships?.map((m: any) => m.organization_id).filter(Boolean) ?? [];

    if (organizationIds.length > 0) {
      // Step 5b: find any programs attached to these organizations (if programs table already wired)
      const { data: programs, error: programsError } = await supabaseAdmin
        .from("programs")
        .select("id, name, school_id")
        .in("school_id", organizationIds as string[]);

      if (programsError) {
        console.error("[/api/me] Failed to load programs:", programsError);
      } else if (programs && programs.length > 0) {
        const programIds = programs.map((p: any) => p.id);

        const { data: programSubs, error: programSubsError } =
          await supabaseAdmin
            .from("program_subscriptions")
            .select("program_id, plan_code, status, current_period_end")
            .in("program_id", programIds as string[]);

        if (programSubsError) {
          console.error(
            "[/api/me] Failed to load program_subscriptions:",
            programSubsError,
          );
        } else if (programSubs && programSubs.length > 0) {
          const programNameById = new Map<string, string | null>();
          for (const p of programs as any[]) {
            programNameById.set(p.id, p.name ?? null);
          }

          for (const row of programSubs as any[]) {
            programBillings.push({
              programId: row.program_id,
              programName: programNameById.get(row.program_id) ?? null,
              planCode: (row.plan_code as PlanCode) ?? null,
              status: row.status ?? null,
              currentPeriodEnd: row.current_period_end,
            });
          }
        }
      }
    }

    // 6) Build response
    const responsePayload = {
      auth: {
        id: authUser.id,
        email: authUser.email,
      },
      user: {
        id: appUser.id,
        email: appUser.email,
        name: appUser.name,
      },
      roleHint,
      billing: {
        athlete: athleteBilling,
        programs: programBillings,
      },
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (err) {
    console.error("[/api/me] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error loading account" },
      { status: 500 },
    );
  }
}

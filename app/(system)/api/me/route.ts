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
 * IMPORTANT:
 * - The current DB schema does NOT have users.full_name, so we do NOT
 *   select or insert that column here.
 * - fullName is derived from Supabase Auth user_metadata instead.
 */

type RoleHint = "coach" | "athlete" | "both" | "unknown";

type BillingStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unknown";

type AthleteBilling = {
  subscriptionId: string | null;
  planCode: PlanCode | null;
  status: BillingStatus;
  currentPeriodEnd: string | null; // ISO
};

type ProgramBilling = {
  programId: string;
  programName: string;
  subscriptionId: string | null;
  planCode: PlanCode | null;
  status: BillingStatus;
  currentPeriodEnd: string | null; // ISO
};

type MeResponse = {
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
  };
  roleHint: RoleHint;
  billing: {
    athlete: AthleteBilling | null;
    programs: ProgramBilling[];
  };
};

function normalizeStatus(status: string | null): BillingStatus {
  if (!status) return "unknown";
  const s = status.toLowerCase();
  if (s === "active") return "active";
  if (s === "trialing") return "trialing";
  if (s === "past_due") return "past_due";
  if (s === "canceled") return "canceled";
  if (s === "incomplete") return "incomplete";
  return "unknown";
}

export async function GET(req: NextRequest) {
  try {
    const { supabase } = supabaseServer(req);

    // 1) Get the authenticated user from Supabase Auth
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    // AuthSessionMissingError just means no session; that's not a 500.
    if (authError) {
      console.warn("[/api/me] auth.getUser error:", authError.message);
    }

    if (!authUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const authId = authUser.id;

    // Derive full name from auth metadata (since users.full_name is not in DB)
    const derivedFullName =
      authUser.user_metadata?.full_name ??
      authUser.user_metadata?.name ??
      null;

    // 2) Ensure a row exists in public.users for this auth_id
    // NOTE: We DO NOT reference users.full_name here.
    const { data: existingUserRow, error: userSelectError } =
      await supabaseAdmin
        .from("users")
        .select("id, auth_id, email")
        .eq("auth_id", authId)
        .maybeSingle();

    if (userSelectError) {
      console.error("[/api/me] users select error:", userSelectError);
      return NextResponse.json(
        { error: "Failed to load user record" },
        { status: 500 }
      );
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
          // full_name intentionally omitted; column not present in DB yet
        })
        .select("id, auth_id, email")
        .single();

      if (userInsertError) {
        console.error("[/api/me] Failed to create user row:", userInsertError);
        return NextResponse.json(
          { error: "Failed to create user record" },
          { status: 500 }
        );
      }

      userRow = insertedUser;
    }

    const userId = userRow.id as string;

    // 3) Load athlete-level subscription (if any)
    let athleteBilling: AthleteBilling | null = null;

    const { data: athleteSubscriptionRows, error: athleteSubError } =
      await supabaseAdmin
        .from("athlete_subscriptions")
        .select(
          "id, status, current_period_end, plan_code, stripe_subscription_id"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

    if (athleteSubError) {
      console.error(
        "[/api/me] athlete_subscriptions select error:",
        athleteSubError
      );
    }

    if (athleteSubscriptionRows && athleteSubscriptionRows.length > 0) {
      const row = athleteSubscriptionRows[0];
      athleteBilling = {
        subscriptionId: row.stripe_subscription_id ?? row.id ?? null,
        planCode: (row.plan_code as PlanCode | null) ?? null,
        status: normalizeStatus(row.status),
        currentPeriodEnd: row.current_period_end
          ? new Date(row.current_period_end).toISOString()
          : null,
      };
    }

    // 4) Load program memberships + program-level subscriptions
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("program_members")
      .select(
        `
        id,
        program_id,
        role,
        programs!inner (
          id,
          name
        )
      `
      )
      .eq("user_id", userId);

    if (membershipError) {
      console.error(
        "[/api/me] program_members select error:",
        membershipError
      );
    }

    const programs: { id: string; name: string }[] =
      memberships?.map((m: any) => ({
        id: m.program_id,
        name: m.programs?.name ?? "Unnamed Program",
      })) ?? [];

    const programIds = programs.map((p) => p.id);
    let programBillings: ProgramBilling[] = [];

    if (programIds.length > 0) {
      const { data: programSubRows, error: programSubError } =
        await supabaseAdmin
          .from("program_subscriptions")
          .select(
            `
            id,
            status,
            current_period_end,
            plan_code,
            stripe_subscription_id,
            program_id
          `
          )
          .in("program_id", programIds);

      if (programSubError) {
        console.error(
          "[/api/me] program_subscriptions select error:",
          programSubError
        );
      }

      const subsByProgram: Record<string, any[]> = {};
      (programSubRows ?? []).forEach((row) => {
        if (!subsByProgram[row.program_id]) {
          subsByProgram[row.program_id] = [];
        }
        subsByProgram[row.program_id].push(row);
      });

      programBillings = programs.map((program) => {
        const subs = subsByProgram[program.id] ?? [];
        let latestSub: any | null = null;

        if (subs.length > 0) {
          latestSub = subs[0];
        }

        return {
          programId: program.id,
          programName: program.name,
          subscriptionId: latestSub
            ? latestSub.stripe_subscription_id ?? latestSub.id
            : null,
          planCode: latestSub?.plan_code ?? null,
          status: normalizeStatus(latestSub?.status ?? null),
          currentPeriodEnd: latestSub?.current_period_end
            ? new Date(latestSub.current_period_end).toISOString()
            : null,
        };
      });
    }

    // 5) Determine role hint
    let roleHint: RoleHint = "unknown";

    const hasAthleteSub =
      athleteBilling && athleteBilling.status !== "canceled";
    const hasProgramMemberships = programs.length > 0;

    if (hasAthleteSub && hasProgramMemberships) {
      roleHint = "both";
    } else if (hasAthleteSub) {
      roleHint = "athlete";
    } else if (hasProgramMemberships) {
      roleHint = "coach";
    }

    const responsePayload: MeResponse = {
      user: {
        id: userRow.id,
        email: userRow.email,
        fullName: derivedFullName,
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
      { status: 500 }
    );
  }
}
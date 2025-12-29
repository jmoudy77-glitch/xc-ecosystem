// app/api/onboarding/athlete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

type AthleteOnboardingBody = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gradYear: number | null;
  eventGroup: string | null;
  hsSchoolName: string | null;
  hsCity: string | null;
  hsState: string | null;
  hsCountry: string | null;
  hsCoachName: string | null;
  hsCoachEmail: string | null;
  hsCoachPhone: string | null;
  inviteToken?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    // Auth (prefer cookie session; fall back to bearer token for fetches that don't carry cookies)
    const { supabase } = await supabaseServer(req);

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const bearerToken = authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

    // 1) Try cookie-based session first
    const {
      data: { user: cookieUser },
      error: cookieAuthError,
    } = await supabase.auth.getUser();

    // 2) If cookies are missing, fall back to Authorization header
    let authUser = cookieUser;
    let authError = cookieAuthError;

    if ((!authUser || authError) && bearerToken) {
      const { data, error } = await supabaseAdmin.auth.getUser(bearerToken);
      authUser = data?.user ?? null;
      authError = error ?? null;
    }

    if (authError) {
      console.error("[/api/onboarding/athlete] Auth error:", authError);
      return NextResponse.json(
        { error: "Failed to verify authentication" },
        { status: 401 }
      );
    }

    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const authId = authUser.id;

    const body = (await req.json()) as AthleteOnboardingBody;

    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (body.gradYear == null) {
      return NextResponse.json(
        { error: "Missing required field: gradYear" },
        { status: 400 }
      );
    }

    if (!body.eventGroup) {
      return NextResponse.json(
        { error: "Missing required field: eventGroup" },
        { status: 400 }
      );
    }

    if (!body.dateOfBirth) {
      return NextResponse.json(
        { error: "Missing required field: dateOfBirth" },
        { status: 400 }
      );
    }

    // Accept yyyy-mm-dd from <input type="date">
    const dob = String(body.dateOfBirth).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return NextResponse.json(
        { error: "Invalid dateOfBirth format" },
        { status: 400 }
      );
    }

    // 1) Load or create user row
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_id", authId)
      .maybeSingle();

    if (userError) {
      console.error(
        "[/api/onboarding/athlete] users select error:",
        userError
      );
      return NextResponse.json(
        { error: "Failed to load user record" },
        { status: 500 }
      );
    }

    if (!userRow) {
      return NextResponse.json(
        { error: "No user record found for this account" },
        { status: 404 }
      );
    }

    const userId = userRow.id as string;

    const inviteToken = body.inviteToken ? String(body.inviteToken).trim() : null;

    const isClaimFlow = Boolean(inviteToken);

    let invite: { athlete_id: string; program_id: string | null; status: string | null } | null = null;

    if (isClaimFlow) {
      const { data: inviteRow, error: inviteErr } = await supabaseAdmin
        .from("athlete_invites")
        .select("athlete_id, program_id, status, expires_at")
        .eq("invite_token", inviteToken)
        .maybeSingle();

      if (inviteErr) {
        console.error("[/api/onboarding/athlete] athlete_invites select error:", inviteErr);
        return NextResponse.json(
          { error: "Failed to load invite" },
          { status: 500 }
        );
      }

      if (!inviteRow) {
        return NextResponse.json(
          { error: "Invalid invite token" },
          { status: 404 }
        );
      }

      if (inviteRow.status && inviteRow.status !== "pending") {
        return NextResponse.json(
          { error: "Invite is not pending" },
          { status: 409 }
        );
      }

      if (inviteRow.expires_at && new Date(inviteRow.expires_at).getTime() < Date.now()) {
        return NextResponse.json(
          { error: "Invite has expired" },
          { status: 409 }
        );
      }

      invite = {
        athlete_id: inviteRow.athlete_id,
        program_id: inviteRow.program_id ?? null,
        status: inviteRow.status ?? null,
      };
    }

    const { data: athleteByUser, error: athleteByUserError } = await supabaseAdmin
      .from("athletes")
      .select("id, identity_key_strong")
      .eq("user_id", userId)
      .maybeSingle();

    if (athleteByUserError) {
      console.error("[/api/onboarding/athlete] athletes select-by-user error:", athleteByUserError);
      return NextResponse.json(
        { error: "Failed to load athlete profile" },
        { status: 500 }
      );
    }

    let existingAthlete: { id: string; identity_key_strong: string | null } | null = athleteByUser ?? null;

    if (isClaimFlow && invite?.athlete_id) {
      const { data: athleteByInvite, error: athleteByInviteError } = await supabaseAdmin
        .from("athletes")
        .select("id, user_id, identity_key_strong")
        .eq("id", invite.athlete_id)
        .maybeSingle();

      if (athleteByInviteError) {
        console.error("[/api/onboarding/athlete] athletes select-by-invite error:", athleteByInviteError);
        return NextResponse.json(
          { error: "Failed to load invited athlete" },
          { status: 500 }
        );
      }

      if (!athleteByInvite) {
        return NextResponse.json(
          { error: "Invited athlete not found" },
          { status: 404 }
        );
      }

      // If the invited athlete is already claimed by a different user, block.
      if (athleteByInvite.user_id && athleteByInvite.user_id !== userId) {
        return NextResponse.json(
          { error: "Athlete already claimed" },
          { status: 409 }
        );
      }

      // If this user already has a different athlete profile, block for now (avoid silent merges).
      if (athleteByUser?.id && athleteByUser.id !== athleteByInvite.id) {
        return NextResponse.json(
          { error: "Account already has an athlete profile" },
          { status: 409 }
        );
      }

      existingAthlete = {
        id: athleteByInvite.id,
        identity_key_strong: athleteByInvite.identity_key_strong ?? null,
      };
    }

    const norm = (v: string) =>
      v
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[^a-z\s'-]/g, "");

    const sha256 = (s: string) =>
      crypto.createHash("sha256").update(s, "utf8").digest("hex");

    const first = norm(body.firstName);
    const last = norm(body.lastName);
    const gradYear = Number(body.gradYear);

    const identityKeyWeak = sha256(`${first}|${last}|${gradYear}`);
    const identityKeyStrong = sha256(`${first}|${last}|${dob}`);

    const { data: dupMatches, error: dupError } = await (() => {
      let dupQuery = supabaseAdmin
        .from("athletes")
        .select("id, first_name, last_name, grad_year, hs_school_name")
        .eq("identity_key_strong", identityKeyStrong)
        .limit(10);

      if (existingAthlete?.id) {
        dupQuery = dupQuery.neq("id", existingAthlete.id);
      }

      return dupQuery;
    })();

    if (dupError) {
      console.error("[/api/onboarding/athlete] dup check error:", dupError);
      return NextResponse.json(
        { error: "Failed to check duplicates" },
        { status: 500 }
      );
    }

    if (dupMatches && dupMatches.length) {
      // Best-effort audit event
      try {
        await supabaseAdmin.from("athlete_identity_events").insert({
          event_type: "duplicate_detected",
          canonical_athlete_id: dupMatches[0].id,
          source_athlete_id: existingAthlete?.id ?? null,
          actor_user_id: userId,
          details: {
            mode: "athlete_onboarding",
            identity_key_strong: identityKeyStrong,
            dob,
          },
        });
      } catch (e) {
        console.warn("[/api/onboarding/athlete] failed to log athlete_identity_events duplicate_detected", e);
      }

      return NextResponse.json(
        {
          error: "duplicate_detected",
          message: "Potential duplicate detected",
          candidates: dupMatches.map((a: any) => ({
            athlete_id: a.id,
            first_name: a.first_name,
            last_name: a.last_name,
            grad_year: a.grad_year,
            reason: "strong_identity_key_match",
          })),
        },
        { status: 409 }
      );
    }

    // 2) Create or update athlete profile (athlete-input: strong identity)
    const athletePayload = {
      user_id: userId,
      is_claimed: isClaimFlow ? true : undefined,
      first_name: body.firstName,
      last_name: body.lastName,
      grad_year: gradYear,
      event_group: body.eventGroup,
      hs_school_name: body.hsSchoolName,
      hs_city: body.hsCity,
      hs_state: body.hsState,
      hs_country: body.hsCountry,
      hs_coach_name: body.hsCoachName,
      hs_coach_email: body.hsCoachEmail,
      hs_coach_phone: body.hsCoachPhone,
      date_of_birth: dob,
      identity_key_weak: identityKeyWeak,
      identity_key_strong: identityKeyStrong,
      identity_confidence: isClaimFlow ? "claimed" : "strong",
      needs_identity_review: false,
    };

    const baseSelect =
      "id, user_id, first_name, last_name, grad_year, event_group, hs_school_name, hs_city, hs_state, hs_country, hs_coach_name, hs_coach_email, hs_coach_phone, date_of_birth, identity_key_weak, identity_key_strong, identity_confidence";

    const { data: athlete, error: athleteError } = existingAthlete?.id
      ? await supabaseAdmin
          .from("athletes")
          .update(athletePayload)
          .eq("id", existingAthlete.id)
          .select(baseSelect)
          .single()
      : await supabaseAdmin
          .from("athletes")
          .insert(athletePayload)
          .select(baseSelect)
          .single();

    if (athleteError) {
      console.error(
        "[/api/onboarding/athlete] athletes upsert error:",
        athleteError
      );
      return NextResponse.json(
        {
          error: "Failed to create or update athlete profile",
          supabase: {
            code: (athleteError as any).code,
            message: (athleteError as any).message,
            details: (athleteError as any).details,
            hint: (athleteError as any).hint,
          },
        },
        { status: 500 }
      );
    }

    try {
      await supabaseAdmin.from("athlete_identity_events").insert({
        event_type: existingAthlete?.id ? "updated" : "created",
        canonical_athlete_id: athlete.id,
        source_athlete_id: existingAthlete?.id ?? null,
        actor_user_id: userId,
        details: {
          mode: "athlete_onboarding",
          identity_confidence: "strong",
        },
      });
    } catch (e) {
      console.warn("[/api/onboarding/athlete] failed to log athlete_identity_events", e);
    }

    if (isClaimFlow && inviteToken) {
      try {
        await supabaseAdmin
          .from("athlete_invites")
          .update({ status: "accepted" })
          .eq("invite_token", inviteToken);
      } catch (e) {
        console.warn("[/api/onboarding/athlete] failed to mark athlete_invites accepted", e);
      }

      try {
        await supabaseAdmin.from("athlete_identity_events").insert({
          event_type: "claimed",
          canonical_athlete_id: athlete.id,
          source_athlete_id: athlete.id,
          program_id: invite?.program_id ?? null,
          actor_user_id: userId,
          details: {
            mode: "athlete_claim",
            invite_token: inviteToken,
            identity_confidence: "claimed",
          },
        });
      } catch (e) {
        console.warn("[/api/onboarding/athlete] failed to log athlete_identity_events claimed", e);
      }
    }

    return NextResponse.json(
      {
        athlete,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[/api/onboarding/athlete] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error during athlete onboarding" },
      { status: 500 }
    );
  }
}
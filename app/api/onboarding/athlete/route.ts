// app/api/onboarding/athlete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Athlete onboarding endpoint.
 *
 * Called after an athlete signs up and logs in.
 * Responsibilities:
 *  - Ensure a public.users row exists for the auth user
 *  - Create or update an athletes row linked to that user
 *  - Create or reuse a schools row based on HS info
 *
 * Expects a JSON body:
 * {
 *   firstName: string;
 *   lastName: string;
 *   gradYear: string;
 *   eventGroup?: string;
 *   hsSchoolName: string;
 *   hsCity?: string;
 *   hsState?: string;
 *   hsCountry?: string;
 *   hsCoachName?: string;
 *   hsCoachEmail?: string;
 *   hsCoachPhone?: string;
 * }
 */

type AthleteOnboardingBody = {
  firstName: string;
  lastName: string;
  gradYear: string;
  eventGroup?: string;
  hsSchoolName: string;
  hsCity?: string;
  hsState?: string;
  hsCountry?: string;
  hsCoachName?: string;
  hsCoachEmail?: string;
  hsCoachPhone?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await supabaseServer();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[/api/onboarding/athlete] Auth error:", authError);
      return NextResponse.json(
        { error: "Failed to verify authentication" },
        { status: 500 },
      );
    }

    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as AthleteOnboardingBody;

    if (!body.firstName || !body.lastName || !body.gradYear || !body.hsSchoolName) {
      return NextResponse.json(
        { error: "Missing required fields for athlete onboarding" },
        { status: 400 },
      );
    }

    // 1) Ensure a user row exists (same pattern as /api/me)
    const authId = authUser.id;

    const { data: existingUsers, error: userSelectError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("auth_id", authId)
      .limit(1);

    if (userSelectError) {
      console.error(
        "[/api/onboarding/athlete] Failed to select user row:",
        userSelectError,
      );
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
        console.error(
          "[/api/onboarding/athlete] Failed to create user row:",
          insertError,
        );
        return NextResponse.json(
          { error: "Failed to create user record" },
          { status: 500 },
        );
      }

      appUser = inserted[0];
    }

    const userId: string = appUser.id;

    // 2) Find or create a school row. For now we match by exact name + state (if provided).
    let schoolId: string | null = null;

    try {
      const schoolQuery = supabaseAdmin
        .from("schools")
        .select("id")
        .eq("name", body.hsSchoolName.trim());

      if (body.hsState) {
        schoolQuery.eq("state", body.hsState.trim());
      }

      const { data: schools, error: schoolsError } = await schoolQuery.limit(1);

      if (schoolsError) {
        console.error(
          "[/api/onboarding/athlete] Failed to lookup school:",
          schoolsError,
        );
      } else if (schools && schools.length > 0) {
        schoolId = schools[0].id;
      }
    } catch (err) {
      console.error("[/api/onboarding/athlete] Error in school lookup:", err);
    }

    if (!schoolId) {
      const { data: insertedSchool, error: insertSchoolError } =
        await supabaseAdmin
          .from("schools")
          .insert({
            name: body.hsSchoolName.trim(),
            level: "hs",
            city: body.hsCity?.trim() || null,
            state: body.hsState?.trim() || null,
            country: body.hsCountry?.trim() || null,
            is_claimed: false,
          })
          .select("id")
          .limit(1);

      if (insertSchoolError || !insertedSchool || insertedSchool.length === 0) {
        console.error(
          "[/api/onboarding/athlete] Failed to create school:",
          insertSchoolError,
        );
        return NextResponse.json(
          { error: "Failed to create school record" },
          { status: 500 },
        );
      }

      schoolId = insertedSchool[0].id as string;
    }

    // 3) Create or update an athlete profile for this user
    const {
      data: existingAthletes,
      error: athleteSelectError,
    } = await supabaseAdmin
      .from("athletes")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (athleteSelectError) {
      console.error(
        "[/api/onboarding/athlete] Failed to lookup existing athlete:",
        athleteSelectError,
      );
    }

    const upsertPayload = {
      user_id: userId,
      is_claimed: true,
      school_id: schoolId,
      first_name: body.firstName.trim(),
      last_name: body.lastName.trim(),
      grad_year: body.gradYear.trim(),
      event_group: body.eventGroup?.trim() || null,
      hs_school_name: body.hsSchoolName.trim(),
      hs_city: body.hsCity?.trim() || null,
      hs_state: body.hsState?.trim() || null,
      hs_country: body.hsCountry?.trim() || null,
      hs_coach_name: body.hsCoachName?.trim() || null,
      hs_coach_email: body.hsCoachEmail?.trim() || null,
      hs_coach_phone: body.hsCoachPhone?.trim() || null,
    };

    let athleteId: string | null = null;

    if (existingAthletes && existingAthletes.length > 0) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("athletes")
        .update(upsertPayload)
        .eq("id", existingAthletes[0].id)
        .select("id")
        .limit(1);

      if (updateError || !updated || updated.length === 0) {
        console.error(
          "[/api/onboarding/athlete] Failed to update athlete:",
          updateError,
        );
        return NextResponse.json(
          { error: "Failed to update athlete record" },
          { status: 500 },
        );
      }

      athleteId = updated[0].id as string;
    } else {
      const { data: insertedAthlete, error: insertAthleteError } =
        await supabaseAdmin
          .from("athletes")
          .insert(upsertPayload)
          .select("id")
          .limit(1);

      if (
        insertAthleteError ||
        !insertAthlete ||
        insertedAthlete.length === 0
      ) {
        console.error(
          "[/api/onboarding/athlete] Failed to create athlete:",
          insertAthleteError,
        );
        return NextResponse.json(
          { error: "Failed to create athlete record" },
          { status: 500 },
        );
      }

      athleteId = insertedAthlete[0].id as string;
    }

    return NextResponse.json(
      {
        ok: true,
        athleteId,
        schoolId,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[/api/onboarding/athlete] Unexpected error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to onboard athlete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

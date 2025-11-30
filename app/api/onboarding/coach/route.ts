// app/api/onboarding/coach/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Coach onboarding endpoint.
 *
 * Responsibilities:
 *  - Ensure a public.users row exists for the auth user
 *  - Find or create a schools row for the coach's school
 *  - Ensure a memberships row exists linking user -> school (organization)
 *
 * This sets up the identity needed for coach/program flows.
 *
 * Expects JSON body:
 * {
 *   schoolId?: string;            // optional existing school ID from search
 *   schoolName: string;
 *   schoolCity?: string;
 *   schoolState?: string;
 *   schoolCountry?: string;
 *   schoolLevel: string;          // e.g. "hs", "college"
 * }
 */

type CoachOnboardingBody = {
  schoolId?: string;
  schoolName: string;
  schoolCity?: string;
  schoolState?: string;
  schoolCountry?: string;
  schoolLevel: string;
};

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await supabaseServer();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[/api/onboarding/coach] Auth error:", authError);
      return NextResponse.json(
        { error: "Failed to verify authentication" },
        { status: 500 },
      );
    }

    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as CoachOnboardingBody;

    if (!body.schoolName || !body.schoolLevel) {
      return NextResponse.json(
        { error: "Missing required school information" },
        { status: 400 },
      );
    }

    const authId = authUser.id;

    // 1) Ensure a user row exists (same pattern as /api/me & athlete onboarding)
    const { data: existingUsers, error: userSelectError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("auth_id", authId)
      .limit(1);

    if (userSelectError) {
      console.error(
        "[/api/onboarding/coach] Failed to select user row:",
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
          "[/api/onboarding/coach] Failed to create user row:",
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

    // 2) Find or create a school
    let schoolId = body.schoolId || null;

    if (!schoolId) {
      // Try to find school by name + state (if provided)
      try {
        let query = supabaseAdmin
          .from("schools")
          .select("id")
          .eq("name", body.schoolName.trim());

        if (body.schoolState) {
          query = query.eq("state", body.schoolState.trim());
        }

        const { data: schools, error: schoolsError } = await query.limit(1);

        if (schoolsError) {
          console.error(
            "[/api/onboarding/coach] Failed to lookup school:",
            schoolsError,
          );
        } else if (schools && schools.length > 0) {
          schoolId = schools[0].id as string;
        }
      } catch (err) {
        console.error("[/api/onboarding/coach] Error in school lookup:", err);
      }
    }

    if (!schoolId) {
      const { data: insertedSchool, error: insertSchoolError } =
        await supabaseAdmin
          .from("schools")
          .insert({
            name: body.schoolName.trim(),
            level: body.schoolLevel.trim(),
            city: body.schoolCity?.trim() || null,
            state: body.schoolState?.trim() || null,
            country: body.schoolCountry?.trim() || null,
            is_claimed: true,
          })
          .select("id")
          .limit(1);

      if (insertSchoolError || !insertedSchool || insertedSchool.length === 0) {
        console.error(
          "[/api/onboarding/coach] Failed to create school:",
          insertSchoolError,
        );
        return NextResponse.json(
          { error: "Failed to create school record" },
          { status: 500 },
        );
      }

      schoolId = insertedSchool[0].id as string;
    }

    // 3) Ensure membership between user and school exists
    const {
      data: memberships,
      error: membershipSelectError,
    } = await supabaseAdmin
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", schoolId)
      .limit(1);

    if (membershipSelectError) {
      console.error(
        "[/api/onboarding/coach] Failed to lookup membership:",
        membershipSelectError,
      );
    }

    if (!memberships || memberships.length === 0) {
      const { error: membershipInsertError } = await supabaseAdmin
        .from("memberships")
        .insert({
          user_id: userId,
          organization_id: schoolId,
        });

      if (membershipInsertError) {
        console.error(
          "[/api/onboarding/coach] Failed to create membership:",
          membershipInsertError,
        );
        // Non-fatal for now, but we report error
        return NextResponse.json(
          { error: "Failed to create coach membership" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        schoolId,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[/api/onboarding/coach] Unexpected error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to onboard coach";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

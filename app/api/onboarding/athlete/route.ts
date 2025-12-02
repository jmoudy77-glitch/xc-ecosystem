// app/api/onboarding/athlete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type AthleteOnboardingBody = {
  firstName: string;
  lastName: string;
  gradYear: number | null;
  eventGroup: string | null;
  hsSchoolName: string | null;
  hsCity: string | null;
  hsState: string | null;
  hsCountry: string | null;
  hsCoachName: string | null;
  hsCoachEmail: string | null;
  hsCoachPhone: string | null;
};

export async function POST(req: NextRequest) {
  try {
    // ✅ FIX: pass req, no await
    const { supabase } = supabaseServer(req);

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[/api/onboarding/athlete] Auth error:", authError);
      return NextResponse.json(
        { error: "Failed to verify authentication" },
        { status: 500 }
      );
    }

    if (!authUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const authId = authUser.id;

    const body = (await req.json()) as AthleteOnboardingBody;

    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // 2) Create athlete profile
    const { data: athlete, error: athleteError } = await supabaseAdmin
      .from("athletes")
      .insert({
        user_id: userId,
        first_name: body.firstName,
        last_name: body.lastName,
        grad_year: body.gradYear,
        event_group: body.eventGroup,
        hs_school_name: body.hsSchoolName,
        hs_city: body.hsCity,
        hs_state: body.hsState,
        hs_country: body.hsCountry,
        hs_coach_name: body.hsCoachName,
        hs_coach_email: body.hsCoachEmail,
        hs_coach_phone: body.hsCoachPhone,
      })
      .select(
        "id, user_id, first_name, last_name, grad_year, event_group, hs_school_name, hs_city, hs_state, hs_country, hs_coach_name, hs_coach_email, hs_coach_phone"
      )
      .single();

    if (athleteError) {
      console.error(
        "[/api/onboarding/athlete] athletes insert error:",
        athleteError
      );
      return NextResponse.json(
        { error: "Failed to create athlete profile" },
        { status: 500 }
      );
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
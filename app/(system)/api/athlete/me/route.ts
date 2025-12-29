// app/api/athlete/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type AthleteProfileResponse = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  gradYear: number | null;
  eventGroup: string | null;
  hsName: string | null;
  hsCity: string | null;
  hsState: string | null;
  hsCountry: string | null;
  hsCoachName: string | null;
  hsCoachEmail: string | null;
  hsCoachPhone: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await supabaseServer(req);

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    // Again, this will often be AuthSessionMissingError when not logged in
    if (authError) {
      console.warn(
        "[/api/athlete/me] auth.getUser error:",
        authError.message
      );
    }

    if (!authUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const authId = authUser.id;

    // Load user row
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_id", authId)
      .maybeSingle();

    if (userError) {
      console.error("[/api/athlete/me] users select error:", userError);
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

    // Load athlete row for this user
    const { data: athletes, error: athleteError } = await supabaseAdmin
      .from("athletes")
      .select(
        "id, first_name, last_name, grad_year, event_group, hs_school_name, hs_city, hs_state, hs_country, hs_coach_name, hs_coach_email, hs_coach_phone"
      )
      .eq("user_id", userId)
      .limit(1);

    if (athleteError) {
      console.error("[/api/athlete/me] athletes select error:", athleteError);
      return NextResponse.json(
        { error: "Failed to load athlete profile" },
        { status: 500 }
      );
    }

    if (!athletes || athletes.length === 0) {
      // No athlete profile yet; 200 with null is fine for your onboarding UI
      return NextResponse.json(null, { status: 200 });
    }

    const athlete = athletes[0];

    const payload: AthleteProfileResponse = {
      id: athlete.id,
      firstName: athlete.first_name,
      lastName: athlete.last_name,
      gradYear: athlete.grad_year,
      eventGroup: athlete.event_group,
      hsName: athlete.hs_school_name,
      hsCity: athlete.hs_city,
      hsState: athlete.hs_state,
      hsCountry: athlete.hs_country,
      hsCoachName: athlete.hs_coach_name,
      hsCoachEmail: athlete.hs_coach_email,
      hsCoachPhone: athlete.hs_coach_phone,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[/api/athlete/me] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error loading athlete profile" },
      { status: 500 }
    );
  }
}
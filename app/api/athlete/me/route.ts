// app/api/athlete/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * /api/athlete/me
 *
 * Returns the authenticated user's athlete profile, if one exists.
 *
 * Uses:
 *  - auth user from Supabase
 *  - users table (auth_id -> users.id)
 *  - athletes table (user_id -> athlete profile)
 *
 * It also parses the event_group field into structured fields when possible:
 *   "Sprints | 100m | 10.82" -> eventGroup, primaryEvent, primaryEventMark
 */

export async function GET(_req: NextRequest) {
  try {
    const { supabase } = await supabaseServer();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[/api/athlete/me] auth error:", authError);
      return NextResponse.json(
        { error: "Failed to load auth user" },
        { status: 500 },
      );
    }

    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const authId = authUser.id;

    // 1) Find the app user row
    const { data: users, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_id", authId)
      .limit(1);

    if (userError) {
      console.error("[/api/athlete/me] users select error:", userError);
      return NextResponse.json(
        { error: "Failed to load user record" },
        { status: 500 },
      );
    }

    const appUser = users?.[0];

    if (!appUser) {
      return NextResponse.json(
        { error: "No user record found for this account" },
        { status: 404 },
      );
    }

    const userId = appUser.id;

    // 2) Find the athlete profile row for this user
    const { data: athletes, error: athleteError } = await supabaseAdmin
      .from("athletes")
      .select(
        "id, first_name, last_name, grad_year, event_group, hs_school_name, hs_city, hs_state, hs_country, hs_coach_name, hs_coach_email, hs_coach_phone",
      )
      .eq("user_id", userId)
      .limit(1);

    if (athleteError) {
      console.error("[/api/athlete/me] athletes select error:", athleteError);
      return NextResponse.json(
        { error: "Failed to load athlete profile" },
        { status: 500 },
      );
    }

    const athlete = athletes?.[0];

    if (!athlete) {
      return NextResponse.json(
        { error: "No athlete profile found for this user" },
        { status: 404 },
      );
    }

    // 3) Parse the event_group field into structured pieces if it follows
    //    the "group | event | mark" convention we used in onboarding.
    let eventGroup: string | null = null;
    let primaryEvent: string | null = null;
    let primaryEventMark: string | null = null;

    if (athlete.event_group) {
      const parts = (athlete.event_group as string)
        .split("|")
        .map((p) => p.trim())
        .filter(Boolean);

      if (parts.length === 1) {
        eventGroup = parts[0];
      } else if (parts.length === 2) {
        eventGroup = parts[0];
        primaryEvent = parts[1];
      } else if (parts.length >= 3) {
        eventGroup = parts[0];
        primaryEvent = parts[1];
        primaryEventMark = parts[2];
      }
    }

    const payload = {
      id: athlete.id,
      firstName: athlete.first_name,
      lastName: athlete.last_name,
      gradYear: athlete.grad_year,
      eventGroup,
      primaryEvent,
      primaryEventMark,
      hsSchoolName: athlete.hs_school_name,
      hsCity: athlete.hs_city,
      hsState: athlete.hs_state,
      hsCountry: athlete.hs_country,
      hsCoachName: athlete.hs_coach_name,
      hsCoachEmail: athlete.hs_coach_email,
      hsCoachPhone: athlete.hs_coach_phone,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[/api/athlete/me] unexpected error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to load athlete profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

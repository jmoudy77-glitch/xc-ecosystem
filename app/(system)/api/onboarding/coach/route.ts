// app/api/onboarding/coach/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CoachOnboardingBody = {
  schoolId?: string | null;
  schoolName: string;
  schoolCity?: string | null;
  schoolState?: string | null;
  schoolCountry?: string | null;
  schoolLevel?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await supabaseServer(req);

    // 1) Authenticate (cookie session first)
    const {
      data: { user: cookieUser },
      error: cookieAuthError,
    } = await supabase.auth.getUser();

    let authId: string | null = cookieUser?.id ?? null;

    // 1b) Fallback: Authorization: Bearer <token>
    if (!authId) {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

      if (token) {
        const { data: tokenUserData, error: tokenUserError } = await supabaseAdmin.auth.getUser(token);
        if (tokenUserError) {
          console.error("[/api/onboarding/coach] Bearer auth error:", tokenUserError);
          return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }
        authId = tokenUserData?.user?.id ?? null;
      }
    }

    // If cookie auth errored but we *did* get a user, we can proceed; otherwise fail.
    if (cookieAuthError && !authId) {
      console.error("[/api/onboarding/coach] Auth error:", cookieAuthError);
      return NextResponse.json({ error: "Failed to verify authentication" }, { status: 500 });
    }

    if (!authId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as CoachOnboardingBody;

    if (!body.schoolName || !body.schoolName.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2) Ensure app user row exists (by auth_id)
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_id", authId)
      .maybeSingle();

    if (userError) {
      console.error("[/api/onboarding/coach] users select error:", userError);
      return NextResponse.json({ error: "Failed to load user record" }, { status: 500 });
    }

    if (!userRow) {
      return NextResponse.json({ error: "No user record found for this account" }, { status: 404 });
    }

    // 3) If a schoolId was provided, validate it exists and return it.
    if (body.schoolId) {
      const { data: existingSchool, error: existingSchoolError } = await supabaseAdmin
        .from("schools")
        .select("id, name, level, country, state, city")
        .eq("id", body.schoolId)
        .maybeSingle();

      if (existingSchoolError) {
        console.error("[/api/onboarding/coach] schools select by id error:", existingSchoolError);
        return NextResponse.json({ error: "Failed to load school" }, { status: 500 });
      }

      if (!existingSchool) {
        return NextResponse.json({ error: "School not found" }, { status: 404 });
      }

      return NextResponse.json(
        {
          schoolId: existingSchool.id,
          school: existingSchool,
        },
        { status: 200 },
      );
    }

    // 4) Find-or-create school (best-effort identity match)
    const nameNorm = body.schoolName.trim();
    const cityNorm = body.schoolCity?.trim() || null;
    const stateNorm = body.schoolState?.trim() || null;
    const countryNorm = body.schoolCountry?.trim() || null;

    // Match conservatively on (name + optional city/state/country)
    let schoolQuery = supabaseAdmin.from("schools").select("id, name, level, country, state, city");
    schoolQuery = schoolQuery.ilike("name", nameNorm);
    if (cityNorm) schoolQuery = schoolQuery.ilike("city", cityNorm);
    if (stateNorm) schoolQuery = schoolQuery.ilike("state", stateNorm);
    if (countryNorm) schoolQuery = schoolQuery.ilike("country", countryNorm);

    const { data: matchedSchools, error: matchError } = await schoolQuery.limit(2);

    if (matchError) {
      console.error("[/api/onboarding/coach] schools match error:", matchError);
      return NextResponse.json({ error: "Failed to search schools" }, { status: 500 });
    }

    if (matchedSchools && matchedSchools.length > 0) {
      // If multiple results come back, we still return the first (UI can refine later).
      const chosen = matchedSchools[0];
      return NextResponse.json(
        {
          schoolId: chosen.id,
          school: chosen,
          matched: true,
        },
        { status: 200 },
      );
    }

    const insertPayload: Record<string, any> = {
      name: nameNorm,
      level: body.schoolLevel || "college",
      city: cityNorm,
      state: stateNorm,
      country: countryNorm,
    };

    const { data: newSchool, error: insertError } = await supabaseAdmin
      .from("schools")
      .insert(insertPayload)
      .select("id, name, level, country, state, city")
      .single();

    if (insertError) {
      console.error("[/api/onboarding/coach] schools insert error:", insertError);
      return NextResponse.json({ error: "Failed to create school" }, { status: 500 });
    }

    return NextResponse.json(
      {
        schoolId: newSchool.id,
        school: newSchool,
        matched: false,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[/api/onboarding/coach] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error during coach onboarding" }, { status: 500 });
  }
}
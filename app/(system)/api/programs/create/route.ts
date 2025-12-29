// app/api/programs/create/route.ts
// Moved here from app/programs/create/route.ts to avoid route/page conflict.
// This is a pure API endpoint used by coach onboarding and the Create Program page.


import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CreateProgramBody = {
  schoolId: string;
  name: string;
  sport: string;
  gender?: string | null;
  level?: string | null;
  season?: string | null;
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
          console.error("[/programs/create] Bearer auth error:", tokenUserError);
          return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }
        authId = tokenUserData?.user?.id ?? null;
      }
    }

    if (cookieAuthError && !authId) {
      console.error("[/programs/create] Auth error:", cookieAuthError);
      return NextResponse.json({ error: "Failed to verify authentication" }, { status: 500 });
    }

    if (!authId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as CreateProgramBody;

    const schoolId = body.schoolId?.trim();
    const name = body.name?.trim();
    const sport = body.sport?.trim();

    if (!schoolId || !name || !sport) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const gender = body.gender?.trim() || null;
    const level = body.level?.trim() || null;
    const season = body.season?.trim() || null;

    // 2) Ensure app user row exists (by auth_id)
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_id", authId)
      .maybeSingle();

    if (userError) {
      console.error("[/programs/create] users select error:", userError);
      return NextResponse.json({ error: "Failed to load user record" }, { status: 500 });
    }

    if (!userRow) {
      return NextResponse.json({ error: "No user record found for this account" }, { status: 404 });
    }

    const userId = userRow.id as string;

    // 3) Validate school exists
    const { data: existingSchool, error: schoolError } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("id", schoolId)
      .maybeSingle();

    if (schoolError) {
      console.error("[/programs/create] schools select error:", schoolError);
      return NextResponse.json({ error: "Failed to load school" }, { status: 500 });
    }

    if (!existingSchool) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // 4) Duplicate protection: same school_id + name + sport + gender + level + season
    let programQuery = supabaseAdmin
      .from("programs")
      .select("id, school_id, name, sport, gender, level, season")
      .eq("school_id", schoolId)
      .eq("name", name)
      .eq("sport", sport);

    if (gender === null) {
      programQuery = programQuery.is("gender", null);
    } else {
      programQuery = programQuery.eq("gender", gender);
    }

    if (level === null) {
      programQuery = programQuery.is("level", null);
    } else {
      programQuery = programQuery.eq("level", level);
    }

    if (season === null) {
      programQuery = programQuery.is("season", null);
    } else {
      programQuery = programQuery.eq("season", season);
    }

    const { data: existingProgram, error: existingProgramError } = await programQuery.maybeSingle();

    if (existingProgramError) {
      console.error("[/programs/create] programs select error:", existingProgramError);
      return NextResponse.json({ error: "Failed to check existing programs" }, { status: 500 });
    }

    if (existingProgram) {
      // Ensure membership exists for this user
      const { data: existingMember, error: existingMemberError } = await supabaseAdmin
        .from("program_members")
        .select("id")
        .eq("program_id", existingProgram.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingMemberError) {
        console.error("[/programs/create] program_members select error:", existingMemberError);
        return NextResponse.json({ error: "Failed to check membership" }, { status: 500 });
      }

      let programMemberId = existingMember?.id as string | undefined;

      if (!programMemberId) {
        const { data: newMember, error: memberInsertError } = await supabaseAdmin
          .from("program_members")
          .insert({
            program_id: existingProgram.id,
            user_id: userId,
            role: "head_coach",
          })
          .select("id")
          .single();

        if (memberInsertError) {
          console.error("[/programs/create] program_members insert error:", memberInsertError);
          return NextResponse.json({ error: "Failed to attach user to program" }, { status: 500 });
        }

        programMemberId = newMember.id as string;
      }

      // Ensure branding stub exists
      const { data: brandingUpsert, error: brandingError } = await supabaseAdmin
        .from("program_branding")
        .upsert(
          {
            program_id: existingProgram.id,
          },
          { onConflict: "program_id" },
        )
        .select("id")
        .single();

      if (brandingError) {
        console.error("[/programs/create] program_branding upsert error:", brandingError);
        return NextResponse.json({ error: "Failed to initialize branding" }, { status: 500 });
      }

      return NextResponse.json(
        {
          existing: true,
          programId: existingProgram.id,
          program: existingProgram,
          programMemberId,
          brandingId: brandingUpsert.id,
        },
        { status: 200 },
      );
    }

    // 5) Create program
    const { data: newProgram, error: programError } = await supabaseAdmin
      .from("programs")
      .insert({
        school_id: schoolId,
        name,
        sport,
        gender,
        level,
        season,
      })
      .select("id, school_id, name, sport, gender, level, season")
      .single();

    if (programError) {
      console.error("[/programs/create] programs insert error:", programError);
      return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
    }

    // 6) Create membership row (default: head_coach)
    const { data: memberRow, error: memberError } = await supabaseAdmin
      .from("program_members")
      .insert({
        program_id: newProgram.id,
        user_id: userId,
        role: "head_coach",
      })
      .select("id")
      .single();

    if (memberError) {
      console.error("[/programs/create] program_members insert error:", memberError);
      return NextResponse.json({ error: "Failed to attach user to program" }, { status: 500 });
    }

    // 7) Initialize branding stub
    const { data: brandingRow, error: brandingError } = await supabaseAdmin
      .from("program_branding")
      .upsert(
        {
          program_id: newProgram.id,
        },
        { onConflict: "program_id" },
      )
      .select("id")
      .single();

    if (brandingError) {
      console.error("[/programs/create] program_branding upsert error:", brandingError);
      return NextResponse.json({ error: "Failed to initialize branding" }, { status: 500 });
    }

    return NextResponse.json(
      {
        existing: false,
        programId: newProgram.id,
        program: newProgram,
        programMemberId: memberRow.id,
        brandingId: brandingRow.id,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[/programs/create] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error creating program" },
      { status: 500 }
    );
  }
}
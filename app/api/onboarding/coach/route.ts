// app/api/onboarding/coach/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CoachOnboardingBody = {
  programName: string;
  schoolName: string;
  division: string | null;
  conference: string | null;
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
      console.error("[/api/onboarding/coach] Auth error:", authError);
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

    const body = (await req.json()) as CoachOnboardingBody;

    if (!body.programName || !body.schoolName) {
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
        "[/api/onboarding/coach] users select error:",
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

    // 2) Create program
    const { data: newProgram, error: programError } = await supabaseAdmin
      .from("programs")
      .insert({
        name: body.programName,
        school_name: body.schoolName,
        division: body.division,
        conference: body.conference,
      })
      .select("id, name, school_name, division, conference")
      .single();

    if (programError) {
      console.error(
        "[/api/onboarding/coach] programs insert error:",
        programError
      );
      return NextResponse.json(
        { error: "Failed to create program" },
        { status: 500 }
      );
    }

    // 3) Add membership as Head Coach
    const { error: memberError } = await supabaseAdmin
      .from("program_members")
      .insert({
        program_id: newProgram.id,
        user_id: userId,
        role: "head_coach",
      });

    if (memberError) {
      console.error(
        "[/api/onboarding/coach] program_members insert error:",
        memberError
      );
      return NextResponse.json(
        { error: "Failed to attach user to program" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        program: newProgram,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[/api/onboarding/coach] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error during coach onboarding" },
      { status: 500 }
    );
  }
}
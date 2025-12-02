// app/api/programs/create/route.ts
// Moved here from app/programs/create/route.ts to avoid route/page conflict.
// This is a pure API endpoint used by coach onboarding and the Create Program page.


import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CreateProgramBody = {
  name: string;
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
      console.error("[/programs/create] Auth error:", authError);
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
    const body = (await req.json()) as CreateProgramBody;

    if (!body.name || !body.schoolName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1) Load user row
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("auth_id", authId)
      .maybeSingle();

    if (userError) {
      console.error("[/programs/create] users select error:", userError);
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

    // Only coaches (and future admin-like roles) can create programs.
    // Athletes should not be able to spin up new programs.
    const userRole = (userRow as any).role as string | null;

    if (userRole && userRole !== "coach" && userRole !== "admin") {
      return NextResponse.json(
        { error: "Only coaches can create programs" },
        { status: 403 }
      );
    }

    const userId = userRow.id as string;

    // 2) Create program
    const { data: newProgram, error: programError } = await supabaseAdmin
      .from("programs")
      .insert({
        name: body.name,
        school_name: body.schoolName,
        division: body.division,
        conference: body.conference,
      })
      .select("id, name, school_name, division, conference")
      .single();

    if (programError) {
      console.error(
        "[/programs/create] programs insert error:",
        programError
      );
      return NextResponse.json(
        { error: "Failed to create program" },
        { status: 500 }
      );
    }

    // 3) Create membership row (default: head_coach)
    const { error: memberError } = await supabaseAdmin
      .from("program_members")
      .insert({
        program_id: newProgram.id,
        user_id: userId,
        role: "head_coach",
      });

    if (memberError) {
      console.error(
        "[/programs/create] program_members insert error:",
        memberError
      );
      return NextResponse.json(
        { error: "Failed to attach user to program" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        programId: newProgram.id,
        program: newProgram,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[/programs/create] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error creating program" },
      { status: 500 }
    );
  }
}
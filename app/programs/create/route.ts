// app/api/programs/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Creates a new program (team) under a school.
 *
 * Expects JSON body:
 * {
 *   schoolId: string;
 *   name: string;        // e.g. "Men's Track & Field"
 *   sport: string;       // e.g. "Track & Field"
 *   gender?: string;     // e.g. "Men", "Women", "Coed"
 *   level?: string;      // e.g. "college", "hs"
 *   season?: string;     // e.g. "Outdoor", "Indoor", "XC"
 * }
 */

type CreateProgramBody = {
  schoolId: string;
  name: string;
  sport: string;
  gender?: string;
  level?: string;
  season?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await supabaseServer();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[/api/programs/create] Auth error:", authError);
      return NextResponse.json(
        { error: "Failed to verify authentication" },
        { status: 500 },
      );
    }

    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as CreateProgramBody;

    if (!body.schoolId || !body.name || !body.sport) {
      return NextResponse.json(
        { error: "Missing required program fields" },
        { status: 400 },
      );
    }

    // Optionally verify the school exists
    const { data: schools, error: schoolError } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("id", body.schoolId)
      .limit(1);

    if (schoolError) {
      console.error("[/api/programs/create] School lookup error:", schoolError);
      return NextResponse.json(
        { error: "Failed to verify school" },
        { status: 500 },
      );
    }

    if (!schools || schools.length === 0) {
      return NextResponse.json(
        { error: "School not found for provided schoolId" },
        { status: 404 },
      );
    }

    const { data: insertedPrograms, error: insertError } = await supabaseAdmin
      .from("programs")
      .insert({
        school_id: body.schoolId,
        name: body.name.trim(),
        sport: body.sport.trim(),
        gender: body.gender?.trim() || null,
        level: body.level?.trim() || null,
        season: body.season?.trim() || null,
      })
      .select("id")
      .limit(1);

    if (insertError || !insertedPrograms || insertedPrograms.length === 0) {
      console.error(
        "[/api/programs/create] Failed to create program:",
        insertError,
      );
      return NextResponse.json(
        { error: "Failed to create program" },
        { status: 500 },
      );
    }

    const programId = insertedPrograms[0].id as string;

    return NextResponse.json(
      {
        ok: true,
        programId,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[/api/programs/create] Unexpected error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create program";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// app/api/programs/[programId]/scoring/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ProgramScoringWeights = {
  academic: number;
  performance: number;
  availability: number;
  conduct: number;
};

const DEFAULT_WEIGHTS: ProgramScoringWeights = {
  academic: 35,
  performance: 40,
  availability: 15,
  conduct: 10,
};

/**
 * GET /api/programs/:programId/scoring
 *
 * Returns the current scoring profile for a program, or a default
 * profile if none exists yet.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const match = url.pathname.match(/\/api\/programs\/([^/]+)\/scoring/);

    if (!match || !match[1]) {
      return NextResponse.json(
        { ok: false, error: "Missing programId in path." },
        { status: 400 },
      );
    }

    const programId = match[1];

    // 1) Ensure the program exists
    const { data: programs, error: programError } = await supabaseAdmin
      .from("programs")
      .select("id, name")
      .eq("id", programId)
      .limit(1);

    if (programError) {
      console.error(
        "[/api/programs/[programId]/scoring] Program select error:",
        programError,
      );
      return NextResponse.json(
        { ok: false, error: "Failed to load program." },
        { status: 500 },
      );
    }

    if (!programs || programs.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Program not found." },
        { status: 404 },
      );
    }

    const program = programs[0];

    // 2) Load the most recent scoring profile (or default)
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("program_scoring_profiles")
      .select("id, label, weights_json, is_default")
      .eq("program_id", programId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (profileError) {
      console.error(
        "[/api/programs/[programId]/scoring] Profile select error:",
        profileError,
      );
      // We still return a default profile here instead of failing hard.
    }

    let profile: {
      id: string | null;
      label: string;
      is_default: boolean;
      weights: ProgramScoringWeights;
    };

    if (profiles && profiles.length > 0) {
      const row = profiles[0] as any;
      const weightsJson = (row.weights_json || {}) as Partial<
        ProgramScoringWeights
      >;

      profile = {
        id: row.id as string,
        label: (row.label as string) ?? "Default",
        is_default: !!row.is_default,
        weights: {
          academic:
            typeof weightsJson.academic === "number"
              ? weightsJson.academic
              : DEFAULT_WEIGHTS.academic,
          performance:
            typeof weightsJson.performance === "number"
              ? weightsJson.performance
              : DEFAULT_WEIGHTS.performance,
          availability:
            typeof weightsJson.availability === "number"
              ? weightsJson.availability
              : DEFAULT_WEIGHTS.availability,
          conduct:
            typeof weightsJson.conduct === "number"
              ? weightsJson.conduct
              : DEFAULT_WEIGHTS.conduct,
        },
      };
    } else {
      profile = {
        id: null,
        label: "Default",
        is_default: true,
        weights: DEFAULT_WEIGHTS,
      };
    }

    return NextResponse.json(
      {
        ok: true,
        programId,
        programName: (program as any).name ?? null,
        scoring_profile: profile,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/scoring] Unexpected error:",
      err,
    );
    const message =
      err instanceof Error
        ? err.message
        : "Failed to load program scoring settings";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/programs/:programId/scoring
 *
 * Upserts a new default scoring profile for the program.
 */
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const match = url.pathname.match(/\/api\/programs\/([^/]+)\/scoring/);

    if (!match || !match[1]) {
      return NextResponse.json(
        { ok: false, error: "Missing programId in path." },
        { status: 400 },
      );
    }

    const programId = match[1];

    const body = (await req.json().catch(() => ({}))) as {
      label?: string;
      weights?: Partial<ProgramScoringWeights>;
    };

    if (!body.weights) {
      return NextResponse.json(
        { ok: false, error: "Missing weights payload." },
        { status: 400 },
      );
    }

    const weights: ProgramScoringWeights = {
      academic:
        typeof body.weights.academic === "number"
          ? body.weights.academic
          : DEFAULT_WEIGHTS.academic,
      performance:
        typeof body.weights.performance === "number"
          ? body.weights.performance
          : DEFAULT_WEIGHTS.performance,
      availability:
        typeof body.weights.availability === "number"
          ? body.weights.availability
          : DEFAULT_WEIGHTS.availability,
      conduct:
        typeof body.weights.conduct === "number"
          ? body.weights.conduct
          : DEFAULT_WEIGHTS.conduct,
    };

    const label = (body.label ?? "Custom").trim() || "Custom";

    // 1) Ensure the program exists
    const { data: programs, error: programError } = await supabaseAdmin
      .from("programs")
      .select("id")
      .eq("id", programId)
      .limit(1);

    if (programError) {
      console.error(
        "[/api/programs/[programId]/scoring] Program select error (POST):",
        programError,
      );
      return NextResponse.json(
        { ok: false, error: "Failed to load program." },
        { status: 500 },
      );
    }

    if (!programs || programs.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Program not found." },
        { status: 404 },
      );
    }

    // 2) Mark existing profiles as non-default (best-effort)
    const { error: clearError } = await supabaseAdmin
      .from("program_scoring_profiles")
      .update({ is_default: false })
      .eq("program_id", programId);

    if (clearError) {
      console.error(
        "[/api/programs/[programId]/scoring] Failed to clear defaults:",
        clearError,
      );
      // We continue; not fatal.
    }

    // 3) Insert a new default scoring profile
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("program_scoring_profiles")
      .insert({
        program_id: programId,
        label,
        weights_json: weights,
        is_default: true,
      })
      .select("id, label, weights_json, is_default")
      .limit(1);

    if (insertError || !inserted || inserted.length === 0) {
      console.error(
        "[/api/programs/[programId]/scoring] Insert error:",
        insertError,
      );
      return NextResponse.json(
        { ok: false, error: "Failed to save scoring profile." },
        { status: 500 },
      );
    }

    const row = inserted[0] as any;
    const weightsJson = (row.weights_json || {}) as Partial<
      ProgramScoringWeights
    >;

    const profile = {
      id: row.id as string,
      label: (row.label as string) ?? label,
      is_default: !!row.is_default,
      weights: {
        academic:
          typeof weightsJson.academic === "number"
            ? weightsJson.academic
            : DEFAULT_WEIGHTS.academic,
        performance:
          typeof weightsJson.performance === "number"
            ? weightsJson.performance
            : DEFAULT_WEIGHTS.performance,
        availability:
          typeof weightsJson.availability === "number"
            ? weightsJson.availability
            : DEFAULT_WEIGHTS.availability,
        conduct:
          typeof weightsJson.conduct === "number"
            ? weightsJson.conduct
            : DEFAULT_WEIGHTS.conduct,
      },
    };

    return NextResponse.json(
      {
        ok: true,
        scoring_profile: profile,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/scoring] Unexpected error (POST):",
      err,
    );
    const message =
      err instanceof Error
        ? err.message
        : "Failed to save program scoring settings";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

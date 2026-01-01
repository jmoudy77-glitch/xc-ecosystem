import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type MintSeasonBody = {
  program_id: string;
  season_code: string;
  season_label: string;
  window_start: string;
  window_end: string;
  sport_phase: string;
  default_compute_profile?: Record<string, unknown>;
  default_sealing_policy?: Record<string, unknown>;
};

function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isNonEmptyString(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

function supabaseFromCookies() {
  const cookieStore = cookies() as any;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) throw new Error("Missing Supabase env");

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseFromCookies();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return jsonError(401, "Unauthorized");

    const body = (await req.json()) as Partial<MintSeasonBody>;
    if (!body || typeof body !== "object") return jsonError(400, "Invalid JSON body");

    if (!isNonEmptyString(body.program_id)) return jsonError(400, "program_id is required");
    if (!isNonEmptyString(body.season_code)) return jsonError(400, "season_code is required");
    if (!isNonEmptyString(body.season_label)) return jsonError(400, "season_label is required");
    if (!isISODate(body.window_start)) return jsonError(400, "window_start must be YYYY-MM-DD");
    if (!isISODate(body.window_end)) return jsonError(400, "window_end must be YYYY-MM-DD");
    if (!isNonEmptyString(body.sport_phase)) return jsonError(400, "sport_phase is required");

    const args = {
      p_program_id: body.program_id,
      p_season_code: body.season_code.trim(),
      p_season_label: body.season_label.trim(),
      p_window_start: body.window_start,
      p_window_end: body.window_end,
      p_sport_phase: body.sport_phase.trim(),
      p_default_compute_profile: body.default_compute_profile ?? {},
      p_default_sealing_policy: body.default_sealing_policy ?? {},
      p_created_by: user.id,
    };

    const { data, error } = await supabase.rpc("genesis_mint_season", args);

    if (error) {
      const msg = error.message || "Mint failed";
      const status = /already exists/i.test(msg) ? 409 : 400;
      return jsonError(status, msg);
    }

    return NextResponse.json({ ok: true, season_id: data }, { status: 201 });
  } catch (e: any) {
    return jsonError(500, "Internal error", { message: String(e?.message ?? e) });
  }
}

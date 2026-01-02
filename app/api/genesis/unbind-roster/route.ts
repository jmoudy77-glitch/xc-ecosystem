import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type UnbindRosterBody = {
  p_season_id: string;
  p_team_id: string;
  p_athlete_id: string;
};

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies() as any;
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return jsonError(401, "Unauthorized");

    const body = (await req.json()) as Partial<UnbindRosterBody>;
    if (!body?.p_season_id) return jsonError(400, "p_season_id is required");
    if (!body?.p_team_id) return jsonError(400, "p_team_id is required");
    if (!body?.p_athlete_id) return jsonError(400, "p_athlete_id is required");

    const { error } = await supabase.rpc("genesis_unbind_roster", {
      p_season_id: body.p_season_id,
      p_team_id: body.p_team_id,
      p_athlete_id: body.p_athlete_id,
    });

    if (error) return jsonError(400, error.message);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return jsonError(500, "Internal error", { message: String(e?.message ?? e) });
  }
}

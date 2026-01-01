import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type BindRosterBody = {
  p_season_id: string;
  p_team_id: string;
  p_athlete_id: string;
  p_binding_role?: string;
  p_binding_meta?: Record<string, unknown>;
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

    const body = (await req.json()) as Partial<BindRosterBody>;
    if (!body || typeof body !== "object") return jsonError(400, "Invalid JSON body");

    if (!body.p_season_id) return jsonError(400, "p_season_id is required");
    if (!body.p_team_id) return jsonError(400, "p_team_id is required");
    if (!body.p_athlete_id) return jsonError(400, "p_athlete_id is required");

    const { data, error } = await supabase.rpc("genesis_bind_roster", {
      p_season_id: body.p_season_id,
      p_team_id: body.p_team_id,
      p_athlete_id: body.p_athlete_id,
      p_binding_role: body.p_binding_role ?? "member",
      p_binding_meta: body.p_binding_meta ?? {},
    });

    if (error) return jsonError(400, error.message);
    return NextResponse.json({ ok: true, roster_binding_id: data }, { status: 201 });
  } catch (e: any) {
    return jsonError(500, "Internal error", { message: String(e?.message ?? e) });
  }
}

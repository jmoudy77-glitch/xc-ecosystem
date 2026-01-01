import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export async function GET(req: NextRequest) {
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

    const url = new URL(req.url);
    const athleteId = url.searchParams.get("athlete_id");
    if (!athleteId) return jsonError(400, "athlete_id query param is required");

    const { data, error } = await supabase.rpc("genesis_list_athlete_teams", {
      p_athlete_id: athleteId,
    });

    if (error) return jsonError(400, error.message);
    return NextResponse.json({ ok: true, teams: data }, { status: 200 });
  } catch (e: any) {
    return jsonError(500, "Internal error", { message: String(e?.message ?? e) });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type MintEventBody = {
  p_season_id: string;
  p_event_code: string;
  p_event_label: string;
  p_event_type: string;
  p_event_time: string;
  p_event_payload?: Record<string, unknown>;
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

    const body = (await req.json()) as Partial<MintEventBody>;
    if (!body?.p_season_id) return jsonError(400, "p_season_id is required");
    if (!body?.p_event_code) return jsonError(400, "p_event_code is required");
    if (!body?.p_event_label) return jsonError(400, "p_event_label is required");
    if (!body?.p_event_type) return jsonError(400, "p_event_type is required");
    if (!body?.p_event_time) return jsonError(400, "p_event_time is required");

    const { data, error } = await supabase.rpc("genesis_mint_event", {
      p_season_id: body.p_season_id,
      p_event_code: body.p_event_code,
      p_event_label: body.p_event_label,
      p_event_type: body.p_event_type,
      p_event_time: body.p_event_time,
      p_event_payload: body.p_event_payload ?? {},
    });

    if (error) return jsonError(400, error.message);
    return NextResponse.json({ ok: true, event_id: data }, { status: 201 });
  } catch (e: any) {
    return jsonError(500, "Internal error", { message: String(e?.message ?? e) });
  }
}

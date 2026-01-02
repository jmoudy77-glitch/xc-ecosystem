import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type RecordAuditBody = {
  p_season_id: string;
  p_tick_index: number;
  p_entity_type: string;
  p_entity_id: string;
  p_action_type: string;
  p_action_payload?: Record<string, unknown>;
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

    const body = (await req.json()) as Partial<RecordAuditBody>;
    if (!body?.p_season_id) return jsonError(400, "p_season_id is required");
    if (body.p_tick_index === undefined) return jsonError(400, "p_tick_index is required");
    if (!body?.p_entity_type) return jsonError(400, "p_entity_type is required");
    if (!body?.p_entity_id) return jsonError(400, "p_entity_id is required");
    if (!body?.p_action_type) return jsonError(400, "p_action_type is required");

    const { error } = await supabase.rpc("genesis_record_audit", {
      p_season_id: body.p_season_id,
      p_tick_index: body.p_tick_index,
      p_entity_type: body.p_entity_type,
      p_entity_id: body.p_entity_id,
      p_action_type: body.p_action_type,
      p_action_payload: body.p_action_payload ?? {},
    });

    if (error) return jsonError(400, error.message);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return jsonError(500, "Internal error", { message: String(e?.message ?? e) });
  }
}

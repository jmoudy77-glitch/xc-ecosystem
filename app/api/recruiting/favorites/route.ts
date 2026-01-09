import { NextResponse } from "next/server";
import { supabaseRouteClient } from "@/lib/supabase/route";
import { favoritesUpsert } from "@/lib/modules/recruiting/services/favoritesUpsert";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await supabaseRouteClient();

    await favoritesUpsert(supabase, {
      programId: body.programId,
      sport: body.sport ?? "xc",
      athleteId: body.athleteId,
      position: body.position ?? 0,
      pinned: body.pinned ?? false,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}

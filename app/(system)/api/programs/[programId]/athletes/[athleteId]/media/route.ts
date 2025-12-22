// app/(system)/api/programs/[programId]/athletes/[athleteId]/media/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 
 * If this file is not being hit, rename it to `route.ts`.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ programId: string; athleteId: string }> }
) {
  try {
    const { programId, athleteId } = await ctx.params;

    const { supabase } = supabaseServer(req);

    // Auth
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Map auth user -> app user (public.users)
const { data: appUser, error: appUserErr } = await supabase
  .from("users")
  .select("id")
  .eq("auth_id", user.id)
  .limit(1)
  .maybeSingle();

if (appUserErr) {
  return NextResponse.json({ error: appUserErr.message }, { status: 400 });
}

if (!appUser) {
  return NextResponse.json({ error: "User record not found" }, { status: 403 });
}

// Must be a member of the program (program_members.user_id is public.users.id)
const { data: member, error: memberErr } = await supabase
  .from("program_members")
  .select("id")
  .eq("program_id", programId)
  .eq("user_id", appUser.id)
  .limit(1)
  .maybeSingle();

    if (memberErr) {
      return NextResponse.json(
        { error: memberErr.message },
        { status: 400 }
      );
    }

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Ensure athlete belongs to this program (program-athletes area only)
    const { data: pa, error: paErr } = await supabase
      .from("program_athletes")
      .select("id")
      .eq("program_id", programId)
      .eq("athlete_id", athleteId)
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();

    if (paErr) {
      return NextResponse.json({ error: paErr.message }, { status: 400 });
    }

    if (!pa) {
      return NextResponse.json(
        { error: "Athlete not found for this program" },
        { status: 404 }
      );
    }

    // Media rows
    const { data: media, error: mediaErr } = await supabase
      .from("athlete_media")
      .select(
        "id, athlete_id, media_type, role, url, storage_bucket, path, sort_order, is_active, created_at"
      )
      .eq("athlete_id", athleteId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (mediaErr) {
      return NextResponse.json({ error: mediaErr.message }, { status: 400 });
    }

    return NextResponse.json({ media: media ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to load athlete media" },
      { status: 500 }
    );
  }
}

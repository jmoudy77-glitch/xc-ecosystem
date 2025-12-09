// app/api/athletes/[athleteId]/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// PATCH: update athlete profile
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ athleteId: string }> }
) {
  const { athleteId } = await context.params;

  if (!athleteId) {
    return NextResponse.json({ error: "Missing athleteId" }, { status: 400 });
  }

  const { supabase } = supabaseServer(req);

  const body = await req.json();

  const updates = {
    first_name: body.firstName,
    last_name: body.lastName,
    graduation_year: body.graduationYear,
    height_inches: body.heightInches,
    weight_pounds: body.weightPounds,
    bio: body.bio,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("athletes")
    .update(updates)
    .eq("id", athleteId)
    .select("*")
    .single();

  if (error) {
    console.error("[athlete-profile-patch] update error", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, athlete: data });
}
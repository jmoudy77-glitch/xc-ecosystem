import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteParams = {
  params: { athleteId: string };
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { athleteId } = params;
  const body = await req.json().catch(() => ({} as any));

  const { bio, gpa, test_scores } = body as {
    bio?: string;
    gpa?: number | null;
    test_scores?: any;
  };

  const { supabase } = supabaseServer(req);

  // Who is calling?
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Load the athlete to verify ownership
  const { data: athlete, error: athleteError } = await supabase
    .from("athletes")
    .select("id, user_id")
    .eq("id", athleteId)
    .maybeSingle();

  if (athleteError || !athlete) {
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
  }

  if (athlete.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updatePayload: any = {};

  if (typeof bio === "string") {
    updatePayload.bio = bio;
  }
  if (gpa === null || typeof gpa === "number") {
    updatePayload.gpa = gpa;
  }
  if (test_scores === null || typeof test_scores === "object") {
    updatePayload.test_scores = test_scores;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("athletes")
    .update(updatePayload)
    .eq("id", athleteId);

  if (updateError) {
    console.error("[athlete-profile-update] error", updateError);
    return NextResponse.json(
      { error: "Failed to update athlete profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
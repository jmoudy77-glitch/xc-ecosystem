// app/api/athletes/[athleteId]/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// PATCH: update athlete profile fields owned by this athlete's user
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ athleteId: string }> }
) {
  const { athleteId } = await context.params;

  if (!athleteId) {
    return NextResponse.json({ error: "Missing athleteId" }, { status: 400 });
  }

  const { supabase } = await supabaseServer(req);

  // Identify the caller
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify athlete belongs to this user
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

  const body = (await req.json().catch(() => ({}))) as {
    firstName?: string;
    lastName?: string;
    bio?: string;
    gradYear?: number;
    eventGroup?: string;
  };

  const updatePayload: Record<string, any> = {};

  if (typeof body.firstName === "string") {
    updatePayload.first_name = body.firstName;
  }
  if (typeof body.lastName === "string") {
    updatePayload.last_name = body.lastName;
  }
  if (typeof body.bio === "string") {
    updatePayload.bio = body.bio;
  }
  if (typeof body.gradYear === "number") {
    updatePayload.grad_year = body.gradYear;
  }
  if (typeof body.eventGroup === "string") {
    updatePayload.event_group = body.eventGroup;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
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
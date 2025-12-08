// app/api/athletes/[athleteId]/training/[sessionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Params = {
  params: {
    athleteId: string;
    sessionId: string;
  };
};

async function getAuthAndVerifyAthlete(req: NextRequest, athleteId: string) {
  const { supabase } = supabaseServer(req);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      errorResponse: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
      supabase,
      user: null,
    };
  }

  const { data: athlete, error: athleteError } = await supabase
    .from("athletes")
    .select("user_id")
    .eq("id", athleteId)
    .single();

  if (athleteError || !athlete) {
    return {
      errorResponse: NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      ),
      supabase,
      user: null,
    };
  }

  if (athlete.user_id !== user.id) {
    return {
      errorResponse: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
      supabase,
      user: null,
    };
  }

  return { supabase, user, errorResponse: null };
}

// PATCH: mark a training session complete (and future: other updates)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { athleteId, sessionId } = params;

  const { supabase, errorResponse } = await getAuthAndVerifyAthlete(req, athleteId);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({} as any));
  const { mark_complete } = body;

  const update: Record<string, any> = {};
  if (mark_complete) {
    update.completed_at = new Date().toISOString();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No updates specified" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("athlete_training_sessions")
    .update(update)
    .eq("id", sessionId)
    .eq("athlete_id", athleteId)
    .select("*")
    .single();

  if (error) {
    console.error("[PATCH training] error", error);
    return NextResponse.json(
      { error: "Failed to update training session" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ session: data });
}
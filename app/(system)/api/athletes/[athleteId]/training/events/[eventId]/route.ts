// app/api/programs/[programId]/training/events/[eventId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<Record<string, string>> };

const updateEventSchema = z.object({
  label: z.string().min(1).optional(),
  eventCode: z.string().min(1).optional(),
});

async function getProgramMemberOrError(req: NextRequest, programId: string) {
  const { supabase } = supabaseServer(req);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      programMember: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: programMember, error: pmError } = await supabase
    .from("program_members")
    .select("id, program_id")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .maybeSingle();

  if (pmError || !programMember) {
    return {
      supabase,
      programMember: null,
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, programMember, errorResponse: null };
}

// GET: fetch a single training event
export async function GET(req: NextRequest, { params }: Ctx) {
  const { programId, eventId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("training_event_templates")
    .select("id, program_id, event_code, label, created_at")
    .eq("id", eventId)
    .eq("program_id", programId)
    .maybeSingle();

  if (error) {
    console.error("[GET training event] error", error);
    return NextResponse.json(
      { error: "Failed to load training event" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ event: data }, { status: 200 });
}

// PATCH: update training event label / eventCode
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { programId, eventId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const json = await req.json().catch(() => null);
  const parsed = updateEventSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { label, eventCode } = parsed.data;

  if (!label && !eventCode) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const updatePayload: Record<string, any> = {};
  if (label) updatePayload.label = label;

  if (eventCode) {
    // Optional: verify new eventCode exists
    const { data: eventDef, error: eventError } = await supabase
      .from("event_definitions")
      .select("event_code")
      .eq("event_code", eventCode)
      .maybeSingle();

    if (eventError) {
      console.error("[PATCH training event] event_def lookup error", eventError);
      return NextResponse.json(
        { error: "Failed to verify event code" },
        { status: 500 }
      );
    }

    if (!eventDef) {
      return NextResponse.json(
        { error: "Invalid eventCode: no matching event definition" },
        { status: 400 }
      );
    }

    updatePayload.event_code = eventCode;
  }

  const { data, error } = await supabase
    .from("training_event_templates")
    .update(updatePayload)
    .eq("id", eventId)
    .eq("program_id", programId)
    .select("id, program_id, event_code, label, created_at")
    .maybeSingle();

  if (error) {
    console.error("[PATCH training event] update error", error);
    return NextResponse.json(
      { error: "Failed to update training event" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ event: data }, { status: 200 });
}

// DELETE: delete a training event template
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { programId, eventId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const { error } = await supabase
    .from("training_event_templates")
    .delete()
    .eq("id", eventId)
    .eq("program_id", programId);

  if (error) {
    console.error("[DELETE training event] error", error);
    return NextResponse.json(
      { error: "Failed to delete training event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
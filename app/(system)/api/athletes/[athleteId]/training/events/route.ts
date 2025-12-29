// app/api/programs/[programId]/training/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<Record<string, string>> };

const createEventSchema = z.object({
  label: z.string().min(1),
  eventCode: z.string().min(1), // must match an event_definitions.event_code
});

async function getProgramMemberOrError(req: NextRequest, programId: string) {
  const { supabase } = await supabaseServer(req);

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

// GET: list training events (templates) for a program
export async function GET(req: NextRequest, { params }: Ctx) {
  const { programId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("training_event_templates")
    .select("id, program_id, event_code, label, created_at")
    .eq("program_id", programId)
    .order("label", { ascending: true });

  if (error) {
    console.error("[GET training events] error", error);
    return NextResponse.json(
      { error: "Failed to load training events" },
      { status: 500 }
    );
  }

  return NextResponse.json({ events: data ?? [] }, { status: 200 });
}

// POST: create a new training event (template) for a program
export async function POST(req: NextRequest, { params }: Ctx) {
  const { programId } = await params;

  const { supabase, programMember, errorResponse } = await getProgramMemberOrError(
    req,
    programId
  );
  if (errorResponse) return errorResponse;

  const json = await req.json().catch(() => null);
  const parsed = createEventSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { label, eventCode } = parsed.data;

  // Optional: verify eventCode exists in event_definitions
  const { data: eventDef, error: eventError } = await supabase
    .from("event_definitions")
    .select("event_code")
    .eq("event_code", eventCode)
    .maybeSingle();

  if (eventError) {
    console.error("[POST training event] event_def lookup error", eventError);
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

  const { data, error } = await supabase
    .from("training_event_templates")
    .insert({
      program_id: programId,
      event_code: eventCode,
      label,
      created_by_program_member_id: programMember.id,
    })
    .select("id, program_id, event_code, label, created_at")
    .single();

  if (error) {
    console.error("[POST training event] insert error", error);
    return NextResponse.json(
      { error: "Failed to create training event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ event: data }, { status: 201 });
}
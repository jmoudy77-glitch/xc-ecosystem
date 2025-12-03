// app/api/programs/[programId]/inquiries/[inquiryId]/route.ts
// Handles updates to a single athlete inquiry (status, notes, requirements).
// Conversion to a full recruit/program_athletes row can be added later.

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type InquiryStatus = "new" | "watching" | "converted" | "closed";

type UpdateInquiryBody = {
  status?: InquiryStatus;
  coachNotes?: string | null;
  requirements?: string | null;
};

async function assertProgramMembership(req: NextRequest, programId: string) {
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn(
      "[/api/programs/[programId]/inquiries/[inquiryId]] auth error:",
      authError,
    );
    return {
      ok: false as const,
      status: 401 as const,
      error: "Authentication error",
    };
  }

  if (!authUser) {
    return {
      ok: false as const,
      status: 401 as const,
      error: "Not authenticated",
    };
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (userError) {
    console.error(
      "[/api/programs/[programId]/inquiries/[inquiryId]] users lookup error:",
      userError,
    );
    return {
      ok: false as const,
      status: 500 as const,
      error: "Failed to resolve user record",
    };
  }

  if (!userRow) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "No user record found for this account",
    };
  }

  const userId = userRow.id as string;

  const { data: memberRow, error: memberError } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) {
    console.error(
      "[/api/programs/[programId]/inquiries/[inquiryId]] program_members lookup error:",
      memberError,
    );
    return {
      ok: false as const,
      status: 500 as const,
      error: "Failed to verify program membership",
    };
  }

  if (!memberRow) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "You do not have access to this program",
    };
  }

  return { ok: true as const, status: 200 as const, error: null };
}

// PATCH /api/programs/:programId/inquiries/:inquiryId
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ programId: string; inquiryId: string }> },
) {
  const { programId, inquiryId } = await context.params;

  const authCheck = await assertProgramMembership(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  let body: UpdateInquiryBody;
  try {
    body = (await req.json()) as UpdateInquiryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.status) {
    const allowed: InquiryStatus[] = [
      "new",
      "watching",
      "converted",
      "closed",
    ];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 },
      );
    }
    update.status = body.status;
  }

  if (body.coachNotes !== undefined) {
    update.coach_notes = body.coachNotes;
  }

  if (body.requirements !== undefined) {
    update.requirements = body.requirements;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No updatable fields provided" },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("athlete_inquiries")
      .update(update)
      .eq("id", inquiryId)
      .eq("program_id", programId)
      .select(
        `
        id,
        program_id,
        athlete_id,
        source_program_id,
        status,
        message,
        contact_email,
        contact_phone,
        grad_year,
        primary_event,
        pr_blob,
        coach_notes,
        requirements,
        created_at,
        updated_at
      `,
      )
      .maybeSingle();

    if (error) {
      console.error(
        "[/api/programs/[programId]/inquiries/[inquiryId]] update error:",
        error,
      );
      return NextResponse.json(
        { error: "Failed to update athlete inquiry" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Inquiry not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        programId,
        inquiry: data,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/inquiries/[inquiryId]] unexpected PATCH error:",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error updating athlete inquiry" },
      { status: 500 },
    );
  }
}

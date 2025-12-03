// app/api/programs/[programId]/inquiries/[inquiryId]/route.ts
// Handles updates to a single athlete inquiry (status, notes, requirements).
// When status is set to 'converted', this will also upsert a program_athletes
// row to mark the athlete as a recruit for this program.

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type InquiryStatus = "new" | "watching" | "converted" | "closed";

type UpdateInquiryBody = {
  status?: InquiryStatus;
  coachNotes?: string | null;
  requirements?: string | null;
};

// Shared auth helper: verify the current user is a member of this program.
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

  return {
    ok: true as const,
    status: 200 as const,
    error: null,
    memberId: memberRow.id as string,
  };
}

// Internal helper: when an inquiry is converted, upsert program_athletes
// to mark this athlete as a recruit for the program.
async function upsertProgramAthleteFromInquiry(params: {
  programId: string;
  inquiryId: string;
  memberId: string | null;
}) {
  const { programId, inquiryId, memberId } = params;

  // Load the inquiry we just updated to get athlete_id and source.
  const { data: inquiry, error: inquiryError } = await supabaseAdmin
    .from("athlete_inquiries")
    .select(
      `
      id,
      program_id,
      athlete_id,
      status,
      source_program_id,
      status,
      pr_blob,
      primary_event,
      grad_year,
      message,
      contact_email,
      contact_phone,
      coach_notes,
      requirements
    `,
    )
    .eq("id", inquiryId)
    .eq("program_id", programId)
    .maybeSingle();

  if (inquiryError) {
    console.error(
      "[/api/programs/[programId]/inquiries/[inquiryId]] failed to reload inquiry for conversion:",
      inquiryError,
    );
    throw new Error("Failed to reload inquiry during conversion");
  }

  if (!inquiry) {
    throw new Error("Inquiry not found during conversion");
  }

  const athleteId: string | undefined = (inquiry as any).athlete_id;
  if (!athleteId) {
    throw new Error("Inquiry is missing athlete_id");
  }

  // Lookup program to infer level (hs/college) if available.
  const { data: programRow, error: programError } = await supabaseAdmin
    .from("programs")
    .select("id, level")
    .eq("id", programId)
    .maybeSingle();

  if (programError) {
    console.error(
      "[/api/programs/[programId]/inquiries/[inquiryId]] program lookup error when converting:",
      programError,
    );
    throw new Error("Failed to verify program during conversion");
  }

  if (!programRow) {
    throw new Error("Program not found during conversion");
  }

  const level: string | null = (programRow as any).level ?? null;

  // Decide source: prefer existing notion of source; fall back to 'hs_inquiry'.
  const source: string | null =
    ((inquiry as any).source as string | null) ?? "hs_inquiry";

  // Upsert program_athletes: this marks the athlete as a recruit for this program.
  const { error: upsertError } = await supabaseAdmin
    .from("program_athletes")
    .upsert(
      {
        program_id: programId,
        athlete_id: athleteId,
        level,
        relationship_type: "recruit",
        status: "prospect",
        source,
        created_by_program_member_id: memberId,
      },
      {
        onConflict: "program_id,athlete_id",
      },
    );

  if (upsertError) {
    console.error(
      "[/api/programs/[programId]/inquiries/[inquiryId]] program_athletes upsert error during conversion:",
      upsertError,
    );
    throw new Error("Failed to attach athlete to program during conversion");
  }
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

    // If status was just set to 'converted', also upsert into program_athletes
    // so this athlete becomes an official recruit for the program.
    if (body.status === "converted") {
      try {
        await upsertProgramAthleteFromInquiry({
          programId,
          inquiryId,
          memberId: authCheck.memberId ?? null,
        });
      } catch (conversionError) {
        console.error(
          "[/api/programs/[programId]/inquiries/[inquiryId]] conversion to program_athletes failed:",
          conversionError,
        );
        return NextResponse.json(
          {
            error:
              "Inquiry updated but failed to convert to recruit. Please try again.",
          },
          { status: 500 },
        );
      }
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

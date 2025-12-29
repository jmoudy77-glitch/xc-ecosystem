// app/api/programs/[programId]/inquiries/route.ts
// Handles listing and creating athlete inquiries for a specific program.
// NOTE: An inquiry is *not* a recruit. Coaches must explicitly convert.

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type InquiryStatus = "new" | "watching" | "converted" | "closed";

type AthleteInquiry = {
  id: string;
  program_id: string;
  athlete_id: string;
  source_program_id: string | null;
  status: InquiryStatus;
  message: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  grad_year: number | null;
  primary_event: string | null;
  pr_blob: unknown | null;
  coach_notes: string | null;
  requirements: string | null;
  created_at: string;
  updated_at: string;
};

// Auth helper: ensure the current auth user belongs to this program.
async function assertProgramMembership(req: NextRequest, programId: string) {
  const { supabase } = await supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn(
      "[/api/programs/[programId]/inquiries] auth error:",
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
      "[/api/programs/[programId]/inquiries] users lookup error:",
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
      "[/api/programs/[programId]/inquiries] program_members lookup error:",
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

// GET /api/programs/:programId/inquiries
// List inquiries for a program (coach-only).
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ programId: string }> },
) {
  const { programId } = await context.params;

  const authCheck = await assertProgramMembership(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") as InquiryStatus | null;

  try {
    let query = supabaseAdmin
      .from("athlete_inquiries")
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
      .eq("program_id", programId)
      .order("created_at", { ascending: false });

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "[/api/programs/[programId]/inquiries] select error:",
        error,
      );
      return NextResponse.json(
        { error: "Failed to load athlete inquiries" },
        { status: 500 },
      );
    }

    const inquiries: AthleteInquiry[] = (data as any[]) ?? [];

    return NextResponse.json(
      {
        programId,
        inquiries,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/inquiries] unexpected GET error:",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error loading athlete inquiries" },
      { status: 500 },
    );
  }
}

type CreateInquiryBody = {
  athleteId: string;
  sourceProgramId?: string | null;
  message?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  gradYear?: number | null;
  primaryEvent?: string | null;
  prBlob?: unknown | null;
};

// POST /api/programs/:programId/inquiries
// Create a new inquiry. This can be called by public-facing forms or
// authenticated athletes; we do NOT require program membership to submit.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ programId: string }> },
) {
  const { programId } = await context.params;

  let body: CreateInquiryBody;
  try {
    body = (await req.json()) as CreateInquiryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const athleteId = (body.athleteId || "").trim();
  if (!athleteId) {
    return NextResponse.json(
      { error: "athleteId is required" },
      { status: 400 },
    );
  }

  try {
    // Optionally verify athlete exists
    const { data: athleteRow, error: athleteError } = await supabaseAdmin
      .from("athletes")
      .select("id")
      .eq("id", athleteId)
      .maybeSingle();

    if (athleteError) {
      console.error(
        "[/api/programs/[programId]/inquiries] athlete lookup error:",
        athleteError,
      );
      return NextResponse.json(
        { error: "Failed to verify athlete" },
        { status: 500 },
      );
    }

    if (!athleteRow) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 },
      );
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("athlete_inquiries")
      .insert({
        program_id: programId,
        athlete_id: athleteId,
        source_program_id: body.sourceProgramId ?? null,
        status: "new",
        message: body.message ?? null,
        contact_email: body.contactEmail ?? null,
        contact_phone: body.contactPhone ?? null,
        grad_year: body.gradYear ?? null,
        primary_event: body.primaryEvent ?? null,
        pr_blob: body.prBlob ?? null,
      })
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
      .single();

    if (error) {
      console.error(
        "[/api/programs/[programId]/inquiries] insert error:",
        error,
      );
      return NextResponse.json(
        { error: "Failed to create athlete inquiry" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        programId,
        inquiry: inserted as AthleteInquiry,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/inquiries] unexpected POST error:",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error creating athlete inquiry" },
      { status: 500 },
    );
  }
}

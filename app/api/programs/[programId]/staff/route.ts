// app/api/programs/[programId]/staff/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Helper: make sure the current auth user belongs to this program
async function assertProgramMembership(req: NextRequest, programId: string) {
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[/api/programs/[programId]/staff] auth error:", authError);
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
      "[/api/programs/[programId]/staff] users select error:",
      userError
    );
    return {
      ok: false as const,
      status: 500 as const,
      error: "Failed to load user record",
    };
  }

  if (!userRow) {
    return {
      ok: false as const,
      status: 404 as const,
      error: "User record missing",
    };
  }

  const internalUserId = userRow.id as string;

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", internalUserId)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "[/api/programs/[programId]/staff] membership select error:",
      membershipError
    );
    return {
      ok: false as const,
      status: 500 as const,
      error: "Failed to verify program membership",
    };
  }

  if (!membership) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "You do not have access to this program",
    };
  }

  // In the future we can enforce specific roles (head_coach only, etc.)
  return { ok: true as const, status: 200 as const, error: null };
}

// GET /api/programs/:programId/staff  → list staff for that program
export async function GET(req: NextRequest) {
  // Derive programId from URL path: /api/programs/:programId/staff
  let programId: string | undefined;

  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    // segments = ["api", "programs", "<programId>", "staff"]
    const programsIndex = segments.indexOf("programs");
    if (programsIndex !== -1 && segments.length > programsIndex + 1) {
      programId = segments[programsIndex + 1];
    }
  } catch {
    // ignore; we'll handle missing programId below
  }

  if (!programId) {
    return NextResponse.json(
      { error: "Missing programId in path" },
      { status: 400 }
    );
  }

  // Ensure caller is a member of this program
  const authCheck = await assertProgramMembership(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status }
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("program_members")
      .select("id, user_id, role, created_at, users!inner(email)")
      .eq("program_id", programId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(
        "[/api/programs/[programId]/staff] staff select error:",
        error
      );
      return NextResponse.json(
        { error: "Failed to load staff" },
        { status: 500 }
      );
    }

    const staff =
      (data ?? []).map((row: any) => ({
        id: row.id as string,
        userId: row.user_id as string,
        role: (row.role as string | null) ?? null,
        email: row.users?.email ?? null,
        joinedAt: (row.created_at as string | null) ?? null,
      })) ?? [];

    return NextResponse.json(
      {
        programId,
        staff,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/staff] Unexpected GET error:",
      err
    );
    return NextResponse.json(
      { error: "Unexpected error loading staff" },
      { status: 500 }
    );
  }
}
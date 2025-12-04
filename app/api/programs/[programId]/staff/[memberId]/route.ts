// app/api/programs/[programId]/staff/[memberId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Helper: extract programId and memberId from URL path
// Expected path: /api/programs/:programId/staff/:memberId
function extractIdsFromUrl(req: NextRequest): {
  programId?: string;
  memberId?: string;
} {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    // segments = ["api", "programs", "<programId>", "staff", "<memberId>"]
    const programsIndex = segments.indexOf("programs");
    const staffIndex = segments.indexOf("staff");

    const programId =
      programsIndex !== -1 && segments.length > programsIndex + 1
        ? segments[programsIndex + 1]
        : undefined;

    const memberId =
      staffIndex !== -1 && segments.length > staffIndex + 1
        ? segments[staffIndex + 1]
        : undefined;

    return { programId, memberId };
  } catch {
    return { programId: undefined, memberId: undefined };
  }
}

// At the top of the file:
const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type ManagerRoleCode = (typeof MANAGER_ROLES)[number];

function isManagerRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return MANAGER_ROLES.includes(role.toLowerCase() as ManagerRoleCode);
}

// Simple authorization helper: ensure the caller belongs to this program
async function assertProgramMembership(
  req: NextRequest,
  programId: string,
  opts?: { requireManager?: boolean },
) {
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn(
      "[/api/programs/[programId]/staff/[memberId]] auth error:",
      authError,
    );
    return { error: "Not authenticated", status: 401 as const };
  }

  if (!authUser) {
    return { error: "Not authenticated", status: 401 as const };
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (userError) {
    console.error(
      "[/api/programs/[programId]/staff/[memberId]] users select error:",
      userError,
    );
    return { error: "Failed to load user", status: 500 as const };
  }

  if (!userRow) {
    return { error: "No user record for this account", status: 404 as const };
  }

  const currentUserId = userRow.id as string;

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "[/api/programs/[programId]/staff/[memberId]] membership error:",
      membershipError,
    );
    return {
      error: "Failed to verify program membership",
      status: 500 as const,
    };
  }

  if (!membership) {
    return {
      error: "You do not have access to this program",
      status: 403 as const,
    };
  }

  const actingRole = (membership.role as string | null) ?? null;

  if (opts?.requireManager && !isManagerRole(actingRole)) {
    return {
      error: "You do not have permission to manage staff in this program",
      status: 403 as const,
    };
  }

  // Success
  return { error: null, status: 200 as const };
}

// PATCH: update role for a staff member
// PATCH: update role for a staff member
export async function PATCH(req: NextRequest) {
  const { programId, memberId } = extractIdsFromUrl(req);

  if (!programId || !memberId) {
    return NextResponse.json(
      { error: "Missing programId or memberId" },
      { status: 400 },
    );
  }

  try {
    const authCheck = await assertProgramMembership(req, programId, {
      requireManager: true,
    });
    if (authCheck.error) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status },
      );
    }

    const body = await req.json().catch(() => ({}));
    const role = typeof body.role === "string" ? body.role.trim() : "";

    if (!role) {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("program_members")
      .update({ role })
      .eq("program_id", programId)
      .eq("user_id", memberId) // memberId = public.users.id for the staff
      .select("id, role, user_id, created_at")
      .maybeSingle();

    if (error) {
      console.error(
        "[/api/programs/[programId]/staff/[memberId]] update error:",
        error,
      );
      return NextResponse.json(
        { error: "Failed to update staff role" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        member: data,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/staff/[memberId]] Unexpected PATCH error:",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error updating staff role" },
      { status: 500 },
    );
  }
}

// DELETE: remove a staff member from the program
// DELETE: remove a staff member from the program
export async function DELETE(req: NextRequest) {
  const { programId, memberId } = extractIdsFromUrl(req);

  if (!programId || !memberId) {
    return NextResponse.json(
      { error: "Missing programId or memberId" },
      { status: 400 },
    );
  }

  try {
    const authCheck = await assertProgramMembership(req, programId, {
      requireManager: true,
    });
    if (authCheck.error) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status },
      );
    }

    const { error } = await supabaseAdmin
      .from("program_members")
      .delete()
      .eq("program_id", programId)
      .eq("user_id", memberId);

    if (error) {
      console.error(
        "[/api/programs/[programId]/staff/[memberId]] delete error:",
        error,
      );
      return NextResponse.json(
        { error: "Failed to remove staff member" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/staff/[memberId]] Unexpected DELETE error:",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error removing staff member" },
      { status: 500 },
    );
  }
}
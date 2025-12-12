// app/programs/[programId]/staff/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import StaffListClient from "./StaffListClient";

type PageProps = {
  params: Promise<{
    programId: string;
  }>;
};

type StaffMember = {
  userId: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
  joinedAt: string | null;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

export default async function ProgramStaffPage({ params }: PageProps) {
  const { programId } = await params;

  const supabase = await supabaseServerComponent();

  // 1) Auth
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[ProgramStaff] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  // 2) Ensure viewer user row exists (same pattern as other program pages)
  const { data: existingUserRow, error: userSelectError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userSelectError) {
    console.error("[ProgramStaff] users select error:", userSelectError);
    throw new Error("Failed to load viewer user record");
  }

  let viewerUserRow = existingUserRow;

  if (!viewerUserRow) {
    const {
      data: insertedUser,
      error: userInsertError,
    } = await supabaseAdmin
      .from("users")
      .insert({
        auth_id: authId,
        email: authUser.email ?? null,
      })
      .select("id, auth_id, email")
      .single();

    if (userInsertError) {
      console.error(
        "[ProgramStaff] Failed to create viewer user row:",
        userInsertError,
      );
      throw new Error("Failed to create user record");
    }

    viewerUserRow = insertedUser;
  }

  const viewerUserId = viewerUserRow.id as string;

  // 3) Viewer membership & program basic info
  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select(
      `
      id,
      role,
      program_id,
      programs!inner (
        id,
        name
      )
    `,
    )
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[ProgramStaff] membership error:", membershipError);
    throw new Error("Failed to load membership");
  }

  if (!membershipRow || !membershipRow.programs) {
    // Not a member of this program → bounce to dashboard
    redirect("/dashboard");
  }

  const programsRel = (membershipRow as any).programs;
  const programRecord = Array.isArray(programsRel)
    ? programsRel[0]
    : programsRel;

  const programName = (programRecord?.name as string) ?? "Program";

  const actingRole: string | null = (membershipRow.role as string) ?? null;
  const isManager =
    actingRole !== null &&
    MANAGER_ROLES.includes(actingRole.toLowerCase() as any);

  // 4) Staff list for this program
  const { data: staffRows, error: staffError } = await supabaseAdmin
    .from("program_members")
    .select(
      `
      user_id,
      role,
      created_at,
      users:users (
        id,
        email,
        name,
        avatar_url
      )
    `,
    )
    .eq("program_id", programId)
    .order("created_at", { ascending: true });

  if (staffError) {
    console.error("[ProgramStaff] staff list error:", staffError);
    throw new Error("Failed to load staff list");
  }

  const staff: StaffMember[] = (staffRows ?? []).map((row: any) => {
    const userRecord = row.users as
      | {
          email: string | null;
          name: string | null;
          avatar_url: string | null;
        }
      | null
      | undefined;

    const email = (userRecord?.email as string | null) ?? null;
    const explicitName = (userRecord?.name as string | null) ?? null;
    const derivedName =
      explicitName ??
      email?.split("@")[0] ??
      "Staff member";

    return {
      userId: row.user_id as string,
      fullName: derivedName,
      email,
      avatarUrl: (userRecord?.avatar_url as string | null) ?? null,
      role: (row.role as string | null) ?? null,
      joinedAt: (row.created_at as string | null) ?? null,
    };
  });

  // 5) Themed layout: hero/header card + StaffListClient
  // ProgramLayout already wraps this with hero + left nav; we just
  // need local sections to respect the branding tokens.
  return (
    <div className="space-y-4">
      {/* Context / breadcrumb header */}
      <section className="rounded-xl border border-subtle bg-brand-soft p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <span>›</span>
              <Link
                href={`/programs/${programId}`}
                className="hover:underline"
              >
                {programName}
              </Link>
              <span>›</span>
              <span>Staff</span>
            </div>

            <h1 className="mt-1 text-sm font-semibold text-slate-100">
              Staff &amp; roles
            </h1>
            <p className="mt-1 text-[11px] text-muted">
              Manage who has access to this program, what they can do, and how
              they appear to athletes and other staff.
            </p>
          </div>

          <div className="hidden text-right text-[11px] text-muted sm:block">
            <p>
              Your role:{" "}
              <span className="font-mono text-[11px] text-slate-100">
                {actingRole ?? "unknown"}
              </span>
            </p>
            <p className="mt-1">
              Manager privileges:{" "}
              <span className="font-mono text-[11px] text-slate-100">
                {isManager ? "yes" : "no"}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Main staff management client (already handles its own cards/controls) */}
      <StaffListClient
        programId={programId}
        isManager={isManager}
        staff={staff}
      />
    </div>
  );
}
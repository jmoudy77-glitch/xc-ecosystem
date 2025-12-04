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

export default async function ProgramStaffPage(props: PageProps) {
  // 🔑 In your app, `params` is a Promise → await it
  const { programId } = await props.params;

  const supabase = await supabaseServerComponent();

  // Auth
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  // Viewer user row
  const { data: viewerRow, error: viewerError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (viewerError) {
    console.error("[ProgramStaff] viewer users error:", viewerError);
    throw new Error("Failed to load viewer user");
  }

  if (!viewerRow) {
    redirect("/dashboard");
  }

  const viewerUserId = viewerRow.id as string;

  // Viewer membership & role
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

  // Load staff for this program
  const { data: staffRows, error: staffError } = await supabaseAdmin
    .from("program_members")
    .select(
      `
      user_id,
      role,
      created_at,
      user:users!inner (
        email,
        avatar_url
      )
    `,
    )
    .eq("program_id", programId);

  if (staffError) {
    console.error("[ProgramStaff] staff rows error:", staffError);
    throw new Error("Failed to load staff list");
  }

  const staff: StaffMember[] = (staffRows ?? []).map((row: any) => {
  const userRel = row.user;
  const userRecord = Array.isArray(userRel) ? userRel[0] : userRel;

  const email = (userRecord?.email as string | null) ?? null;
  const derivedName =
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Link
                  href={`/programs/${programId}`}
                  className="hover:text-slate-200"
                >
                  Program overview
                </Link>
                <span>›</span>
                <span>Staff &amp; roles</span>
              </div>
              <h1 className="mt-1 text-base font-semibold text-slate-100">
                {programName}
              </h1>
              <p className="mt-1 text-[11px] text-slate-500">
                Manage staff membership and access levels for this program.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <StaffListClient
          programId={programId}
          isManager={isManager}
          staff={staff}
        />
      </main>
    </div>
  );
}
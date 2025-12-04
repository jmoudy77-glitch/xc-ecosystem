// app/programs/[programId]/staff/page.tsx
// Program Staff page (server component)

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PageProps = {
  params: Promise<{
    programId: string;
  }>;
};

type StaffMember = {
  userId: string;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
};

type ProgramBasic = {
  id: string;
  name: string | null;
};

function getInitials(name: string | null, email: string | null): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts[parts.length - 1]?.[0] ?? "";
    return (first + last).toUpperCase();
  }
  if (email) {
    const firstChar = email.trim()[0];
    return firstChar ? firstChar.toUpperCase() : "?";
  }
  return "?";
}

export default async function ProgramStaffPage({ params }: PageProps) {
  const { programId } = await params;

  const supabase = await supabaseServerComponent();

  // 1) Auth user
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

  // 2) Ensure user row exists (same pattern as dashboard)
  const { data: existingUserRow, error: userSelectError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userSelectError) {
    console.error("[ProgramStaff] users select error:", userSelectError);
    throw new Error("Failed to load user record");
  }

  let userRow = existingUserRow;

  if (!userRow) {
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
        "[ProgramStaff] Failed to create user row:",
        userInsertError
      );
      throw new Error("Failed to create user record");
    }

    userRow = insertedUser;
  }

  const userId = userRow.id as string;

  // 3) Confirm this user is a member of the program + get basic program info
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
    `
    )
    .eq("user_id", userId)
    .eq("program_id", programId)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "[ProgramStaff] program_members select error:",
      membershipError
    );
    throw new Error("Failed to load program membership");
  }

  if (!membershipRow || !membershipRow.programs) {
    // User is not part of this program → back to dashboard
    redirect("/dashboard");
  }

  const programRel = (membershipRow as any).programs;
  const programRecord = Array.isArray(programRel) ? programRel[0] : programRel;

  const program: ProgramBasic = {
    id: (programRecord?.id as string) ?? programId,
    name: programRecord?.name ?? "Program",
  };

  const viewerRole: string | null = (membershipRow.role as string | null) ?? null;

  // 4) Load all staff members for this program (joined to users, with avatar_url)
  const { data: staffRows, error: staffError } = await supabaseAdmin
    .from("program_members")
    .select(
      `
      user_id,
      role,
      created_at,
      user:users (
        id,
        email,
        avatar_url
      )
    `
    )
    .eq("program_id", programId)
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });

  if (staffError) {
    console.error("[ProgramStaff] program_members (staff) error:", staffError);
    throw new Error("Failed to load staff list");
  }

  const staff: StaffMember[] =
    (staffRows ?? []).map((row: any) => ({
      userId: row.user_id as string,
      email: row.user?.email ?? null,
      avatarUrl: row.user?.avatar_url ?? null,
      role: row.role ?? null,
    }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top nav header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-50 text-slate-950 flex items-center justify-center text-xs font-semibold">
              XC
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-50">
                {program.name}
              </p>
              <p className="text-[11px] text-slate-400">Program staff</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            {viewerRole && (
              <span className="rounded-full border border-slate-700 px-2 py-0.5">
                Your role: {viewerRole}
              </span>
            )}
            <Link
              href={`/programs/${program.id}`}
              className="rounded-full border border-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-slate-400"
            >
              ← Program overview
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Staff roster
            </p>
            <p className="text-[11px] text-slate-500">
              Coaches and support staff attached to this program.
            </p>
          </div>

          {/* Future: invite staff / manage roles */}
          <div className="flex flex-wrap gap-2 text-[11px]">
            <button
              type="button"
              disabled
              className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1.5 font-medium text-slate-500 cursor-not-allowed"
            >
              + Invite staff (coming soon)
            </button>
          </div>
        </div>

        {staff.length === 0 ? (
          <p className="mt-3 text-[11px] text-slate-500">
            No staff members added yet.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {staff.map((s) => (
              <Link
                key={s.userId}
                href={`/programs/${programId}/staff/${s.userId}`}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 hover:border-slate-600 hover:bg-slate-900/60 transition"
              >
                <div className="h-10 w-10 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center">
                  {s.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.avatarUrl}
                      alt={s.email ?? "staff avatar"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-slate-300">
                      {getInitials(null, s.email)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <p className="text-sm font-medium text-slate-100">
                    {s.email?.split("@")[0] ?? "Staff member"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {s.role ?? "Staff"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
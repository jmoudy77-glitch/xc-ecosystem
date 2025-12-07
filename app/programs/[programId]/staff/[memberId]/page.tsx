// app/programs/[programId]/staff/[memberId]/page.tsx
// Staff profile page (server component)

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import StaffAvatarUploader from "../StaffAvatarUploader";
import StaffRoleEditor from "../StaffRoleEditor";
import { Avatar } from "@/components/Avatar";

type PageProps = {
  params: Promise<{
    programId: string;
    memberId: string; // this is public.users.id from the roster page
  }>;
};

type ProgramBasic = {
  id: string;
  name: string | null;
};

type StaffProfile = {
  userId: string;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
  joinedAt: string | null;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"];

function formatJoinedAt(joinedAt: string | null): string {
  if (!joinedAt) return "Unknown";
  const d = new Date(joinedAt);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function StaffProfilePage(props: PageProps) {
  const { programId, memberId } = await props.params;
  const staffUserId = memberId; // public.users.id for the staff member

  const supabase = await supabaseServerComponent();

  // 1) Auth viewer (Supabase Auth)
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[StaffProfile] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  // 2) Ensure viewer has a row in public.users and get their DB user id
  const { data: existingUserRow, error: userSelectError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userSelectError) {
    console.error("[StaffProfile] users select error:", userSelectError);
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
        "[StaffProfile] Failed to create viewer user row:",
        userInsertError
      );
      throw new Error("Failed to create user record");
    }

    viewerUserRow = insertedUser;
  }

  const viewerUserId = viewerUserRow.id as string;

  // 3) Viewer membership in this program (using public.users.id)
  const { data: actingMembership, error: actingMembershipError } =
    await supabaseAdmin
      .from("program_members")
      .select(
        `
        id,
        user_id,
        role,
        program_id,
        programs!inner (
          id,
          name
        )
      `
      )
      .eq("program_id", programId)
      .eq("user_id", viewerUserId)
      .maybeSingle();

  if (actingMembershipError) {
    console.error(
      "[StaffProfile] acting membership select error:",
      actingMembershipError
    );
    throw new Error("Failed to load viewer membership");
  }

  if (!actingMembership || !actingMembership.programs) {
    // Viewer is not part of this program → bounce
    redirect("/dashboard");
  }

  // programs relation can be array or single object; normalize
  const programsRel = (actingMembership as any).programs;
  const programRecord = Array.isArray(programsRel)
    ? programsRel[0]
    : programsRel;

  const program: ProgramBasic = {
    id: (programRecord?.id as string) ?? programId,
    name: programRecord?.name ?? "Program",
  };

  const actingRole: string | null = (actingMembership.role as string) ?? null;
  const isSelf = viewerUserId === staffUserId;
  const isManager =
    actingRole !== null && MANAGER_ROLES.includes(actingRole.toLowerCase());
  const canEditAvatar = isSelf || isManager;

  // 4) Load target staff membership + user info (again using public.users.id)
  const { data: staffMembershipRow, error: staffMembershipError } =
    await supabaseAdmin
      .from("program_members")
      .select(
        `
        id,
        role,
        created_at,
        user:users!inner (
          id,
          email,
          avatar_url
        )
      `
      )
      .eq("program_id", programId)
      .eq("user_id", staffUserId)
      .maybeSingle();

  if (staffMembershipError) {
    console.error(
      "[StaffProfile] staff membership select error:",
      staffMembershipError
    );
    throw new Error("Failed to load staff membership");
  }

  if (!staffMembershipRow || !staffMembershipRow.user) {
    // Target user is not staff on this program
    redirect(`/programs/${programId}/staff`);
  }

  // user relation can also be an array; normalize
  const userRel = (staffMembershipRow as any).user;
  const userRecord = Array.isArray(userRel) ? userRel[0] : userRel;

  if (!userRecord) {
    redirect(`/programs/${programId}/staff`);
  }

  const staffProfile: StaffProfile = {
    userId: (userRecord.id as string) ?? staffUserId,
    email: (userRecord.email as string | null) ?? null,
    avatarUrl: (userRecord.avatar_url as string | null) ?? null,
    role: (staffMembershipRow.role as string | null) ?? null,
    joinedAt: (staffMembershipRow.created_at as string | null) ?? null,
  };

  const displayName =
    staffProfile.email?.split("@")[0] ??
    staffProfile.email ??
    "Staff member";

  const joinedLabel = formatJoinedAt(staffProfile.joinedAt);

  const programInitials =
    (program.name || "")
      .split(" ")
      .map((w) => w.charAt(0))
      .join("")
      .slice(0, 3)
      .toUpperCase() || "XC";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Branded hero header */}
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-b-2xl border-x border-b border-slate-800 bg-gradient-to-r from-sky-900/80 via-slate-900 to-emerald-900/70 px-4 pt-4 pb-5">
            {/* subtle background accents */}
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-sky-500/30" />
              <div className="absolute -left-16 bottom-0 h-40 w-40 rounded-full border border-emerald-400/20" />
            </div>

            {/* Top row: program badge + back */}
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600 bg-slate-950/50 text-xs font-semibold tracking-wide">
                  {programInitials}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300/80">
                    Program staff profile
                  </p>
                  <p className="text-sm font-semibold text-slate-50">
                    {program.name || "Program"}
                  </p>
                </div>
              </div>
              <Link
                href={`/programs/${program.id}/staff`}
                className="relative rounded-full border border-slate-500/70 bg-slate-950/40 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-slate-300 hover:bg-slate-900/80"
              >
                ← Back to staff
              </Link>
            </div>

            {/* Main row: avatar + identity */}
            <div className="relative mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <Avatar
                  src={staffProfile.avatarUrl || undefined}
                  name={displayName}
                  size="xl"
                  className="h-16 w-16 ring-2 ring-slate-100/20"
                />
                <div>
                  <p className="text-base font-semibold text-slate-50">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-200/80">
                    {staffProfile.email ?? "No email on file"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
                    {staffProfile.role && (
                      <span className="rounded-full border border-emerald-300/60 bg-emerald-900/40 px-2 py-0.5 font-medium text-emerald-100">
                        {staffProfile.role}
                      </span>
                    )}
                    <span className="rounded-full border border-slate-400/40 bg-slate-900/60 px-2 py-0.5 text-slate-200/80">
                      Joined {joinedLabel}
                    </span>
                    {isManager && !isSelf && (
                      <span className="rounded-full border border-sky-400/60 bg-sky-900/40 px-2 py-0.5 text-sky-100">
                        You can manage this staff member
                      </span>
                    )}
                    {isSelf && (
                      <span className="rounded-full border border-slate-300/50 bg-slate-900/60 px-2 py-0.5 text-slate-100">
                        This is your staff profile
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
        {/* Breadcrumb */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Link
              href={`/programs/${programId}`}
              className="hover:text-slate-200"
            >
              Program overview
            </Link>
            <span>›</span>
            <Link
              href={`/programs/${programId}/staff`}
              className="hover:text-slate-200"
            >
              Staff &amp; roles
            </Link>
            <span>›</span>
            <span>{displayName}</span>
          </div>
          <h1 className="mt-1 text-base font-semibold text-slate-100">
            {displayName}
          </h1>
          <p className="mt-1 text-[11px] text-slate-500">
            Manage this coach&apos;s profile, avatar, and role in your program.
          </p>
        </div>
        <section className="grid gap-4 md:grid-cols-3">
          {/* Left: photo controls + meta */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 md:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Profile image & access
            </p>

            <div className="mt-3 flex items-center gap-3">
              <Avatar
                src={staffProfile.avatarUrl || undefined}
                name={displayName}
                size="xl"
                className="h-16 w-16"
              />
              <div className="text-[11px] text-slate-400">
                <p>Update this staff member&apos;s photo.</p>
                <p className="mt-1">
                  Square image is auto-generated for best fit in rosters and
                  dashboards.
                </p>
              </div>
            </div>

            <StaffAvatarUploader
              canEdit={!!canEditAvatar}
              isSelf={isSelf}
              programId={program.id}
              targetUserId={staffProfile.userId}
            />

            <div className="mt-4 space-y-1 text-xs text-slate-300">
              <p>
                Joined program:{" "}
                <span className="font-mono text-[11px] text-slate-100">
                  {joinedLabel}
                </span>
              </p>
              <p className="text-[11px] text-slate-500">
                {isSelf
                  ? "This is how program admins will see your staff profile."
                  : isManager
                  ? "As a head coach / admin, you can adjust this staff member’s photo and eventually their roles."
                  : "Only head coaches and admins can change this staff member’s details."}
              </p>
            </div>
          </div>

          {/* Right: future sections */}
          <div className="space-y-4 md:col-span-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Coaching roles & responsibilities
              </p>

              <StaffRoleEditor
                programId={programId}
                memberId={staffProfile.userId}
                initialRole={staffProfile.role}
                canEdit={isManager}
              />

              <p className="mt-4 text-[11px] text-slate-500">
                In the future, this will include assigning event groups (distance,
                sprints, throws), practice responsibilities, and access permissions.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Contact & internal notes
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Future: store phone numbers, preferred contact channels, and
                internal notes for this staff member (only visible to program
                admins and head coaches).
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
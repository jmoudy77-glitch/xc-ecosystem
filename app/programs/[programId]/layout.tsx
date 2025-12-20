// app/programs/[programId]/layout.tsx
// Program-level layout: applies program theme + hero header shell

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadProgramTheme } from "@/lib/branding";
import { ProgramNav, ProgramContextBar } from "./ProgramNav";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{
    programId: string;
  }>;
};

type ProgramHeaderInfo = {
  id: string;
  name: string | null;
  sport: string | null;
  gender: string | null;
  level: string | null;
  season: string | null;
  school: {
    id: string;
    name: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    level: string | null;
  } | null;
};

function formatLevelTag(level: string | null): string {
  if (!level) return "Unknown level";
  const v = level.toLowerCase();
  if (v === "hs" || v === "high_school" || v === "highschool") return "High school";
  if (v === "naia") return "NAIA";
  if (v === "njcaa") return "NJCAA";
  if (v === "ncaa_d1" || v === "d1") return "NCAA D1";
  if (v === "ncaa_d2" || v === "d2") return "NCAA D2";
  if (v === "ncaa_d3" || v === "d3") return "NCAA D3";
  return level;
}

function formatSportTag(sport: string | null): string {
  if (!sport) return "Unknown sport";
  return sport;
}

function formatGenderTag(gender: string | null): string {
  if (!gender) return "Co-ed / unknown";
  const g = gender.toLowerCase();
  if (g === "m" || g === "men" || g === "male") return "Men";
  if (g === "w" || g === "women" || g === "female") return "Women";
  return gender;
}

export default async function ProgramLayout({ children, params }: LayoutProps) {
  const { programId } = await params;

  const supabase = await supabaseServerComponent();

  // 1) Auth
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[ProgramLayout] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  // 2) Ensure user row exists (mirrors ProgramOverview logic)
  const { data: existingUserRow, error: userSelectError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userSelectError) {
    console.error("[ProgramLayout] users select error:", userSelectError);
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
      console.error("[ProgramLayout] Failed to create user row:", userInsertError);
      throw new Error("Failed to create user record");
    }

    userRow = insertedUser;
  }

  const userId = userRow.id as string;

  // 3) Confirm membership + load program basic info
  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select(
      `
      id,
      role,
      program_id,
      programs!inner (
        id,
        name,
        sport,
        gender,
        level,
        season,
        school:schools (
          id,
          name,
          city,
          state,
          country,
          level
        )
      )
    `
    )
    .eq("user_id", userId)
    .eq("program_id", programId)
    .maybeSingle();

  if (membershipError) {
    console.error("[ProgramLayout] program_members select error:", membershipError);
    throw new Error("Failed to load program membership");
  }

  if (!membershipRow || !membershipRow.programs) {
    // Not a member of this program → bounce to dashboard
    redirect("/dashboard");
  }

  const programData = membershipRow.programs as any;

  const program: ProgramHeaderInfo = {
    id: programData.id,
    name: programData.name ?? null,
    sport: programData.sport ?? null,
    gender: programData.gender ?? null,
    level: programData.level ?? null,
    season: programData.season ?? null,
    school: programData.school
      ? {
          id: programData.school.id,
          name: programData.school.name ?? null,
          city: programData.school.city ?? null,
          state: programData.school.state ?? null,
          country: programData.school.country ?? null,
          level: programData.school.level ?? null,
        }
      : null,
  };

  const school = program.school;

  // 4) Program-level theme
  const theme = await loadProgramTheme(programId);

  return (
    <div
      className="min-h-screen"
      style={{
        // v1 core neutrals
        ["--app-bg" as any]: theme.appBg,
        ["--surface-1" as any]: theme.surface1,
        ["--surface-2" as any]: theme.surface2,
        ["--surface-3" as any]: theme.surface3,
        ["--border" as any]: theme.border,
        ["--border-muted" as any]: theme.borderMuted,
        ["--text" as any]: theme.text,
        ["--text-muted" as any]: theme.textMuted,
        ["--text-subtle" as any]: theme.textSubtle,
        ["--focus-ring" as any]: theme.focusRing,

        // v1 brand + accents
        ["--brand" as any]: theme.brand,
        ["--brand-contrast" as any]: theme.brandContrast,
        ["--accent" as any]: theme.accent,
        ["--accent-contrast" as any]: theme.accentContrast,
        ["--brand-soft" as any]: theme.brandSoft,
        ["--brand-rail" as any]: theme.brandRail,
        ["--link" as any]: theme.link,

        // v1 semantic support
        ["--success" as any]: theme.success,
        ["--warning" as any]: theme.warning,
        ["--danger" as any]: theme.danger,
        ["--info" as any]: theme.info,

        // Surface System (v1)
        ["--canvas-bg" as any]: theme.canvasBg,
        ["--panel-bg" as any]: theme.panelBg,
        ["--panel-muted-bg" as any]: theme.panelMutedBg,
        ["--panel-ring" as any]: theme.panelRing,

        // legacy aliases (keep during migration)
        ["--background" as any]: theme.appBg,
        ["--foreground" as any]: theme.text,
        ["--brand-primary" as any]: theme.brand,
        ["--brand-secondary" as any]: theme.surface2,
        ["--surface" as any]: theme.surface3,
        ["--border-subtle" as any]: theme.border,
        ["--muted-foreground" as any]: theme.textMuted,

        backgroundColor: "var(--app-bg)",
        color: "var(--text)",
      }}
    >
      <div className="xc-program-shell">
      {/* Program hero header (non-negotiable for coach app) */}
      <header className="relative z-[9999] border-b border-subtle bg-panel-muted backdrop-blur">
        <div className="flex w-full items-center justify-between px-4 py-3 lg:px-8">
              <div className="flex items-center gap-3">
                {theme.logoUrl && (
                  <div className="h-10 w-10 rounded-md border border-subtle bg-surface flex items-center justify-center overflow-hidden">
                    <img
                      src={theme.logoUrl}
                      alt={`${program.name ?? "Program"} logo`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted">
                    {school?.name ?? "School name"}
                  </p>
                  <h1 className="text-base font-semibold">
                    {program.name ?? "Program name"}
                  </h1>
                </div>
              </div>
          <ProgramContextBar
            programId={programId}
            programName={program.name ?? "Program"}
          />
        </div>
      </header>

      {/* Body: left menu + main content, program-scoped */}
      <div className="flex w-full gap-4 px-4 py-4 lg:px-8">
        <aside className="w-56 shrink-0">
          <ProgramNav />
        </aside>

        <main className="flex-1 pb-8">
          {children}
        </main>
      </div>
      </div>
      <style>{`
        /* Reserve space for the system-header AI tray so it never overlaps program header or workspace.
           Uses :has() to detect the open <details id="ai-presence"> in app/layout.tsx.
           We only reserve space on large screens; on small screens the tray can overlay. */
        @media (min-width: 1024px) {
          body:has(#ai-presence[open]) .xc-program-shell {
            padding-right: 380px;
            transition: padding-right 220ms ease;
          }
          body:not(:has(#ai-presence[open])) .xc-program-shell {
            padding-right: 0px;
            transition: padding-right 220ms ease;
          }
        }
      `}</style>
    </div>
  );
}
// app/programs/[programId]/layout.tsx
import Link from "next/link";
import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

type ProgramLayoutProps = {
  children: ReactNode;
  params: Promise<{
    programId: string;
  }>;
};

export default async function ProgramLayout({
  children,
  params,
}: ProgramLayoutProps) {
  const { programId } = await params;

  if (!programId) {
    console.error("[ProgramLayout] missing programId param");
    notFound();
  }

  const supabase = await supabaseServerComponent();

  // Load program + school for branding
  const { data: program, error } = await supabase
    .from("programs")
    .select(
      `
      id,
      name,
      sport,
      gender,
      level,
      school:schools (
        id,
        name,
        logo_url,
        primary_color,
        secondary_color
      )
    `
    )
    .eq("id", programId)
    .single();

  if (error || !program) {
    console.error("[ProgramLayout] failed to load program:", error);
    notFound();
  }

  const school = (program as any).school;
  const schoolName = school?.name ?? "School name";
  const programName = program.name ?? "Program name";

  // Fallback colors if theme not set yet
  const primary = school?.primary_color || "#ef4444"; // red-500
  const secondary = school?.secondary_color || "#0f172a"; // slate-900

  // You can later move this into CSS vars / theming
  const headerGradient = {
    backgroundImage: `linear-gradient(120deg, ${primary} 0%, ${secondary} 60%, #020617 100%)`,
  };

  const navItems: { label: string; href: string; key: string }[] = [
    { label: "Dashboard", href: `/programs/${programId}/dashboard`, key: "dashboard" },
    { label: "Teams", href: `/programs/${programId}/teams`, key: "teams" },
    { label: "Recruiting", href: `/programs/${programId}/recruiting`, key: "recruiting" },
    { label: "Training", href: `/programs/${programId}/training`, key: "training" },
    { label: "Communications", href: `/programs/${programId}/communications`, key: "communications" },
    { label: "Staff", href: `/programs/${programId}/staff`, key: "staff" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Full-width program header */}
      <header
        className="border-b border-slate-900/80 bg-gradient-to-r from-slate-900 to-slate-950"
        style={headerGradient}
      >
        <div className="flex w-full items-center justify-between px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            {/* School / program logo */}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950/60 ring-1 ring-slate-900/70">
              {school?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={school.logo_url}
                  alt={schoolName}
                  className="h-10 w-10 rounded-lg object-contain"
                />
              ) : (
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-100">
                  {schoolName.slice(0, 3)}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-200">
                {schoolName}
              </div>
              <div className="text-lg font-semibold text-slate-50">
                {programName}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] uppercase tracking-wide text-slate-200/80">
                {program.sport && (
                  <span className="rounded-full bg-slate-950/40 px-2 py-[2px]">
                    {program.sport}
                  </span>
                )}
                {program.gender && (
                  <span className="rounded-full bg-slate-950/40 px-2 py-[2px]">
                    {program.gender}
                  </span>
                )}
                {program.level && (
                  <span className="rounded-full bg-slate-950/40 px-2 py-[2px]">
                    {program.level}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Small Account link up top-right */}
          <div className="flex flex-col items-end gap-1 text-right">
            <Link
              href="/account"
              className="text-[11px] text-slate-100/80 hover:text-white"
            >
              Account &amp; billing
            </Link>
          </div>
        </div>
      </header>

      {/* Body: sidebar + main content */}
      <div className="flex w-full gap-4 px-4 py-4 lg:px-8">
        {/* Left nav with modern stacked buttons */}
        <aside className="w-56 shrink-0">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="group flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-200 hover:border-emerald-500/80 hover:bg-slate-900 hover:text-slate-50"
              >
                <span>{item.label}</span>
                <span className="text-[9px] text-slate-500 group-hover:text-emerald-400">
                  →
                </span>
              </Link>
            ))}
            {/* Account as a secondary nav item */}
            <div className="pt-2">
              <Link
                href="/account"
                className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-300 hover:border-slate-600 hover:text-slate-50"
              >
                <span>Account</span>
                <span className="text-[9px] text-slate-500">↗</span>
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex-1 pb-8">{children}</main>
      </div>
    </div>
  );
}
// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { loadProgramTheme } from "@/lib/branding";

export const metadata: Metadata = {
  title: "XC Ecosystem",
  description: "College recruiting & team management ecosystem",
};

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-subtle bg-brand-soft px-3 py-1.5 text-[11px] font-medium hover:bg-brand-soft/80"
    >
      {label}
    </Link>
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = await loadProgramTheme(null);
  const t = theme as any;

  // Theme-driven token set (with safe fallbacks)
  // Base neutrals (L0/L1): stable, professional, and NOT brand-tinted by default.
  // Program theming should primarily drive L3 (brand/actions), not the canvas/surface ramp.
  const appBg = t.appBg ?? "#050607";
  const surface1 = t.surface1 ?? "#0b0c0e";
  const surface2 = t.surface2 ?? "#111827";
  const surface3 = t.surface3 ?? "#07080a";

  // Canvas is the stable space behind surfaces.
  const canvasBg = t.canvasBg ?? appBg;

  const border = t.border ?? t.borderSubtle ?? "#1f2937";
  const borderMuted = t.borderMuted ?? "#111827";

  const text = t.text ?? t.foreground ?? "#e5e7eb";
  const textMuted = t.textMuted ?? t.mutedForeground ?? "#9ca3af";
  const textSubtle = t.textSubtle ?? "#6b7280";
  const focusRing = t.focusRing ?? t.link ?? "#38bdf8";

  const brand = t.brand ?? t.brandPrimary ?? "#2563eb";
  const brandContrast = t.brandContrast ?? "#ffffff";
  const accent = t.accent ?? "#22c55e";
  const accentContrast = t.accentContrast ?? "#052e16";

  const brandSoft = t.brandSoft ?? t.brandSoft ?? `${brand}33`;
  const brandRail = t.brandRail ?? brand;
  const link = t.link ?? focusRing;

  const success = t.success ?? "#22c55e";
  const successContrast = t.successContrast ?? "#052e16";
  const warning = t.warning ?? "#f97316";
  const warningContrast = t.warningContrast ?? "#431407";
  const danger = t.danger ?? "#ef4444";
  const dangerContrast = t.dangerContrast ?? "#450a0a";
  const info = t.info ?? focusRing;
  const infoContrast = t.infoContrast ?? "#082f49";

  // Panels: default to the neutral surface ramp unless explicitly overridden.
  const panelBg = t.panelBg ?? surface2;
  const panelMutedBg = t.panelMutedBg ?? surface1;
  const panelRing = t.panelRing ?? border;

  return (
    <html lang="en">
      <body
        className="min-h-screen antialiased bg-canvas"
        style={{
          // Canonical base tokens
          ["--app-bg" as any]: appBg,
          ["--surface-1" as any]: surface1,
          ["--surface-2" as any]: surface2,
          ["--surface-3" as any]: surface3,

          ["--border" as any]: border,
          ["--border-muted" as any]: borderMuted,

          ["--text" as any]: text,
          ["--text-muted" as any]: textMuted,
          ["--text-subtle" as any]: textSubtle,
          ["--focus-ring" as any]: focusRing,

          ["--brand" as any]: brand,
          ["--brand-contrast" as any]: brandContrast,
          ["--accent" as any]: accent,
          ["--accent-contrast" as any]: accentContrast,

          ["--brand-soft" as any]: brandSoft,
          ["--brand-rail" as any]: brandRail,
          ["--link" as any]: link,

          ["--success" as any]: success,
          ["--success-contrast" as any]: successContrast,
          ["--warning" as any]: warning,
          ["--warning-contrast" as any]: warningContrast,
          ["--danger" as any]: danger,
          ["--danger-contrast" as any]: dangerContrast,
          ["--info" as any]: info,
          ["--info-contrast" as any]: infoContrast,

          // Surface System
          ["--canvas-bg" as any]: canvasBg,
          ["--panel-bg" as any]: panelBg,
          ["--panel-muted-bg" as any]: panelMutedBg,
          ["--panel-ring" as any]: panelRing,

          // Legacy aliases (back-compat)
          ["--background" as any]: appBg,
          ["--foreground" as any]: text,
          ["--brand-primary" as any]: brand,
          ["--brand-secondary" as any]: surface2,
          ["--surface" as any]: surface3,
          ["--border-subtle" as any]: border,
          ["--muted-foreground" as any]: textMuted,
        }}
      >
        {/* Global top nav */}
        <header className="relative z-[20000] border-b border-subtle bg-panel-muted backdrop-blur">
          <div className="mx-auto flex max-w-[6xl] items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center text-xs font-semibold">
                XC
              </div>
              <div>
                <p className="text-sm font-semibold">
                  XC Ecosystem
                </p>
                <p className="text-[11px] text-muted">
                  Recruiting, roster & AI assistant
                </p>
              </div>
            </div>
            <details className="group relative z-[20001]" id="ai-presence">
              <summary className="list-none cursor-pointer select-none rounded-full border border-subtle bg-panel px-2 py-1 text-[11px] text-muted hover:bg-panel-muted focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-soft)] ring-1 ring-panel">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/ai/avatars/william-carey.png"
                      alt="AI avatar"
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="hidden sm:inline">Assistant</span>
                  <span className="text-subtle">▾</span>
                </span>
              </summary>

              {/* Drop-down tray (UI-only presence). */}
              <div className="absolute right-0 z-[10000] mt-2 w-[min(360px,92vw)]">
                <div className="rounded-2xl border border-subtle bg-panel/70 p-3 shadow-xl backdrop-blur">
                  {/* Primary presence row */}
                  <div className="relative flex items-start px-3">
                    {/* Avatar (1:1.85), aligned left */}
                    <div
                      className="relative overflow-hidden rounded-3xl bg-[var(--brand-soft)] ring-1 ring-panel"
                      style={{ width: 140, aspectRatio: "1 / 1.85" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/ai/avatars/william-carey.png"
                        alt="AI avatar"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>

                    {/* Listening indicator (top-right) */}
                    <div className="relative left-3 top-0 inline-flex items-center gap-2 rounded-full border border-subtle bg-panel px-2.5 py-1 text-[10px] text-subtle">
                      <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                      Listening
                    </div>
                  </div>

                  {/* Secondary tray (collapsed by default). Opens when the coach requests details, and can be auto-opened later during voice interactions. */}
                  <details className="mt-3 w-full" id="ai-secondary-tray" open>
                    <summary className="list-none cursor-pointer select-none rounded-full border border-subtle bg-panel px-2.5 py-1 text-[10px] text-subtle hover:bg-panel-muted focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
                      <span className="inline-flex w-full items-center justify-between">
                        <span>Details</span>
                        <span className="text-subtle">▾</span>
                      </span>
                    </summary>

                    <div className="mt-2 rounded-2xl border border-subtle bg-panel/60 p-3 shadow-sm backdrop-blur">
                      {/* Athlete Context Card (no visible border) */}
                      <div className="flex gap-">
                        {/* Avatar (1:1.85), 33% width */}
                        <div className="w-1/3">
                          <div
                            className="relative w-full overflow-hidden rounded-2xl bg-panel-muted/60 ring-1 ring-panel"
                            style={{ aspectRatio: "1 / 1.85" }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/athletes/53f8eeaf-8d78-42b5-b383-483117922f2a/avatar`}
                              alt="Athlete avatar"
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          </div>
                        </div>

                        {/* Primary data + warnings */}
                        <div className="flex-1 pl-4">
                          <p className="text-sm font-semibold text-[var(--text)]">Athlete Name</p>
                          <div className="mt-1 space-y-0.5 text-[11px]">
                            <p className="text-muted">
                              Event group: <span className="text-[var(--text)]">Distance</span>
                            </p>
                            <p className="text-muted">
                              Context: <span className="text-[var(--text)]">Current team · Current season</span>
                            </p>
                          </div>

                          {/* Warnings / alerts */}
                          <div className="mt-2 space-y-1 text-[11px]">
                            <p className="text-[var(--danger)]">On injury watch</p>
                            <p className="text-[var(--danger)]">Elevated fatigue risk</p>
                          </div>
                        </div>
                      </div>

                      {/* Pinned contextual data (below card) */}
                      <div className="mt-4">
                        <p className="text-[10px] uppercase tracking-wide text-subtle">Pinned context</p>
                        <div className="mt-2 rounded-xl border border-subtle bg-panel-muted/60 p-3 text-[11px] text-muted">
                          <p className="text-[var(--text)] font-medium">Nothing pinned yet.</p>
                          <p className="mt-1">This area will show proposed outcomes for your approval.</p>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </details>
          </div>
        </header>

        {/* Page content */}
        <main className="relative z-0 mx-auto max-w-[95vw] px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

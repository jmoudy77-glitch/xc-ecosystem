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
        className="min-h-screen antialiased"
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
        <header className="border-b border-subtle bg-panel-muted backdrop-blur">
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
            <nav className="flex items-center gap-2">
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/onboarding/coach" label="Coach Onboarding" />
              <NavLink href="/onboarding/athlete" label="Athlete Onboarding" />
              <NavLink href="/athletes/ffd7f622-aead-416f-8ff6-3cca7dd22b1d" label="Test Athlete" />
            </nav>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-[95vw] px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

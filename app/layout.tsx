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

  return (
    <html lang="en">
      <body
        className="min-h-screen antialiased"
        style={{
          ["--background" as any]: theme.background,
          ["--foreground" as any]: theme.foreground,

          ["--brand-primary" as any]: theme.brandPrimary,
          ["--brand-secondary" as any]: theme.brandSecondary,
          ["--accent" as any]: theme.accent,

          ["--surface" as any]: theme.surface,
          ["--border-subtle" as any]: theme.borderSubtle,

          ["--muted-foreground" as any]: theme.mutedForeground,
          ["--link" as any]: theme.link,

          ["--success" as any]: theme.success,
          ["--warning" as any]: theme.warning,
          ["--danger" as any]: theme.danger,
        }}
      >
        {/* Global top nav */}
        <header className="border-b border-subtle bg-brand-soft/80 backdrop-blur">
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

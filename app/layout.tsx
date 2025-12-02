// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
      className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-slate-400 hover:bg-slate-900/90"
    >
      {label}
    </Link>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        {/* Global top nav */}
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-50 text-slate-950 flex items-center justify-center text-xs font-semibold">
                XC
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-50">
                  XC Ecosystem
                </p>
                <p className="text-[11px] text-slate-400">
                  Recruiting, roster & AI assistant
                </p>
              </div>
            </div>
            <nav className="flex items-center gap-2">
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/onboarding/coach" label="Coach Onboarding" />
              <NavLink href="/onboarding/athlete" label="Athlete Onboarding" />
              <NavLink href="/debug/program-billing" label="Program Billing Debug" />
            </nav>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

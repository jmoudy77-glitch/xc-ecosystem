"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
};

const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/onboarding/coach", label: "Coach Onboarding" },
  { href: "/onboarding/athlete", label: "Athlete Onboarding" },
  { href: "/debug/program-billing", label: "Program Billing Debug" },
];

const HIDE_NAV_PREFIXES = ["/", "/login", "/signup"];

function shouldHideNav(pathname: string | null): boolean {
  if (!pathname) return false;
  return HIDE_NAV_PREFIXES.some((prefix) => {
    return pathname === prefix || pathname.startsWith(prefix + "/");
  });
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (shouldHideNav(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] panel-muted">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="font-semibold tracking-tight text-sm">
            XC Ecosystem
          </Link>

          <nav className="flex items-center gap-2 text-xs">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "px-3 py-1.5 rounded-full border transition",
                    "font-medium",
                    isActive
                      ? "bg-panel-muted text-[var(--foreground)] border-[var(--border)]"
                      : "border-[var(--border)]/70 text-[var(--muted-foreground)] hover:border-[var(--border)] hover:text-[var(--foreground)]",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}

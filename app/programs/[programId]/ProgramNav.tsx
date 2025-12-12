// app/programs/[programId]/programNav.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: (programId: string) => string;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: (programId) => `/programs/${programId}/dashboard`,
  },
  {
    label: "Teams",
    href: (programId) => `/programs/${programId}/teams`,
  },
  {
    label: "Recruiting",
    href: (programId) => `/programs/${programId}/recruiting`,
  },
  {
    label: "Training",
    href: (programId) => `/programs/${programId}/training`,
  },
  {
    label: "Communications",
    href: (programId) => `/programs/${programId}/communications`,
  },
  {
    label: "Staff",
    href: (programId) => `/programs/${programId}/staff`,
  },
];

export function ProgramNav() {
  const params = useParams<{ programId: string }>();
  const programId = params?.programId;
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(true);

  if (!programId) return null;

  const billingHref = `/programs/${programId}/billing`;
  const brandingHref = `/programs/${programId}/settings/branding`;

  const isBillingActive =
    pathname === billingHref || pathname.startsWith(billingHref);
  const isBrandingActive =
    pathname === brandingHref || pathname.startsWith(brandingHref);

  return (
    <div className="flex flex-col gap-4 text-[11px]">
      {/* Primary program navigation */}
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const href = item.href(programId);
          const isActive =
            pathname === href ||
            (href !== `/programs/${programId}` &&
              pathname.startsWith(href));

          return (
            <Link
              key={item.label}
              href={href}
              className={[
                "flex items-center justify-between rounded-lg border border-subtle px-3 py-2 transition-colors",
                isActive
                  ? "bg-brand"
                  : "bg-brand-soft hover:bg-brand-soft/80 text-muted",
              ].join(" ")}
            >
              <span>{item.label}</span>
              <span className="text-[9px] opacity-60">→</span>
            </Link>
          );
        })}

        {/* Program Settings group (collapsible) */}
        <div className="mt-2 space-y-1">
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-lg border border-subtle bg-brand-soft px-3 py-2 text-[11px] text-muted transition-colors hover:bg-brand-soft/80"
            aria-expanded={settingsOpen}
          >
            <span>Program Settings</span>
            <span className="text-[9px] opacity-60">
              {settingsOpen ? "▾" : "▸"}
            </span>
          </button>

          {settingsOpen && (
            <div className="space-y-1 pl-3">
              <Link
                href={billingHref}
                className={[
                  "flex items-center justify-between rounded-lg border border-subtle px-3 py-2 transition-colors",
                  isBillingActive
                    ? "bg-brand"
                    : "bg-brand-soft hover:bg-brand-soft/80 text-muted",
                ].join(" ")}
              >
                <span>Billing</span>
                <span className="text-[9px] opacity-60">💳</span>
              </Link>

              <Link
                href={brandingHref}
                className={[
                  "flex items-center justify-between rounded-lg border border-subtle px-3 py-2 transition-colors",
                  isBrandingActive
                    ? "bg-brand"
                    : "bg-brand-soft hover:bg-brand-soft/80 text-muted",
                ].join(" ")}
              >
                <span>Branding</span>
                <span className="text-[9px] opacity-60">🎨</span>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Account as a secondary nav item (user-level, not program-level) */}
      <div className="border-t border-subtle pt-2">
        <div className="space-y-1">
          <Link
            href={`/programs/${programId}/account`}
            className="flex items-center justify-between rounded-lg border border-subtle bg-brand-soft px-3 py-2 text-muted transition-colors hover:bg-brand-soft/80"
          >
            <span>Account</span>
            <span className="text-[9px] opacity-60">↗</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
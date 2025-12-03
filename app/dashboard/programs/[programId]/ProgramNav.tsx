"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: (programId: string) => string;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    href: (programId) => `/dashboard/programs/${programId}`,
  },
  {
    label: "Staff",
    href: (programId) => `/dashboard/programs/${programId}/staff`,
  },
  {
    label: "Teams & Divisions",
    href: (programId) => `/dashboard/programs/${programId}/teams-and-divisions`,
  },
  {
    label: "Inquiries",
    href: (programId) => `/dashboard/programs/${programId}/inquiries`,
  },
  {
    label: "Recruiting Board",
    href: (programId) => `/dashboard/programs/${programId}/recruiting`,
  },
];

export function ProgramNav() {
  const params = useParams<{ programId: string }>();
  const programId = params?.programId;
  const pathname = usePathname();

  if (!programId) return null;

  return (
    <nav className="mb-4 flex flex-wrap gap-1 rounded-x3 border border-slate-800 bg-slate-900/60 p-2 text-sm">
      {NAV_ITEMS.map((item) => {
        const href = item.href(programId);
        const isActive =
          pathname === href ||
          (href !== `/dashboard/programs/${programId}` &&
            pathname.startsWith(href));

        return (
          <Link
            key={item.label}
            href={href}
            className={[
              "rounded px-3 py-1.5 transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/60",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
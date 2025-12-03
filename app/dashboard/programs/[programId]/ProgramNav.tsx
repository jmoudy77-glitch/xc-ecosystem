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
    href: (programId) => `/programs/${programId}`,
  },
  {
    label: "Staff",
    href: (programId) => `/programs/${programId}/staff`,
  },
  {
    label: "Teams & Divisions",
    href: (programId) => `/programs/${programId}/teams-and-divisions`,
  },
  {
    label: "Inquiries",
    href: (programId) => `/programs/${programId}/inquiries`,
  },
  {
    label: "Recruiting Board",
    href: (programId) => `/programs/${programId}/recruiting`,
  },
];

export function ProgramNav() {
  const params = useParams<{ programId: string }>();
  const programId = params?.programId;
  const pathname = usePathname();

  if (!programId) return null;

  return (
    <nav className="mb-4 flex flex-wrap gap-1 rounded-md border border-border bg-background/60 p-1 text-sm">
      {NAV_ITEMS.map((item) => {
        const href = item.href(programId);
        const isActive =
          pathname === href ||
          (href !== `/programs/${programId}` && pathname.startsWith(href));

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
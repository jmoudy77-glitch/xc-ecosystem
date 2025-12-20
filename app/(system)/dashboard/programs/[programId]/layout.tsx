// app/dashboard/programs/[programId]/layout.tsx
// Program-scoped layout that mimics the main /dashboard card:
// rounded, bordered, slightly lighter background.

import React from "react";
import Link from "next/link";
import { ProgramNav } from "./ProgramNav";

export default function ProgramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Program dashboard
        </p>
        <Link
          href="/athletes/ffd7f622-aead-416f-8ff6-3cca7dd22b1d"
          className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-200 hover:border-sky-400/60 hover:text-sky-100"
        >
          Test athlete
        </Link>
      </div>

      {/* Program-level navigation (Overview / Staff / Teams & Divisions / Inquiries / Recruiting Board) */}
      <ProgramNav />

      {/* Page content */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
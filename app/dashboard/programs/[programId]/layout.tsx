// app/dashboard/programs/[programId]/layout.tsx
// Program-scoped layout that mimics the main /dashboard card:
// rounded, bordered, slightly lighter background.

import React from "react";
import { ProgramNav } from "./ProgramNav";

export default function ProgramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-6 py-6">
      {/* Program-level navigation (Overview / Staff / Teams & Divisions / Inquiries / Recruiting Board) */}
      <ProgramNav />

      {/* Page content */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
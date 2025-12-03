// app/(dashboard)/programs/[programId]/layout.tsx

import React from "react";
import { ProgramNav } from "./ProgramNav";

export default function ProgramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 px-4 py-6 md:px-8">
      {/* Top nav specific to a single program */}
      <ProgramNav />
      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
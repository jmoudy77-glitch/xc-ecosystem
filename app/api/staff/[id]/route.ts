// app/api/staff/[id]/route.ts
// Route handler for fetching a single staff member by id.

import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Next.js 16 typed routes pass params as a Promise
  const { id } = await context.params;

  const member = getStaffMember(id);

  if (!member) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.json(member);
}
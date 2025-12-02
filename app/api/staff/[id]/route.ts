// memberRoute.ts
// Place this file in your project as: app/api/staff/[id]/route.ts

import { NextResponse } from 'next/server';
import { getStaffMember } from '@/lib/staff';

export async function GET(
  _req: Request,
  context: { params: { id: string } }
) {
  const member = getStaffMember(context.params.id);
  if (!member) {
    return new NextResponse('Not found', { status: 404 });
  }
  return NextResponse.json(member);
}

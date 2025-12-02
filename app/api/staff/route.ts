// route.ts
import { NextResponse } from 'next/server';
import { listStaff, addStaffMember } from '@/lib/staff';

export async function GET() {
  return NextResponse.json(listStaff());
}

export async function POST(req: Request) {
  const data = await req.json();
  addStaffMember(data);
  return NextResponse.json({ status: 'ok' });
}

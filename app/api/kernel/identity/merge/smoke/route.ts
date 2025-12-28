import { NextResponse } from 'next/server';
import { kernelMergeAthletes } from '@/app/actions/kernelMergeAthletes';

export async function POST() {
  const programId = process.env.KERNEL_SMOKE_PROGRAM_ID!;
  const canonicalAthleteId = process.env.KERNEL_SMOKE_CANONICAL_ATHLETE_ID!;
  const sourceAthleteId = process.env.KERNEL_SMOKE_SOURCE_ATHLETE_ID!;

  if (!programId || !canonicalAthleteId || !sourceAthleteId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Missing KERNEL_SMOKE_PROGRAM_ID and/or KERNEL_SMOKE_CANONICAL_ATHLETE_ID and/or KERNEL_SMOKE_SOURCE_ATHLETE_ID',
      },
      { status: 500 }
    );
  }

  const result = await kernelMergeAthletes({
    programId,
    canonicalAthleteId,
    sourceAthleteId,
    details: { smoke: true, route: '/api/kernel/identity/merge/smoke' },
  });

  return NextResponse.json({ ok: true, ...result });
}

import { NextResponse } from 'next/server';
import { kernelMergeAthleteIdentity } from '@/app/actions/kernelMergeAthleteIdentity';

/**
 * POST /api/kernel/identity/merge/smoke
 */
export async function POST() {
  const programId = process.env.KERNEL_SMOKE_PROGRAM_ID;
  const canonicalAthleteId = process.env.KERNEL_SMOKE_CANONICAL_ATHLETE_ID;
  const sourceAthleteId = process.env.KERNEL_SMOKE_SOURCE_ATHLETE_ID;
  const actorUserId = process.env.KERNEL_SMOKE_ACTOR_USER_ID;

  if (!programId || !canonicalAthleteId || !sourceAthleteId || !actorUserId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Missing KERNEL_SMOKE_PROGRAM_ID, KERNEL_SMOKE_CANONICAL_ATHLETE_ID, KERNEL_SMOKE_SOURCE_ATHLETE_ID, or KERNEL_SMOKE_ACTOR_USER_ID',
      },
      { status: 400 }
    );
  }

  try {
    const res = await kernelMergeAthleteIdentity({
      programId,
      canonicalAthleteId,
      sourceAthleteId,
      actorUserId,
      details: { smoke: true },
      causality: { smoke: true },
      payload: { route: '/api/kernel/identity/merge/smoke' },
    });

    return NextResponse.json({ ok: true, canonicalEventId: res.canonicalEventId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

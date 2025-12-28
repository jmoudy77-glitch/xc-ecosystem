import { NextResponse } from 'next/server';
import { kernelUpsertTeamRosterScholarship } from '@/app/actions/kernelUpsertTeamRosterScholarship';

/**
 * POST /api/kernel/scholarships/smoke
 *
 * Uses env vars for smoke params and calls kernel_upsert_team_roster_scholarship.
 */
export async function POST() {
  const programId = process.env.KERNEL_SMOKE_PROGRAM_ID;
  const teamRosterId = process.env.KERNEL_SMOKE_TEAM_ROSTER_ID;
  const actorUserId = process.env.KERNEL_SMOKE_ACTOR_USER_ID;

  if (!programId || !teamRosterId || !actorUserId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Missing KERNEL_SMOKE_PROGRAM_ID, KERNEL_SMOKE_TEAM_ROSTER_ID, or KERNEL_SMOKE_ACTOR_USER_ID',
      },
      { status: 400 }
    );
  }

  try {
    const res = await kernelUpsertTeamRosterScholarship({
      programId,
      teamRosterId,
      actorUserId,
      scholarshipUnit: 'equivalency',
      scholarshipAmount: 0.25,
      scholarshipNotes: 'kernel smoke',
      causality: { smoke: true },
      payload: { route: '/api/kernel/scholarships/smoke' },
    });

    return NextResponse.json({ ok: true, canonicalEventId: res.canonicalEventId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

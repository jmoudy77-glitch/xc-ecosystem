import { NextResponse } from 'next/server';
import { kernelUpsertTeamSeasonScholarshipBudget } from '@/app/actions/kernelUpsertTeamSeasonScholarshipBudget';

/**
 * POST /api/kernel/scholarships/budget/smoke
 */
export async function POST() {
  const programId = process.env.KERNEL_SMOKE_PROGRAM_ID;
  const teamSeasonId = process.env.KERNEL_SMOKE_TEAM_SEASON_ID;
  const actorUserId = process.env.KERNEL_SMOKE_ACTOR_USER_ID;

  if (!programId || !teamSeasonId || !actorUserId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Missing KERNEL_SMOKE_PROGRAM_ID, KERNEL_SMOKE_TEAM_SEASON_ID, or KERNEL_SMOKE_ACTOR_USER_ID',
      },
      { status: 400 }
    );
  }

  try {
    const res = await kernelUpsertTeamSeasonScholarshipBudget({
      programId,
      teamSeasonId,
      actorUserId,
      budgetEquivalents: 10,
      budgetAmount: 10000,
      currency: 'USD',
      causality: { smoke: true },
      payload: { route: '/api/kernel/scholarships/budget/smoke' },
    });

    return NextResponse.json({ ok: true, canonicalEventId: res.canonicalEventId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

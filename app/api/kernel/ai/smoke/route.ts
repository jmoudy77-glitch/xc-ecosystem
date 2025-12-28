import { NextResponse } from 'next/server';
import { kernelEmitAiOutput } from '@/app/actions/kernelEmitAiOutput';

/**
 * POST /api/kernel/ai/smoke
 */
export async function POST() {
  const programId = process.env.KERNEL_SMOKE_PROGRAM_ID;
  const scopeType = process.env.KERNEL_SMOKE_AI_SCOPE_TYPE ?? 'program';
  const scopeId = process.env.KERNEL_SMOKE_AI_SCOPE_ID ?? null;
  const actorUserId = process.env.KERNEL_SMOKE_ACTOR_USER_ID;

  if (!programId || !scopeId || !actorUserId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Missing KERNEL_SMOKE_PROGRAM_ID, KERNEL_SMOKE_AI_SCOPE_ID, or KERNEL_SMOKE_ACTOR_USER_ID',
      },
      { status: 400 }
    );
  }

  try {
    const res = await kernelEmitAiOutput({
      programId,
      scopeType,
      scopeId,
      actorUserId,
      modelVersion: 'kernel_smoke_v1',
      tier: 1,
      inputsFingerprint: 'kernel_smoke_inputs',
      driversJson: { smoke: true },
      confidence: 0.5,
      dataLineage: { source: 'smoke' },
      outputJson: { ok: true },
      causality: { smoke: true },
      payload: { route: '/api/kernel/ai/smoke' },
    });

    return NextResponse.json({ ok: true, canonicalEventId: res.canonicalEventId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

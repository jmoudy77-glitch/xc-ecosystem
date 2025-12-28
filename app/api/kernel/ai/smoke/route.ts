import { NextResponse } from 'next/server';
import { kernelEmitAiOutput } from '@/app/actions/kernelEmitAiOutput';

export async function POST() {
  const programId = process.env.KERNEL_SMOKE_PROGRAM_ID!;
  const actorUserId = process.env.KERNEL_SMOKE_ACTOR_USER_ID!;

  if (!programId || !actorUserId) {
    return NextResponse.json(
      { ok: false, error: 'Missing KERNEL_SMOKE_PROGRAM_ID or KERNEL_SMOKE_ACTOR_USER_ID' },
      { status: 500 }
    );
  }

  const result = await kernelEmitAiOutput({
    programId,
    scopeType: 'program',
    scopeId: null,
    actorUserId,
    modelVersion: 'gpt-5.2',
    tier: 1,
    inputsFingerprint: 'smoke:ai_output:v1',
    driversJson: { smoke: true },
    confidence: 0.5,
    dataLineage: { route: '/api/kernel/ai/smoke' },
    outputJson: { message: 'kernel smoke ai output' },
    causality: { smoke: true },
    payload: { route: '/api/kernel/ai/smoke' },
    sourceSystem: 'smoke_route',
  });

  return NextResponse.json({ ok: true, ...result });
}

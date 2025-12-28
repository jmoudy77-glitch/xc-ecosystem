import { NextResponse } from 'next/server';
import { kernelUpsertProgramBranding } from '@/app/actions/kernelUpsertProgramBranding';

/**
 * POST /api/kernel/branding/smoke
 * Body: { programId: string }
 *
 * Minimal smoke test to validate:
 * - auth session works server-side
 * - membership gate inside RPC works
 * - canonical_events row is emitted
 * - program_branding is upserted
 *
 * This is intentionally minimal and should be removed/locked down after validation.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const programId = body?.programId as string | undefined;

  if (!programId) {
    return NextResponse.json({ ok: false, error: 'Missing programId' }, { status: 400 });
  }

  try {
    const res = await kernelUpsertProgramBranding({
      programId,
      // minimal mutation to prove write path
      metadata: { kernel_smoke: true, at: new Date().toISOString() },
    });

    return NextResponse.json({ ok: true, ...res });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

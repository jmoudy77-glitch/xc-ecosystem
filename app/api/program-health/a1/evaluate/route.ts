import { NextResponse } from 'next/server';
import { emitProgramHealthA1Evaluation } from '@/app/actions/program-health/a1Evaluate';

/**
 * Optional API wrapper for callers that cannot directly invoke a Server Action
 * (cron runners, external job triggers, etc.).
 *
 * Still sovereign: it only calls the governed Server Action which only calls the Kernel RPC.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await emitProgramHealthA1Evaluation(body);
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 400 }
    );
  }
}

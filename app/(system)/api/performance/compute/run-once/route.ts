import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const locker = `api:${process.env.VERCEL_REGION ?? "local"}:${process.pid}`;

  // Track state so we can reliably fail the job/run on any thrown error.
  let job: any = null;
  let run: any = null;

  const toErrorJson = (e: any) => {
    // Normalize unknown errors into a small, JSON-safe payload.
    const out: any = {
      message: e?.message ?? String(e),
    };
    if (e?.name) out.name = e.name;
    if (e?.code) out.code = e.code;
    if (e?.details) out.details = e.details;
    if (e?.hint) out.hint = e.hint;
    if (e?.status) out.status = e.status;
    return out;
  };

  try {
    // 1) claim next job atomically
    const { data: claimed, error: claimErr } = await supabaseAdmin.rpc(
      "performance_claim_next_compute_job",
      { locker }
    );

    if (claimErr) throw claimErr;

    job = Array.isArray(claimed) ? claimed[0] : claimed;
    if (!job) {
      return NextResponse.json({ ok: true, claimed: false }, { status: 200 });
    }

    // 2) create run ledger entry (even if we no-op)
    const { data: createdRun, error: runErr } = await supabaseAdmin
      .from("performance_compute_runs")
      .insert([
        {
          queue_id: job.id,
          scope_type: job.scope_type,
          scope_id: job.scope_id,
          stages: ["primes", "athlete_rollups", "team_rollups", "signals"],
          status: "running",
          summary_json: {
            note:
              "Compute pipeline skeleton executed. Prime ruleset is currently placeholder (seed spec indicates formulas not yet populated).",
          },
        },
      ])
      .select("*")
      .single();

    if (runErr) throw runErr;
    run = createdRun;

    // 3) TODO: compute stages (primes/rollups/signals)
    // For now, this is a skeleton that validates orchestration + audit trail.

    // 4) mark job done (for now) — later we’ll mark succeeded/failed based on stage outcomes
    const { error: doneErr } = await supabaseAdmin.rpc(
      "performance_mark_compute_job_done",
      { job_id: job.id }
    );
    if (doneErr) throw doneErr;

    // 5) close out run
    const { error: closeErr } = await supabaseAdmin
      .from("performance_compute_runs")
      .update({
        status: "partial",
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    if (closeErr) throw closeErr;

    // 6) re-read final persisted state for curl-driven clarity
    const { data: finalJob, error: finalJobErr } = await supabaseAdmin
      .from("performance_compute_queue")
      .select("*")
      .eq("id", job.id)
      .single();
    if (finalJobErr) throw finalJobErr;

    const { data: finalRun, error: finalRunErr } = await supabaseAdmin
      .from("performance_compute_runs")
      .select("*")
      .eq("id", run.id)
      .single();
    if (finalRunErr) throw finalRunErr;

    return NextResponse.json(
      { ok: true, claimed: true, job: finalJob, run: finalRun },
      { status: 200 }
    );
  } catch (e: any) {
    const errJson = toErrorJson(e);
    console.error("[/api/performance/compute/run-once] Failed:", errJson);

    // Best-effort: mark queue job failed (only if we actually claimed one)
    if (job?.id) {
      const { error: failJobErr } = await supabaseAdmin.rpc(
        "performance_mark_compute_job_failed",
        { job_id: job.id, err: errJson }
      );
      if (failJobErr) {
        console.error(
          "[/api/performance/compute/run-once] Failed to mark job failed:",
          toErrorJson(failJobErr)
        );
      }
    }

    // Best-effort: close run as failed (only if run row exists)
    if (run?.id) {
      const { error: failRunErr } = await supabaseAdmin
        .from("performance_compute_runs")
        .update({
          status: "failed",
          error_json: errJson,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      if (failRunErr) {
        console.error(
          "[/api/performance/compute/run-once] Failed to update run as failed:",
          toErrorJson(failRunErr)
        );
      }
    }

    return NextResponse.json({ ok: false, error: "run_once_failed", err: errJson }, { status: 500 });
  }
}
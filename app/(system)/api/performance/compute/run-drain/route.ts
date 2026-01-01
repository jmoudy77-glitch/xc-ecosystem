import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getGenesisRuntimeId(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("runtimes")
    .select("id")
    .eq("runtime_type", "genesis")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("genesis runtime not found");
  return data.id;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const maxJobs = Math.min(Math.max(Number(body.maxJobs ?? 20), 1), 200);

  const runtime_id = await getGenesisRuntimeId();
  const locker = `api:${process.env.VERCEL_REGION ?? "local"}:${process.pid}`;

  const toErrorJson = (e: any) => {
    const out: any = { message: e?.message ?? String(e) };
    if (e?.name) out.name = e.name;
    if (e?.code) out.code = e.code;
    if (e?.details) out.details = e.details;
    if (e?.hint) out.hint = e.hint;
    if (e?.status) out.status = e.status;
    return out;
  };

  const results: Array<{ jobId?: string; ok: boolean; err?: any }> = [];
  let claimed = 0;
  let done = 0;
  let failed = 0;

  for (let i = 0; i < maxJobs; i++) {
    let job: any = null;
    let run: any = null;

    try {
      // 1) claim
      const { data: claimedRows, error: claimErr } = await supabaseAdmin.rpc(
        "performance_claim_next_compute_job",
        { locker }
      );
      if (claimErr) throw claimErr;

      job = Array.isArray(claimedRows) ? claimedRows[0] : claimedRows;
      if (!job) break;

      claimed++;

      // 2) ledger
      const { data: createdRun, error: runErr } = await supabaseAdmin
        .from("performance_compute_runs")
        .insert([
          {
            runtime_id,
            queue_id: job.id,
            scope_type: job.scope_type,
            scope_id: job.scope_id,
            stages: ["primes", "athlete_rollups", "team_rollups", "signals"],
            status: "running",
            summary_json: {
              note:
                "Compute pipeline skeleton executed via run-drain. Prime ruleset is currently placeholder.",
            },
          },
        ])
        .select("*")
        .eq("runtime_id", runtime_id)
        .single();
      if (runErr) throw runErr;
      run = createdRun;

      // 3) TODO: real compute stages (primes/rollups/signals)

      // 4) mark done
      const { error: doneErr } = await supabaseAdmin.rpc(
        "performance_mark_compute_job_done",
        { job_id: job.id }
      );
      if (doneErr) throw doneErr;

      // 5) close run
      const { error: closeErr } = await supabaseAdmin
        .from("performance_compute_runs")
        .update({ runtime_id, status: "partial", finished_at: new Date().toISOString() })
        .eq("runtime_id", runtime_id)
        .eq("id", run.id);
      if (closeErr) throw closeErr;

      results.push({ jobId: job.id, ok: true });
      done++;
    } catch (e: any) {
      const errJson = toErrorJson(e);

      // Best-effort fail job
      if (job?.id) {
        await supabaseAdmin.rpc("performance_mark_compute_job_failed", {
          job_id: job.id,
          err: errJson,
        });
      }

      // Best-effort fail run
      if (run?.id) {
        await supabaseAdmin
          .from("performance_compute_runs")
          .update({
            runtime_id,
            status: "failed",
            error_json: errJson,
            finished_at: new Date().toISOString(),
          })
          .eq("runtime_id", runtime_id)
          .eq("id", run.id);
      }

      results.push({ jobId: job?.id, ok: false, err: errJson });
      failed++;
    }
  }

  return NextResponse.json(
    { ok: true, maxJobs, claimed, done, failed, results },
    { status: 200 }
  );
}

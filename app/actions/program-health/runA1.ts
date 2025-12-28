"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RunA1Result = {
  success: boolean;
  error?: string;
  queueId?: string;
  runId?: string;
  snapshotCount?: number;
  absenceCount?: number;
};

type Horizon = "H0" | "H1" | "H2" | "H3";

const HORIZONS: Horizon[] = ["H0", "H1", "H2", "H3"];

const CAPABILITY_SEED = [
  {
    node_code: "cap_coaching_continuity",
    name: "Coaching Continuity",
    description: "Sustained coaching coverage across the program.",
  },
  {
    node_code: "cap_compliance_authority",
    name: "Compliance Authority",
    description: "Authorized compliance coverage for program operations.",
  },
  {
    node_code: "cap_recruiting_function",
    name: "Recruiting Function",
    description: "Active recruiting capability for roster continuity.",
  },
];

export async function runA1(programId: string): Promise<RunA1Result> {
  if (!programId?.trim()) {
    return { success: false, error: "programId is required." };
  }

  const systemTime = new Date().toISOString();
  let queueId: string | undefined;
  let runId: string | undefined;

  try {
    const { data: nodes, error: nodesError } = await supabaseAdmin
      .from("capability_nodes")
      .upsert(
        CAPABILITY_SEED.map((node) => ({
          ...node,
          program_id: programId,
        })),
        { onConflict: "program_id,node_code" }
      )
      .select("id,node_code");

    if (nodesError || !nodes) {
      throw new Error(nodesError?.message ?? "Failed to seed capability nodes.");
    }

    const nodeIdByCode = new Map<string, string>();
    nodes.forEach((node) => nodeIdByCode.set(node.node_code, node.id));

    const nodeIds = CAPABILITY_SEED.map((node) => {
      const nodeId = nodeIdByCode.get(node.node_code);
      if (!nodeId) {
        throw new Error(`Missing capability node id for ${node.node_code}.`);
      }
      return nodeId;
    });

    const coverageRows = nodeIds.map((nodeId) => ({
      program_id: programId,
      capability_node_id: nodeId,
      min_coverage: 1,
      is_active: true,
    }));

    const redundancyRows = nodeIds.map((nodeId) => ({
      program_id: programId,
      capability_node_id: nodeId,
      min_depth: 0,
      is_active: true,
    }));

    const fragilityRows = nodeIds.map((nodeId) => ({
      program_id: programId,
      capability_node_id: nodeId,
      h0: 1,
      h1: 1,
      h2: 1,
      h3: 1,
    }));

    const { error: coverageError } = await supabaseAdmin
      .from("coverage_requirements")
      .upsert(coverageRows, { onConflict: "program_id,capability_node_id" });

    if (coverageError) {
      throw new Error(coverageError.message);
    }

    const { error: redundancyError } = await supabaseAdmin
      .from("redundancy_depths")
      .upsert(redundancyRows, { onConflict: "program_id,capability_node_id" });

    if (redundancyError) {
      throw new Error(redundancyError.message);
    }

    const { error: fragilityError } = await supabaseAdmin
      .from("horizon_fragility_vectors")
      .upsert(fragilityRows, { onConflict: "program_id,capability_node_id" });

    if (fragilityError) {
      throw new Error(fragilityError.message);
    }

    const { data: queueData, error: queueError } = await supabaseAdmin
      .from("program_health_compute_queue")
      .insert({
        program_id: programId,
        reason: "bootstrap",
        details_json: { seeded_nodes: CAPABILITY_SEED.map((node) => node.node_code) },
      })
      .select("id")
      .single();

    if (queueError || !queueData) {
      throw new Error(queueError?.message ?? "Failed to create compute queue.");
    }

    queueId = queueData.id;

    const { data: runData, error: runError } = await supabaseAdmin
      .from("program_health_compute_runs")
      .insert({
        queue_id: queueId,
        program_id: programId,
        status: "running",
        started_at: systemTime,
      })
      .select("id")
      .single();

    if (runError || !runData) {
      throw new Error(runError?.message ?? "Failed to create compute run.");
    }

    runId = runData.id;

    const { data: provenanceData, error: provenanceError } = await supabaseAdmin
      .from("provenance_meta")
      .insert({
        program_id: programId,
        engine_code: "A1",
        run_id: runId,
        system_time: systemTime,
        mutation_state: "pre_freeze",
        meta_json: { run_type: "bootstrap" },
      })
      .select("id")
      .single();

    if (provenanceError || !provenanceData) {
      throw new Error(provenanceError?.message ?? "Failed to write provenance.");
    }

    const { data: freezeRows, error: freezeError } = await supabaseAdmin
      .from("freeze_markers")
      .insert(
        HORIZONS.map((horizon) => ({
          program_id: programId,
          horizon,
          window_start: systemTime,
          window_end: systemTime,
          system_time: systemTime,
          boundary_source: "system",
        }))
      )
      .select("id,horizon");

    if (freezeError || !freezeRows) {
      throw new Error(freezeError?.message ?? "Failed to bind freeze markers.");
    }

    const freezeByHorizon = new Map<Horizon, string>();
    freezeRows.forEach((row) => freezeByHorizon.set(row.horizon as Horizon, row.id));

    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from("program_capability_assignments")
      .select("capability_node_id")
      .eq("program_id", programId)
      .eq("is_active", true);

    if (assignmentsError) {
      throw new Error(assignmentsError.message);
    }

    const coverageCount = new Map<string, number>();
    assignments?.forEach((assignment) => {
      const current = coverageCount.get(assignment.capability_node_id) ?? 0;
      coverageCount.set(assignment.capability_node_id, current + 1);
    });

    const nodesWithCoverage = nodeIds.map((nodeId, index) => {
      const nodeSeed = CAPABILITY_SEED[index];
      const count = coverageCount.get(nodeId) ?? 0;
      return {
        node_code: nodeSeed.node_code,
        name: nodeSeed.name,
        coverage_count: count,
        min_coverage: 1,
        min_depth: 0,
      };
    });

    const snapshotRows = HORIZONS.map((horizon) => ({
      program_id: programId,
      as_of_system_time: systemTime,
      horizon,
      snapshot_json: {
        system_time: systemTime,
        nodes: nodesWithCoverage,
      },
      provenance_id: provenanceData.id,
    }));

    const { data: snapshotData, error: snapshotError } = await supabaseAdmin
      .from("capability_snapshots")
      .insert(snapshotRows)
      .select("id");

    if (snapshotError) {
      throw new Error(snapshotError.message);
    }

    const absenceRows = HORIZONS.flatMap((horizon) =>
      nodeIds.flatMap((nodeId, index) => {
        const count = coverageCount.get(nodeId) ?? 0;
        const violationRows = [] as Array<{
          program_id: string;
          capability_node_id: string;
          violation_type: string;
          horizon: Horizon;
          freeze_marker_id: string;
          provenance_id: string;
          evidence_json: Record<string, unknown>;
        }>;

        if (count < 1) {
          const freezeId = freezeByHorizon.get(horizon);
          if (freezeId) {
            violationRows.push({
              program_id: programId,
              capability_node_id: nodeId,
              violation_type: "coverage",
              horizon,
              freeze_marker_id: freezeId,
              provenance_id: provenanceData.id,
              evidence_json: {
                node_code: CAPABILITY_SEED[index].node_code,
                coverage_count: count,
                min_coverage: 1,
                system_time: systemTime,
              },
            });
          }
        }

        return violationRows;
      })
    );

    let absenceCount = 0;

    if (absenceRows.length > 0) {
      const { data: absenceData, error: absenceError } = await supabaseAdmin
        .from("absence_determinations")
        .insert(absenceRows)
        .select("id");

      if (absenceError) {
        throw new Error(absenceError.message);
      }

      absenceCount = absenceData?.length ?? 0;

      if (absenceData && absenceData.length > 0) {
        const appealRows = absenceData.map((absence) => ({
          program_id: programId,
          determination_id: absence.id,
          status: "eligible",
        }));

        const { error: appealError } = await supabaseAdmin
          .from("appeal_intake_links")
          .insert(appealRows);

        if (appealError) {
          throw new Error(appealError.message);
        }
      }
    }

    const snapshotCount = snapshotData?.length ?? 0;

    await supabaseAdmin
      .from("program_health_compute_runs")
      .update({
        status: "succeeded",
        finished_at: systemTime,
        summary_json: {
          snapshots: snapshotCount,
          absences: absenceCount,
        },
      })
      .eq("id", runId);

    await supabaseAdmin
      .from("program_health_compute_queue")
      .update({ status: "done", updated_at: systemTime })
      .eq("id", queueId);

    return {
      success: true,
      queueId,
      runId,
      snapshotCount,
      absenceCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "A1 run failed.";

    if (runId) {
      await supabaseAdmin
        .from("program_health_compute_runs")
        .update({ status: "failed", finished_at: systemTime })
        .eq("id", runId);
    }

    if (queueId) {
      await supabaseAdmin
        .from("program_health_compute_queue")
        .update({ status: "failed", updated_at: systemTime })
        .eq("id", queueId);
    }

    return { success: false, error: message, queueId, runId };
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { readM3RuntimeState, readRecruitingM3Impacts } from "@/app/lib/m3/runtime";
import { runM3DryRun } from "@/app/lib/m3/dryRun";

type CountResult = {
  status: "ok" | "missing" | "error";
  count: number | null;
  error?: unknown;
};

type TableFilter = { column: string; value: string };

type MonitoredTable = {
  table: string;
  filter?: TableFilter;
  class: "program_health" | "impacts";
};

export type IsolationTableCheck = {
  table: string;
  status: "checked" | "skipped_missing_table" | "error";
  beforeCount: number | null;
  afterCount: number | null;
  changed: boolean | null;
  error?: string | null;
};

export type M3IsolationTestReport = {
  ok: boolean;
  scope: {
    programId: string;
    teamId: string | null;
  };
  checks: IsolationTableCheck[];
  invariants: {
    programHealthMutation: boolean; // true if any monitored PH table changed
    impactsWritten: boolean; // true if recruiting_candidate_impacts count changed
  };
  evidence: {
    runtimeStateMode: string;
    dryRunReasonCodes: string[];
    impactsReturnedCount: number;
  };
  generatedAt: string;
};

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Unknown error";
}

function errorCode(e: unknown): string {
  if (typeof e === "object" && e && "code" in e) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "";
}

function isMissingTableError(e: unknown): boolean {
  const msg = errorMessage(e);
  const code = errorCode(e);
  return (
    code === "42P01" ||
    /does not exist/i.test(msg) ||
    /relation .* does not exist/i.test(msg)
  );
}

async function countTable(
  supabase: SupabaseClient,
  table: string,
  filter?: TableFilter
): Promise<CountResult> {
  try {
    let q = supabase.from(table).select("id", { count: "exact", head: true });

    if (filter) {
      // Best-effort filter. If the column does not exist, supabase will throw; we treat as error.
      q = q.eq(filter.column, filter.value);
    }

    const { count, error } = await q;
    if (error) {
      if (isMissingTableError(error)) {
        return { status: "missing", count: null };
      }
      return { status: "error", count: null, error };
    }
    return { status: "ok", count: count ?? 0 };
  } catch (e: unknown) {
    if (isMissingTableError(e)) {
      return { status: "missing", count: null };
    }
    return { status: "error", count: null, error: e };
  }
}

export async function runM3IsolationTest(params: {
  supabase: SupabaseClient;
  programId?: string | null;
  teamId?: string | null;
}): Promise<M3IsolationTestReport> {
  // Resolve programId via canonical runtime resolver
  const state = await readM3RuntimeState(params.supabase, {
    programId: params.programId ?? null,
    teamId: params.teamId ?? null,
  });

  const programId = state.programId;
  const teamId = params.teamId ?? null;

  // Tables to monitor (best-effort). Missing tables are reported, not failed.
  const monitored: MonitoredTable[] = [
    // PH sovereign surfaces (best-effort names; missing is non-failing)
    {
      table: "absence_determinations",
      filter: { column: "program_id", value: programId },
      class: "program_health",
    },
    { table: "program_health_absences", class: "program_health" },
    { table: "program_health_snapshots", class: "program_health" },
    { table: "program_health_ledger", class: "program_health" },

    // Recruiting M3 artifact table (must not change during dry-run)
    {
      table: "recruiting_candidate_impacts",
      filter: { column: "program_id", value: programId },
      class: "impacts",
    },
  ];

  const before: Record<string, CountResult> = {};
  for (const m of monitored) {
    before[m.table] = await countTable(params.supabase, m.table, m.filter);
  }

  // Execute read paths + dry-run (no persistence)
  const impactsRead = await readRecruitingM3Impacts(params.supabase, {
    programId,
    teamId,
    horizon: null,
  });

  const dryRun = await runM3DryRun({
    supabase: params.supabase,
    programId,
    teamId,
    horizon: null,
  });

  const after: Record<string, CountResult> = {};
  for (const m of monitored) {
    after[m.table] = await countTable(params.supabase, m.table, m.filter);
  }

  const checks: IsolationTableCheck[] = monitored.map((m) => {
    const b = before[m.table];
    const a = after[m.table];

    if (b.status === "missing" || a.status === "missing") {
      return {
        table: m.table,
        status: "skipped_missing_table",
        beforeCount: b.count,
        afterCount: a.count,
        changed: null,
      };
    }

    if (b.status === "error" || a.status === "error") {
      return {
        table: m.table,
        status: "error",
        beforeCount: b.count,
        afterCount: a.count,
        changed: null,
        error: errorMessage(b.error) || errorMessage(a.error),
      };
    }

    const changed = (b.count ?? 0) !== (a.count ?? 0);
    return {
      table: m.table,
      status: "checked",
      beforeCount: b.count,
      afterCount: a.count,
      changed,
    };
  });

  const phChanged = checks.some(
    (c) =>
      c.status === "checked" &&
      c.changed === true &&
      [
        "absence_determinations",
        "program_health_absences",
        "program_health_snapshots",
        "program_health_ledger",
      ].includes(c.table)
  );

  const impactsChanged = checks.some(
    (c) =>
      c.status === "checked" &&
      c.changed === true &&
      c.table === "recruiting_candidate_impacts"
  );

  const ok = !phChanged && !impactsChanged && !checks.some((c) => c.status === "error");

  return {
    ok,
    scope: { programId, teamId },
    checks,
    invariants: {
      programHealthMutation: phChanged,
      impactsWritten: impactsChanged,
    },
    evidence: {
      runtimeStateMode: state.mode,
      dryRunReasonCodes: dryRun.plan.reasonCodes,
      impactsReturnedCount: impactsRead.impacts.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

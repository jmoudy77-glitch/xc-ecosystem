"use client";

import * as React from "react";
import type { RecruitingM1ViewModel, RecruitingM1RecruitableAbsence } from "@/app/actions/recruiting/readRecruitingM1View";

function bandLabel(band: RecruitingM1ViewModel["stabilization"]["band"]) {
  switch (band) {
    case "within_tolerances":
      return "Within tolerances";
    case "stabilizing_required":
      return "Stabilization required";
    default:
      return "Status";
  }
}

function sortKey(a: RecruitingM1RecruitableAbsence) {
  return `${a.sector_key ?? "zz"}|${a.absence_key ?? "zz"}|${a.capability_node_id ?? "zz"}`;
}

export default function RecruitingM1Client({ model }: { model: RecruitingM1ViewModel }) {
  const items = React.useMemo(() => {
    const copy = [...(model.recruitableAbsences ?? [])];
    copy.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    return copy;
  }, [model.recruitableAbsences]);

  const grouped = React.useMemo(() => {
    const m = new Map<string, RecruitingM1RecruitableAbsence[]>();
    for (const a of items) {
      const key = a.sector_key ?? "unclassified";
      const arr = m.get(key) ?? [];
      arr.push(a);
      m.set(key, arr);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-subtle bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100">Roster stabilization</h2>
            <p className="mt-1 text-[11px] text-muted">
              This workspace surfaces only recruitable deficits (mitigatable via athlete additions).
            </p>
            <p className="mt-2 text-[11px] text-slate-100">{model.stabilization.message}</p>
          </div>

          <div className="shrink-0 text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-subtle bg-surface/70 px-3 py-1.5 text-[11px] text-slate-100">
              <span className="font-semibold">{bandLabel(model.stabilization.band)}</span>
              <span className="text-muted">•</span>
              <span className="font-mono">{model.stabilization.recruitableAbsenceCount}</span>
            </div>
            <div className="mt-2 text-[11px] text-muted">
              Horizon: <span className="font-mono text-slate-100">{model.horizon ?? "—"}</span>
            </div>
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="rounded-xl border border-subtle bg-surface p-5">
          <p className="text-xs font-semibold text-slate-100">No recruitable deficits detected</p>
          <p className="mt-1 text-[11px] text-muted">
            When new recruitable deficits appear, they will surface here automatically.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-subtle bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-100">Recruitable deficits</p>
              <p className="mt-1 text-[11px] text-muted">
                These are the only deficits Recruiting will surface. Non-recruitable deficits are intentionally absent.
              </p>
            </div>
            <div className="text-[11px] text-muted">
              Snapshot: <span className="font-mono text-slate-100">{model.snapshotId ? model.snapshotId.slice(0, 8) : "—"}</span>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {grouped.map(([sectorKey, abs]) => (
              <div key={sectorKey} className="rounded-lg border border-subtle bg-surface/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold text-slate-100">
                    Sector: <span className="font-mono">{sectorKey}</span>
                  </p>
                  <span className="rounded-full border border-subtle px-2 py-0.5 text-[11px] text-muted">
                    {abs.length} deficit{abs.length === 1 ? "" : "s"}
                  </span>
                </div>

                <ul className="mt-3 space-y-2">
                  {abs.map((a, idx) => (
                    <li key={`${a.absence_key ?? "x"}-${a.capability_node_id ?? "y"}-${idx}`} className="rounded-md border border-subtle bg-surface/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-slate-100">
                            {a.absence_key ?? "recruitable_deficit"}
                          </p>
                          <p className="mt-1 text-[11px] text-muted">
                            capability_node_id: <span className="font-mono text-slate-100">{a.capability_node_id ?? "—"}</span>
                          </p>
                        </div>
                        <div className="text-right text-[11px] text-muted">
                          <div>
                            severity: <span className="font-mono text-slate-100">{a.severity ?? "—"}</span>
                          </div>
                          <div>
                            horizon: <span className="font-mono text-slate-100">{a.horizon ?? model.horizon ?? "—"}</span>
                          </div>
                        </div>
                      </div>

                      {a.notes ? (
                        <p className="mt-2 text-[11px] text-muted">{a.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

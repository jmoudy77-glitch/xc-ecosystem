"use client";

import * as React from "react";

type CausalityDrilldownPanelProps = {
  absence: any;
  lineage: any[] | null;
};

export function CausalityDrilldownPanel({ absence, lineage }: CausalityDrilldownPanelProps) {
  if (!absence) {
    return (
      <div className="ph-drilldown empty">
        <div className="ph-drilldown-title">Canonical Inspector</div>
        <div className="ph-drilldown-empty">Select an absence to inspect canonical causality.</div>
      </div>
    );
  }

  return (
    <div className="ph-drilldown">
      <div className="ph-drilldown-title">Canonical Inspector</div>

      <section className="ph-drilldown-section">
        <div className="ph-drilldown-label">Absence</div>
        <div className="ph-drilldown-kv">
          <b>Key</b> {absence.absence_key}
        </div>
        <div className="ph-drilldown-kv">
          <b>Type</b> {absence.absence_type}
        </div>
        <div className="ph-drilldown-kv">
          <b>Horizon</b> {absence.horizon}
        </div>
        <div className="ph-drilldown-kv">
          <b>Severity</b> {absence.severity}
        </div>
        <div className="ph-drilldown-kv">
          <b>Created</b> {new Date(absence.created_at).toLocaleString()}
        </div>
        <div className="ph-drilldown-kv ph-drilldown-mono">
          <b>Canonical Event</b> {absence.canonical_event_id}
        </div>
        <div className="ph-drilldown-kv ph-drilldown-mono">
          <b>Ledger</b> {absence.ledger_id}
        </div>
      </section>

      <section className="ph-drilldown-section">
        <div className="ph-drilldown-label">Causal Lineage</div>
        {lineage?.length ? (
          lineage.map((ev: any) => (
            <details key={ev.id} className="ph-lineage-row">
              <summary>
                {ev.event_domain}:{ev.event_type}
                <span className="ph-drilldown-mono">{ev.id}</span>
                <span>{new Date(ev.created_at).toLocaleString()}</span>
              </summary>
              <pre className="ph-drilldown-json">{JSON.stringify(ev.payload, null, 2)}</pre>
            </details>
          ))
        ) : (
          <div className="ph-drilldown-empty">No canonical links found.</div>
        )}
      </section>
    </div>
  );
}

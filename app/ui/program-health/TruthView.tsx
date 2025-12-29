"use client";

import * as React from "react";
import type { AbsenceTruthModel } from "./types";

function fmtTs(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

export function TruthView({
  truth,
  onClose,
}: {
  truth: AbsenceTruthModel;
  onClose: () => void;
}) {
  const { absence, canonicalEvent, links, linkedEvents } = truth;

  const linkedById = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const e of linkedEvents ?? []) m.set(e.id, e);
    return m;
  }, [linkedEvents]);

  return (
    <div className="ph-modal">
      <button
        className="ph-modal-backdrop"
        onClick={onClose}
        type="button"
        aria-label="Close"
      />
      <div className="ph-modal-body">
        <div className="ph-modal-header">
          <div className="ph-modal-title">Truth View</div>
          <button className="ph-btn" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="ph-modal-section">
          <div className="ph-panel-subtitle">absence</div>
          <div className="ph-kv">
            <div className="ph-k">absence_id</div>
            <div className="ph-v ph-mono">{absence.id}</div>

            <div className="ph-k">horizon</div>
            <div className="ph-v">{absence.horizon}</div>

            <div className="ph-k">absence_type</div>
            <div className="ph-v">{absence.absence_type}</div>

            <div className="ph-k">absence_key</div>
            <div className="ph-v ph-mono">{absence.absence_key}</div>

            <div className="ph-k">canonical_event_id</div>
            <div className="ph-v ph-mono">{absence.canonical_event_id}</div>

            <div className="ph-k">ledger_id</div>
            <div className="ph-v ph-mono">{absence.ledger_id}</div>

            <div className="ph-k">created_at</div>
            <div className="ph-v">{fmtTs(absence.created_at)}</div>
          </div>
        </div>

        <div className="ph-modal-section">
          <div className="ph-panel-subtitle">canonical_event header</div>
          <div className="ph-kv">
            <div className="ph-k">event_domain</div>
            <div className="ph-v">{canonicalEvent.event_domain}</div>

            <div className="ph-k">event_type</div>
            <div className="ph-v">{canonicalEvent.event_type}</div>

            <div className="ph-k">scope_type</div>
            <div className="ph-v">{canonicalEvent.scope_type}</div>

            <div className="ph-k">scope_id</div>
            <div className="ph-v ph-mono">{canonicalEvent.scope_id ?? "—"}</div>

            <div className="ph-k">actor_user_id</div>
            <div className="ph-v ph-mono">{canonicalEvent.actor_user_id ?? "—"}</div>

            <div className="ph-k">created_at</div>
            <div className="ph-v">{fmtTs(canonicalEvent.created_at)}</div>
          </div>
        </div>

        <div className="ph-modal-section">
          <div className="ph-panel-subtitle">canonical_event payload</div>
          <pre className="ph-json">{JSON.stringify(canonicalEvent.payload ?? {}, null, 2)}</pre>
        </div>

        <div className="ph-modal-section">
          <div className="ph-panel-subtitle">canonical_event causality</div>
          <pre className="ph-json">{JSON.stringify(canonicalEvent.causality ?? {}, null, 2)}</pre>
        </div>

        <div className="ph-modal-section">
          <div className="ph-panel-subtitle">canonical causal links (depth-1)</div>

          {!links || links.length === 0 ? (
            <div className="ph-muted">No canonical links found for this event.</div>
          ) : (
            <div className="ph-table">
              <div className="ph-tr ph-th">
                <div className="ph-td">time</div>
                <div className="ph-td">link_type</div>
                <div className="ph-td">from</div>
                <div className="ph-td">to</div>
              </div>

              {links.map((l) => {
                const fromEvt = linkedById.get(l.from_canonical_event_id);
                const toEvt = linkedById.get(l.to_canonical_event_id);

                const fromLabel = fromEvt
                  ? `${fromEvt.event_domain}:${fromEvt.event_type}`
                  : l.from_canonical_event_id;

                const toLabel = toEvt
                  ? `${toEvt.event_domain}:${toEvt.event_type}`
                  : l.to_canonical_event_id;

                return (
                  <div key={l.id} className="ph-tr">
                    <div className="ph-td">{fmtTs(l.created_at)}</div>
                    <div className="ph-td">{l.link_type}</div>
                    <div className="ph-td ph-mono" title={l.from_canonical_event_id}>
                      {fromLabel}
                    </div>
                    <div className="ph-td ph-mono" title={l.to_canonical_event_id}>
                      {toLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="ph-modal-section">
          <div className="ph-panel-subtitle">linked canonical events (raw)</div>
          <pre className="ph-json">{JSON.stringify(linkedEvents ?? [], null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

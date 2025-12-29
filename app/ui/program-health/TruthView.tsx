"use client";

import * as React from "react";
import type { AbsenceTruthModel, CanonicalEvent, CanonicalEventGraphModel } from "./types";
import { readCanonicalEventGraph } from "@/app/actions/program-health/readCanonicalEventGraph";

type TabKey = "truth" | "causality";

function fmtTs(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function eventLabel(e: CanonicalEvent) {
  return `${e.event_domain}:${e.event_type}`;
}

function monoId(id: string | null | undefined) {
  return id ? `${id}` : "—";
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Silent failure (browser policy). No invented UI state.
  }
}

export function TruthView({
  truth,
  onClose,
  programId,
  initialTab,
  initialRootEventId,
}: {
  truth: AbsenceTruthModel;
  programId: string;
  onClose: () => void;
  initialTab?: TabKey;
  initialRootEventId?: string;
}) {
  const { absence, canonicalEvent } = truth;

  const [tab, setTab] = React.useState<TabKey>(initialTab ?? "truth");

  const [rootEventId, setRootEventId] = React.useState<string>(
    initialRootEventId ?? canonicalEvent.id
  );

  const [graph, setGraph] = React.useState<CanonicalEventGraphModel | null>(null);
  const [graphLoading, setGraphLoading] = React.useState(false);
  const [graphError, setGraphError] = React.useState<string | null>(null);

  const loadGraph = React.useCallback(
    async (eventId: string) => {
      setGraphError(null);
      setGraphLoading(true);
      try {
        const g = await readCanonicalEventGraph(programId, eventId);
        setGraph(g);
      } catch (e: any) {
        const msg =
          typeof e?.message === "string"
            ? e.message
            : "Failed to load canonical event graph.";
        setGraphError(msg);
        setGraph(null);
      } finally {
        setGraphLoading(false);
      }
    },
    [programId]
  );

  React.useEffect(() => {
    if (tab !== "causality") return;
    void loadGraph(rootEventId);
  }, [tab, rootEventId, loadGraph]);

  const linkedById = React.useMemo(() => {
    const m = new Map<string, CanonicalEvent>();
    for (const e of graph?.linkedEvents ?? []) m.set(e.id, e);
    return m;
  }, [graph]);

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
          <div>
            <div className="ph-modal-title">Truth View</div>
            <div className="ph-muted">
              canonical event: <span className="ph-mono">{canonicalEvent.id}</span>
            </div>
          </div>
          <button className="ph-btn" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="ph-tabs">
          <button
            type="button"
            className={`ph-tab ${tab === "truth" ? "is-active" : ""}`}
            onClick={() => setTab("truth")}
          >
            Truth
          </button>
          <button
            type="button"
            className={`ph-tab ${tab === "causality" ? "is-active" : ""}`}
            onClick={() => setTab("causality")}
          >
            Causality
          </button>
        </div>

        {tab === "truth" ? (
          <>
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

              <div className="ph-row ph-row-actions">
                <button
                  type="button"
                  className="ph-btn"
                  onClick={() => copyToClipboard(absence.canonical_event_id)}
                  title="Copy canonical_event_id"
                >
                  Copy canonical_event_id
                </button>
                <button
                  type="button"
                  className="ph-btn"
                  onClick={() => copyToClipboard(absence.ledger_id)}
                  title="Copy ledger_id"
                >
                  Copy ledger_id
                </button>
              </div>
            </div>

            <div className="ph-modal-section">
              <div className="ph-panel-subtitle">canonical_event header</div>
              <div className="ph-kv">
                <div className="ph-k">event</div>
                <div className="ph-v">{eventLabel(canonicalEvent)}</div>

                <div className="ph-k">scope_type</div>
                <div className="ph-v">{canonicalEvent.scope_type}</div>

                <div className="ph-k">scope_id</div>
                <div className="ph-v ph-mono">{monoId(canonicalEvent.scope_id)}</div>

                <div className="ph-k">actor_user_id</div>
                <div className="ph-v ph-mono">{monoId(canonicalEvent.actor_user_id)}</div>

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
          </>
        ) : (
          <>
            <div className="ph-modal-section">
              <div className="ph-panel-subtitle">causality drilldown (depth-1)</div>
              <div className="ph-muted">
                Root: <span className="ph-mono">{rootEventId}</span>
              </div>

              <div className="ph-row ph-row-actions">
                <button
                  type="button"
                  className="ph-btn"
                  onClick={() => copyToClipboard(rootEventId)}
                  title="Copy root canonical_event_id"
                >
                  Copy root canonical_event_id
                </button>
              </div>

              {graphError ? (
                <div className="ph-banner ph-banner-error">
                  <div className="ph-banner-title">Causality read failed</div>
                  <div className="ph-banner-body">{graphError}</div>
                </div>
              ) : null}

              {graphLoading ? <div className="ph-muted">Loading canonical graph…</div> : null}

              {!graphLoading && graph ? (
                <>
                  <div className="ph-panel ph-panel-graphroot">
                    <div className="ph-panel-title">Root Event (raw)</div>
                    <div className="ph-muted">
                      {eventLabel(graph.rootEvent)} • {fmtTs(graph.rootEvent.created_at)}
                    </div>

                    <div className="ph-kv">
                      <div className="ph-k">event_domain</div>
                      <div className="ph-v">{graph.rootEvent.event_domain}</div>

                      <div className="ph-k">event_type</div>
                      <div className="ph-v">{graph.rootEvent.event_type}</div>

                      <div className="ph-k">scope_type</div>
                      <div className="ph-v">{graph.rootEvent.scope_type}</div>

                      <div className="ph-k">scope_id</div>
                      <div className="ph-v ph-mono">{monoId(graph.rootEvent.scope_id)}</div>

                      <div className="ph-k">actor_user_id</div>
                      <div className="ph-v ph-mono">{monoId(graph.rootEvent.actor_user_id)}</div>

                      <div className="ph-k">created_at</div>
                      <div className="ph-v">{fmtTs(graph.rootEvent.created_at)}</div>
                    </div>

                    <pre className="ph-json">{JSON.stringify(graph.rootEvent.payload ?? {}, null, 2)}</pre>
                  </div>

                  <div className="ph-panel ph-panel-links">
                    <div className="ph-panel-title">Links</div>

                    {(graph.links?.length ?? 0) === 0 ? (
                      <div className="ph-muted">No canonical links found for this event.</div>
                    ) : (
                      <div className="ph-table">
                        <div className="ph-tr ph-th">
                          <div className="ph-td">time</div>
                          <div className="ph-td">link_type</div>
                          <div className="ph-td">from</div>
                          <div className="ph-td">to</div>
                        </div>

                        {graph.links.map((l) => {
                          const fromEvt = linkedById.get(l.from_canonical_event_id);
                          const toEvt = linkedById.get(l.to_canonical_event_id);

                          const fromLabel = fromEvt ? eventLabel(fromEvt) : l.from_canonical_event_id;
                          const toLabel = toEvt ? eventLabel(toEvt) : l.to_canonical_event_id;

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

                  <div className="ph-panel ph-panel-linked">
                    <div className="ph-panel-title">Linked Events (depth-1)</div>

                    {(graph.linkedEvents?.length ?? 0) === 0 ? (
                      <div className="ph-muted">No linked events returned.</div>
                    ) : (
                      <div className="ph-linked-list">
                        {graph.linkedEvents.map((e) => {
                          const isRoot = e.id === graph.rootEvent.id;
                          return (
                            <details key={e.id} className="ph-linked-card" open={false}>
                              <summary className="ph-linked-summary">
                                <span className="ph-linked-title">
                                  {eventLabel(e)}
                                  {isRoot ? " (root)" : ""}
                                </span>
                                <span className="ph-linked-meta">
                                  <span className="ph-mono">{String(e.id).slice(0, 8)}…</span>
                                  <span className="ph-dot">•</span>
                                  <span>{fmtTs(e.created_at)}</span>
                                </span>
                              </summary>

                              <div className="ph-linked-actions">
                                <button
                                  type="button"
                                  className="ph-btn"
                                  onClick={() => copyToClipboard(e.id)}
                                  title="Copy canonical_event_id"
                                >
                                  Copy canonical_event_id
                                </button>

                                <button
                                  type="button"
                                  className="ph-btn"
                                  onClick={() => setRootEventId(e.id)}
                                  disabled={e.id === rootEventId}
                                  title="Re-root drilldown at this canonical event (depth-1)"
                                >
                                  Open this event
                                </button>
                              </div>

                              <div className="ph-kv">
                                <div className="ph-k">canonical_event_id</div>
                                <div className="ph-v ph-mono">{e.id}</div>

                                <div className="ph-k">event_domain</div>
                                <div className="ph-v">{e.event_domain}</div>

                                <div className="ph-k">event_type</div>
                                <div className="ph-v">{e.event_type}</div>

                                <div className="ph-k">scope_type</div>
                                <div className="ph-v">{e.scope_type}</div>

                                <div className="ph-k">scope_id</div>
                                <div className="ph-v ph-mono">{monoId(e.scope_id)}</div>

                                <div className="ph-k">actor_user_id</div>
                                <div className="ph-v ph-mono">{monoId(e.actor_user_id)}</div>

                                <div className="ph-k">created_at</div>
                                <div className="ph-v">{fmtTs(e.created_at)}</div>
                              </div>

                              <div className="ph-linked-body">
                                <pre className="ph-json">{JSON.stringify(e.payload ?? {}, null, 2)}</pre>
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

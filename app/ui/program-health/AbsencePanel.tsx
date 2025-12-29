"use client";

import * as React from "react";
import type { ProgramHealthAbsence } from "./types";
import { readCanonicalEventGraph } from "@/app/actions/program-health/readCanonicalEventGraph";

type Horizon = "H0" | "H1" | "H2" | "H3";
type SeverityFilter = "all" | "critical" | "high" | "medium" | "low" | "unknown";

function fmtTs(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function shortId(id: string | null | undefined) {
  if (!id) return "—";
  return `${id.slice(0, 8)}…`;
}

function sevBucket(severity: string | null | undefined): Exclude<SeverityFilter, "all"> {
  const s = (severity ?? "").toLowerCase();
  if (s.includes("critical")) return "critical";
  if (s.includes("high")) return "high";
  if (s.includes("medium")) return "medium";
  if (s.includes("low")) return "low";
  return "unknown";
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // silent: do not invent UI semantics
  }
}

export function AbsencePanel({
  programId,
  absences,
  selectedAbsenceId,
  selectedAbsence,
  onSelectAbsence,
  onOpenTruth,
  onOpenCausality,
}: {
  programId: string;
  absences: ProgramHealthAbsence[];
  selectedAbsenceId: string | null;
  selectedAbsence: ProgramHealthAbsence | null;
  onSelectAbsence?: (id: string) => void;
  onOpenTruth?: () => void;
  onOpenCausality?: () => void;
}) {
  const [horizon, setHorizon] = React.useState<"all" | Horizon>("all");
  const [severity, setSeverity] = React.useState<SeverityFilter>("all");
  const [q, setQ] = React.useState<string>("");

  // Causality preview (depth-1) rooted at selected absence canonical_event_id
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [previewLinksCount, setPreviewLinksCount] = React.useState<number>(0);
  const [previewEvents, setPreviewEvents] = React.useState<
    Array<{ id: string; label: string; created_at?: string | null }>
  >([]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();

    return absences
      .filter((a) => {
        if (horizon !== "all" && a.horizon !== horizon) return false;
        if (severity !== "all" && sevBucket(a.severity) !== severity) return false;

        if (needle.length > 0) {
          const key = (a.absence_key ?? "").toLowerCase();
          const typ = (a.absence_type ?? "").toLowerCase();
          if (!key.includes(needle) && !typ.includes(needle)) return false;
        }

        return true;
      })
      .sort((x, y) => {
        // stable ordering: horizon -> severity bucket -> absence_type -> absence_key
        const hc = String(x.horizon ?? "").localeCompare(String(y.horizon ?? ""));
        if (hc !== 0) return hc;

        const sx = sevBucket(x.severity);
        const sy = sevBucket(y.severity);
        const sc = sx.localeCompare(sy);
        if (sc !== 0) return sc;

        const tc = String(x.absence_type ?? "").localeCompare(String(y.absence_type ?? ""));
        if (tc !== 0) return tc;

        return String(x.absence_key ?? "").localeCompare(String(y.absence_key ?? ""));
      });
  }, [absences, horizon, severity, q]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setPreviewError(null);
      setPreviewEvents([]);
      setPreviewLinksCount(0);

      if (!selectedAbsence?.canonical_event_id) return;

      setPreviewLoading(true);
      try {
        const g = await readCanonicalEventGraph(programId, selectedAbsence.canonical_event_id);

        const events = (g.linkedEvents ?? [])
          .map((e: any) => ({
            id: e.id,
            label: `${e.event_domain}:${e.event_type}`,
            created_at: e.created_at ?? null,
          }))
          .slice(0, 6);

        if (!cancelled) {
          setPreviewLinksCount((g.links ?? []).length);
          setPreviewEvents(events);
        }
      } catch (e: any) {
        const msg =
          typeof e?.message === "string" ? e.message : "Failed to load causality preview.";
        if (!cancelled) setPreviewError(msg);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [programId, selectedAbsence?.canonical_event_id]);

  return (
    <div className="ph-inspector">
      <div className="ph-inspector-title">Canonical Inspector</div>
      <div className="ph-muted">UI reads runtime emissions only. No computation or advice.</div>

      {/* 1) Selected Absence */}
      <div className="ph-inspector-section">
        <div className="ph-section-title">Selected Absence</div>

        {selectedAbsence ? (
          <>
            <div className="ph-kv">
              <div className="ph-k">horizon</div>
              <div className="ph-v">{selectedAbsence.horizon}</div>

              <div className="ph-k">absence_type</div>
              <div className="ph-v">{selectedAbsence.absence_type}</div>

              <div className="ph-k">absence_key</div>
              <div className="ph-v ph-mono">{selectedAbsence.absence_key}</div>

              <div className="ph-k">severity</div>
              <div className="ph-v">{selectedAbsence.severity ?? "—"}</div>

              <div className="ph-k">canonical_event_id</div>
              <div className="ph-v ph-mono">{selectedAbsence.canonical_event_id}</div>

              <div className="ph-k">ledger_id</div>
              <div className="ph-v ph-mono">{selectedAbsence.ledger_id}</div>

              <div className="ph-k">created_at</div>
              <div className="ph-v">{fmtTs(selectedAbsence.created_at)}</div>
            </div>

            <div className="ph-row ph-row-actions">
              <button type="button" className="ph-btn" onClick={onOpenTruth} title="Open Truth tab">
                Truth
              </button>
              <button
                type="button"
                className="ph-btn"
                onClick={onOpenCausality}
                title="Open Causality tab"
              >
                Causality
              </button>
            </div>

            <div className="ph-row ph-row-actions">
              <button
                type="button"
                className="ph-btn ph-btn-ghost"
                onClick={() => copyToClipboard(selectedAbsence.canonical_event_id)}
                title="Copy canonical_event_id"
              >
                Copy canonical_event_id
              </button>
              <button
                type="button"
                className="ph-btn ph-btn-ghost"
                onClick={() => copyToClipboard(selectedAbsence.ledger_id)}
                title="Copy ledger_id"
              >
                Copy ledger_id
              </button>
            </div>
          </>
        ) : (
          <div className="ph-empty">Select an absence to inspect canonical truth.</div>
        )}
      </div>

      {/* 2) Filters */}
      <div className="ph-inspector-section">
        <div className="ph-section-title">Absence Filters</div>

        <div className="ph-filter-row">
          <div className="ph-filter-label">horizon</div>
          <div className="ph-chip-row">
            {(["all", "H0", "H1", "H2", "H3"] as const).map((h) => (
              <button
                key={h}
                type="button"
                className={`ph-chip ${horizon === h ? "is-active" : ""}`}
                onClick={() => setHorizon(h as any)}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <div className="ph-filter-row">
          <div className="ph-filter-label">severity</div>
          <div className="ph-chip-row">
            {(["all", "critical", "high", "medium", "low", "unknown"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`ph-chip ${severity === s ? "is-active" : ""}`}
                onClick={() => setSeverity(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="ph-filter-row">
          <div className="ph-filter-label">search</div>
          <input
            className="ph-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="absence_key or absence_type"
          />
        </div>
      </div>

      {/* 3) Absences list */}
      <div className="ph-inspector-section">
        <div className="ph-section-title">Absences</div>
        <div className="ph-muted">Runtime emissions. Select to bind inspector + map.</div>

        <div className="ph-absence-list-v2">
          {filtered.length === 0 ? (
            <div className="ph-empty">No absences match filters.</div>
          ) : (
            filtered.map((a) => {
              const active = a.id === selectedAbsenceId;
              const sev = sevBucket(a.severity);

              return (
                <button
                  key={a.id}
                  type="button"
                  className={`ph-absence-row-v2 ${active ? "is-active" : ""}`}
                  onClick={() => onSelectAbsence?.(a.id)}
                  title={`${a.horizon} • ${a.absence_type} • ${a.absence_key}`}
                >
                  <span className={`ph-sev-dot ${sev}`} />
                  <div className="ph-absence-col">
                    <div className="ph-absence-line1">
                      <span className="ph-pill">{a.horizon}</span>
                      <span className="ph-absence-type">{a.absence_type}</span>
                    </div>
                    <div className="ph-absence-line2 ph-mono">{a.absence_key}</div>
                  </div>
                  <div className="ph-absence-col-right">
                    <div className="ph-absence-mini ph-mono">{shortId(a.ledger_id)}</div>
                    <div className="ph-absence-mini">{a.severity ?? "—"}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 4) Causality preview */}
      <div className="ph-inspector-section">
        <div className="ph-section-title">Causality Preview</div>

        {!selectedAbsence ? (
          <div className="ph-empty">Select an absence to view causality.</div>
        ) : previewError ? (
          <div className="ph-banner ph-banner-error">
            <div className="ph-banner-title">Preview read failed</div>
            <div className="ph-banner-body">{previewError}</div>
          </div>
        ) : previewLoading ? (
          <div className="ph-muted">Loading preview…</div>
        ) : (
          <>
            <div className="ph-muted">
              Root: <span className="ph-mono">{shortId(selectedAbsence.canonical_event_id)}</span> • links:{" "}
              <span className="ph-mono">{previewLinksCount}</span>
            </div>

            <div className="ph-preview-list">
              {previewEvents.length === 0 ? (
                <div className="ph-empty">No linked events returned.</div>
              ) : (
                previewEvents.map((e) => (
                  <div key={e.id} className="ph-preview-row">
                    <div className="ph-preview-left">
                      <div className="ph-preview-label">{e.label}</div>
                      <div className="ph-preview-meta">
                        <span className="ph-mono">{shortId(e.id)}</span>
                        <span className="ph-dot">•</span>
                        <span>{fmtTs(e.created_at ?? null)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ph-btn ph-btn-ghost"
                      onClick={() => copyToClipboard(e.id)}
                      title="Copy canonical_event_id"
                    >
                      Copy
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="ph-row ph-row-actions">
              <button
                type="button"
                className="ph-btn"
                onClick={onOpenCausality}
                title="Open full causality drilldown"
              >
                Open full Causality
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

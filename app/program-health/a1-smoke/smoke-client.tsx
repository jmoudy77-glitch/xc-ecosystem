'use client';

import React, { useMemo, useState, useTransition } from 'react';

type Sport = 'xc' | 'tf';
type Horizon = 'H0' | 'H1' | 'H2' | 'H3';

function nowHash() {
  const d = new Date();
  return `ui_smoke_${d.toISOString()}`;
}

export default function ProgramHealthA1SmokeClient() {
  const [isPending, startTransition] = useTransition();

  const [programId, setProgramId] = useState<string>('6252113e-0eb1-482f-8438-50415db05617');
  const [sport, setSport] = useState<Sport>('xc');
  const [horizon, setHorizon] = useState<Horizon>('H1');
  const [inputsHash, setInputsHash] = useState<string>(nowHash());

  const defaultPayload = useMemo(
    () =>
      JSON.stringify(
        {
          summary: { absences_total: 1 },
          absences: [
            {
              absence_key: 'ui_smoke_absence_1',
              absence_type: 'capability_loss_example',
              severity: 'low',
              details: { note: 'ui smoke test' },
            },
          ],
        },
        null,
        2
      ),
    []
  );

  const [payloadText, setPayloadText] = useState<string>(defaultPayload);

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    setResult(null);

    let resultPayload: any;
    try {
      resultPayload = JSON.parse(payloadText);
    } catch (e: any) {
      setError(`Invalid JSON in resultPayload: ${e?.message ?? String(e)}`);
      return;
    }

    startTransition(async () => {
      try {
        const resp = await fetch('/api/program-health/a1/evaluate-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programId,
            sport,
            horizon,
            inputsHash,
            resultPayload,
            scopeId: null,
            engineVersion: 'a1_v1',
          }),
        });

        const json = await resp.json();
        if (!json?.ok) {
          throw new Error(json?.error ?? `Request failed (${resp.status})`);
        }

        setResult(json.result);
      } catch (e: any) {
        setError(e?.message ?? 'Unknown error');
      }
    });
  };

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Program Health — A1 Smoke Test (DEV ONLY)</h1>
      <p style={{ marginTop: 0, marginBottom: 20, color: '#444' }}>
        This page calls the actor-bound route (<code>/api/program-health/a1/evaluate-user</code>) and writes:
        <br />
        <code>canonical_events → program_health_ledger → program_health_snapshots / program_health_absences</code>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, marginBottom: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>programId</span>
          <input
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
            placeholder="program uuid"
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>sport</span>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value as Sport)}
            style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          >
            <option value="xc">xc</option>
            <option value="tf">tf</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>horizon</span>
          <select
            value={horizon}
            onChange={(e) => setHorizon(e.target.value as Horizon)}
            style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          >
            <option value="H0">H0</option>
            <option value="H1">H1</option>
            <option value="H2">H2</option>
            <option value="H3">H3</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>inputsHash</span>
          <input
            value={inputsHash}
            onChange={(e) => setInputsHash(e.target.value)}
            style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          />
        </label>

        <button
          onClick={() => setInputsHash(nowHash())}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #ccc',
            background: '#fff',
            cursor: 'pointer',
          }}
          type="button"
        >
          Regenerate inputsHash
        </button>
      </div>

      <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>resultPayload (JSON)</span>
        <textarea
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          rows={14}
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
        />
      </label>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <button
          onClick={run}
          disabled={isPending}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #111',
            background: isPending ? '#f4f4f4' : '#111',
            color: isPending ? '#111' : '#fff',
            cursor: isPending ? 'not-allowed' : 'pointer',
            fontWeight: 700,
          }}
          type="button"
        >
          {isPending ? 'Running…' : 'Emit A1 Evaluation (actor-bound)'}
        </button>

        <span style={{ fontSize: 12, color: '#555' }}>
          Dev-only diagnostic surface.
        </span>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 10, border: '1px solid #f2b8b5', background: '#fff5f5', color: '#7a1b16' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ padding: 12, borderRadius: 10, border: '1px solid #c9e6d3', background: '#f4fff8' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Success</div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

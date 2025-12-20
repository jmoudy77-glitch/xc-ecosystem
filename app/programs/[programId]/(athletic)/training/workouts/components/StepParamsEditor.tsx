

// app/programs/[programId]/training/workouts/components/StepParamsEditor.tsx
"use client";

import * as React from "react";

type ParamType = "string" | "number" | "boolean" | "select";

export type ParamSpec = {
  key: string;
  label: string;
  type: ParamType;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  helperText?: string;
};

type Props = {
  /**
   * Raw params object from API (normalized). This component edits a shallow key/value object.
   */
  value: Record<string, any> | null | undefined;

  /**
   * Optional schema to render friendly inputs. Unknown keys fall back to a generic editor.
   */
  spec?: ParamSpec[];

  /**
   * Called whenever the params object changes.
   */
  onChange: (next: Record<string, any>) => void;

  /**
   * If true, disables editing.
   */
  disabled?: boolean;

  /**
   * Optional className for wrapper.
   */
  className?: string;
};

function toNumberOrUndefined(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeObject(input: Record<string, any> | null | undefined): Record<string, any> {
  if (!input || typeof input !== "object") return {};
  // Shallow clone only.
  return { ...input };
}

function prettyKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function StepParamsEditor({ value, spec, onChange, disabled, className }: Props) {
  const params = React.useMemo(() => normalizeObject(value), [value]);
  const specByKey = React.useMemo(() => {
    const map = new Map<string, ParamSpec>();
    (spec ?? []).forEach((s) => map.set(s.key, s));
    return map;
  }, [spec]);

  const keys = React.useMemo(() => {
    // Prefer ordering: spec keys first, then remaining keys alphabetically.
    const specKeys = (spec ?? []).map((s) => s.key);
    const remaining = Object.keys(params)
      .filter((k) => !specKeys.includes(k))
      .sort((a, b) => a.localeCompare(b));
    return [...specKeys.filter((k) => k in params), ...remaining];
  }, [params, spec]);

  const [newKey, setNewKey] = React.useState("");
  const [newType, setNewType] = React.useState<ParamType>("string");

  function setParam(k: string, v: any) {
    const next = { ...params, [k]: v };
    onChange(next);
  }

  function deleteParam(k: string) {
    const next = { ...params };
    delete next[k];
    onChange(next);
  }

  function addParam() {
    const k = newKey.trim();
    if (!k) return;
    if (k in params) return;

    let initial: any = "";
    if (newType === "number") initial = undefined;
    if (newType === "boolean") initial = false;
    if (newType === "select") initial = "";

    onChange({ ...params, [k]: initial });
    setNewKey("");
    setNewType("string");
  }

  return (
    <div className={className ?? ""}>
      <div className="space-y-3">
        {keys.length === 0 ? (
          <div className="text-sm text-muted-foreground">No parameters.</div>
        ) : null}

        {keys.map((k) => {
          const s = specByKey.get(k);
          const label = s?.label ?? prettyKey(k);
          const type: ParamType = s?.type ?? (typeof params[k] === "number" ? "number" : typeof params[k] === "boolean" ? "boolean" : "string");
          const helper = s?.helperText;

          return (
            <div key={k} className="flex items-start gap-3 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.02)] p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{label}</div>
                    <div className="text-xs text-muted-foreground truncate">{k}</div>
                  </div>

                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => deleteParam(k)}
                    disabled={disabled}
                    aria-label={`Remove ${label}`}
                    title="Remove"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-2">
                  {type === "string" ? (
                    <input
                      type="text"
                      className="w-full rounded-md border border-border-subtle bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                      value={params[k] ?? ""}
                      placeholder={s?.placeholder ?? ""}
                      onChange={(e) => setParam(k, e.target.value)}
                      disabled={disabled}
                    />
                  ) : null}

                  {type === "number" ? (
                    <input
                      type="number"
                      className="w-full rounded-md border border-border-subtle bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                      value={params[k] ?? ""}
                      placeholder={s?.placeholder ?? ""}
                      min={s?.min}
                      max={s?.max}
                      step={s?.step}
                      onChange={(e) => setParam(k, toNumberOrUndefined(e.target.value))}
                      disabled={disabled}
                    />
                  ) : null}

                  {type === "boolean" ? (
                    <label className="inline-flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={Boolean(params[k])}
                        onChange={(e) => setParam(k, e.target.checked)}
                        disabled={disabled}
                      />
                      <span>{Boolean(params[k]) ? "True" : "False"}</span>
                    </label>
                  ) : null}

                  {type === "select" ? (
                    <select
                      className="w-full rounded-md border border-border-subtle bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                      value={params[k] ?? ""}
                      onChange={(e) => setParam(k, e.target.value)}
                      disabled={disabled}
                    >
                      <option value="">Select…</option>
                      {(s?.options ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {helper ? <div className="mt-1 text-xs text-muted-foreground">{helper}</div> : null}
                </div>
              </div>
            </div>
          );
        })}

        <div className="rounded-md border border-border-subtle bg-[rgba(255,255,255,0.02)] p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground">Add parameter</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-border-subtle bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                placeholder="e.g., duration_min"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="sm:w-48">
              <label className="block text-xs text-muted-foreground">Type</label>
              <select
                className="mt-1 w-full rounded-md border border-border-subtle bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                value={newType}
                onChange={(e) => setNewType(e.target.value as ParamType)}
                disabled={disabled}
              >
                <option value="string">Text</option>
                <option value="number">Number</option>
                <option value="boolean">True/False</option>
              </select>
            </div>

            <div className="sm:w-auto">
              <button
                type="button"
                className="w-full rounded-md border border-border-subtle bg-[rgba(255,255,255,0.04)] px-4 py-2 text-sm text-foreground hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50"
                onClick={addParam}
                disabled={disabled || newKey.trim() === "" || newKey.trim() in params}
                title={newKey.trim() in params ? "Key already exists" : "Add"}
              >
                Add
              </button>
            </div>
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            Tip: Keep keys consistent (e.g., <span className="font-mono">duration_min</span>, <span className="font-mono">distance_m</span>, <span className="font-mono">reps</span>).
          </div>
        </div>
      </div>
    </div>
  );
}
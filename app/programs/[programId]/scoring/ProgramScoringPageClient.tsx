// app/programs/[programId]/scoring/ProgramScoringPageClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProgramScoringWeights = {
  academic: number;
  performance: number;
  availability: number;
  conduct: number;
};

type ProgramScoringProfile = {
  id: string | null;
  label: string;
  is_default: boolean;
  weights: ProgramScoringWeights;
};

type LoadResponse =
  | {
      ok: true;
      programId: string;
      programName: string | null;
      scoring_profile: ProgramScoringProfile;
    }
  | {
      ok: false;
      error: string;
    };

type SaveResponse =
  | { ok: true; scoring_profile: ProgramScoringProfile }
  | { ok: false; error: string };

type Props = {
  programId: string;
};

const DEFAULT_WEIGHTS: ProgramScoringWeights = {
  academic: 35,
  performance: 40,
  availability: 15,
  conduct: 10,
};

export default function ProgramScoringPageClient({ programId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [programName, setProgramName] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProgramScoringProfile | null>(null);
  const [label, setLabel] = useState<string>("Default");
  const [weights, setWeights] = useState<ProgramScoringWeights>(
    DEFAULT_WEIGHTS,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setSaveMessage(null);

        const res = await fetch(`/api/programs/${programId}/scoring`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const body = (await res.json().catch(() => ({}))) as LoadResponse;

        if (!mounted) return;

        if (!res.ok || !("ok" in body) || !body.ok) {
          const message =
            !("ok" in body) || !body.ok
              ? (body as any).error ?? "Failed to load scoring settings"
              : `Failed to load scoring settings (${res.status})`;

          setError(message);
          setLoading(false);
          return;
        }

        setProgramName(body.programName);
        setProfile(body.scoring_profile);
        setLabel(body.scoring_profile.label);
        setWeights(body.scoring_profile.weights);
        setLoading(false);
      } catch (err) {
        console.error(
          "[ProgramScoringPageClient] Failed to load scoring settings:",
          err,
        );
        if (!mounted) return;
        setError("Unexpected error loading scoring settings.");
        setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [programId]);

  function updateWeight(
    key: keyof ProgramScoringWeights,
    value: number | string,
  ) {
    const numeric =
      typeof value === "string" ? parseInt(value || "0", 10) : value;
    const clamped = Math.max(0, Math.min(100, Number.isNaN(numeric) ? 0 : numeric));
    setWeights((prev) => ({ ...prev, [key]: clamped }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSaveMessage(null);

      const payload = {
        label: label.trim() || "Custom",
        weights,
      };

      const res = await fetch(`/api/programs/${programId}/scoring`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await res.json().catch(() => ({}))) as SaveResponse;

      if (!res.ok || !body.ok) {
        const message =
          !body.ok && "error" in body && body.error
            ? body.error
            : `Failed to save scoring settings (${res.status})`;
        setError(message);
        return;
      }

      setProfile(body.scoring_profile);
      setLabel(body.scoring_profile.label);
      setWeights(body.scoring_profile.weights);
      setSaveMessage("Scoring profile saved.");
    } catch (err) {
      console.error(
        "[ProgramScoringPageClient] Failed to save scoring settings:",
        err,
      );
      setError("Unexpected error saving scoring settings.");
    } finally {
      setSaving(false);
    }
  }

  const totalWeight =
    weights.academic +
    weights.performance +
    weights.availability +
    weights.conduct;

  if (loading && !profile && !error) {
    return (
      <div className="p-6 text-slate-500 text-sm">
        Loading program scoring settings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-900">
            Scoring settings
          </p>
          <p className="text-[11px] text-slate-500">
            Customize how this program weights academics, performance,
            availability, and conduct when computing holistic recruiting scores.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[11px] text-slate-500 hover:text-slate-800 underline"
        >
          Back
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {programName || "Program scoring profile"}
            </p>
            <p className="text-[11px] text-slate-500">
              These weights are used to derive program-specific scores from the
              global athlete scores.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-500">
              Total weight:{" "}
              <span
                className={
                  totalWeight === 0
                    ? "font-semibold text-red-600"
                    : "font-semibold text-slate-900"
                }
              >
                {totalWeight}
              </span>
            </p>
            <p className="text-[11px] text-slate-400">
              Any non-zero distribution is valid. Relative values matter most.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-700">
              Profile label
            </label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. High-academic distance program"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <WeightInput
              label="Academics"
              description="GPA, coursework, academic reliability"
              value={weights.academic}
              onChange={(v) => updateWeight("academic", v)}
            />
            <WeightInput
              label="Performance"
              description="Event-specific performance and upside"
              value={weights.performance}
              onChange={(v) => updateWeight("performance", v)}
            />
            <WeightInput
              label="Availability"
              description="Attendance, injuries, communication reliability"
              value={weights.availability}
              onChange={(v) => updateWeight("availability", v)}
            />
            <WeightInput
              label="Conduct"
              description="Character, discipline history, coach flags"
              value={weights.conduct}
              onChange={(v) => updateWeight("conduct", v)}
            />
          </div>
        </div>

        {saveMessage && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
            {saveMessage}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-900">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || totalWeight === 0}
            className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save scoring profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

type WeightInputProps = {
  label: string;
  description: string;
  value: number;
  onChange: (value: number | string) => void;
};

function WeightInput({ label, description, value, onChange }: WeightInputProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-900">{label}</p>
          <p className="text-[11px] text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-600">
          <input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-14 rounded border border-slate-300 px-1 py-0.5 text-right text-[11px]"
          />
          <span>wt</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
      />
    </div>
  );
}

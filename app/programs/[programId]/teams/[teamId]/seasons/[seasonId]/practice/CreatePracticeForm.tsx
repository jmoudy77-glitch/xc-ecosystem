//app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/CreatePracticeForm.tsx
"use client";

import React, { useState } from "react";
import { createPracticePlan, type PracticeStatus } from "./actions";

type CreatePracticeFormProps = {
  programId: string;
  teamId: string;
  seasonId: string;
};

const STATUS_OPTIONS: PracticeStatus[] = [
  "planned",
  "published",
  "completed",
  "canceled",
];

export default function CreatePracticeForm({
  programId,
  teamId,
  seasonId,
}: CreatePracticeFormProps) {
  const today = new Date();
  const defaultDate = today.toISOString().slice(0, 10); // YYYY-MM-DD

  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<PracticeStatus>("planned");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!label.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await createPracticePlan({
        programId,
        teamId,
        teamSeasonId: seasonId,
        practiceDate: date,
        startTime: startTime || null,
        endTime: endTime || null,
        location: location || null,
        label: label.trim(),
        notes: notes.trim() || null,
        status,
      });

      if (!result.success) {
        setError(result.error ?? "Unable to save practice.");
        return;
      }

      setSuccessMessage("Practice saved.");

      // Clear form fields but leave date/status as-is
      setLabel("");
      setNotes("");
      setLocation("");
      setStartTime("");
      setEndTime("");
    } catch (err: any) {
      console.error("[CreatePracticeForm] submit error:", err);
      setError("Something went wrong while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <h2 className="mb-2 text-sm font-semibold text-slate-100">
        Create practice
      </h2>
      <p className="mb-4 text-xs text-slate-400">
        Define a practice for this team and season. This writes directly into{" "}
        <code className="font-mono text-[10px]">practice_plans</code>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3 text-xs text-slate-200">
        {/* Hidden context */}
        <input type="hidden" name="programId" value={programId} />
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="teamSeasonId" value={seasonId} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-300">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-300">
              Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as PracticeStatus)
              }
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-emerald-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-300">
              Start time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-300">
              End time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-300">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Interval session, Recovery run"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-500"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-300">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Track, XC course, weight room, etc."
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-500"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-300">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional details for coaches or athletes."
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <p className="text-[10px] text-slate-500">
              Saving will create a{" "}
              <code className="font-mono text-[10px]">practice_plans</code> row
              for this season.
            </p>
            {error && (
              <p className="mt-1 text-[10px] text-red-400">{error}</p>
            )}
            {successMessage && !error && (
              <p className="mt-1 text-[10px] text-emerald-400">
                {successMessage}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !label.trim()}
            className="inline-flex items-center rounded-md border border-emerald-500/70 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save practice"}
          </button>
        </div>
      </form>
    </section>
  );
}
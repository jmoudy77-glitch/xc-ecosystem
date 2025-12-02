// app/programs/create/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateProgramPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [division, setDivision] = useState("");
  const [conference, setConference] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        schoolName: schoolName.trim(),
        division: division.trim() || null,
        conference: conference.trim() || null,
      };

      if (!payload.name || !payload.schoolName) {
        throw new Error("Program name and school name are required.");
      }

      const res = await fetch("/api/programs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body?.error || "Failed to create program");
      }

      const program = body?.program;
      const programId = body?.programId ?? program?.id;
      if (programId) {
        // Navigate to the new program's overview page
        router.push(`/programs/${programId}`);
      } else {
        // Fallback: go back to dashboard
        router.push("/dashboard");
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Unexpected error creating program");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white rounded-lg shadow p-6 space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Programs
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Create a new program
          </h1>
          <p className="text-sm text-slate-600">
            Connect your team to a school so you can manage staff, athletes,
            scoring, and billing in one place.
          </p>
        </header>

        {errorMsg && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Program name<span className="text-red-500">*</span>
            </label>
            <input
              required
              className="border rounded px-3 py-2 text-sm w-full"
              placeholder="e.g. Men's Track & Field"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-[11px] text-slate-500">
              This is the team you&apos;ll manage in the system.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              School name<span className="text-red-500">*</span>
            </label>
            <input
              required
              className="border rounded px-3 py-2 text-sm w-full"
              placeholder="e.g. Central High School"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Division
              </label>
              <input
                className="border rounded px-3 py-2 text-sm w-full"
                placeholder="e.g. 6A, NCAA D1"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Conference
              </label>
              <input
                className="border rounded px-3 py-2 text-sm w-full"
                placeholder="e.g. Big Ten, District 12"
                value={conference}
                onChange={(e) => setConference(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => router.push("/dashboard")}
              className="text-xs text-slate-600 hover:underline"
            >
              ← Back to dashboard
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded shadow text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create program"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

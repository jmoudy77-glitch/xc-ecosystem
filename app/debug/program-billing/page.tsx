// app/debug/program-billing/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DebugProgramBillingPage() {
  const router = useRouter();
  const [programId, setProgramId] = useState("");

  function goToBilling() {
    const trimmed = programId.trim();
    if (!trimmed) return;
    router.push(`/programs/${trimmed}/billing`);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6 space-y-4">
        <header>
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
            Debug
          </p>
          <h1 className="text-xl font-semibold text-slate-900">
            Program Billing Tester
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Paste a <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">program_id</code> from Supabase
            and jump directly to that program&apos;s billing page to test Stripe checkout.
          </p>
        </header>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-700">
            Program ID
          </label>
          <input
            className="border rounded px-3 py-2 text-sm w-full"
            placeholder="e.g. 8d5f4b2a-...."
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={goToBilling}
          disabled={!programId.trim()}
          className="w-full rounded-md bg-blue-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
        >
          Go to program billing
        </button>

        <p className="text-[11px] text-slate-500">
          You can find the <strong>program_id</strong> in your Supabase dashboard under the{" "}
          <span className="font-mono">programs</span> table. This page is just for testing
          the program billing flow without needing full dashboard navigation in place yet.
        </p>
      </div>
    </div>
  );
}

// app/programs/[programId]/billing/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProgramBillingPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params?.programId as string;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!programId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(`/api/programs/${programId}/billing`, {
          credentials: "include",
        });

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        const json = await res.json();

        if (!res.ok) {
          if (!cancelled) setErrorMsg(json.error || "Failed to load billing");
          return;
        }

        if (!cancelled) {
          setData(json);
        }
      } catch (err: any) {
        if (!cancelled) setErrorMsg(err?.message || "Unexpected error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [programId, router]);

  if (!programId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Program Billing</h1>
        <p className="mt-2 text-sm text-slate-600">
          Program ID missing. Make sure this page is accessed through the dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Program Billing</h1>

      {loading && <p className="text-slate-600">Loading…</p>}

      {errorMsg && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-red-800">
          {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && data && (
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <p className="text-sm text-slate-700">
            <span className="font-medium">Program ID:</span> {data.programId}
          </p>

          {!data.subscription ? (
            <p className="text-slate-600">
              No active subscription for this program.
            </p>
          ) : (
            <div className="space-y-2">
              <p>
                <span className="font-medium">Plan:</span> {data.subscription.plan_code}
              </p>
              <p>
                <span className="font-medium">Status:</span> {data.subscription.status}
              </p>
              <p>
                <span className="font-medium">Renews:</span>{" "}
                {data.subscription.current_period_end
                  ? new Date(data.subscription.current_period_end).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
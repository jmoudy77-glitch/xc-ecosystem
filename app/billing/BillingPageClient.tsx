// app/billing/BillingPageClient.tsx
"use client";

import { useState } from "react";

type Scope = "org" | "athlete";

export default function BillingPageClient() {
  const [loadingScope, setLoadingScope] = useState<Scope | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(scope: Scope) {
    try {
      setError(null);
      setLoadingScope(scope);

      // TODO: replace these with real IDs once auth / DB is wired up
      const orgId = "org-demo-id";
      const athleteId = "athlete-demo-id";

      const body =
        scope === "org"
          ? { scope: "org", tier: "elite", orgId }
          : { scope: "athlete", tier: "elite", athleteId };

      const res = await fetch("/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as any).error || "Failed to start checkout";
        throw new Error(msg);
      }

      const data = await res.json();
      const url = (data as any).url as string | undefined;

      if (!url) {
        throw new Error("No checkout URL returned from server");
      }

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unexpected checkout error";
      console.error("Checkout error:", message);
      setError(message);
    } finally {
      setLoadingScope(null);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Billing & Plans</h1>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Coach / Program Plan */}
      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="text-xl font-semibold">Coach / Program Plan</h2>
        <p className="text-sm text-gray-600">
          Unlock recruiting tools for your entire program: coach dashboards,
          recruiting boards, pipeline, and AI scout assistant.
        </p>
        <button
          type="button"
          onClick={() => startCheckout("org")}
          disabled={loadingScope === "org"}
          className="mt-3 inline-flex items-center px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-60"
        >
          {loadingScope === "org"
            ? "Redirecting to Stripe..."
            : "Upgrade Program to Elite"}
        </button>
      </section>

      {/* Athlete Plan */}
      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="text-xl font-semibold">Athlete Plan</h2>
        <p className="text-sm text-gray-600">
          Personal account for athletes: profile tools, visibility, and AI
          guidance—even if your team hasn’t joined yet.
        </p>
        <button
          type="button"
          onClick={() => startCheckout("athlete")}
          disabled={loadingScope === "athlete"}
          className="mt-3 inline-flex items-center px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-60"
        >
          {loadingScope === "athlete"
            ? "Redirecting to Stripe..."
            : "Upgrade Athlete to Elite"}
        </button>
      </section>
    </main>
  );
}


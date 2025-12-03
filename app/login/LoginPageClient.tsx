// app/login/LoginPageClient.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPageClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        setError("No session returned from Supabase.");
        setLoading(false);
        return;
      }

      router.replace("/dashboard");
    } catch (err: unknown) {
      console.error("[LoginPage] handleLogin error:", err);
      setError(
        err instanceof Error ? err.message : "Unexpected error logging in.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg"
      >
        <h1 className="text-lg font-semibold mb-4">Log in</h1>

        <label className="block text-xs font-medium text-slate-300 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-blue-500"
          required
        />

        <label className="block text-xs font-medium text-slate-300 mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-blue-500"
          required
        />

        {error && (
          <p className="mb-3 text-xs text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-slate-50 py-2 text-sm font-semibold text-slate-950 hover:bg-white disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log In"}
        </button>
      </form>
    </div>
  );
}
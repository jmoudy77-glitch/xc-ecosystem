// app/login/LoginPageClient.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPageClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [signupOpen, setSignupOpen] = useState(false);
  const [signupRole, setSignupRole] = useState<"athlete" | "coach">("athlete");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  useEffect(() => {
    if (!signupOpen) return;
    if (!signupEmail && email) setSignupEmail(email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signupOpen]);

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

      // Post-login routing is resolved centrally
      router.replace("/home");
    } catch (err: unknown) {
      console.error("[LoginPage] handleLogin error:", err);
      setError(
        err instanceof Error ? err.message : "Unexpected error logging in.",
      );
      setLoading(false);
    }
  }

  async function ensureAppUserRow() {
    // This endpoint should create the row in `public.users` if missing.
    try {
      await fetch("/api/me", { method: "GET" });
    } catch {
      // Non-fatal; onboarding endpoints should also defensively upsert.
    }
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setSignupError(null);
    setSignupLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
      });

      if (error) {
        setSignupError(error.message);
        setSignupLoading(false);
        return;
      }

      if (!data.user) {
        setSignupError("Sign up succeeded but no user was returned.");
        setSignupLoading(false);
        return;
      }

      // If email confirmation is enabled, Supabase will create the user but return no session.
      // In that case, do NOT route into onboarding (it requires an authenticated session).
      if (!data.session) {
        setSignupError(
          "Account created. Please check your email to verify your account, then log in to continue.",
        );
        setSignupLoading(false);
        return;
      }

      await ensureAppUserRow();

      setSignupOpen(false);
      // Send to the appropriate onboarding flow.
      router.replace(
        signupRole === "athlete" ? "/onboarding/athlete" : "/onboarding/coach",
      );
    } catch (err: unknown) {
      console.error("[LoginPage] handleSignup error:", err);
      setSignupError(err instanceof Error ? err.message : "Unexpected error creating account.");
    } finally {
      setSignupLoading(false);
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

        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-slate-50 py-2 text-sm font-semibold text-slate-950 hover:bg-white disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log In"}
        </button>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setSignupError(null);
              setSignupOpen(true);
            }}
            className="text-xs font-semibold text-slate-200 underline decoration-slate-500 underline-offset-4 hover:text-white"
          >
            Create account
          </button>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.refresh();
            }}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-200"
            title="Log out (dev helper)"
          >
            Log out
          </button>
        </div>
      </form>

      {signupOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">Create account</p>
                <p className="mt-1 text-xs text-slate-400">
                  Choose your account type, then we’ll walk you through onboarding.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSignupOpen(false)}
                className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-200 hover:border-slate-600"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSignup} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Account type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSignupRole("athlete")}
                    className={
                      "flex-1 rounded-md border px-3 py-2 text-xs font-semibold " +
                      (signupRole === "athlete"
                        ? "border-slate-500 bg-slate-900 text-white"
                        : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600")
                    }
                  >
                    Athlete
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupRole("coach")}
                    className={
                      "flex-1 rounded-md border px-3 py-2 text-xs font-semibold " +
                      (signupRole === "coach"
                        ? "border-slate-500 bg-slate-900 text-white"
                        : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600")
                    }
                  >
                    Coach
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-blue-500"
                  required
                  minLength={8}
                />
                <p className="mt-1 text-[11px] text-slate-500">Minimum 8 characters.</p>
              </div>

              {signupError ? <p className="text-xs text-red-400">{signupError}</p> : null}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={signupLoading}
                  className="flex-1 rounded bg-slate-50 py-2 text-sm font-semibold text-slate-950 hover:bg-white disabled:opacity-60"
                >
                  {signupLoading ? "Creating…" : "Create account"}
                </button>
                <button
                  type="button"
                  onClick={() => setSignupOpen(false)}
                  className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
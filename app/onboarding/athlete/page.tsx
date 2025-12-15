// app/onboarding/athlete/page.tsx
"use client";

import { FormEvent, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type SchoolResult = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  level: string;
  is_claimed: boolean;
};

type FormState = {
  firstName: string;
  lastName: string;
  gradYear: string;
  dateOfBirth: string;
  // event-related fields
  eventGroup: string;
  primaryEvent: string;
  primaryEventMark: string;

  hsSchoolName: string;      // free-typed if user overrides
  hsSchoolId: string | null; // selected from search
  hsCity: string;
  hsState: string;
  hsCountry: string;
  hsCoachName: string;
  hsCoachEmail: string;
  hsCoachPhone: string;
};

const initialFormState: FormState = {
  firstName: "",
  lastName: "",
  gradYear: "",
  dateOfBirth: "",
  eventGroup: "",
  primaryEvent: "",
  primaryEventMark: "",
  hsSchoolName: "",
  hsSchoolId: null,
  hsCity: "",
  hsState: "",
  hsCountry: "",
  hsCoachName: "",
  hsCoachEmail: "",
  hsCoachPhone: "",
};

const EVENT_GROUP_OPTIONS = [
  "",
  "Sprints",
  "Middle Distance",
  "Distance",
  "Hurdles",
  "Jumps",
  "Throws",
  "Multi-Events",
  "Relays",
  "Other",
];

export default function AthleteOnboardingPage() {
  const router = useRouter();
  const params = useParams() as { inviteToken?: string };
  const inviteToken = params?.inviteToken ? String(params.inviteToken) : null;
  const [form, setForm] = useState<FormState>(initialFormState);

  const [searchQuery, setSearchQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<SchoolResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- Search schools ---
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSchoolResults([]);
      return;
    }

    const fetchSchools = async () => {
      try {
        const res = await fetch(
          `/api/schools/search?q=${encodeURIComponent(q)}&level=hs`,
        );
        const body = await res.json().catch(() => ({}));
        if (body.schools) {
          setSchoolResults(body.schools);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("[AthleteOnboarding] school search error:", err);
      }
    };

    const t = setTimeout(fetchSchools, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  function handleForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectSchool(s: SchoolResult) {
    handleForm("hsSchoolName", s.name);
    handleForm("hsSchoolId", s.id);
    handleForm("hsCity", s.city || "");
    handleForm("hsState", s.state || "");
    handleForm("hsCountry", s.country || "");
    setSearchQuery(s.name);
    setShowDropdown(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const eventPieces = [
        form.eventGroup || null,
        form.primaryEvent || null,
        form.primaryEventMark || null,
      ].filter(Boolean) as string[];

      const eventGroupPayload =
        eventPieces.length > 0 ? eventPieces.join(" | ") : undefined;

      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        gradYear: form.gradYear,
        dateOfBirth: form.dateOfBirth,
        eventGroup: eventGroupPayload,
        hsSchoolName: form.hsSchoolName,
        hsCity: form.hsCity || undefined,
        hsState: form.hsState || undefined,
        hsCountry: form.hsCountry || undefined,
        hsCoachName: form.hsCoachName || undefined,
        hsCoachEmail: form.hsCoachEmail || undefined,
        hsCoachPhone: form.hsCoachPhone || undefined,
        inviteToken: inviteToken || undefined,
      };

      // Prefer cookie auth, but also attach a Bearer token for resilience
      // (server supports both cookie auth and Authorization header fallback).
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || null;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch("/api/onboarding/athlete", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to save profile");
      }

      setSuccessMsg("Profile saved! Redirecting…");

      setTimeout(() => {
        if (inviteToken) {
          router.push("/claim/complete");
        } else {
          router.push("/athletes/me");
        }
      }, 800);
    } catch (err: any) {
      console.error("[AthleteOnboarding] submit error:", err);
      setErrorMsg(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 relative">
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative w-full max-w-2xl">
          <div className="w-full rounded-2xl border border-slate-800 bg-slate-950/75 shadow-[0_0_0_1px_rgba(15,23,42,0.2),0_20px_80px_rgba(0,0,0,0.65)] p-6 md:p-8 text-slate-100">
        <h1 className="text-2xl md:text-3xl font-semibold mb-1 tracking-tight text-white">Athlete Onboarding</h1>
        <p className="text-sm text-slate-300 mb-6">
          Tell us about yourself, your primary event, and your high school so
          college coaches can find accurate information, even if your school
          hasn&apos;t created an account yet.
        </p>

        {errorMsg && (
          <p className="mb-3 rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {errorMsg}
          </p>
        )}
        {successMsg && (
          <p className="mb-3 rounded-md border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
            {successMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* --- Athlete Info --- */}
          <section>
            <h2 className="text-sm font-semibold mb-2 text-slate-200">Athlete Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                placeholder="First name *"
                value={form.firstName}
                onChange={(e) => handleForm("firstName", e.target.value)}
              />
              <input
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                placeholder="Last name *"
                value={form.lastName}
                onChange={(e) => handleForm("lastName", e.target.value)}
              />
              <input
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                placeholder="Graduation year *"
                value={form.gradYear}
                onChange={(e) => handleForm("gradYear", e.target.value)}
              />
              <input
                required
                type="date"
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                value={form.dateOfBirth}
                onChange={(e) => handleForm("dateOfBirth", e.target.value)}
              />
            </div>
          </section>

          {/* --- Event & Performance --- */}
          <section>
            <h2 className="text-sm font-semibold mb-2 text-slate-200">
              Primary Event & Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Event group
                </label>
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                  value={form.eventGroup}
                  onChange={(e) => handleForm("eventGroup", e.target.value)}
                >
                  {EVENT_GROUP_OPTIONS.map((opt) => (
                    <option key={opt || "blank"} value={opt}>
                      {opt || "Select group"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Primary event
                </label>
                <input
                  className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                  placeholder="e.g. 100m, 1600m, Shot Put"
                  value={form.primaryEvent}
                  onChange={(e) => handleForm("primaryEvent", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Personal best / mark
                </label>
                <input
                  className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                  placeholder="e.g. 10.82, 4:21, 48-6"
                  value={form.primaryEventMark}
                  onChange={(e) =>
                    handleForm("primaryEventMark", e.target.value)
                  }
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              You&apos;ll be able to add more events and results later. This
              just helps us seed your profile.
            </p>
          </section>

          {/* --- HS with autocomplete --- */}
          <section className="relative">
            <h2 className="text-sm font-semibold mb-2 text-slate-200">High School</h2>

            <input
              required
              className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
              placeholder="Search your high school *"
              value={searchQuery}
              onChange={(e) => {
                const v = e.target.value;
                setSearchQuery(v);
                handleForm("hsSchoolName", v);
                handleForm("hsSchoolId", null);
                setShowDropdown(true);
              }}
            />

            {showDropdown && schoolResults.length > 0 && (
              <ul className="absolute z-20 mt-2 w-full max-h-60 overflow-auto rounded-md border border-slate-700 bg-slate-950 shadow-xl">
                {schoolResults.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => selectSchool(s)}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-900"
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-slate-400">
                      {[s.city, s.state, s.country].filter(Boolean).join(", ")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* manual city/state fields */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                placeholder="City"
                value={form.hsCity}
                onChange={(e) => handleForm("hsCity", e.target.value)}
              />
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                placeholder="State"
                value={form.hsState}
                onChange={(e) => handleForm("hsState", e.target.value)}
              />
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                placeholder="Country"
                value={form.hsCountry}
                onChange={(e) => handleForm("hsCountry", e.target.value)}
              />
            </div>
          </section>

          {/* Coach contact */}
          <section>
            <h2 className="text-sm font-semibold mb-2 text-slate-200">
              Coach Contact (optional)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                placeholder="Coach name"
                value={form.hsCoachName}
                onChange={(e) => handleForm("hsCoachName", e.target.value)}
              />
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                placeholder="Coach email"
                value={form.hsCoachEmail}
                onChange={(e) => handleForm("hsCoachEmail", e.target.value)}
              />
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                placeholder="Coach phone"
                value={form.hsCoachPhone}
                onChange={(e) => handleForm("hsCoachPhone", e.target.value)}
              />
            </div>
          </section>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              You can update this information later from your profile.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 shadow hover:border-slate-500 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save and Continue"}
            </button>
          </div>
        </form>
          </div>
        </div>
      </div>
    </div>
  );
}

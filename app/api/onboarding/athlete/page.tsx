// app/onboarding/athlete/page.tsx
"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
        eventGroup: eventGroupPayload,
        hsSchoolName: form.hsSchoolName,
        hsCity: form.hsCity || undefined,
        hsState: form.hsState || undefined,
        hsCountry: form.hsCountry || undefined,
        hsCoachName: form.hsCoachName || undefined,
        hsCoachEmail: form.hsCoachEmail || undefined,
        hsCoachPhone: form.hsCoachPhone || undefined,
      };

      const res = await fetch("/api/onboarding/athlete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to save profile");
      }

      setSuccessMsg("Profile saved! Redirecting…");
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err: any) {
      console.error("[AthleteOnboarding] submit error:", err);
      setErrorMsg(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-6 relative">
        <h1 className="text-2xl font-semibold mb-1">Athlete Onboarding</h1>
        <p className="text-sm text-gray-600 mb-4">
          Tell us about yourself, your primary event, and your high school so
          college coaches can find accurate information, even if your school
          hasn&apos;t created an account yet.
        </p>

        {errorMsg && <p className="mb-2 text-sm text-red-600">{errorMsg}</p>}
        {successMsg && (
          <p className="mb-2 text-sm text-green-600">{successMsg}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* --- Athlete Info --- */}
          <section>
            <h2 className="text-sm font-semibold mb-2">Athlete Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                required
                className="border rounded px-3 py-2 text-sm"
                placeholder="First name *"
                value={form.firstName}
                onChange={(e) => handleForm("firstName", e.target.value)}
              />
              <input
                required
                className="border rounded px-3 py-2 text-sm"
                placeholder="Last name *"
                value={form.lastName}
                onChange={(e) => handleForm("lastName", e.target.value)}
              />
              <input
                required
                className="border rounded px-3 py-2 text-sm"
                placeholder="Graduation year *"
                value={form.gradYear}
                onChange={(e) => handleForm("gradYear", e.target.value)}
              />
            </div>
          </section>

          {/* --- Event & Performance --- */}
          <section>
            <h2 className="text-sm font-semibold mb-2">
              Primary Event & Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Event group
                </label>
                <select
                  className="border rounded px-3 py-2 text-sm w-full bg-white"
                  value={form.eventGroup}
                  onChange={(e) => handleForm("eventGroup", e.target.value)}
                >
                  {EVENT_GROUP_OPTIONS.map((opt) => (
                    <option key={opt || "blank"} value={opt}>
                      {opt || "Select group (optional)"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Primary event
                </label>
                <input
                  className="border rounded px-3 py-2 text-sm w-full"
                  placeholder="e.g. 100m, 1600m, Shot Put"
                  value={form.primaryEvent}
                  onChange={(e) => handleForm("primaryEvent", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Personal best / mark
                </label>
                <input
                  className="border rounded px-3 py-2 text-sm w-full"
                  placeholder="e.g. 10.82, 4:21, 48-6"
                  value={form.primaryEventMark}
                  onChange={(e) =>
                    handleForm("primaryEventMark", e.target.value)
                  }
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              You&apos;ll be able to add more events and results later. This
              just helps us seed your profile.
            </p>
          </section>

          {/* --- HS with autocomplete --- */}
          <section className="relative">
            <h2 className="text-sm font-semibold mb-2">High School</h2>

            <input
              required
              className="border rounded px-3 py-2 text-sm w-full"
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
              <ul className="absolute z-20 bg-white border rounded mt-1 shadow max-h-60 overflow-auto w-full">
                {schoolResults.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => selectSchool(s)}
                    className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500">
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
                className="border rounded px-3 py-2 text-sm"
                placeholder="City"
                value={form.hsCity}
                onChange={(e) => handleForm("hsCity", e.target.value)}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="State"
                value={form.hsState}
                onChange={(e) => handleForm("hsState", e.target.value)}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Country"
                value={form.hsCountry}
                onChange={(e) => handleForm("hsCountry", e.target.value)}
              />
            </div>
          </section>

          {/* Coach contact */}
          <section>
            <h2 className="text-sm font-semibold mb-2">
              Coach Contact (optional)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Coach name"
                value={form.hsCoachName}
                onChange={(e) => handleForm("hsCoachName", e.target.value)}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Coach email"
                value={form.hsCoachEmail}
                onChange={(e) => handleForm("hsCoachEmail", e.target.value)}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Coach phone"
                value={form.hsCoachPhone}
                onChange={(e) => handleForm("hsCoachPhone", e.target.value)}
              />
            </div>
          </section>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              You can update this information later from your profile.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded shadow disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save and Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

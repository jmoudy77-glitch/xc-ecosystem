// app/onboarding/coach/page.tsx
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

type SchoolFormState = {
  schoolId: string | null;
  schoolName: string;
  schoolCity: string;
  schoolState: string;
  schoolCountry: string;
  schoolLevel: string;
};

type ProgramFormState = {
  name: string;
  sport: string;
  gender: string;
  level: string;
  season: string;
};

const initialSchoolState: SchoolFormState = {
  schoolId: null,
  schoolName: "",
  schoolCity: "",
  schoolState: "",
  schoolCountry: "",
  schoolLevel: "college",
};

const initialProgramState: ProgramFormState = {
  name: "",
  sport: "Track & Field",
  gender: "",
  level: "college",
  season: "",
};

export default function CoachOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const [schoolForm, setSchoolForm] =
    useState<SchoolFormState>(initialSchoolState);
  const [programForm, setProgramForm] =
    useState<ProgramFormState>(initialProgramState);

  const [searchQuery, setSearchQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<SchoolResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- School search (reuse /api/schools/search) ---
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSchoolResults([]);
      return;
    }

    const fetchSchools = async () => {
      try {
        const res = await fetch(
          `/api/schools/search?q=${encodeURIComponent(q)}&level=${encodeURIComponent(
            schoolForm.schoolLevel || "",
          )}`,
        );
        const body = await res.json().catch(() => ({}));
        if (body.schools) {
          setSchoolResults(body.schools);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("[CoachOnboarding] school search error:", err);
      }
    };

    const t = setTimeout(fetchSchools, 250);
    return () => clearTimeout(t);
  }, [searchQuery, schoolForm.schoolLevel]);

  function handleSchool<K extends keyof SchoolFormState>(
    key: K,
    value: SchoolFormState[K],
  ) {
    setSchoolForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleProgram<K extends keyof ProgramFormState>(
    key: K,
    value: ProgramFormState[K],
  ) {
    setProgramForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectSchool(s: SchoolResult) {
    setSearchQuery(s.name);
    handleSchool("schoolId", s.id);
    handleSchool("schoolName", s.name);
    handleSchool("schoolCity", s.city || "");
    handleSchool("schoolState", s.state || "");
    handleSchool("schoolCountry", s.country || "");
    handleSchool("schoolLevel", s.level || schoolForm.schoolLevel);
    setShowDropdown(false);
  }

  async function handleSchoolSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const payload = {
        schoolId: schoolForm.schoolId || undefined,
        schoolName: schoolForm.schoolName,
        schoolCity: schoolForm.schoolCity || undefined,
        schoolState: schoolForm.schoolState || undefined,
        schoolCountry: schoolForm.schoolCountry || undefined,
        schoolLevel: schoolForm.schoolLevel,
      };

      const res = await fetch("/api/onboarding/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to save school");
      }

      // Use the schoolId returned from the API to ensure consistency
      const returnedSchoolId = body.schoolId as string | undefined;
      if (returnedSchoolId) {
        handleSchool("schoolId", returnedSchoolId);
      }

      setStep(2);
    } catch (err: any) {
      console.error("[CoachOnboarding] school submit error:", err);
      setErrorMsg(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function handleProgramSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (!schoolForm.schoolId) {
        throw new Error("Missing school ID. Please complete step 1 first.");
      }

      const payload = {
        schoolId: schoolForm.schoolId,
        name: programForm.name,
        sport: programForm.sport,
        gender: programForm.gender || undefined,
        level: programForm.level || undefined,
        season: programForm.season || undefined,
      };

      const res = await fetch("/api/programs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to create program");
      }

      const programId = body.programId as string | undefined;

      if (programId) {
        // Redirect to a future program overview page
        // or to dashboard if that is not ready yet.
        router.push(`/programs/${programId}`);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("[CoachOnboarding] program submit error:", err);
      setErrorMsg(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-6 space-y-6">
        <header>
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
            Coach Onboarding
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Set up your school and first program
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            We&apos;ll connect your account to a school and create your first
            team so you can start managing athletes and recruiting.
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 border ${
                step === 1
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-slate-300"
              }`}
            >
              <span className="font-semibold mr-1">1</span> School
            </span>
            <span className="h-px w-6 bg-slate-300" />
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 border ${
                step === 2
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-slate-300"
              }`}
            >
              <span className="font-semibold mr-1">2</span> Program
            </span>
          </div>
        </header>

        {errorMsg && (
          <p className="text-sm text-red-600 border border-red-100 bg-red-50 rounded-md px-3 py-2">
            {errorMsg}
          </p>
        )}

        {step === 1 && (
          <form onSubmit={handleSchoolSubmit} className="space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-slate-900 mb-2">
                Step 1 · Find or create your school
              </h2>

              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Level
                </label>
                <select
                  className="border rounded px-3 py-2 text-sm bg-white"
                  value={schoolForm.schoolLevel}
                  onChange={(e) =>
                    handleSchool("schoolLevel", e.target.value || "college")
                  }
                >
                  <option value="college">College / University</option>
                  <option value="hs">High School</option>
                  <option value="club">Club / Other</option>
                </select>
              </div>

              <div className="relative">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  School name<span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="border rounded px-3 py-2 text-sm w-full"
                  placeholder="Search or enter your school name"
                  value={searchQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearchQuery(v);
                    handleSchool("schoolName", v);
                    handleSchool("schoolId", null);
                    setShowDropdown(true);
                  }}
                />

                {showDropdown && schoolResults.length > 0 && (
                  <ul className="absolute z-20 bg-white border rounded mt-1 shadow max-h-60 overflow-auto w-full">
                    {schoolResults.map((s) => (
                      <li
                        key={s.id}
                        onClick={() => selectSchool(s)}
                        className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer"
                      >
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-slate-500">
                          {[s.city, s.state, s.country]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="City"
                  value={schoolForm.schoolCity}
                  onChange={(e) =>
                    handleSchool("schoolCity", e.target.value)
                  }
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="State"
                  value={schoolForm.schoolState}
                  onChange={(e) =>
                    handleSchool("schoolState", e.target.value)
                  }
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Country"
                  value={schoolForm.schoolCountry}
                  onChange={(e) =>
                    handleSchool("schoolCountry", e.target.value)
                  }
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                If your school isn&apos;t listed, just finish typing the name
                and we&apos;ll create it for you.
              </p>
            </section>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                You&apos;ll connect your first team (program) in the next step.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded shadow text-sm font-medium disabled:opacity-60"
              >
                {loading ? "Saving…" : "Continue to program setup"}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleProgramSubmit} className="space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-slate-900 mb-2">
                Step 2 · Create your first program
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                This is the team you&apos;ll manage in the system (for example,
                &quot;Men&apos;s Track & Field&quot; or &quot;Women&apos;s
                Cross Country&quot;).
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Program name<span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    className="border rounded px-3 py-2 text-sm w-full"
                    placeholder="e.g. Men's Track & Field"
                    value={programForm.name}
                    onChange={(e) =>
                      handleProgram("name", e.target.value)
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Sport<span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      className="border rounded px-3 py-2 text-sm w-full"
                      placeholder="Track & Field"
                      value={programForm.sport}
                      onChange={(e) =>
                        handleProgram("sport", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Gender
                    </label>
                    <input
                      className="border rounded px-3 py-2 text-sm w-full"
                      placeholder="Men, Women, Coed"
                      value={programForm.gender}
                      onChange={(e) =>
                        handleProgram("gender", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Level
                    </label>
                    <input
                      className="border rounded px-3 py-2 text-sm w-full"
                      placeholder="NAIA, D1, D2, HS, etc."
                      value={programForm.level}
                      onChange={(e) =>
                        handleProgram("level", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Season
                  </label>
                  <input
                    className="border rounded px-3 py-2 text-sm w-full"
                    placeholder="Outdoor, Indoor, XC, etc."
                    value={programForm.season}
                    onChange={(e) =>
                      handleProgram("season", e.target.value)
                    }
                  />
                </div>
              </div>
            </section>

            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep(1)}
                className="text-xs text-slate-600 hover:underline"
              >
                ← Back to school
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
        )}
      </div>
    </div>
  );
}

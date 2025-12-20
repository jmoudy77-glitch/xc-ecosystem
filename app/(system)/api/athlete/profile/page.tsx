// app/athlete/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AthleteProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  gradYear: string | null;
  eventGroup: string | null;
  primaryEvent: string | null;
  primaryEventMark: string | null;
  hsSchoolName: string | null;
  hsCity: string | null;
  hsState: string | null;
  hsCountry: string | null;
  hsCoachName: string | null;
  hsCoachEmail: string | null;
  hsCoachPhone: string | null;
};

export default function AthleteProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/athlete/me");
        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(body.error || "Failed to load athlete profile");
        }

        if (!cancelled) {
          setProfile(body as AthleteProfile);
        }
      } catch (err: any) {
        console.error("[AthleteProfilePage] load error:", err);
        if (!cancelled) {
          setErrorMsg(err?.message || "Unexpected error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Loading athlete profile…</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md bg-white rounded-lg shadow p-6">
          <h1 className="text-lg font-semibold mb-2">Athlete Profile</h1>
          <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
          <button
            type="button"
            onClick={() => router.push("/onboarding/athlete")}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
          >
            Complete athlete onboarding
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md bg-white rounded-lg shadow p-6">
          <h1 className="text-lg font-semibold mb-2">Athlete Profile</h1>
          <p className="text-sm text-slate-600">
            No athlete profile found. You may need to complete onboarding.
          </p>
          <button
            type="button"
            onClick={() => router.push("/onboarding/athlete")}
            className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
          >
            Go to athlete onboarding
          </button>
        </div>
      </div>
    );
  }

  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  const locationParts = [
    profile.hsCity,
    profile.hsState,
    profile.hsCountry,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header / hero */}
        <header className="bg-white rounded-xl shadow p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Athlete Profile
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {fullName || "Unnamed athlete"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Grad year:{" "}
              <span className="font-medium">
                {profile.gradYear || "Not set"}
              </span>
            </p>
            {profile.hsSchoolName && (
              <p className="mt-1 text-sm text-slate-600">
                {profile.hsSchoolName}
                {locationParts.length > 0 && (
                  <span className="text-slate-500">
                    {" · "}
                    {locationParts.join(", ")}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            {profile.primaryEvent && (
              <div className="inline-flex flex-col items-start rounded-lg bg-blue-50 px-3 py-2">
                <span className="text-xs uppercase tracking-wide text-blue-700">
                  Primary Event
                </span>
                <span className="text-sm font-semibold text-blue-900">
                  {profile.primaryEvent}
                </span>
                {profile.primaryEventMark && (
                  <span className="text-xs text-blue-800">
                    PR: {profile.primaryEventMark}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Event summary */}
          <section className="md:col-span-2 bg-white rounded-xl shadow p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">
              Event & Performance Summary
            </h2>
            {profile.eventGroup || profile.primaryEvent || profile.primaryEventMark ? (
              <div className="space-y-1 text-sm text-slate-700">
                {profile.eventGroup && (
                  <p>
                    <span className="font-medium">Event group:</span>{" "}
                    {profile.eventGroup}
                  </p>
                )}
                {profile.primaryEvent && (
                  <p>
                    <span className="font-medium">Primary event:</span>{" "}
                    {profile.primaryEvent}
                  </p>
                )}
                {profile.primaryEventMark && (
                  <p>
                    <span className="font-medium">Personal best:</span>{" "}
                    {profile.primaryEventMark}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  More detailed event history and performance charts will appear
                  here as you log results.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No event information on file yet. You can add this from your
                profile editor in a future version.
              </p>
            )}
          </section>

          {/* HS coach contact */}
          <section className="bg-white rounded-xl shadow p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">
              High School Coach
            </h2>
            {profile.hsCoachName || profile.hsCoachEmail || profile.hsCoachPhone ? (
              <div className="space-y-1 text-sm text-slate-700">
                {profile.hsCoachName && (
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {profile.hsCoachName}
                  </p>
                )}
                {profile.hsCoachEmail && (
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    <a
                      href={`mailto:${profile.hsCoachEmail}`}
                      className="text-blue-600 hover:underline"
                    >
                      {profile.hsCoachEmail}
                    </a>
                  </p>
                )}
                {profile.hsCoachPhone && (
                  <p>
                    <span className="font-medium">Phone:</span>{" "}
                    {profile.hsCoachPhone}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  This information is shared with college coaches viewing your
                  profile so they can contact your high school program.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No coach contact information on file yet.
              </p>
            )}
          </section>
        </div>

        {/* Future sections */}
        <section className="bg-white rounded-xl shadow p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            Upcoming Features
          </h2>
          <p className="text-sm text-slate-600">
            In the beta, this profile will expand to include training
            history, competition results, charts, and AI-powered evaluations
            like Scout Score and Commit Probability.
          </p>
        </section>
      </div>
    </div>
  );
}

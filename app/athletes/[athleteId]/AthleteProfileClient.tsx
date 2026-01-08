// app/athletes/[athleteId]/AthleteProfileClient.tsx
"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";

type Athlete = {
  id: string;
  fullName: string;
  gradYear: number | null;
  schoolName: string | null;
  schoolLocation: string | null;
  eventGroup: string | null;
  avatarUrl: string | null;
  gender: string | null;
  scoutScore?: number | null;
};

type RoleContext = {
  isCoachView: boolean;
  isAthleteSelf: boolean;
};

type SlideOutTab = "relationship" | "insights" | "training";

type Props = {
  athlete: Athlete;
  roleContext: RoleContext;
};

export default function AthleteProfileClient({ athlete, roleContext }: Props) {
  const { isCoachView, isAthleteSelf } = roleContext;
  const [activeTab, setActiveTab] = useState<SlideOutTab | null>(null);

  const isSlideOutOpen = activeTab !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* Title strip */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
          Athlete profile
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          {athlete.gradYear && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-200">
              {athlete.gradYear} Grad
            </span>
          )}
          {athlete.eventGroup && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sky-300">
              {athlete.eventGroup}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
        {/* Main content (header + two-column body) */}
        <div className="w-full md:flex-1">
        {/* Header */}
        <header className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            {/* Left side: portrait photo block + basic info */}
            <div className="flex flex-row items-start gap-4">
              <div className="w-[96px] md:w-[115px] aspect-[1/1.85] rounded-xl bg-slate-800 overflow-hidden">
                <Avatar
                  src={athlete.avatarUrl || undefined}
                  name={athlete.fullName}
                  size="xl"
                  variant="square"
                  bordered={false}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base font-semibold text-slate-100 md:text-lg">
                    {athlete.fullName}
                  </h1>
                  {typeof athlete.scoutScore === "number" && (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      Scout Score: {Math.round(athlete.scoutScore)}
                    </span>
                  )}
                  {athlete.gradYear && (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {athlete.gradYear} Grad
                    </span>
                  )}
                  {athlete.gender && (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {athlete.gender}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 md:text-sm truncate">
                  {athlete.schoolName && (
                    <>
                      {athlete.schoolName}
                      {athlete.schoolLocation ? " • " : ""}
                    </>
                  )}
                  {athlete.schoolLocation}
                </p>
                {athlete.eventGroup && (
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-sky-300">
                    {athlete.eventGroup}
                  </p>
                )}
              </div>
            </div>

            {/* Right side: status + actions */}
            <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
              {isCoachView && (
                <>
                  {/* Placeholder coach-facing badges */}
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-900/40 px-2 py-0.5 text-[10px] text-emerald-100">
                    Evaluating
                  </span>
                  <span className="rounded-full border border-sky-500/40 bg-sky-900/40 px-2 py-0.5 text-[10px] text-sky-100">
                    Priority
                  </span>
                </>
              )}

              <div className="flex gap-2">
                {isCoachView && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab((current) =>
                          current === "relationship" ? null : "relationship"
                        )
                      }
                      className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-200 hover:border-sky-400/60 hover:text-sky-100"
                    >
                      Relationship
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab((current) =>
                          current === "insights" ? null : "insights"
                        )
                      }
                      className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-200 hover:border-emerald-400/60 hover:text-emerald-100"
                    >
                      Recruiting insight
                    </button>
                  </>
                )}

                {isAthleteSelf && (
                  <button
                    type="button"
                    className="rounded-full border border-slate-600 bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-900 hover:bg-white"
                  >
                    Edit profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Body: Two-column main grid (stacked on mobile) */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.35fr)]">
          {/* Left column: deep sections */}
          <div className="space-y-4">
            {/* Performance / PR Overview */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <header className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Performance &amp; PRs
                </h2>
                {isCoachView && (
                  <button className="text-[10px] text-sky-300 hover:underline">
                    Compare
                  </button>
                )}
              </header>
              <div className="text-[11px] text-slate-400">
                {/* TODO: PR list / chart */}
                <p>PR list / event table goes here.</p>
              </div>
            </section>

            {/* Academic Overview */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <header className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Academics
                </h2>
              </header>
              <div className="text-[11px] text-slate-400">
                {/* TODO: GPA, tests, awards */}
                <p>GPA, test scores, and academic highlights go here.</p>
              </div>
            </section>

            {/* Recruiting Overview */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <header className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Recruiting overview
                </h2>
              </header>
              <div className="text-[11px] text-slate-400">
                {/* TODO: stage, interest, notes summary */}
                <p>Pipeline stage, interest level, and summary notes go here.</p>
              </div>
            </section>

            {/* Training Snapshot */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <header className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Training snapshot
                </h2>
                {isCoachView && (
                  <button className="text-[10px] text-sky-300 hover:underline">
                    Go to training dashboard
                  </button>
                )}
              </header>
              <div className="text-[11px] text-slate-400">
                {/* TODO: today's session + week overview */}
                <p>Today&apos;s session and current block summary go here.</p>
              </div>
            </section>

            {/* Wellness / Health */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <header className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Wellness &amp; health
                </h2>
              </header>
              <div className="text-[11px] text-slate-400">
                {/* TODO: injuries, soreness, mood, etc. */}
                <p>Wellness, injury status, and self-reported notes go here.</p>
              </div>
            </section>
          </div>

          {/* Right column: summary tiles */}
          <div className="space-y-4">
            {/* Percentile Snapshot */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <header className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Percentile snapshot
                </h3>
                {isCoachView && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab((current) =>
                        current === "insights" ? null : "insights"
                      )
                    }
                    className="text-[10px] text-sky-300 hover:underline"
                  >
                    View details
                  </button>
                )}
              </header>
              <div className="space-y-1 text-[11px] text-slate-300">
                {/* TODO: actual percentile data */}
                <p>800m: 85th percentile (placeholder)</p>
                <p>1600m: 72nd percentile (placeholder)</p>
              </div>
            </section>

            {/* Academic Snapshot */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <header className="mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Academic snapshot
                </h3>
              </header>
              <div className="space-y-1 text-[11px] text-slate-300">
                <p>GPA: —</p>
                <p>Test scores: —</p>
              </div>
            </section>

            {/* Training Compliance (athlete / coach) */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <header className="mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Training summary
                </h3>
              </header>
              <div className="space-y-1 text-[11px] text-slate-300">
                <p>Recent completion and load overview (placeholder).</p>
              </div>
            </section>

            {/* Offers / Scholarship Summary (coach only) */}
            {isCoachView && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <header className="mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Offer / scholarship summary
                  </h3>
                </header>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p>Offer: none yet (placeholder).</p>
                </div>
              </section>
            )}

            {/* Communication Summary (coach only) */}
            {isCoachView && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <header className="mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Communication
                  </h3>
                </header>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p>Last contact: —</p>
                  <p>Next action: —</p>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Slide-out tools panel */}
      <aside
        className={`w-full md:shrink-0 rounded-2xl border border-slate-800 bg-slate-900/70 transition-all duration-500 ${
          isSlideOutOpen
            ? "md:w-80 px-4 py-4 opacity-100"
            : "md:w-0 border-transparent px-0 py-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Tools panel
          </p>
          {isSlideOutOpen && (
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-100"
            >
              <span>◀</span>
              <span>Hide tools</span>
            </button>
          )}
        </div>

        {isSlideOutOpen && (
          <div className="flex flex-col gap-3 text-[11px] text-slate-300">
            {/* Tab selector */}
            <div className="flex gap-2 text-[10px]">
              {isCoachView && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab("relationship")}
                    className={`flex-1 rounded-full border px-2 py-1 ${
                      activeTab === "relationship"
                        ? "border-sky-400/60 bg-sky-900/60 text-sky-100"
                        : "border-slate-700 bg-slate-950/70 text-slate-300 hover:border-sky-400/60"
                    }`}
                  >
                    Relationship
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("insights")}
                    className={`flex-1 rounded-full border px-2 py-1 ${
                      activeTab === "insights"
                        ? "border-emerald-400/60 bg-emerald-900/60 text-emerald-100"
                        : "border-slate-700 bg-slate-950/70 text-slate-300 hover:border-emerald-400/60"
                    }`}
                  >
                    Insights
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setActiveTab("training")}
                className={`flex-1 rounded-full border px-2 py-1 ${
                  activeTab === "training"
                    ? "border-amber-400/60 bg-amber-900/60 text-amber-100"
                    : "border-slate-700 bg-slate-950/70 text-slate-300 hover:border-amber-400/60"
                }`}
              >
                Training
              </button>
            </div>

            {/* Tab content */}
            <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 max-h-[60vh] overflow-y-auto">
              {activeTab === "relationship" && isCoachView && (
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Relationship
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Placeholder for internal notes, pipeline stage, interest
                    level, assigned coach, and communication log.
                  </p>
                </div>
              )}

              {activeTab === "insights" && isCoachView && (
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Recruiting insights
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Placeholder for percentile curves, fit scores, and
                    comparison tools.
                  </p>
                </div>
              )}

              {activeTab === "training" && (
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Training detail
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Placeholder for athlete-specific view of assigned training:
                    calendar-style list, today&apos;s session details, and past
                    sessions.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  </div>
  );
}

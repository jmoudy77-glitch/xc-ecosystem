"// app/programs/[programId]/athletes/components/AthleteProfileShell.tsx"
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { CoachAthlete } from "@/lib/athletes";
import {
  GLASS_SCROLLBAR,
  SurfaceCard,
  WorkspacePanel,
} from "@/components/ui/SurfaceShell";

type Props = {
  programId: string;
  athlete: CoachAthlete;
};

/**
 * AthleteProfileShell
 * -------------------
 * Structural shell only.
 * - No data fetching
 * - No side effects
 * - No business logic
 *
 * This component establishes the visual + interaction frame
 * for the coach-facing athlete profile surface. Individual
 * sections will be layered in incrementally.
 */
export default function AthleteProfileShell({ programId, athlete }: Props) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "performance" | "training" | "media" | "notes"
  >("overview");
  return (
    <WorkspacePanel className="h-full overflow-hidden rounded-2xl">
      <div className="flex h-full flex-col overflow-hidden">
        {/* Header band (module header + tabs) */}
        <div className="bg-transparent">
          {/* Header */}
          <div className="flex items-center gap-4 px-2 py-4 min-w-0 border-b border-white/8 bg-transparent">
            <div className="h-12 w-12 rounded-full bg-black/25 backdrop-blur-xl flex items-center justify-center text-sm font-semibold ring-1 ring-inset ring-white/8">
              {athlete.athlete.firstName[0]}
              {athlete.athlete.lastName[0]}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="text-lg font-semibold leading-tight truncate">
                {athlete.athlete.firstName} {athlete.athlete.lastName}
              </div>
              <div className="text-sm text-muted truncate">
                {fmtText(athlete.athlete.eventGroup, "Event group not set")} ·{" "}
                {String(athlete.athlete.gradYear)}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {athlete.athlete.isClaimed ? (
                <span className="rounded-full bg-success-soft/80 px-2 py-0.5 text-xs text-success">
                  Claimed
                </span>
              ) : (
                <span className="rounded-full bg-black/25 backdrop-blur-xl px-2 py-0.5 text-xs text-muted ring-1 ring-inset ring-white/8">
                  Unclaimed
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 bg-transparent border-b border-white/8">
            <div className="flex gap-6 text-sm">
              <Tab
                label="Overview"
                active={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
              />
              <Tab
                label="Performance"
                active={activeTab === "performance"}
                onClick={() => setActiveTab("performance")}
              />
              <Tab
                label="Training"
                active={activeTab === "training"}
                onClick={() => setActiveTab("training")}
              />
              <Tab
                label="Media"
                active={activeTab === "media"}
                onClick={() => setActiveTab("media")}
              />
              <Tab
                label="Notes"
                active={activeTab === "notes"}
                onClick={() => setActiveTab("notes")}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={"flex-1 overflow-y-auto px-2 pb-6 pt-4 " + GLASS_SCROLLBAR}>
          <div className="min-h-full">
            {activeTab === "overview" && <OverviewTab athlete={athlete} />}
            {activeTab === "performance" && (
              <PerformanceTab programId={programId} athlete={athlete} />
            )}
            {activeTab === "training" && (
                <TrainingTab programId={programId} athlete={athlete} />
            )}
            {activeTab === "media" && <MediaTab programId={programId} athlete={athlete} />}
            {activeTab === "notes" && (
              <NotesTab programId={programId} athlete={athlete} />
            )}
          </div>
        </div>
      </div>
    </WorkspacePanel>
  );
}

function OverviewTab({ athlete }: { athlete: CoachAthlete }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Left column */}
      <div className="lg:col-span-7 space-y-4">
        <Card title="Overview">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Event Group" value={athlete.athlete.eventGroup} />
            <Field label="Grad Year" value={String(athlete.athlete.gradYear)} />
            <Field label="Gender" value={athlete.athlete.gender} />
            <Field
              label="Claimed"
              value={athlete.athlete.isClaimed ? "Yes" : "No"}
            />
          </div>

          <Divider />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Relationship"
              value={athlete.relationshipType}
            />
            <Field label="Status" value={athlete.status} />
            <Field label="Level" value={athlete.level} />
            <Field label="Source" value={athlete.source} />
          </div>
        </Card>

        <Card title="High School">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="School"
              value={athlete.athlete.hsSchoolName}
            />
            <Field label="City" value={athlete.athlete.hsCity} />
            <Field label="State" value={athlete.athlete.hsState} />
            <Field
              label="Country"
              value={athlete.athlete.hsCountry}
            />
          </div>
        </Card>
      </div>

      {/* Right column */}
      <div className="lg:col-span-5 space-y-4">
        <Card title="Scores">
          {athlete.score ? (
            <div className="grid grid-cols-2 gap-3">
              <Score label="Overall" value={athlete.score.globalOverall} />
              <Score label="Academic" value={athlete.score.academicScore} />
              <Score
                label="Performance"
                value={athlete.score.performanceScore}
              />
              <Score
                label="Availability"
                value={athlete.score.availabilityScore}
              />
              <Score label="Conduct" value={athlete.score.conductScore} />
              <Score
                label="Coachable"
                value={athlete.score.coachableScore}
              />
            </div>
          ) : (
            <div className="text-sm text-muted">
              Scores not available yet.
            </div>
          )}
        </Card>

        <Card title="Quick Notes">
          <div className="text-sm text-muted">
            Notes surface will live here.
          </div>
        </Card>
      </div>
    </div>
  );
}

type PerformanceRow = {
  id: string;
  event_code: string;
  mark_seconds: number | null;
  mark_value: number | null;
  is_personal_best: boolean;
  performance_date: string | null;
  meet_name: string | null;
  location: string | null;
  performance_type: "verified_meet" | "self_reported" | "training";
  timing_method: "FAT" | "manual" | null;
};

type PerformanceResponse = {
  recent: PerformanceRow[];
  // Back-compat
  personalBests?: PerformanceRow[];
  // Explicit sets
  personalBestsAny?: PerformanceRow[];
  personalBestsVerified?: PerformanceRow[];
  eventMeta?: Record<
    string,
    {
      event_code: string;
      display_name: string;
      measurement_unit: string;
      sport?: string;
      category?: string;
      gender?: string | null;
      is_relay?: boolean;
      is_multiround?: boolean;
    }
  >;
};

type TrainingSessionRow = {
  id: string;
  source: "coach_assigned" | "self_assigned";
  scheduled_date: string | null;
  completed_at: string | null;
  workout_category: "run" | "gym" | "cross_training" | "other";
  title: string | null;
  planned_description: string | null;
  planned_distance_m: number | null;
  planned_duration_sec: number | null;
  planned_rpe: number | null;
  actual_distance_m: number | null;
  actual_duration_sec: number | null;
  actual_rpe: number | null;
  actual_description: string | null;
  practice_plan_id: string | null;
  practice_group_id: string | null;
  workout_id: string | null;
  training_event_template_id: string | null;
};

type TrainingResponse =
  | TrainingSessionRow[]
  | {
      sessions?: TrainingSessionRow[];
      data?: TrainingSessionRow[];
      trainingSessions?: TrainingSessionRow[];
      items?: TrainingSessionRow[];
    };

type AthleteMediaRow = {
  id: string;
  athlete_id: string;
  media_type: "photo" | "video";
  role: "highlight_reel" | "action_shot" | "gallery";
  url: string;
  sort_order?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

type AthleteMediaResponse =
  | AthleteMediaRow[]
  | {
      media?: AthleteMediaRow[];
      items?: AthleteMediaRow[];
      data?: AthleteMediaRow[];
    };

function PerformanceTab({
  programId,
  athlete,
}: {
  programId: string;
  athlete: CoachAthlete;
}) {
  const athleteId = athlete.athlete.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<PerformanceRow[]>([]);
  const [pbsAny, setPbsAny] = useState<PerformanceRow[]>([]);
  const [pbsVerified, setPbsVerified] = useState<PerformanceRow[]>([]);
  const [eventMeta, setEventMeta] = useState<Record<string, any>>({});

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const url = `/api/programs/${programId}/athletes/${athleteId}/performances?limit=50`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed (${res.status})`);
        }
        const json = (await res.json()) as PerformanceResponse;
        if (!alive) return;
        setRecent(json.recent ?? []);
        setPbsAny(json.personalBestsAny ?? json.personalBests ?? []);
        setPbsVerified(json.personalBestsVerified ?? []);
        setEventMeta(json.eventMeta ?? {});
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load performances");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (programId && athleteId) run();
    else {
      setLoading(false);
      setError("Missing program context");
    }

    return () => {
      alive = false;
    };
  }, [programId, athleteId]);

  const pbByEvent = useMemo(() => {
    const source = (pbsVerified?.length ? pbsVerified : pbsAny) ?? [];
    const map = new Map<string, PerformanceRow>();
    for (const r of source) map.set(r.event_code, r);
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v);
  }, [pbsAny, pbsVerified]);

  return (
    <div className="space-y-4">
      <Card title="Performance Summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Score label="Overall" value={athlete.score?.globalOverall ?? 0} />
          <Score
            label="Performance"
            value={athlete.score?.performanceScore ?? 0}
          />
          <Score
            label="Availability"
            value={athlete.score?.availabilityScore ?? 0}
          />
        </div>
      </Card>

      <Card title="Personal Bests">
        {loading ? (
          <PerfSkeleton rows={6} />
        ) : error ? (
          <div className="text-sm text-muted">{error}</div>
        ) : pbByEvent.length === 0 ? (
          <EmptyState
            title="No personal bests yet"
            subtitle="Once marks are added, bests will appear here by event."
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {pbByEvent.map((r) => (
              <SurfaceCard key={r.id}>
                <div className="relative px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted">{fmtEvent(r.event_code, eventMeta)}</div>
                      <div className="text-sm font-medium text-foreground truncate">
                        {fmtMark(r, eventMeta[r.event_code])}
                      </div>
                    </div>
                    <div className="text-xs text-muted whitespace-nowrap">
                      {fmtDate(r.performance_date)}
                    </div>
                  </div>
                  {(r.meet_name || r.location) && (
                    <div className="mt-1 text-xs text-muted truncate">
                      {fmtText(r.meet_name, "")}
                      {r.meet_name && r.location ? " · " : ""}
                      {fmtText(r.location, "")}
                    </div>
                  )}
                </div>
              </SurfaceCard>
            ))}
          </div>
        )}
      </Card>

      <Card title="Recent Marks">
        {loading ? (
          <PerfSkeleton rows={8} />
        ) : error ? (
          <div className="text-sm text-muted">{error}</div>
        ) : recent.length === 0 ? (
          <EmptyState
            title="No marks yet"
            subtitle="Add meet results or training marks to populate this list."
          />
        ) : (
          <div className="divide-y divide-white/5">
            {recent.map((r) => (
              <div key={r.id} className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-foreground font-medium truncate">
                      {fmtEvent(r.event_code, eventMeta)} · {fmtMark(r, eventMeta[r.event_code])}
                    </div>
                    <div className="text-xs text-muted truncate">
                      {fmtType(r.performance_type)}
                      {r.timing_method ? ` · ${r.timing_method}` : ""}
                      {r.meet_name ? ` · ${r.meet_name}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-muted whitespace-nowrap">
                    {fmtDate(r.performance_date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function TrainingTab({
  programId,
  athlete,
}: {
  programId: string;
  athlete: CoachAthlete;
}) {
  const athleteId = athlete.athlete.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TrainingSessionRow[]>([]);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        // Existing athlete training endpoint (read-only MVP)
        const url = `/api/programs/${programId}/training/sessions?athleteId=${athleteId}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed (${res.status})`);

        const json = (await res.json()) as TrainingResponse;
        if (!alive) return;

        const arr = Array.isArray(json)
          ? json
          : json.sessions ?? json.data ?? json.trainingSessions ?? json.items ?? [];

        setSessions(arr ?? []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load training");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (athleteId) run();
    else {
      setLoading(false);
      setError("Missing athlete context");
    }

    return () => {
      alive = false;
    };
  }, [programId, athleteId]);

  const { upcoming, recent } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const normalized = (sessions ?? []).slice().sort((a, b) => {
      const ad = a.scheduled_date ? Date.parse(a.scheduled_date) : 0;
      const bd = b.scheduled_date ? Date.parse(b.scheduled_date) : 0;
      return bd - ad;
    });

    const upcoming = normalized
      .filter((s) => {
        const d = s.scheduled_date ? new Date(s.scheduled_date) : null;
        const isFuture = d ? d >= startOfToday : false;
        return isFuture && !s.completed_at;
      })
      .sort((a, b) => {
        const ad = a.scheduled_date ? Date.parse(a.scheduled_date) : 0;
        const bd = b.scheduled_date ? Date.parse(b.scheduled_date) : 0;
        return ad - bd;
      })
      .slice(0, 10);

    const recent = normalized
      .filter((s) => !!s.completed_at || (!!s.scheduled_date && new Date(s.scheduled_date) < startOfToday))
      .slice(0, 12);

    return { upcoming, recent };
  }, [sessions]);

  const summary = useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter((s) => !!s.completed_at).length;
    const assigned = sessions.filter((s) => s.source === "coach_assigned").length;
    return { total, completed, assigned };
  }, [sessions]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="lg:col-span-7 space-y-4">
        <Card title="Upcoming">
          {loading ? (
            <PerfSkeleton rows={4} />
          ) : error ? (
            <div className="text-sm text-muted">{error}</div>
          ) : upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming sessions"
              subtitle="Scheduled sessions will appear here when assigned or planned."
            />
          ) : (
            <div className="divide-y divide-white/5">
              {upcoming.map((s) => (
                <div key={s.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {fmtText(s.title, "Training session")} · {fmtCategory(s.workout_category)}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {fmtPlanned(s)}
                        {s.practice_plan_id ? " · Practice" : ""}
                        {s.source === "coach_assigned" ? " · Coach-assigned" : ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted whitespace-nowrap">
                      {fmtDate(s.scheduled_date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent">
          {loading ? (
            <PerfSkeleton rows={6} />
          ) : error ? (
            <div className="text-sm text-muted">{error}</div>
          ) : recent.length === 0 ? (
            <EmptyState
              title="No recent sessions"
              subtitle="Completed and past-dated sessions will appear here."
            />
          ) : (
            <div className="divide-y divide-white/5">
              {recent.map((s) => (
                <div key={s.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {fmtText(s.title, "Training session")} · {fmtCategory(s.workout_category)}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {s.completed_at ? "Completed" : "Planned"}
                        {fmtActual(s) ? ` · ${fmtActual(s)}` : fmtPlanned(s) ? ` · ${fmtPlanned(s)}` : ""}
                        {s.source === "coach_assigned" ? " · Coach-assigned" : ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted whitespace-nowrap">
                      {fmtDate(s.completed_at ?? s.scheduled_date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="lg:col-span-5 space-y-4">
        <Card title="Training Summary">
          <div className="grid grid-cols-2 gap-3">
            <Score label="Sessions" value={summary.total} />
            <Score label="Completed" value={summary.completed} />
            <Score label="Coach-assigned" value={summary.assigned} />
            <Score label="Upcoming" value={upcoming.length} />
          </div>
          <div className="mt-3 text-xs text-muted">
            MVP view: read-only visibility into athlete sessions. Editing and assignments live in Training.
          </div>
        </Card>

        <Card title="Practice Assignments">
          <div className="text-sm text-muted">
            Practice-linked sessions will surface here with group context in a later step.
          </div>
        </Card>
      </div>
    </div>
  );
}
function fmtCategory(c: TrainingSessionRow["workout_category"]) {
  if (c === "cross_training") return "Cross";
  if (c === "gym") return "Gym";
  if (c === "run") return "Run";
  return "Other";
}

function fmtMeters(m: number) {
  // Show miles when it’s clearly a running distance
  const miles = m / 1609.34;
  if (miles >= 0.25) return `${miles.toFixed(miles < 10 ? 2 : 1)} mi`;
  return `${Math.round(m)} m`;
}

function fmtDuration(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}

function fmtPlanned(s: TrainingSessionRow) {
  const parts: string[] = [];
  if (s.planned_distance_m != null) parts.push(fmtMeters(s.planned_distance_m));
  if (s.planned_duration_sec != null) parts.push(fmtDuration(s.planned_duration_sec));
  if (s.planned_rpe != null) parts.push(`RPE ${s.planned_rpe}`);
  return parts.join(" · ");
}

function fmtActual(s: TrainingSessionRow) {
  const parts: string[] = [];
  if (s.actual_distance_m != null) parts.push(fmtMeters(s.actual_distance_m));
  if (s.actual_duration_sec != null) parts.push(fmtDuration(s.actual_duration_sec));
  if (s.actual_rpe != null) parts.push(`RPE ${s.actual_rpe}`);
  return parts.join(" · ");
}

function MediaTab({ programId, athlete }: { programId: string; athlete: CoachAthlete }) {
  const athleteId = athlete.athlete.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AthleteMediaRow[]>([]);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/programs/${programId}/athletes/${athleteId}/media`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed (${res.status})`);

        const json = (await res.json()) as AthleteMediaResponse;
        if (!alive) return;

        const arr = Array.isArray(json)
          ? json
          : json.media ?? json.items ?? json.data ?? [];

        const active = (arr ?? [])
          .filter((m) => m?.url && (m.is_active ?? true))
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

        setRows(active);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load media");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (athleteId) run();
    else {
      setLoading(false);
      setError("Missing athlete context");
    }

    return () => {
      alive = false;
    };
  }, [athleteId]);

  const highlightReel = rows.filter((m) => m.role === "highlight_reel");
  const actionShots = rows.filter((m) => m.role === "action_shot");
  const gallery = rows.filter((m) => m.role === "gallery");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="lg:col-span-7 space-y-4">
        <Card title="Highlight Reel">
          {loading ? (
            <PerfSkeleton rows={3} />
          ) : error ? (
            <div className="text-sm text-muted">{error}</div>
          ) : highlightReel.length === 0 ? (
            <EmptyState
              title="No highlight reel yet"
              subtitle="When a reel is added, it will appear here."
            />
          ) : (
            <div className="space-y-2">
              {highlightReel.map((m, i) => (
                <SurfaceCard key={m.id}>
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <div className="text-sm font-medium">
                      Highlight Reel {highlightReel.length > 1 ? `#${i + 1}` : ""}
                    </div>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline underline-offset-4"
                    >
                      Open
                    </a>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          )}
        </Card>

        <Card title="Action Shots">
          {loading ? (
            <PerfSkeleton rows={4} />
          ) : error ? (
            <div className="text-sm text-muted">{error}</div>
          ) : actionShots.length === 0 ? (
            <EmptyState
              title="No action shots yet"
              subtitle="Photos will appear here when added."
            />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {actionShots.slice(0, 12).map((m) => (
                <a
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl ring-1 ring-inset ring-white/8 bg-black/20"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.url}
                    alt="Action shot"
                    loading="lazy"
                    className="h-28 w-full object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card title="Gallery">
          <div className="text-sm text-muted">
            {gallery.length
              ? `${gallery.length} item${gallery.length === 1 ? "" : "s"}`
              : "No gallery items yet."}
          </div>
          <div className="mt-2 text-xs text-muted">
            MVP view: media is read-only. Uploads and verification come later.
          </div>
        </Card>
      </div>

      <div className="lg:col-span-5 space-y-4">
        <Card title="Uploads">
          <div className="text-sm text-muted">
            Uploading and verification will be enabled in a later phase.
          </div>
        </Card>

        <Card title="External Links">
          <div className="text-sm text-muted">
            External links (Hudl, YouTube, Drive) will live here.
          </div>
        </Card>
      </div>
    </div>
  );
}

type NotesApiNote = {
  id: string;
  program_id: string;
  athlete_id: string;
  body: string;
  created_by_user_id: string;
  updated_at: string;
};

type NotesApiResponse = {
  note: NotesApiNote | null;
  error?: string;
};

function NotesTab({
  programId,
  athlete,
}: {
  programId: string;
  athlete: CoachAthlete;
}) {
  const athleteId = athlete.athlete.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState<string>("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Load
  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/programs/${programId}/athletes/${athleteId}/notes`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`Failed (${res.status})`);

        const json = (await res.json()) as NotesApiResponse;
        if (!alive) return;

        const body = json?.note?.body ?? "";
        setText(body);
        setLastSavedAt(json?.note?.updated_at ?? null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load notes");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (programId && athleteId) run();
    else {
      setLoading(false);
      setError("Missing program/athlete context");
    }

    return () => {
      alive = false;
    };
  }, [programId, athleteId]);

  // Autosave (debounced)
  useEffect(() => {
    // Don’t autosave while initial load is happening
    if (loading) return;

    const handle = window.setTimeout(async () => {
      setSaving(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/programs/${programId}/athletes/${athleteId}/notes`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ body: text }),
          }
        );

        if (!res.ok) throw new Error(`Failed (${res.status})`);

        const json = (await res.json()) as NotesApiResponse;
        setLastSavedAt(json?.note?.updated_at ?? new Date().toISOString());
      } catch (e: any) {
        setError(e?.message ?? "Failed to save notes");
      } finally {
        setSaving(false);
      }
    }, 650);

    return () => window.clearTimeout(handle);
  }, [text, loading, programId, athleteId]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="lg:col-span-8 space-y-4">
        <Card title="Coach Notes">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted">
              {loading
                ? "Loading…"
                : saving
                  ? "Saving…"
                  : lastSavedAt
                    ? `Saved ${fmtDateTime(lastSavedAt)}`
                    : "Not saved yet"}
            </div>

            {error ? (
              <div className="text-xs text-danger">{error}</div>
            ) : (
              <div className="text-xs text-muted">Program-private</div>
            )}
          </div>

          <div className="mt-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Write program-private notes about this athlete…"
              className={[
                "w-full resize-none rounded-xl bg-black/20 px-3 py-2.5",
                "text-sm text-foreground placeholder:text-muted/70",
                "ring-1 ring-inset ring-white/8",
                "focus:outline-none focus:ring-2 focus:ring-brand/60",
                GLASS_SCROLLBAR,
              ].join(" ")}
            />
          </div>

          <div className="mt-2 text-xs text-muted">
            Autosaves after you pause typing.
          </div>
        </Card>
      </div>

      <div className="lg:col-span-4 space-y-4">
        <Card title="Guidance">
          <div className="text-sm text-muted">
            Notes are private to this program and used for coaching context.
            History, tagging, and sharing controls will come later.
          </div>
        </Card>

        <Card title="Pinned">
          <div className="text-sm text-muted">
            Pinning will be enabled in a later phase.
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <SurfaceCard>
      <div className="relative px-4 py-3.5">
        <div className="text-sm font-medium text-foreground pb-2 mb-3 border-b border-[var(--border)]/40">
          {title}
        </div>
        {children}
      </div>
    </SurfaceCard>
  );
}

function fmtText(
  value: string | null | undefined,
  emptyLabel: string = "Not provided",
) {
  const v = (value ?? "").toString().trim();
  return v.length ? v : emptyLabel;
}

function Field({
  label,
  value,
  emptyLabel,
}: {
  label: string;
  value: string | null | undefined;
  emptyLabel?: string;
}) {
  const display = fmtText(value, emptyLabel);
  const isEmpty = !(value ?? "").toString().trim().length;

  return (
    <div className="flex flex-col">
      <div className="text-xs text-muted">{label}</div>
      <div className={["text-sm", isEmpty ? "text-muted" : "text-foreground"].join(" ")}>
        {display}
      </div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <SurfaceCard>
      <div className="relative px-3 py-2.5">
        <div className="text-xs text-muted">{label}</div>
        <div className="text-sm font-medium text-foreground">{value}</div>
      </div>
    </SurfaceCard>
  );
}

function Divider() {
  return <div className="my-3 h-px w-full bg-subtle/35" />;
}

function MediaTile({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <SurfaceCard>
      <div className="relative px-3 py-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted">{subtitle}</div>
      </div>
    </SurfaceCard>
  );
}

function Tab({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={[
        "relative cursor-pointer px-1 py-3 transition-colors",
        active
          ? "font-medium text-foreground after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-brand"
          : "text-muted/80 hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </div>
  );
}
function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <SurfaceCard>
      <div className="px-3 py-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted">{subtitle}</div>
      </div>
    </SurfaceCard>
  );
}

function PerfSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SurfaceCard key={i}>
          <div className="h-12 w-full animate-pulse bg-white/5" />
        </SurfaceCard>
      ))}
    </div>
  );
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(d);
  }
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return dt.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(d);
  }
}

function fmtType(t: string) {
  if (t === "verified_meet") return "Verified";
  if (t === "self_reported") return "Self-reported";
  if (t === "training") return "Training";
  return t;
}

function fmtEvent(code: string, meta: Record<string, any>) {
  const m = meta?.[code];
  return (m?.display_name ?? code ?? "").toString();
}

function fmtMark(
  r: { mark_seconds: number | null; mark_value: number | null },
  meta?: { measurement_unit?: string } | null
) {
  if (r.mark_seconds !== null && r.mark_seconds !== undefined) {
    return fmtSeconds(r.mark_seconds);
  }
  if (r.mark_value !== null && r.mark_value !== undefined) {
    const unit = (meta?.measurement_unit ?? "").toString().trim();
    return unit ? `${r.mark_value} ${unit}` : String(r.mark_value);
  }
  return "—";
}

function fmtSeconds(total: number) {
  if (!isFinite(total)) return "—";
  const neg = total < 0;
  const t = Math.abs(total);
  const minutes = Math.floor(t / 60);
  const seconds = t - minutes * 60;
  const secWhole = Math.floor(seconds);
  const hundredths = Math.round((seconds - secWhole) * 100);
  const secStr = String(secWhole).padStart(2, "0");
  const hunStr = String(hundredths).padStart(2, "0");
  const base = minutes > 0 ? `${minutes}:${secStr}.${hunStr}` : `${secWhole}.${hunStr}`;
  return neg ? `-${base}` : base;
}
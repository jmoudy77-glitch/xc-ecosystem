"use client";

import { useEffect, useRef, useState, MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import RosterSandboxClient from "./RosterSandboxClient";

export type ActiveRosterRow = {
  id: string;
  athlete_id: string;
  athlete_first_name: string;
  athlete_last_name: string;
  athlete_grad_year: number | null;
  athlete_event_group: string | null;
  athlete_avatar_url: string | null;
  status: string | null;
  scholarship_amount: number | null;
  scholarship_unit: string | null;
};

type TeamToolsPanelProps = {
  programId: string;
  teamId: string;
  isManager: boolean;
};

type TabKey = "rosters" | "activeRoster";

export default function TeamToolsPanel({
  programId,
  teamId,
  isManager,
}: TeamToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("rosters");

  return (
    <div className="sticky top-6 flex flex-col gap-4">
      <div className="rounded-2xl bg-slate-900/80 p-4 ring-1 ring-slate-800">
        {/* Tabs: Rosters + Active Roster */}
        <div className="mb-3 flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab("rosters")}
            className={
              "rounded-full px-3 py-1 font-semibold transition " +
              (activeTab === "rosters"
                ? "bg-slate-800 text-slate-100"
                : "bg-slate-900 text-slate-400 ring-1 ring-slate-700 hover:text-slate-200")
            }
          >
            Rosters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("activeRoster")}
            className={
              "rounded-full px-3 py-1 font-semibold transition " +
              (activeTab === "activeRoster"
                ? "bg-slate-800 text-slate-100"
                : "bg-slate-900 text-slate-400 ring-1 ring-slate-700 hover:text-slate-200")
            }
          >
            Active Roster
          </button>
          {/* Future tabs (Training, Comms, etc.) can be added here */}
        </div>

        {/* Tab content */}
        {activeTab === "rosters" ? (
          <RostersTabContent
            programId={programId}
            teamId={teamId}
            isManager={isManager}
          />
        ) : (
          <ActiveRosterTab programId={programId} teamId={teamId} />
        )}
      </div>
    </div>
  );
}

function RostersTabContent({
  programId,
  teamId,
  isManager,
}: TeamToolsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Roster builder link */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Roster Builder
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Open the roster planning tool for this team and season.
        </p>
        <div className="mt-2">
          <Link
            href={`/programs/${programId}/teams/${teamId}/roster-planning`}
            className="inline-flex items-center justify-center rounded-full bg-sky-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
          >
            Open Roster Builder
          </Link>
        </div>
      </div>

      {/* Roster sandbox scenarios */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Sandbox Scenarios
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Manage what-if rosters for scholarships, retention, and transfers.
        </p>
        <div className="mt-3">
          <RosterSandboxClient
            programId={programId}
            teamId={teamId}
            isManager={isManager}
          />
        </div>
      </div>
    </div>
  );
}

function ActiveRosterTab({
  programId,
  teamId,
}: Pick<TeamToolsPanelProps, "programId" | "teamId">) {
  const [roster, setRoster] = useState<ActiveRosterRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelTop, setPanelTop] = useState<number>(0);

  // Local drafts for future interactive controls in the coach panel
  const [statusDraft, setStatusDraft] = useState<string>("");
  const [roleDraft, setRoleDraft] = useState<string>("");
  const [scholarshipAmountDraft, setScholarshipAmountDraft] = useState<string>("");
  const [scholarshipUnitDraft, setScholarshipUnitDraft] = useState<string>("percent");
  const [notesDraft, setNotesDraft] = useState<string>("");

  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [isPanelClosing, setIsPanelClosing] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadActiveRoster() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/programs/${programId}/teams/${teamId}/active-roster`,
          { method: "GET" }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (!isMounted) return;
          console.error("[ActiveRosterTab] failed response", body);
          setError(body.error || "Failed to load active roster");
          setRoster([]);
          return;
        }

        const body = await res.json();
        const rows: ActiveRosterRow[] = body.roster ?? [];
        if (!isMounted) return;
        setRoster(rows);
      } catch (err) {
        console.error("[ActiveRosterTab] error", err);
        if (!isMounted) return;
        setError("Failed to load active roster");
        setRoster([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadActiveRoster();

    return () => {
      isMounted = false;
    };
  }, [programId, teamId]);

  const selectedRow = selectedId
    ? roster.find((row) => row.id === selectedId) ?? null
    : null;

  // When a new athlete is selected, seed the drafts from existing data
  useEffect(() => {
    if (!selectedRow) {
      setStatusDraft("");
      setRoleDraft("");
      setScholarshipAmountDraft("");
      setScholarshipUnitDraft("percent");
      setNotesDraft("");
      return;
    }

    setStatusDraft(selectedRow.status ?? "");
    setRoleDraft(""); // will be wired to a real role field later
    setScholarshipAmountDraft(
      selectedRow.scholarship_amount != null
        ? String(selectedRow.scholarship_amount)
        : ""
    );
    setScholarshipUnitDraft(
      selectedRow.scholarship_unit
        ? selectedRow.scholarship_unit.toLowerCase()
        : "percent"
    );
    setNotesDraft(""); // will load season-specific notes in a future pass
  }, [selectedRow]);

  const handleStatusSave = async () => {
    if (!selectedRow) return;

    setStatusSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/roster/${selectedRow.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: statusDraft,
            // role: roleDraft, // enable when role is backed by the row
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[ActiveRosterTab] status update failed", body);
        setStatusMessage(body.error || "Failed to update status.");
        return;
      }

      const body = await res.json();
      const updated = body.rosterEntry;

      if (updated) {
        // Update the local roster array so the list reflects the new status
        setRoster((prev) =>
          prev.map((row) =>
            row.id === updated.id
              ? {
                  ...row,
                  status: updated.status ?? row.status,
                  scholarship_amount:
                    updated.scholarship_amount ?? row.scholarship_amount,
                  scholarship_unit:
                    updated.scholarship_unit ?? row.scholarship_unit,
                }
              : row
          )
        );
        setStatusMessage("Status updated.");
      }
    } catch (err) {
      console.error("[ActiveRosterTab] status update error", err);
      setStatusMessage("Failed to update status.");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleRowClick = (
    row: ActiveRosterRow,
    event: MouseEvent<HTMLDivElement>
  ) => {
    // Toggle behavior: click same row again to close
    if (row.id === selectedId) {
        setIsPanelClosing(true);
        // Match the CSS animation duration (0.18s)
        setTimeout(() => {
        setSelectedId(null);
        setIsPanelClosing(false);
        }, 180);
        return;
    }

    const containerRect = containerRef.current?.getBoundingClientRect();
    const rowRect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();

    const offset =
      containerRect != null ? rowRect.top - containerRect.top : rowRect.top;

    setSelectedId(row.id);
    setPanelTop(offset);
  };

  return (
    <div
      ref={containerRef}
      className="relative space-y-3 text-[11px] text-slate-400"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
        Active Roster
      </p>

      {/* Dim/blur overlay behind coach panel + rows, but below the highlighted elements */}
      {selectedRow && (
        <div className="pointer-events-none fixed inset-0 z-10 bg-slate-950/60 backdrop-blur-sm" />
      )}

      {/* Slide-out coach panel, aligned with selected row and butted to its left */}
      {selectedRow && (
        <div
          className={
            (isPanelClosing ? "coach-panel-slide-out " : "coach-panel-slide-in ") +
            "absolute right-full mr-3 w-[420px] md:w-[800px] rounded-2xl border border-amber-400/80 bg-slate-950/95 p-3 text-[11px] text-slate-50 shadow-2xl ring-2 ring-amber-400/60 z-30"
            }
          style={{ top: panelTop }}
        >
          <div className="flex flex-col gap-3">
            {/* Header + profile photo + quick links */}
            <div className="flex items-start justify-between gap-3">
              {/* Profile photo block ~2" x 3.5" ratio */}
              <div className="flex-shrink-0">
                <div className="h-56 w-32 overflow-hidden rounded-md border border-slate-700 bg-slate-900/80 flex items-center justify-center text-[10px] text-slate-500">
                  {selectedRow.athlete_avatar_url ? (
                    <Image
                      src={selectedRow.athlete_avatar_url}
                      alt={`${selectedRow.athlete_first_name} ${selectedRow.athlete_last_name}`}
                      width={160}
                      height={280}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>
                      {selectedRow.athlete_first_name.charAt(0)}
                      {selectedRow.athlete_last_name.charAt(0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Text meta + links */}
              <div className="flex flex-1 items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    {selectedRow.athlete_first_name} {selectedRow.athlete_last_name}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {selectedRow.athlete_event_group ?? "Event group not set"}
                    {selectedRow.athlete_grad_year
                      ? ` · ${selectedRow.athlete_grad_year} grad`
                      : ""}
                  </p>
                  {selectedRow.status && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      Status: {selectedRow.status}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Link
                      href={`/athletes/${selectedRow.athlete_id}`}
                      className="inline-flex items-center justify-center rounded-full bg-sky-500 px-2.5 py-1 text-[10px] font-semibold text-slate-950 shadow-sm hover:bg-sky-400"
                    >
                      Full profile
                    </Link>
                    <button
                      type="button"
                      className="inline-flex cursor-default items-center justify-center rounded-full border border-slate-600 px-2.5 py-1 text-[10px] font-medium text-slate-200"
                    >
                      Training (soon)
                    </button>
                    <button
                      type="button"
                      className="inline-flex cursor-default items-center justify-center rounded-full border border-slate-600 px-2.5 py-1 text-[10px] font-medium text-slate-200"
                    >
                      Recruiting (soon)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Grouped season controls */}
            <div className="mt-1 border-t border-slate-800 pt-2">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                Season Controls
              </p>
              <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                {/* Roster status & role controls (layout only, no API yet) */}
                <div className="flex-1 space-y-1 text-[10px] text-slate-400">
                  <p className="font-semibold text-slate-200">
                    Roster status &amp; role
                  </p>
                  <div className="mt-1 space-y-1.5">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-400">
                        Status
                      </label>
                      <select
                        className="w-full rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] text-slate-100"
                        value={statusDraft}
                        onChange={(e) => setStatusDraft(e.target.value)}
                      >
                        <option value="">Not set</option>
                        <option value="active">Active</option>
                        <option value="redshirt">Redshirt</option>
                        <option value="injured">Injured</option>
                        <option value="medical_redshirt">Medical redshirt</option>
                        <option value="practice_squad">Practice squad</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-slate-400">
                        Role (e.g. Top 7, dev squad)
                      </label>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] text-slate-100"
                        value={roleDraft}
                        onChange={(e) => setRoleDraft(e.target.value)}
                        disabled
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleStatusSave}
                      disabled={statusSaving || !selectedRow}
                      className={
                        "mt-1 inline-flex items-center justify-center rounded-full px-3 py-1 text-[10px] font-semibold " +
                        (statusSaving || !selectedRow
                          ? "cursor-not-allowed bg-slate-800 text-slate-400"
                          : "cursor-pointer bg-sky-500 text-slate-950 hover:bg-sky-400")
                      }
                    >
                      {statusSaving ? "Updating…" : "Update status"}
                    </button>
                    {statusMessage && (
                      <p className="mt-1 text-[10px] text-slate-500">
                        {statusMessage}
                      </p>
                    )}
                  </div>
                </div>

                {/* Scholarship controls (layout only) */}
                <div className="flex-1 space-y-1 text-[10px] text-slate-400">
                  <p className="font-semibold text-slate-200">Scholarship</p>
                  <div className="mt-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="mb-0.5 block text-[10px] text-slate-400">
                          Amount
                        </label>
                        <input
                          type="number"
                          className="w-full rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] text-slate-100"
                          value={scholarshipAmountDraft}
                          onChange={(e) => setScholarshipAmountDraft(e.target.value)}
                          disabled
                        />
                      </div>
                      <div className="w-28">
                        <label className="mb-0.5 block text-[10px] text-slate-400">
                          Unit
                        </label>
                        <select
                          className="w-full rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] text-slate-100"
                          value={scholarshipUnitDraft}
                          onChange={(e) => setScholarshipUnitDraft(e.target.value)}
                          disabled
                        >
                          <option value="percent">Percent</option>
                          <option value="equivalency">Equivalency</option>
                          <option value="amount">Amount</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="mt-1 inline-flex cursor-not-allowed items-center justify-center rounded-full bg-slate-800 px-3 py-1 text-[10px] font-semibold text-slate-400"
                    >
                      Save scholarship (coming soon)
                    </button>
                    <p className="text-[10px] text-slate-500">
                      Current:{' '}
                      {selectedRow.scholarship_amount != null ? (
                        <span className="font-semibold text-emerald-300">
                          {selectedRow.scholarship_amount}
                          {selectedRow.scholarship_unit
                            ? ` ${selectedRow.scholarship_unit.toLowerCase()}`
                            : ""}
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-200">
                          No scholarship assigned
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coach notes (season context) */}
            <div className="border-t border-slate-800 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                Coach Notes (Season)
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Season-specific notes for this athlete will appear here. We&apos;ll
                add the ability to save and view a notes history tied to the active
                team season.
              </p>
              <div className="mt-1">
                <textarea
                  rows={3}
                  className="w-full resize-none rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] text-slate-100"
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Notes editor coming soon..."
                  disabled
                />
              </div>
              <button
                type="button"
                disabled
                className="mt-1 inline-flex cursor-not-allowed items-center justify-center rounded-full bg-slate-800 px-3 py-1 text-[10px] font-semibold text-slate-400"
              >
                Save notes (coming soon)
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading active roster…</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : roster.length === 0 ? (
        <p>No active roster found for the current or upcoming season.</p>
      ) : (
        <div className="mt-1 space-y-2">
          {roster.map((row) => {
            const isSelected = row.id === selectedId;

            return (
              <div
                key={row.id}
                onClick={(event) => handleRowClick(row, event)}
                className={
                  "relative flex cursor-pointer items-start justify-between rounded-xl px-3 py-2 text-slate-100 transition " +
                  (isSelected
                    ? "z-20 bg-slate-900 ring-2 ring-amber-400 border border-amber-400/80"
                    : "bg-slate-900/80 ring-1 ring-slate-800 hover:bg-slate-900")
                }
              >
                <div className="flex items-start gap-2">
                    {/* Small circular avatar */}
                    <div className="mt-0.5 h-10 w-10 overflow-hidden rounded-full bg-slate-800 text-[10px] text-slate-400 flex items-center justify-center">
                        {row.athlete_avatar_url ? (
                        <Image
                            src={row.athlete_avatar_url}
                            alt={`${row.athlete_first_name} ${row.athlete_last_name}`}
                            width={28}
                            height={28}
                            className="h-full w-full object-cover"
                        />
                        ) : (
                        <span>
                            {row.athlete_first_name.charAt(0)}
                            {row.athlete_last_name.charAt(0)}
                        </span>
                        )}
                    </div>

                    {/* Name + meta */}
                    <div>
                        <div className="text-[11px] font-semibold">
                        {row.athlete_first_name} {row.athlete_last_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                        {row.athlete_event_group ?? "Event group not set"}
                        {row.athlete_grad_year ? ` · ${row.athlete_grad_year} grad` : ""}
                        </div>
                        {row.status && (
                        <div className="mt-0.5 text-[10px] text-slate-500">
                            Status: {row.status}
                        </div>
                        )}
                    </div>
                </div>
                <div className="ml-2 text-right">
                  {row.scholarship_amount != null ? (
                    <div className="text-[11px] font-semibold text-emerald-300">
                      {row.scholarship_amount}
                      {row.scholarship_unit
                        ? ` ${row.scholarship_unit.toLowerCase()}`
                        : ""}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500">
                      No scholarship
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-[10px] text-slate-500">
        Click an athlete to view their season context. Click the same athlete
        again to close the panel.
      </p>
    </div>
  );
}
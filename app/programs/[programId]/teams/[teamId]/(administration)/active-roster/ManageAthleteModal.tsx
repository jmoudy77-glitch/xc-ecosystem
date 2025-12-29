"use client";

import { useEffect, useState } from "react";

type ActiveRosterApiRow = {
  id: string;
  athlete_id: string;
  athlete_first_name: string;
  athlete_last_name: string;
  athlete_grad_year: number | null;
  athlete_avatar_url: string | null;
  status: string | null;
  scholarship_amount: number | null;
  scholarship_unit: string | null;
  scholarship_notes?: string | null;
  team_season_id?: string | null;

  // Some builds may return one or more of these; we’ll normalize.
  roster_event_group?: string | null;
  athlete_default_event_group?: string | null;
  athlete_event_group?: string | null;
};

export function ManageAthleteModal({
  selectedAthlete,
  programId,
  teamId,
  onClose,
  onUpdated,
}: {
  selectedAthlete: ActiveRosterApiRow;
  programId: string;
  teamId: string;
  onClose: () => void;
  onUpdated?: (updated: ActiveRosterApiRow) => void;
}) {
  type AdminDraft = {
    status: string | null;
    event_group: string | null;
    scholarship_amount: number | null;
    scholarship_unit: string | null;
    scholarship_notes: string | null;
    notes: string | null;
  };

  const getGroupKey = (row: ActiveRosterApiRow) =>
    row.roster_event_group ??
    row.athlete_default_event_group ??
    row.athlete_event_group ??
    "Unassigned";

  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminDraft, setAdminDraft] = useState<AdminDraft>({
    status: null,
    event_group: null,
    scholarship_amount: null,
    scholarship_unit: "percent",
    scholarship_notes: null,
    notes: null,
  });

  useEffect(() => {
    setIsEditingAdmin(false);
    setAdminSaving(false);
    setAdminError(null);

    setAdminDraft({
      status: selectedAthlete.status ?? null,
      event_group:
        selectedAthlete.roster_event_group ??
        selectedAthlete.athlete_default_event_group ??
        selectedAthlete.athlete_event_group ??
        null,
      scholarship_amount:
        typeof selectedAthlete.scholarship_amount === "number"
          ? selectedAthlete.scholarship_amount
          : null,
      scholarship_unit: selectedAthlete.scholarship_unit ?? "percent",
      scholarship_notes: null,
      notes: null,
    });
  }, [selectedAthlete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <div className="relative mx-4 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-subtle shadow-2xl text-[color:var(--text)]">
        {/* Zone 1: Identity Header (fixed) */}
        <div className="flex items-start justify-between gap-4 border-b border-subtle bg-surface-1 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="h-12 w-10 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-subtle">
              {selectedAthlete.athlete_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedAthlete.athlete_avatar_url}
                  alt={`${selectedAthlete.athlete_first_name} ${selectedAthlete.athlete_last_name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-subtle">
                  —
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">
                {selectedAthlete.athlete_first_name} {selectedAthlete.athlete_last_name}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <span className="rounded-full bg-surface-1 px-2.5 py-1 ring-1 ring-subtle">
                  Grad:{" "}
                  <span className="font-semibold text-[color:var(--text)]">
                    {selectedAthlete.athlete_grad_year ?? "—"}
                  </span>
                </span>
                <span className="rounded-full bg-surface-1 px-2.5 py-1 ring-1 ring-subtle">
                  Group:{" "}
                  <span className="font-semibold text-[color:var(--text)]">
                    {getGroupKey(selectedAthlete)}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="shrink-0 rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-[11px] font-semibold hover:bg-surface-1"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Zone 2: Profile (scrollable, read-only) */}
        <div className="flex-1 overflow-y-auto bg-surface-2 px-5 py-4">
          <div className="space-y-3">
            <section className="rounded-xl bg-surface-1 p-4 ring-1 ring-subtle">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Overview
                </h3>
                <span className="text-[10px] text-subtle">Read-only</span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Name
                  </p>
                  <p className="mt-1 text-[12px] font-semibold">
                    {selectedAthlete.athlete_first_name} {selectedAthlete.athlete_last_name}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Grad Year
                  </p>
                  <p className="mt-1 text-[12px] font-semibold">
                    {selectedAthlete.athlete_grad_year ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Event Group
                  </p>
                  <p className="mt-1 text-[12px] font-semibold">
                    {getGroupKey(selectedAthlete)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Scholarship
                  </p>
                  <p className="mt-1 text-[12px] font-semibold">
                    {selectedAthlete.scholarship_amount !== null && selectedAthlete.scholarship_unit
                      ? `${selectedAthlete.scholarship_amount}${selectedAthlete.scholarship_unit === "percent" ? "%" : ""}`
                      : "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-surface-1 p-4 ring-1 ring-subtle">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Performance Snapshot
              </h3>
              <p className="mt-2 text-[12px] text-muted">
                This section will surface PRs and recent results from the athlete performance history.
              </p>
              <div className="mt-3 rounded-lg bg-surface-2 p-3 ring-1 ring-subtle">
                <p className="text-[11px] text-subtle">
                  No performance data loaded yet.
                </p>
              </div>
            </section>

            <section className="rounded-xl bg-surface-1 p-4 ring-1 ring-subtle">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Admin Controls
                </h3>
                <button
                  type="button"
                  className="rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-[11px] font-semibold hover:bg-surface-1"
                  onClick={() => setIsEditingAdmin((v) => !v)}
                >
                  {isEditingAdmin ? "Cancel" : "Edit"}
                </button>
              </div>

              {!isEditingAdmin ? (
                <div className="mt-3 text-[12px] text-muted">
                  Use Edit to update admin fields (status, event group, scholarship, notes).
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Status
                      <input
                        value={adminDraft.status ?? ""}
                        onChange={(e) =>
                          setAdminDraft((prev) => ({
                            ...prev,
                            status: e.target.value || null,
                          }))
                        }
                        className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[12px] font-medium text-[color:var(--text)]"
                        placeholder="active / inactive"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Event Group
                      <input
                        value={adminDraft.event_group ?? ""}
                        onChange={(e) =>
                          setAdminDraft((prev) => ({
                            ...prev,
                            event_group: e.target.value || null,
                          }))
                        }
                        className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[12px] font-medium text-[color:var(--text)]"
                        placeholder="Sprints / Distance"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Scholarship Amount
                      <input
                        type="number"
                        inputMode="decimal"
                        value={adminDraft.scholarship_amount ?? ""}
                        onChange={(e) =>
                          setAdminDraft((prev) => ({
                            ...prev,
                            scholarship_amount:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          }))
                        }
                        className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[12px] font-medium text-[color:var(--text)]"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Scholarship Unit
                      <select
                        value={adminDraft.scholarship_unit ?? "percent"}
                        onChange={(e) =>
                          setAdminDraft((prev) => ({
                            ...prev,
                            scholarship_unit: e.target.value || null,
                          }))
                        }
                        className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[12px] font-medium text-[color:var(--text)]"
                      >
                        <option value="percent">Percent</option>
                        <option value="equivalency">Equivalency</option>
                        <option value="amount">Amount</option>
                      </select>
                    </label>
                  </div>

                  <label className="flex flex-col gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Scholarship Notes
                    <textarea
                      value={adminDraft.scholarship_notes ?? ""}
                      onChange={(e) =>
                        setAdminDraft((prev) => ({
                          ...prev,
                          scholarship_notes: e.target.value || null,
                        }))
                      }
                      rows={3}
                      className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[12px] font-medium text-[color:var(--text)]"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Notes
                    <textarea
                      value={adminDraft.notes ?? ""}
                      onChange={(e) =>
                        setAdminDraft((prev) => ({
                          ...prev,
                          notes: e.target.value || null,
                        }))
                      }
                      rows={4}
                      className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[12px] font-medium text-[color:var(--text)]"
                    />
                  </label>

                  {adminError && (
                    <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
                      {adminError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-subtle bg-surface-2 px-4 py-2 text-[12px] font-semibold text-muted"
                      onClick={() => setIsEditingAdmin(false)}
                      disabled={adminSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-400 px-4 py-2 text-[12px] font-semibold text-slate-950 shadow-sm hover:bg-emerald-300"
                      disabled={adminSaving}
                      onClick={async () => {
                        setAdminSaving(true);
                        setAdminError(null);

                        try {
                          const res = await fetch(
                            `/api/programs/${programId}/teams/${teamId}/seasons/${selectedAthlete.team_season_id}/roster/${selectedAthlete.id}/scholarship`,
                            {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                scholarship_amount: adminDraft.scholarship_amount,
                                scholarship_unit: adminDraft.scholarship_unit,
                                scholarship_notes: adminDraft.scholarship_notes,
                                status: adminDraft.status,
                                event_group: adminDraft.event_group,
                                notes: adminDraft.notes,
                              }),
                            }
                          );

                          const json = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            throw new Error(json.error || "Failed to update roster entry");
                          }

                          setIsEditingAdmin(false);
                          if (onUpdated) {
                            onUpdated({
                              ...selectedAthlete,
                              status: adminDraft.status,
                              scholarship_amount: adminDraft.scholarship_amount,
                              scholarship_unit: adminDraft.scholarship_unit,
                              scholarship_notes: adminDraft.scholarship_notes,
                              roster_event_group: adminDraft.event_group ?? selectedAthlete.roster_event_group,
                            });
                          }
                        } catch (err: any) {
                          setAdminError(err?.message || "Failed to update athlete");
                        } finally {
                          setAdminSaving(false);
                        }
                      }}
                    >
                      {adminSaving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

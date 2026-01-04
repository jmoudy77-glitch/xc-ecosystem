// app/programs/[programId]/recruiting/_components/RecruitingPrimarySurfaceSkeleton.tsx

"use client";

import * as React from "react";
import { RECRUITING_UI } from "./recruitingUiConstants";
import type { RecruitingEventGroupRow, RecruitingSlot, RecruitingAthleteSummary } from "./types";

type Props = {
  programId: string;
  rows: RecruitingEventGroupRow[];
};

export function RecruitingPrimarySurfaceSkeleton({ programId, rows }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Recruiting</h2>
          <p className="mt-1 text-[11px] text-muted">
            Primary surface (skeleton): event groups → slots → open slot rendering.
          </p>
        </div>
        <div className="hidden text-right text-[11px] text-muted sm:block">
          <div className="font-mono text-[10px] text-slate-300">{programId}</div>
        </div>
      </div>

      <div className="space-y-6">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          rows.map((row) => (
            <EventGroupRow key={row.eventGroupKey} row={row} />
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-subtle bg-surface p-6">
      <p className="text-xs font-semibold text-slate-100">No event groups</p>
      <p className="mt-1 text-[11px] text-muted">
        Data wiring is not yet connected. This screen is the UI skeleton only.
      </p>
    </div>
  );
}

function EventGroupRow({ row }: { row: RecruitingEventGroupRow }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-100">{row.label}</span>
          <span className="rounded-full border border-subtle px-2 py-0.5 text-[10px] text-muted">
            {row.slots.length} slots
          </span>
        </div>
        <div className="text-[10px] text-muted">
          Primary surface only (drag/drop not yet implemented)
        </div>
      </div>

      <div className="grid gap-3">
        {row.slots.map((slot) => (
          <SlotCard key={slot.slotId} slot={slot} />
        ))}
      </div>
    </section>
  );
}

function SlotCard({ slot }: { slot: RecruitingSlot }) {
  const total = slot.athleteIds.length;
  const primary = slot.primaryAthleteId ? slot.athletesById[slot.primaryAthleteId] : null;

  return (
    <div className="rounded-xl border border-subtle bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-[11px] font-semibold text-slate-100">
            Slot <span className="font-mono text-slate-300">{slot.slotId}</span>
          </div>
          <span className="rounded-full border border-subtle px-2 py-0.5 text-[10px] text-muted">
            {total}/{RECRUITING_UI.slotMaxOccupancy}
          </span>
        </div>
        <div className="text-[10px] text-muted">
          {slot.primaryAthleteId ? "PRIMARY set" : "PRIMARY empty"}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PrimaryAvatar primary={primary} totalInSlot={total} />
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-slate-100">
              {primary?.displayName ?? "Open slot"}
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              {primary ? `PRIMARY • ${primary.type}` : "Drop into empty slot → PRIMARY (locked behavior)"}
            </div>
          </div>
        </div>
        <PresenceMeter primary={primary} />
      </div>

      <div className="mt-3">
        <div className="text-[10px] text-muted">SECONDARIES</div>
        <div className="mt-1 flex flex-wrap gap-2">
          {slot.athleteIds
            .filter((id) => id !== slot.primaryAthleteId)
            .map((id) => slot.athletesById[id])
            .filter(Boolean)
            .map((a) => (
              <SecondaryPill key={a.athleteId} athlete={a} />
            ))}
          {slot.athleteIds.filter((id) => id !== slot.primaryAthleteId).length === 0 ? (
            <span className="text-[11px] text-muted">None</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PrimaryAvatar({
  primary,
  totalInSlot,
}: {
  primary: RecruitingAthleteSummary | null;
  totalInSlot: number;
}) {
  const ringClass =
    primary?.type === "returning"
      ? "ring-blue-500/80"
      : primary?.type === "recruit"
        ? "ring-yellow-400/80"
        : "ring-slate-600/60";

  return (
    <div className="relative" style={{ width: RECRUITING_UI.avatar.sizePx, height: RECRUITING_UI.avatar.sizePx }}>
      <div
        className={[
          "h-full w-full overflow-hidden rounded-full bg-slate-800 ring-2",
          ringClass,
          "flex items-center justify-center",
        ].join(" ")}
      >
        {primary?.displayName ? (
          <span className="text-[12px] font-semibold text-slate-100">
            {initials(primary.displayName)}
          </span>
        ) : (
          <span className="text-[12px] text-slate-400">+</span>
        )}
      </div>

      {primary ? (
        <div
          className="absolute flex items-center justify-center rounded-full border border-subtle bg-surface text-[10px] font-semibold text-slate-100"
          style={{
            top: RECRUITING_UI.badge.offsetTopPx,
            right: RECRUITING_UI.badge.offsetRightPx,
            width: RECRUITING_UI.badge.sizePx,
            height: RECRUITING_UI.badge.sizePx,
          }}
        >
          {Math.min(Math.max(totalInSlot, 1), RECRUITING_UI.slotMaxOccupancy)}
        </div>
      ) : null}
    </div>
  );
}

function PresenceMeter({ primary }: { primary: RecruitingAthleteSummary | null }) {
  if (!primary) {
    return (
      <div className="text-[10px] text-muted">
        Meter renders only on PRIMARY (locked behavior)
      </div>
    );
  }

  const fillPct = primary.type === "recruit" ? 0 : 58;

  return (
    <div className="flex items-center gap-2">
      <div
        className="overflow-hidden rounded-full border border-subtle bg-slate-900"
        style={{
          width: RECRUITING_UI.meter.widthPx,
          height: RECRUITING_UI.meter.heightPx,
          borderRadius: RECRUITING_UI.meter.radiusPx,
        }}
      >
        <div className="h-full bg-slate-100/70" style={{ width: `${fillPct}%` }} />
      </div>
      <span className="text-[10px] text-muted">{fillPct}%</span>
    </div>
  );
}

function SecondaryPill({ athlete }: { athlete: RecruitingAthleteSummary }) {
  const ring =
    athlete.type === "returning"
      ? "border-blue-500/40 text-blue-200"
      : "border-yellow-400/40 text-yellow-200";

  return (
    <span className={["rounded-full border px-2 py-0.5 text-[10px]", ring].join(" ")}>
      {athlete.displayName}
    </span>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

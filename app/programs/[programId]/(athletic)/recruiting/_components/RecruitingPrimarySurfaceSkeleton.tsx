// app/programs/[programId]/(athletic)/recruiting/_components/RecruitingPrimarySurfaceSkeleton.tsx

"use client";

import * as React from "react";
import { RECRUITING_UI } from "./recruitingUiConstants";
import { DRAG_TYPES, type DragAthletePayload } from "./dragTypes";
import type {
  RecruitingEventGroupRow,
  RecruitingSlot,
  RecruitingAthleteSummary,
} from "./types";
import { DraggableAthleteChip } from "./DraggableAthleteChip";
import { SlotRemoveDropZone } from "./SlotRemoveDropZone";
import {
  readOriginRegistryEntry,
  clearOriginRegistryEntry,
  unhideSurfacedCandidate,
  addToFavoritesIfMissing,
} from "@/app/lib/recruiting/portalStorage";

type ExpandedKey = { eventGroupKey: string; slotId: string } | null;

type Props = {
  programId: string;
  rows: RecruitingEventGroupRow[];

  expanded: ExpandedKey;
  onToggleExpand: (eventGroupKey: string, slotId: string) => void;

  onOpenAthlete: (athlete: RecruitingAthleteSummary) => void;
  onSetPrimary: (eventGroupKey: string, slotId: string, athleteId: string) => void;
  onRemoveAthlete: (
    eventGroupKey: string,
    slotId: string,
    athleteId: string,
    opts?: { returnToOrigin?: boolean }
  ) => void;

  getSlotHasPrimary?: (eventGroupKey: string, slotId: string) => boolean;
  getDropHandlers?: (slot: RecruitingSlot) => Pick<React.HTMLAttributes<HTMLDivElement>, "onDragOver" | "onDrop">;
};

export function RecruitingPrimarySurfaceSkeleton({
  programId,
  rows,
  expanded,
  onToggleExpand,
  onOpenAthlete,
  onSetPrimary,
  onRemoveAthlete,
  getSlotHasPrimary,
  getDropHandlers,
}: Props) {
  const isDev = process.env.NODE_ENV !== "production";
  return (
    <div className="w-full space-y-3">
      <div className="relative overflow-hidden rounded-t-2xl ring-1 ring-panel panel-muted shadow-elev-2 border-b border-subtle px-3 py-3">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-14 opacity-100"
        >
          <div className="absolute inset-0 bg-[radial-gradient(1200px_120px_at_0%_0%,color-mix(in_oklab,white_10%,transparent)_0%,transparent_65%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent,transparent,transparent)]" />
        </div>
        <div className="text-sm font-semibold truncate text-slate-100">Roster Slots</div>
      </div>

      <div className="w-full space-y-4">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          rows.map((row) => (
            <EventGroupRow
              key={row.eventGroupKey}
              programId={programId}
              row={row}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onOpenAthlete={onOpenAthlete}
              onSetPrimary={onSetPrimary}
              onRemoveAthlete={onRemoveAthlete}
              getSlotHasPrimary={getSlotHasPrimary}
              getDropHandlers={getDropHandlers}
            />
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
      <p className="mt-1 text-[11px] text-muted">Data wiring is not yet connected.</p>
    </div>
  );
}

function EventGroupRow({
  programId,
  row,
  expanded,
  onToggleExpand,
  onOpenAthlete,
  onSetPrimary,
  onRemoveAthlete,
  getSlotHasPrimary,
  getDropHandlers,
}: {
  programId: string;
  row: RecruitingEventGroupRow;
  expanded: ExpandedKey;
  onToggleExpand: (eventGroupKey: string, slotId: string) => void;
  onOpenAthlete: (athlete: RecruitingAthleteSummary) => void;
  onSetPrimary: (eventGroupKey: string, slotId: string, athleteId: string) => void;
  onRemoveAthlete: (
    eventGroupKey: string,
    slotId: string,
    athleteId: string,
    opts?: { returnToOrigin?: boolean }
  ) => void;
  getSlotHasPrimary?: (eventGroupKey: string, slotId: string) => boolean;
  getDropHandlers?: (slot: RecruitingSlot) => Pick<React.HTMLAttributes<HTMLDivElement>, "onDragOver" | "onDrop">;
}) {
  const isDev = process.env.NODE_ENV !== "production";
  const expandedSlot =
    expanded?.eventGroupKey === row.eventGroupKey
      ? row.slots.find((s) => s.slotId === expanded.slotId) ?? null
      : null;

  return (
    <section className="w-full rounded-xl border border-subtle bg-surface/30 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-100">{row.label}</span>
          {isDev ? (
            <span className="rounded-full border border-subtle px-2 py-0.5 text-[10px] text-muted">
              {row.slots.length} slots
            </span>
          ) : null}
        </div>

      </div>

      <div className="mt-3 flex w-full flex-wrap items-start justify-start gap-3">
        {row.slots.map((slot) => (
          <div key={slot.slotId} className="shrink-0">
            <SlotCard
              programId={programId}
              eventGroupKey={row.eventGroupKey}
              slot={slot}
              isExpanded={!!expandedSlot && expandedSlot.slotId === slot.slotId}
              onToggleExpand={() => onToggleExpand(row.eventGroupKey, slot.slotId)}
              onOpenAthlete={onOpenAthlete}
              onSetPrimary={onSetPrimary}
              onRemoveAthlete={onRemoveAthlete}
              getSlotHasPrimary={getSlotHasPrimary}
              getDropHandlers={getDropHandlers}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function SlotCard({
  programId,
  eventGroupKey,
  slot,
  isExpanded,
  onToggleExpand,
  onOpenAthlete,
  onSetPrimary,
  onRemoveAthlete,
  getSlotHasPrimary,
  getDropHandlers,
}: {
  programId: string;
  eventGroupKey: string;
  slot: RecruitingSlot;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenAthlete: (athlete: RecruitingAthleteSummary) => void;
  onSetPrimary: (eventGroupKey: string, slotId: string, athleteId: string) => void;
  onRemoveAthlete: (
    eventGroupKey: string,
    slotId: string,
    athleteId: string,
    opts?: { returnToOrigin?: boolean }
  ) => void;
  getSlotHasPrimary?: (eventGroupKey: string, slotId: string) => boolean;
  getDropHandlers?: (slot: RecruitingSlot) => Pick<React.HTMLAttributes<HTMLDivElement>, "onDragOver" | "onDrop">;
}) {
  const total = slot.athleteIds.length;
  const primary = slot.primaryAthleteId ? slot.athletesById[slot.primaryAthleteId] : null;
  const hasPrimary = getSlotHasPrimary ? getSlotHasPrimary(eventGroupKey, slot.slotId) : Boolean(primary);
  // LOCK: SlotCard width flexes to avatar + p-3 padding (12px each side).
  const cardWidthPx = RECRUITING_UI.avatar.sizePx + 34;

  const getEventsLabel = (a: any): string | null => {
    if (!a) return null;
    // Prefer explicit labels when present
    if (typeof a.eventsLabel === "string" && a.eventsLabel.trim()) return a.eventsLabel.trim();
    if (typeof a.eventNamesLabel === "string" && a.eventNamesLabel.trim()) return a.eventNamesLabel.trim();
    // Common arrays: events, eventNames
    const ev = Array.isArray(a.events) ? a.events : Array.isArray(a.eventNames) ? a.eventNames : null;
    if (ev && ev.length) {
      const s = ev.filter(Boolean).map((x: any) => String(x)).join(", ");
      return s.trim() ? s : null;
    }
    // Fallback: athlete may have a single event string
    if (typeof a.event === "string" && a.event.trim()) return a.event.trim();
    return null;
  };

  const onPrimaryAvatarClick = () => {
    if (!primary) return;
    if (total <= 1) {
      onOpenAthlete(primary);
      return;
    }
    onToggleExpand();
  };

  const onPrimaryAvatarDragStart = (e: React.DragEvent) => {
    if (!primary) return;
    const payload: DragAthletePayload = {
      athleteId: primary.athleteId,
      eventGroupKey,
      displayName: primary.displayName,
      gradYear: primary.gradYear ?? null,
      originList: primary.originList,
      fromSlotId: slot.slotId,
    };
    e.dataTransfer.setData(DRAG_TYPES.ATHLETE, JSON.stringify(payload));
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const onPrimaryAvatarDragEnd = (e: React.DragEvent) => {
    if (!primary) return;
    if (e.dataTransfer?.dropEffect && e.dataTransfer.dropEffect !== "none") return;
    onRemoveAthlete(eventGroupKey, slot.slotId, primary.athleteId, { returnToOrigin: true });
  };

  return (
    <div className="relative" {...(getDropHandlers ? getDropHandlers(slot) : {})}>

      <div
        className={[
          "text-left",
          "rounded-xl bg-surface p-3",
          isExpanded ? "bg-surface/90" : "bg-surface",
        ].join(" ")}
        style={{ width: cardWidthPx }}
      >
        {/* Slot header intentionally removed per locked contract */}

        <div className="mt-2 flex items-center justify-start">
          <div className="flex flex-col items-center justify-center">
            <PresenceMeter hasPrimary={hasPrimary} />
            <button
              type="button"
              className="relative z-20 mt-2 rounded-full"
              draggable={Boolean(primary)}
              onDragStart={onPrimaryAvatarDragStart}
              onDragEnd={onPrimaryAvatarDragEnd}
              onClick={onPrimaryAvatarClick}
              aria-label={primary ? `Open ${primary.displayName}` : "Primary slot"}
              title={primary ? (total <= 1 ? "Open athlete" : "Expand slot") : undefined}
            >
              <PrimaryAvatar primary={primary} totalInSlot={total} />
            </button>
            <div className="mt-2 text-center">
              <div className="whitespace-normal break-words text-sm font-medium leading-tight text-slate-100">
                {primary?.displayName ?? "Open slot"}
              </div>
              {primary ? (
                <div className="mt-0.5 whitespace-normal break-words text-xs leading-snug text-muted">
                  {getEventsLabel(primary) ?? ""}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isExpanded ? (
        <ExpandedSlotOverlay
          programId={programId}
          slot={slot}
          eventGroupKey={eventGroupKey}
          onOpenAthlete={onOpenAthlete}
          onSetPrimary={onSetPrimary}
          onRemoveAthlete={onRemoveAthlete}
        />
      ) : null}
    </div>
  );
}

function ExpandedSlotOverlay({
  programId,
  slot,
  eventGroupKey,
  onOpenAthlete,
  onSetPrimary,
  onRemoveAthlete,
}: {
  programId: string;
  slot: RecruitingSlot;
  eventGroupKey: string;
  onOpenAthlete: (athlete: RecruitingAthleteSummary) => void;
  onSetPrimary: (eventGroupKey: string, slotId: string, athleteId: string) => void;
  onRemoveAthlete: (eventGroupKey: string, slotId: string, athleteId: string) => void;
}) {
  const athletes = slot.athleteIds.map((id) => slot.athletesById[id]).filter(Boolean);
  const requiresSelection = slot.primaryAthleteId === null && slot.athleteIds.length >= 2;

  return (
    <div
      className={[
        "absolute z-50",
        "left-1/2 -translate-x-1/2 bottom-full mb-3",
        "w-[min(92vw,720px)]",
        "rounded-xl border border-subtle bg-slate-950/80 backdrop-blur",
        "shadow-xl",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-subtle px-3 py-2">
        <div className="text-xs font-semibold text-slate-100">
          Slot <span className="font-mono text-slate-300">{slot.slotId}</span> • Expanded
        </div>
        <div className="text-[10px] text-muted">
          Left-click athlete for modal · Right-click athlete to set PRIMARY
        </div>
      </div>

      {requiresSelection ? (
        <div className="mt-3 rounded-lg border border-dashed border-yellow-400/40 bg-yellow-400/5 px-2 py-1 text-[10px] text-yellow-200">
          PRIMARY required — choose one (locked behavior).
        </div>
      ) : null}

      <div className="mt-3 flex gap-4 overflow-x-auto px-3 pb-3">
        {athletes.length === 0 ? (
          <div className="text-[11px] text-muted">No athletes in slot.</div>
        ) : (
          athletes.map((a) => {
            const isPrimary = slot.primaryAthleteId === a.athleteId;
            return (
              <div key={a.athleteId} className="shrink-0">
                <DraggableAthleteChip
                  athlete={a}
                  eventGroupKey={eventGroupKey}
                  isPrimary={isPrimary}
                  onOpen={() => onOpenAthlete(a)}
                  onSetPrimary={() => onSetPrimary(eventGroupKey, slot.slotId, a.athleteId)}
                />
              </div>
            );
          })
        )}
      </div>

      <div className="px-3 pb-3">
        <SlotRemoveDropZone
          slot={slot}
          disabled={slot.athleteIds.some((id) => slot.athletesById[id]?.type === "returning")}
          disabledReason="Returning athletes cannot be removed via Recruiting"
          onRemoveAthlete={(athleteId) => {
            // Perform origin-aware restoration (Discovery Portal lists) before M1 removes.
            const entry = readOriginRegistryEntry(programId, athleteId);
            if (entry) {
              if (entry.originKey === "favorites") {
                addToFavoritesIfMissing(programId, entry.candidate);
              } else {
                unhideSurfacedCandidate(programId, athleteId);
              }
              clearOriginRegistryEntry(programId, athleteId);
            } else {
              // Safe default: if we don't know origin, unhide surfaced.
              unhideSurfacedCandidate(programId, athleteId);
            }

            onRemoveAthlete(eventGroupKey, slot.slotId, athleteId);
          }}
        />
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
        ? "ring-green-500/80"
        : "ring-slate-600/60";

  return (
    <div className="relative" style={{ width: RECRUITING_UI.avatar.sizePx, height: RECRUITING_UI.avatar.sizePx }}>
      <div
        className={[
          "h-full w-full overflow-hidden rounded-full bg-slate-800 ring-2",
          ringClass,
          "flex items-center justify-center",
        ].join(" ")}
        aria-label="Primary athlete avatar"
      >
        {primary?.displayName ? (
          <span className="text-[12px] font-semibold text-slate-100">{initials(primary.displayName)}</span>
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
          aria-label="Slot athlete count"
          title="Total athletes in slot (informational)"
        >
          {Math.min(Math.max(totalInSlot, 1), RECRUITING_UI.slotMaxOccupancy)}
        </div>
      ) : null}
    </div>
  );
}

function PresenceMeter({ hasPrimary }: { hasPrimary: boolean }) {
  // LOCK: meter is always present but dormant when there is no primary; no instructional copy.
  if (!hasPrimary) return <div className="h-1.5 w-16 rounded-full bg-slate-200/5" />;

  const fillPct = 58;

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200/10" aria-label="Slot presence meter">
        <div className="h-full bg-slate-100/70" style={{ width: `${fillPct}%` }} />
      </div>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

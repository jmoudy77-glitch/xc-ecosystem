// app/programs/[programId]/(athletic)/recruiting/_components/RecruitingPrimarySurfaceSkeleton.tsx

"use client";

import * as React from "react";
import { RECRUITING_UI } from "./recruitingUiConstants";
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
} from "@/app/lib/recruiting/discoveryStorage";

type ExpandedKey = { eventGroupKey: string; slotId: string } | null;

type Props = {
  programId: string;
  rows: RecruitingEventGroupRow[];

  expanded: ExpandedKey;
  onToggleExpand: (eventGroupKey: string, slotId: string) => void;

  onOpenAthlete: (athlete: RecruitingAthleteSummary) => void;
  onSetPrimary: (eventGroupKey: string, slotId: string, athleteId: string) => void;
  onRemoveAthlete: (eventGroupKey: string, slotId: string, athleteId: string) => void;

  renderDropZone?: (slot: RecruitingSlot) => React.ReactNode;
};

export function RecruitingPrimarySurfaceSkeleton({
  programId,
  rows,
  expanded,
  onToggleExpand,
  onOpenAthlete,
  onSetPrimary,
  onRemoveAthlete,
  renderDropZone,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Recruiting</h2>
          <p className="mt-1 text-[11px] text-muted">
            Primary surface: click slot to expand. Left-click athlete for modal. Right-click athlete to set PRIMARY.
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
            <EventGroupRow
              key={row.eventGroupKey}
              programId={programId}
              row={row}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onOpenAthlete={onOpenAthlete}
              onSetPrimary={onSetPrimary}
              onRemoveAthlete={onRemoveAthlete}
              renderDropZone={renderDropZone}
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
  renderDropZone,
}: {
  programId: string;
  row: RecruitingEventGroupRow;
  expanded: ExpandedKey;
  onToggleExpand: (eventGroupKey: string, slotId: string) => void;
  onOpenAthlete: (athlete: RecruitingAthleteSummary) => void;
  onSetPrimary: (eventGroupKey: string, slotId: string, athleteId: string) => void;
  onRemoveAthlete: (eventGroupKey: string, slotId: string, athleteId: string) => void;
  renderDropZone?: (slot: RecruitingSlot) => React.ReactNode;
}) {
  const expandedSlot =
    expanded?.eventGroupKey === row.eventGroupKey
      ? row.slots.find((s) => s.slotId === expanded.slotId) ?? null
      : null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-100">{row.label}</span>
          <span className="rounded-full border border-subtle px-2 py-0.5 text-[10px] text-muted">
            {row.slots.length} slots
          </span>
        </div>

        <div className="text-[10px] text-muted">Expansion is horizontal; other rows do not reflow.</div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="grid gap-3">
          {row.slots.map((slot) => (
            <SlotCard
              key={slot.slotId}
              slot={slot}
              isExpanded={!!expandedSlot && expandedSlot.slotId === slot.slotId}
              onToggleExpand={() => onToggleExpand(row.eventGroupKey, slot.slotId)}
              renderDropZone={renderDropZone}
            />
          ))}
        </div>

        <div className="hidden lg:block">
          {expandedSlot ? (
            <ExpandedSlotPanel
              programId={programId}
              row={row}
              slot={expandedSlot}
              onOpenAthlete={onOpenAthlete}
              onSetPrimary={onSetPrimary}
              onRemoveAthlete={onRemoveAthlete}
            />
          ) : (
            <div className="rounded-xl border border-subtle bg-surface p-4">
              <div className="text-xs font-semibold text-slate-100">Slot details</div>
              <div className="mt-1 text-[11px] text-muted">Click a slot to expand (no hover semantics).</div>
            </div>
          )}
        </div>
      </div>

      {expandedSlot ? (
        <div className="lg:hidden">
          <ExpandedSlotPanel
            programId={programId}
            row={row}
            slot={expandedSlot}
            onOpenAthlete={onOpenAthlete}
            onSetPrimary={onSetPrimary}
            onRemoveAthlete={onRemoveAthlete}
          />
        </div>
      ) : null}
    </section>
  );
}

function SlotCard({
  slot,
  isExpanded,
  onToggleExpand,
  renderDropZone,
}: {
  slot: RecruitingSlot;
  isExpanded: boolean;
  onToggleExpand: () => void;
  renderDropZone?: (slot: RecruitingSlot) => React.ReactNode;
}) {
  const total = slot.athleteIds.length;
  const primary = slot.primaryAthleteId ? slot.athletesById[slot.primaryAthleteId] : null;

  return (
    <div className="relative">
      {renderDropZone ? <div className="absolute inset-0 z-10">{renderDropZone(slot)}</div> : null}

      <button
        type="button"
        onClick={onToggleExpand}
        className={[
          "w-full text-left",
          "rounded-xl border bg-surface p-4 transition",
          isExpanded ? "border-slate-200/30" : "border-subtle hover:border-slate-200/20",
        ].join(" ")}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-semibold text-slate-100">
              Slot <span className="font-mono text-slate-300">{slot.slotId}</span>
            </div>
            <span className="rounded-full border border-subtle px-2 py-0.5 text-[10px] text-muted">
              {total}/{RECRUITING_UI.slotMaxOccupancy}
            </span>
          </div>

          <div className="text-[10px] text-muted">{slot.primaryAthleteId ? "PRIMARY set" : "PRIMARY empty"}</div>
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
      </button>
    </div>
  );
}

function ExpandedSlotPanel({
  programId,
  row,
  slot,
  onOpenAthlete,
  onSetPrimary,
  onRemoveAthlete,
}: {
  programId: string;
  row: RecruitingEventGroupRow;
  slot: RecruitingSlot;
  onOpenAthlete: (athlete: RecruitingAthleteSummary) => void;
  onSetPrimary: (eventGroupKey: string, slotId: string, athleteId: string) => void;
  onRemoveAthlete: (eventGroupKey: string, slotId: string, athleteId: string) => void;
}) {
  const athletes = slot.athleteIds.map((id) => slot.athletesById[id]).filter(Boolean);
  const requiresSelection = slot.primaryAthleteId === null && slot.athleteIds.length >= 2;

  return (
    <div className="rounded-xl border border-subtle bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-100">
            {row.label} • Slot <span className="font-mono text-slate-300">{slot.slotId}</span>
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Left-click athlete for modal. Right-click athlete to set PRIMARY.
          </div>
        </div>

        <div className="rounded-full border border-subtle px-2 py-0.5 text-[10px] text-muted">
          {slot.athleteIds.length}/{RECRUITING_UI.slotMaxOccupancy}
        </div>
      </div>

      {requiresSelection ? (
        <div className="mt-3 rounded-lg border border-dashed border-yellow-400/40 bg-yellow-400/5 px-2 py-1 text-[10px] text-yellow-200">
          PRIMARY required — choose one (locked behavior).
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {athletes.length === 0 ? (
          <div className="text-[11px] text-muted">No athletes in slot.</div>
        ) : (
          athletes.map((a) => {
            const isPrimary = slot.primaryAthleteId === a.athleteId;
            return (
              <DraggableAthleteChip
                key={a.athleteId}
                athlete={a}
                eventGroupKey={row.eventGroupKey}
                isPrimary={isPrimary}
                onOpen={() => onOpenAthlete(a)}
                onSetPrimary={() => onSetPrimary(row.eventGroupKey, slot.slotId, a.athleteId)}
              />
            );
          })
        )}
      </div>

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

          onRemoveAthlete(row.eventGroupKey, slot.slotId, athleteId);
        }}
      />
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

function PresenceMeter({ primary }: { primary: RecruitingAthleteSummary | null }) {
  if (!primary) {
    return <div className="text-[10px] text-muted">Meter renders only on PRIMARY (locked behavior)</div>;
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
        aria-label="Slot presence meter"
        title="Historical contribution to event group (athlete-based)."
      >
        <div className="h-full bg-slate-100/70" style={{ width: `${fillPct}%` }} />
      </div>
      <span className="text-[10px] text-muted">{fillPct}%</span>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

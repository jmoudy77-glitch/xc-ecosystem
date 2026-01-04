// app/programs/[programId]/(athletic)/recruiting/_components/useRecruitingSlots.ts

"use client";

import * as React from "react";
import { RECRUITING_UI } from "./recruitingUiConstants";
import type {
  RecruitingEventGroupRow,
  RecruitingSlot,
  RecruitingAthleteSummary,
} from "./types";

type Action =
  | { type: "DROP_IN_SLOT"; eventGroupKey: string; slotId: string; athleteId: string }
  | { type: "SET_PRIMARY"; eventGroupKey: string; slotId: string; athleteId: string }
  | { type: "REMOVE_ATHLETE"; eventGroupKey: string; slotId: string; athleteId: string };

type State = {
  rows: RecruitingEventGroupRow[];
};

export function useRecruitingSlots(initialRows: RecruitingEventGroupRow[]) {
  const [state, dispatch] = React.useReducer(reducer, { rows: initialRows });

  return { rows: state.rows, dispatch } as const;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "DROP_IN_SLOT": {
      const { eventGroupKey, slotId, athleteId } = action;
      return {
        rows: state.rows.map((row) => {
          if (row.eventGroupKey !== eventGroupKey) return row;

          // Recruits: may exist in only one slot at a time.
          // Returning athletes: allowed to exist in this slot; uniqueness not enforced across rows in this mock.
          const nextSlots = row.slots.map((slot) => {
            // If athlete already in this slot, no-op
            if (slot.athleteIds.includes(athleteId)) return slot;

            // Enforce cap
            if (slot.slotId === slotId && slot.athleteIds.length >= RECRUITING_UI.slotMaxOccupancy) return slot;

            // Remove from any other slot in this event group (recruit uniqueness primitive).
            if (slot.slotId !== slotId) {
              if (!slot.athleteIds.includes(athleteId)) return slot;
              return removeFromSlotDeterministic(slot, athleteId);
            }

            // Add to target slot:
            // - empty slot -> becomes PRIMARY
            // - filled slot -> added as SECONDARY (PRIMARY unchanged)
            const next = addToSlot(slot, athleteId);
            return next;
          });

          return { ...row, slots: nextSlots };
        }),
      };
    }

    case "SET_PRIMARY": {
      const { eventGroupKey, slotId, athleteId } = action;
      return {
        rows: state.rows.map((row) => {
          if (row.eventGroupKey !== eventGroupKey) return row;
          return {
            ...row,
            slots: row.slots.map((slot) => {
              if (slot.slotId !== slotId) return slot;
              if (!slot.athleteIds.includes(athleteId)) return slot;
              return { ...slot, primaryAthleteId: athleteId };
            }),
          };
        }),
      };
    }

    case "REMOVE_ATHLETE": {
      const { eventGroupKey, slotId, athleteId } = action;

      return {
        rows: state.rows.map((row) => {
          if (row.eventGroupKey !== eventGroupKey) return row;
          return {
            ...row,
            slots: row.slots.map((slot) => {
              if (slot.slotId !== slotId) return slot;
              if (!slot.athleteIds.includes(athleteId)) return slot;

              // Constitutionally locked: Returning athletes cannot be removed via Recruiting.
              const athlete = slot.athletesById[athleteId];
              if (athlete?.type === "returning") return slot;

              return removeFromSlotDeterministic(slot, athleteId);
            }),
          };
        }),
      };
    }

    default:
      return state;
  }
}

function addToSlot(slot: RecruitingSlot, athleteId: string): RecruitingSlot {
  const nextIds = [...slot.athleteIds, athleteId];

  // If empty, promote to PRIMARY (locked behavior)
  if (slot.athleteIds.length === 0) {
    return { ...slot, athleteIds: nextIds, primaryAthleteId: athleteId };
  }

  return { ...slot, athleteIds: nextIds };
}

/**
 * Deterministic removal semantics:
 * - If removed athlete is PRIMARY:
 *   - If exactly 1 secondary remains -> auto-promote to PRIMARY
 *   - If 2-3 secondaries remain -> PRIMARY becomes null (required selection)
 * - If removed athlete is SECONDARY -> PRIMARY unchanged
 */
function removeFromSlotDeterministic(slot: RecruitingSlot, athleteId: string): RecruitingSlot {
  const wasPrimary = slot.primaryAthleteId === athleteId;
  const nextIds = slot.athleteIds.filter((id) => id !== athleteId);

  if (!wasPrimary) {
    return { ...slot, athleteIds: nextIds };
  }

  const remaining = nextIds.length;

  if (remaining === 0) {
    return { ...slot, athleteIds: nextIds, primaryAthleteId: null };
  }

  if (remaining === 1) {
    return { ...slot, athleteIds: nextIds, primaryAthleteId: nextIds[0] };
  }

  // remaining is 2-3
  return { ...slot, athleteIds: nextIds, primaryAthleteId: null };
}

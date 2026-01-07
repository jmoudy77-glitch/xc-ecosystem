// app/programs/[programId]/(athletic)/recruiting/_components/useRecruitingSlots.ts

"use client";

import * as React from "react";
import { RECRUITING_UI } from "./recruitingUiConstants";
import type {
  RecruitingEventGroupRow,
  RecruitingSlot,
  RecruitingAthleteSummary,
} from "./types";

type SlotAction =
  | { type: "DROP_IN_SLOT"; eventGroupKey: string; slotId: string; athleteId: string }
  | { type: "SET_PRIMARY"; eventGroupKey: string; slotId: string; athleteId: string }
  | { type: "REMOVE_ATHLETE"; eventGroupKey: string; slotId: string; athleteId: string };

type InternalAction =
  | { type: "CLEAR_EVENTS" }
  | { type: "HYDRATE_ROWS"; rows: RecruitingEventGroupRow[] };

type Action = SlotAction | InternalAction;

type RecruitReturnEvent = {
  type: "RECRUIT_RETURN_TO_ORIGIN";
  athleteId: string;
  originList: "favorites" | "surfaced";
};

type State = {
  rows: RecruitingEventGroupRow[];
  pendingEvents: RecruitReturnEvent[];
};

type Options = {
  onRecruitReturn?: (event: RecruitReturnEvent) => void;
};

export function useRecruitingSlots(initialRows: RecruitingEventGroupRow[], options?: Options) {
  const [state, dispatch] = React.useReducer(reducer, {
    rows: initialRows,
    pendingEvents: [],
  });

  React.useEffect(() => {
    if (!options?.onRecruitReturn) return;
    if (state.pendingEvents.length === 0) return;

    for (const ev of state.pendingEvents) options.onRecruitReturn(ev);

    dispatch({ type: "CLEAR_EVENTS" });
  }, [options, state.pendingEvents]);

  return { rows: state.rows, dispatch } as const;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "CLEAR_EVENTS":
      return state.pendingEvents.length === 0 ? state : { ...state, pendingEvents: [] };

    case "HYDRATE_ROWS":
      return { ...state, rows: action.rows, pendingEvents: [] };

    case "DROP_IN_SLOT": {
      const { eventGroupKey, slotId, athleteId } = action;

      return {
        ...state,
        rows: state.rows.map((row) => {
          if (row.eventGroupKey !== eventGroupKey) return row;

          const nextSlots = row.slots.map((slot) => {
            if (slot.athleteIds.includes(athleteId)) return slot;

            if (slot.slotId === slotId && slot.athleteIds.length >= RECRUITING_UI.slotMaxOccupancy) return slot;

            // Remove from any other slot in this event group (recruit uniqueness primitive).
            if (slot.slotId !== slotId) {
              if (!slot.athleteIds.includes(athleteId)) return slot;
              return removeFromSlotDeterministic(slot, athleteId).nextSlot;
            }

            // Add to target slot:
            // - empty slot -> becomes PRIMARY
            // - filled slot -> added as SECONDARY (PRIMARY unchanged)
            return addToSlot(slot, athleteId);
          });

          return { ...row, slots: nextSlots };
        }),
      };
    }

    case "SET_PRIMARY": {
      const { eventGroupKey, slotId, athleteId } = action;

      return {
        ...state,
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

      let emitted: RecruitReturnEvent | null = null;

      const nextRows = state.rows.map((row) => {
        if (row.eventGroupKey !== eventGroupKey) return row;

        const nextSlots = row.slots.map((slot) => {
          if (slot.slotId !== slotId) return slot;
          if (!slot.athleteIds.includes(athleteId)) return slot;

          // Constitutionally locked: Returning athletes cannot be removed via Recruiting.
          const athlete = slot.athletesById[athleteId];
          if (athlete?.type === "returning") return slot;

          const res = removeFromSlotDeterministic(slot, athleteId);

          // If a recruit was removed AND now exists in no slot in this event group,
          // emit event to restore to their origin list (favorites | surfaced).
          if (athlete?.type === "recruit") {
            const stillPlacedInGroup = row.slots.some((s) =>
              s.slotId === slot.slotId ? res.nextSlot.athleteIds.includes(athleteId) : s.athleteIds.includes(athleteId)
            );

            if (!stillPlacedInGroup) {
              emitted = {
                type: "RECRUIT_RETURN_TO_ORIGIN",
                athleteId,
                originList: athlete.originList ?? "favorites",
              };
            }
          }

          return res.nextSlot;
        });

        return { ...row, slots: nextSlots };
      });

      return {
        ...state,
        rows: nextRows,
        pendingEvents: emitted ? [...state.pendingEvents, emitted] : state.pendingEvents,
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
function removeFromSlotDeterministic(
  slot: RecruitingSlot,
  athleteId: string
): { nextSlot: RecruitingSlot } {
  const wasPrimary = slot.primaryAthleteId === athleteId;
  const nextIds = slot.athleteIds.filter((id) => id !== athleteId);

  if (!wasPrimary) {
    return { nextSlot: { ...slot, athleteIds: nextIds } };
  }

  const remaining = nextIds.length;

  if (remaining === 0) {
    return { nextSlot: { ...slot, athleteIds: nextIds, primaryAthleteId: null } };
  }

  if (remaining === 1) {
    return { nextSlot: { ...slot, athleteIds: nextIds, primaryAthleteId: nextIds[0] } };
  }

  // remaining is 2-3
  return { nextSlot: { ...slot, athleteIds: nextIds, primaryAthleteId: null } };
}

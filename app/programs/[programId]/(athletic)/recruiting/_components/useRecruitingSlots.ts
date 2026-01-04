// app/programs/[programId]/(athletic)/recruiting/_components/useRecruitingSlots.ts
"use client";

import * as React from "react";
import { RECRUITING_UI } from "./recruitingUiConstants";
import type { RecruitingEventGroupRow } from "./types";

type State = RecruitingEventGroupRow[];

type Action =
  | { type: "DROP_IN_SLOT"; eventGroupKey: string; slotId: string; athleteId: string }
  | { type: "REMOVE_ATHLETE"; eventGroupKey: string; slotId: string; athleteId: string }
  | { type: "SET_PRIMARY"; eventGroupKey: string; slotId: string; athleteId: string };

export function useRecruitingSlots(initial: State) {
  const [rows, dispatch] = React.useReducer(reducer, initial);
  return { rows, dispatch };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "DROP_IN_SLOT": {
      return state.map((row) => {
        if (row.eventGroupKey !== action.eventGroupKey) return row;

        return {
          ...row,
          slots: row.slots.map((slot) => {
            if (slot.slotId !== action.slotId) return slot;

            // cap enforcement
            if (slot.athleteIds.length >= RECRUITING_UI.slotMaxOccupancy) return slot;

            // uniqueness within slot
            if (slot.athleteIds.includes(action.athleteId)) return slot;

            const athleteIds = [...slot.athleteIds, action.athleteId];

            // deterministic: empty slot -> dropped athlete becomes PRIMARY
            // deterministic: filled slot -> dropped athlete becomes SECONDARY (no primary change)
            const primaryAthleteId = slot.primaryAthleteId ?? action.athleteId;

            return { ...slot, athleteIds, primaryAthleteId };
          }),
        };
      });
    }

    case "REMOVE_ATHLETE": {
      return state.map((row) => {
        if (row.eventGroupKey !== action.eventGroupKey) return row;

        return {
          ...row,
          slots: row.slots.map((slot) => {
            if (slot.slotId !== action.slotId) return slot;

            if (!slot.athleteIds.includes(action.athleteId)) return slot;

            const athleteIds = slot.athleteIds.filter((id) => id !== action.athleteId);
            let primaryAthleteId = slot.primaryAthleteId;

            // deterministic primary removal behavior (selection-state UI will be added later):
            // - if exactly 1 secondary remains -> auto-promote to PRIMARY
            // - if 2-3 secondaries remain -> PRIMARY becomes null (requires selection)
            if (slot.primaryAthleteId === action.athleteId) {
              if (athleteIds.length === 1) primaryAthleteId = athleteIds[0];
              else primaryAthleteId = null;
            }

            return { ...slot, athleteIds, primaryAthleteId };
          }),
        };
      });
    }

    case "SET_PRIMARY": {
      return state.map((row) => {
        if (row.eventGroupKey !== action.eventGroupKey) return row;

        return {
          ...row,
          slots: row.slots.map((slot) => {
            if (slot.slotId !== action.slotId) return slot;
            if (!slot.athleteIds.includes(action.athleteId)) return slot;

            return { ...slot, primaryAthleteId: action.athleteId };
          }),
        };
      });
    }

    default:
      return state;
  }
}

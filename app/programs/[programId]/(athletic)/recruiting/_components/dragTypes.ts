// app/programs/[programId]/(athletic)/recruiting/_components/dragTypes.ts

export const DRAG_TYPES = {
  ATHLETE: "recruiting-athlete",
} as const;

export type DragAthletePayload = {
  athleteId: string;
  eventGroupKey: string;
};

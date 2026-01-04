// app/programs/[programId]/recruiting/_components/types.ts

export type RecruitingAthleteType = "returning" | "recruit";

export type RecruitingAthleteSummary = {
  athleteId: string;
  displayName: string;
  avatarUrl?: string | null;
  type: RecruitingAthleteType;
  // When a recruit is removed from all slots, they must return to their origin list.
  // Optional until recruit discovery portal is implemented.
  originList?: "favorites" | "surfaced";
};

export type RecruitingSlot = {
  slotId: string;
  eventGroupKey: string;
  primaryAthleteId: string | null;
  athleteIds: string[];
  athletesById: Record<string, RecruitingAthleteSummary>;
};

export type RecruitingEventGroupRow = {
  eventGroupKey: string;
  label: string;
  slots: RecruitingSlot[];
};

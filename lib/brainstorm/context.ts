// lib/brainstorm/context.ts

import type { BrainstormContext } from "./types";

export function normalizeBrainstormContext(input: any): BrainstormContext {
  const programId = input.programId ?? input.program_id;
  if (!programId) {
    throw new Error("normalizeBrainstormContext: programId is required");
  }

  // Explicit scopeType provided (preferred path)
  if (input.scopeType) {
    return {
      programId,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      teamId: input.teamId,
      athleteId: input.athleteId,
    };
  }

  // Legacy / DB-shaped inputs
  if (input.teamId || input.team_id) {
    const teamId = input.teamId ?? input.team_id;
    return {
      programId,
      scopeType: "team",
      scopeId: teamId,
      teamId,
    };
  }

  if (input.athleteId || input.athlete_id) {
    const athleteId = input.athleteId ?? input.athlete_id;
    return {
      programId,
      scopeType: "athlete",
      scopeId: athleteId,
      athleteId,
    };
  }

  return {
    programId,
    scopeType: "program",
  };
}
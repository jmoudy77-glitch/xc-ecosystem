// lib/brainstorm/types.ts

export type BrainstormObjectType =
  | "text_note"
  | "image"
  | "file"
  | "ai_diagram"
  | "metric_snapshot"
  | "anchor";

export type BrainstormIndexType =
  | "decision"
  | "risk"
  | "gap"
  | "action"
  | "question"
  | "insight";


export type BrainstormMessageRole = "coach" | "ai" | "system";

// --- Context typing ---
// Canonical (UI/API) context contract (camelCase)
export type BrainstormScopeType =
  | "program"
  | "team"
  | "athlete"
  | "execution_balance";

export type BrainstormContext = {
  programId: string;
  scopeType: BrainstormScopeType;
  // Optional because "program" scope does not require a specific entity id
  scopeId?: string;
  // Convenience fields for UI code paths
  teamId?: string;
  athleteId?: string;
};

// DB-facing context shape (snake_case). Useful when normalizing incoming payloads.
export type BrainstormContextDb =
  | { scope: "program"; program_id: string }
  | { scope: "team"; program_id: string; team_id: string }
  | { scope: "athlete"; program_id: string; athlete_id: string };

export type BrainstormObjectBase = {
  id: string;
  page_id: string;
  object_type: BrainstormObjectType;
  payload_json: Record<string, any>;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  z_index: number;
  created_at: string;
  created_by_user_id: string;
};
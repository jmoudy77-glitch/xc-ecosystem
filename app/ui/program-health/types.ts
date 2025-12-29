export type Sport = "xc" | "tf";
export type Horizon = "H0" | "H1" | "H2" | "H3";

export type ProgramHealthSnapshot = {
  id: string;
  program_id: string;
  scope_id: string | null;
  sport: Sport;
  horizon: Horizon;
  canonical_event_id: string;
  ledger_id: string;
  inputs_hash: string;
  summary: any;
  full_payload: any;
  created_at: string;
};

export type ProgramHealthAbsence = {
  id: string;
  program_id: string;
  scope_id: string | null;
  sport: Sport;
  horizon: Horizon;
  absence_key: string;
  absence_type: string;
  severity: string | null;
  details: any;
  canonical_event_id: string;
  ledger_id: string;
  created_at: string;
  updated_at: string;
};

export type CapabilityNode = {
  id: string;
  program_id: string;
  node_code: string;
  name: string;
  scope_type: "program" | "team";
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProgramHealthCapabilityNode = CapabilityNode;

export type ProgramHealthViewModel = {
  snapshot: ProgramHealthSnapshot | null;
  absences: ProgramHealthAbsence[];
  capabilityNodes: CapabilityNode[];
  latestSnapshotsByHorizon: Record<string, ProgramHealthSnapshot | null>;
  snapshotHistoryByHorizon: Record<string, ProgramHealthSnapshot[]>;
};

/**
 * Canonical Truth Types (Program Health UI v1)
 * Pure read-models for rendering causality and payloads.
 */

export type CanonicalEvent = {
  id: string;
  program_id: string | null;
  event_domain: string;
  event_type: string;
  scope_type: string;
  scope_id: string | null;
  actor_user_id: string | null;
  source_system: string;
  causality: any;
  payload: any;
  created_at: string;
};

export type CanonicalEventLink = {
  id: string;
  from_canonical_event_id: string;
  to_canonical_event_id: string;
  link_type: string;
  created_at: string;
};

export type AbsenceTruthModel = {
  absence: ProgramHealthAbsence;
  canonicalEvent: CanonicalEvent;
  links: CanonicalEventLink[];
  linkedEvents: CanonicalEvent[];
};

/**
 * Canonical Event Graph (depth-1) — for causality drilldown UI
 */
export type CanonicalEventGraphModel = {
  rootEvent: CanonicalEvent;
  links: CanonicalEventLink[];
  linkedEvents: CanonicalEvent[];
};

/**
 * Linked canonical event IDs (depth-1) — for Lineage Highlight overlay
 */
export type LinkedCanonicalEventIdsModel = {
  rootEventId: string;
  linkedEventIds: string[];
};

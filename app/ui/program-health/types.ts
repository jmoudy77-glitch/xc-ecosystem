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

export type ProgramHealthViewModel = {
  snapshot: ProgramHealthSnapshot | null;
  absences: ProgramHealthAbsence[];
  capabilityNodes: CapabilityNode[];
};

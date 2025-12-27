// lib/brainstorm/indexer.ts

import { BrainstormIndexType } from "./types";

export type IndexCandidate = {
  index_type: BrainstormIndexType;
  label: string;
  source: "coach" | "ai";
};

export function extractIndexCandidates(
  text: string
): IndexCandidate[] {
  // placeholder – AI will replace this later
  if (text.toLowerCase().includes("gap")) {
    return [
      { index_type: "gap", label: text, source: "coach" }
    ];
  }

  return [];
}
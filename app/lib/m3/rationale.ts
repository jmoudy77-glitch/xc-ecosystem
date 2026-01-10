export type M3RationaleValidationResult = {
  ok: boolean;
  errors: string[];
};

export type M3RationaleValidationOptions = {
  /**
   * If true, requires temporal/horizon language in the rationale.
   * Use when emitting horizon-scoped impacts.
   */
  requireTemporal?: boolean;

  /**
   * Optional max length gate to prevent overlong, unreadable rationales.
   */
  maxLength?: number;
};

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bfix(es|ed|ing)?\b/i,
  /\bsolve(s|d|ing)?\b/i,
  /\bresolve(s|d|ving)?\b/i,
  /\bcovers?\s+completely\b/i,
  /\bguarantee(s|d|ing)?\b/i,
  /\bwill\s+provide\b/i,
  /\bensure(s|d|ing)?\b/i,
  /\blocks?\s+in\b/i,
];

const REQUIRED_CONDITIONAL_PATTERNS: RegExp[] = [
  /\bcould\b/i,
  /\bmay\b/i,
  /\bmight\b/i,
  /\bis\s+likely\s+to\b/i,
  /\bcan\s+pressure\b/i,
  /\bmay\s+pressure\b/i,
  /\bcould\s+pressure\b/i,
];

const REQUIRED_ALIGNMENT_PATTERNS: RegExp[] = [
  /\balign(s|ed|ment)?\b/i,
  /\bevent\s+group\b/i,
  /\bcapability\b/i,
  /\bcapability\s+node\b/i,
  /\bprimary\b/i,
  /\bsecondary\b/i,
];

const REQUIRED_EVIDENCE_PATTERNS: RegExp[] = [
  /\bperformance\b/i,
  /\bmark(s)?\b/i,
  /\btime(s)?\b/i,
  /\bresult(s)?\b/i,
  /\btrajectory\b/i,
  /\bverified\b/i,
  /\bnote(s)?\b/i,
  /\brating(s)?\b/i,
  /\bbenchmark(s)?\b/i,
];

const REQUIRED_CONSTRAINT_PATTERNS: RegExp[] = [
  /\bcoverage\b/i,
  /\bredundancy\b/i,
  /\bauthority\b/i,
  /\bcertification\b/i,
];

const TEMPORAL_PATTERNS: RegExp[] = [
  /\bhorizon\b/i,
  /\bH0\b/i,
  /\bH1\b/i,
  /\bH2\b/i,
  /\bH3\b/i,
  /\bthis\s+season\b/i,
  /\bnext\s+cycle\b/i,
  /\bnear[-\s]?term\b/i,
  /\bmid[-\s]?term\b/i,
  /\blong[-\s]?term\b/i,
  /\benroll(ment|ing)\b/i,
  /\bavailability\b/i,
];

function anyMatch(patterns: RegExp[], text: string): boolean {
  for (const p of patterns) {
    if (p.test(text)) return true;
  }
  return false;
}

export function validateM3Rationale(
  rationale: string,
  opts: M3RationaleValidationOptions = {}
): M3RationaleValidationResult {
  const errors: string[] = [];
  const maxLength = typeof opts.maxLength === "number" ? opts.maxLength : 420;

  const trimmed = (rationale ?? "").trim();

  if (!trimmed) {
    return { ok: false, errors: ["Rationale is required."] };
  }

  if (trimmed.length > maxLength) {
    errors.push(`Rationale exceeds max length (${maxLength}).`);
  }

  // Forbidden certainty/resolution language
  for (const p of FORBIDDEN_PATTERNS) {
    if (p.test(trimmed)) {
      errors.push("Rationale contains forbidden certainty/resolution language.");
      break;
    }
  }

  // Must be conditional/advisory
  if (!anyMatch(REQUIRED_CONDITIONAL_PATTERNS, trimmed)) {
    errors.push("Rationale must use conditional/advisory language (e.g., could/may/might).");
  }

  // Must reference structural alignment
  if (!anyMatch(REQUIRED_ALIGNMENT_PATTERNS, trimmed)) {
    errors.push("Rationale must reference structural alignment (event group/capability alignment).");
  }

  // Must reference plausibility evidence
  if (!anyMatch(REQUIRED_EVIDENCE_PATTERNS, trimmed)) {
    errors.push("Rationale must reference plausibility evidence (performance/marks/notes/benchmarks).");
  }

  // Must reference constraint context
  if (!anyMatch(REQUIRED_CONSTRAINT_PATTERNS, trimmed)) {
    errors.push("Rationale must reference constraint context (coverage/redundancy/authority/certification).");
  }

  // Optional temporal requirement
  if (opts.requireTemporal) {
    if (!anyMatch(TEMPORAL_PATTERNS, trimmed)) {
      errors.push("Rationale must reference temporal/horizon assumptions when required.");
    }
  }

  return { ok: errors.length === 0, errors };
}

export function assertValidM3Rationale(
  rationale: string,
  opts: M3RationaleValidationOptions = {}
): void {
  const res = validateM3Rationale(rationale, opts);
  if (!res.ok) {
    const msg = `Invalid M3 rationale: ${res.errors.join(" | ")}`;
    throw new Error(msg);
  }
}

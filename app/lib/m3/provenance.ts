export type M3ProvenanceRecord = {
  modelVersion: string;
  inputsHash: string;
  programId: string;
  generatedAt: string;
  notes?: string[];
};

/**
 * Minimal provenance logger.
 * For now this logs to server console; later, persist to a dedicated audit table
 * once canon authorizes it.
 */
export function logM3Provenance(rec: M3ProvenanceRecord): void {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        tag: "M3_PROVENANCE",
        ...rec,
      },
      null,
      0
    )
  );
}

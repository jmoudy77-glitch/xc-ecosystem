import { buildM3InputsHash, stableJsonStringify, type JsonValue } from "./hash.ts";

function assertEqual(a: string, b: string, msg: string) {
  if (a !== b) throw new Error(`${msg}\nA: ${a}\nB: ${b}`);
}

(function run() {
  const payloadA: JsonValue = {
    programId: "p1",
    horizon: "H1",
    evidence: { marks: [15.12, 15.34], verified: true },
    alignment: { type: "primary", capabilityNodeId: "c1" },
    constraint: { type: "coverage" },
  };

  const payloadB: JsonValue = {
    constraint: { type: "coverage" },
    alignment: { capabilityNodeId: "c1", type: "primary" },
    evidence: { verified: true, marks: [15.12, 15.34] },
    horizon: "H1",
    programId: "p1",
  };

  // Canonical stringification stable across key order permutations
  const sA = stableJsonStringify(payloadA);
  const sB = stableJsonStringify(payloadB);

  assertEqual(sA, sB, "stableJsonStringify must be deterministic across key permutations");

  // Hash stable across key permutations
  const hA = buildM3InputsHash(payloadA);
  const hB = buildM3InputsHash(payloadB);

  assertEqual(hA, hB, "inputs_hash must be deterministic across key permutations");

  // Arrays preserve order (caller responsibility); ensure difference is detected
  const payloadC: JsonValue = {
    ...(payloadA as Record<string, JsonValue>),
    evidence: { marks: [15.34, 15.12], verified: true },
  };

  const hC = buildM3InputsHash(payloadC);
  if (hC === hA) throw new Error("inputs_hash must change when array ordering changes");

  // eslint-disable-next-line no-console
  console.log("M3 hash determinism: OK");
})();

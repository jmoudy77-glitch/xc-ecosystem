import { validateM3Rationale } from "./rationale.ts";

function expectOk(r: { ok: boolean; errors: string[] }) {
  if (!r.ok) throw new Error(`Expected ok, got errors: ${r.errors.join(", ")}`);
}

function expectFail(r: { ok: boolean; errors: string[] }) {
  if (r.ok) throw new Error("Expected failure, got ok.");
}

(function run() {
  // Valid: conditional + alignment + evidence + constraint
  expectOk(
    validateM3Rationale(
      "Could pressure coverage because alignment to the capability node is primary, supported by verified performance marks and coach notes.",
      { requireTemporal: false }
    )
  );

  // Valid w/ temporal requirement
  expectOk(
    validateM3Rationale(
      "May pressure redundancy at H1 because alignment is primary and recent results support plausibility; availability is expected next cycle.",
      { requireTemporal: true }
    )
  );

  // Forbidden language
  expectFail(
    validateM3Rationale(
      "Resolves coverage because alignment is primary and performance is strong.",
      { requireTemporal: false }
    )
  );

  // Missing conditional
  expectFail(
    validateM3Rationale(
      "Pressures coverage because alignment is primary and verified performance marks support plausibility.",
      { requireTemporal: false }
    )
  );

  // Missing constraint context
  expectFail(
    validateM3Rationale(
      "Could contribute because alignment is primary and verified performance marks support plausibility.",
      { requireTemporal: false }
    )
  );

  // Missing temporal when required
  expectFail(
    validateM3Rationale(
      "Could pressure coverage because alignment is primary and verified performance marks support plausibility.",
      { requireTemporal: true }
    )
  );

  // eslint-disable-next-line no-console
  console.log("M3 rationale validator: OK");
})();

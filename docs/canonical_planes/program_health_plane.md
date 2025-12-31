# Program Health Plane — Canonical Spatial Specification
**Status:** Materialized (R3.2)
**Surface:** Instrument plane (not a dashboard)
**Authority:** Canvas is working authority; this file is the published canonical record.

---

## A) Theme tokens
Primary theme token (repo-wide):
- `--brand` (defined in `app/globals.css`)

Program Health uses `var(--brand)` as primary tint for instrument engagement states (e.g. read-ray wash).

---

## B) Shell variables and sources
### B1) Header height
- `--ph-header-h = var(--app-header-h, 72px)`
  - Implemented in `app/ui/program-health/styles.css` under `.ph-root`
  - If `--app-header-h` is not set elsewhere, effective default is **72px**

### B2) Program nav and gutter (program layout contract)
- `--ph-nav-w = 224px`
- `--ph-gutter = 24px`
  - Implemented in `app/programs/[programId]/layout.tsx` as inline CSS variables on the program shell body wrapper

### B3) Program Health field defaults (instrument field contract)
Defined in `app/ui/program-health/styles.css` under `.ph-field`:
- `--ph-disc-size = 95vmin`
- `--ph-disc-translate-x = -55%`
- `--ph-disc-translate-y = -58%`
- `--ph-under-nav-tuck = 72px`
- `--ph-radial-left = 0px`
- `--ph-disc-nudge-x = -70px`
- `--ph-disc-nudge-y = -90px`

Notes:
- `--ph-disc-top` may be set by ProgramHealthPage as an alignment helper, but is not currently consumed by CSS in the Program Health plane.

---

## C) Plane topology (what exists)
### C1) Field plane (world)
Selector: `.ph-field-plane`
- `position: fixed`
- bounds: `top: var(--ph-header-h); left: var(--ph-radial-left); right: 0; bottom: 0`
- base stratum: `z-index: 0`
- input: `pointer-events: auto`
- constraint: this plane is the world; it must not be nested into legacy rectangular content constraints.

### C2) Disc stage (instrument anchor)
Selector: `.ph-disc-stage`
- Anchor:
  - `left: 50%`
  - `top: 50%`
- Size:
  - `width/height: var(--ph-disc-size)`
- Translation:
  - `transform: translate(var(--ph-disc-translate-x), var(--ph-disc-translate-y))`
- Stratum:
  - `z-index: 1`
- Pointer policy:
  - stage is pointer-quiet (`pointer-events: none`), tilt layer is pointer-active.

### C3) Disc tilt and spin
Selector: `.ph-disc-tilt`
- Transform (canonical):
  - `rotateX(58deg)`
  - `rotateZ(calc(-12deg + var(--ph-disc-spin, 0deg)))`
  - `scale(1.10)`
- Pointer policy:
  - `.ph-disc-tilt` is pointer-active (`pointer-events: auto`)

### C4) Overlay strata
Selector: `.ph-map-overlay`
- `position: absolute; inset: 0`
- Stratum: `z-index: 5`
- Overlay is pointer-quiet by default; child controls may re-enable pointer events.

### C5) Dock strata (UI shells above the field)
Selectors: `.ph-dock-top`, `.ph-dock-left`, `.ph-dock-right`, `.ph-dock-inspector`
- Docks float above the field and do not define instrument geometry.
- Docks may use program shell variables (`--ph-nav-w`, `--ph-gutter`, `--ph-under-nav-tuck`) for position.

---

## D) Geometry primitives (binding numbers)
### D1) Disc coordinate system
Radial scaffold is rendered in SVG with:
- `viewBox: 0 0 1000 1000`
- center: `(500, 500)`

### D2) Disc radius and rings (H0–H3)
- Disc radius: `DISC_RADIUS_PX = 440`
- Ring radii used by scaffold/hit-testing:
  - H0: 140
  - H1: 240
  - H2: 340
  - H3: 440

### D3) Canonical sectors
- Sector count: 6
- Sector width: 60 degrees each
- Sector labels (current):
  - STRUCTURE, READINESS, CAPACITY, RECOVERY, EXECUTION, RESILIENCE

---

## E) Read-ray definition (math reference ray)
Constants (from `CapabilityDriftMap.tsx`):
- Visible read line angle: `READ_LINE_DEG = -55`
- Math reference offset: `READ_MATH_OFFSET_DEG = -20`

Active slice selection rule:
- `worldAngle = normalizeDeg((READ_LINE_DEG + READ_MATH_OFFSET_DEG) - rotationDeg)`
- `idx = floor(worldAngle / 60deg) mod 6`

Non-negotiable:
- The read-ray/active-slice is derived from disc polar math, not hover DOM state.

---

## F) Interaction fields (current)
### F1) Disc rotation
- Input: mouse wheel on the plane element
- Rotation update:
  - `discSpinDeg += deltaY * 0.08`
  - normalized into 0..360

### F2) Horizon band selection
- Horizon computed from pointer distance in disc stage bounding box, mapped into the 0..1000 scaffold coordinates.

---

## G) Visual invariants
- This surface is a spatial instrument, not a dashboard.
- Overlays must be disciplined and derived from instrument geometry.
- No rectangular container may constrain the disc stage (overflow and layout must preserve instrument sovereignty).

# --- FILE: /docs/canonical_planes/program_health_plane.md ---
# Program Health Canonical Plane
**Status:** CANONICAL  
**Scope:** Program Health UI — spatial instrument plane (not a dashboard)  
**Authority:** This document is the single source of truth for Program Health spatial geometry, plane topology, and interaction field boundaries.  
**Applies to:** `app/ui/program-health/*` (including `CapabilityDriftMap.tsx`, `HorizonTimeline.tsx`, `HorizonGlyphRail.tsx`, `ProgramHealthPage.tsx`, `styles.css`)

---

## 0) Non-negotiable intent
- Program Health UI is a **runtime instrument**.
- UI **reveals truth**; it does not compute truth.
- Causal explainability must be preserved; overlays must never obscure auditability.

---

## 1) Canonical coordinate system

### 1.1 Variables (canonical CSS vars)
The Program Health instrument uses these CSS variables as canonical anchors:

- `--ph-header-h` (default 72px)
- `--ph-nav-w`
- `--ph-gutter`
- `--ph-radial-left`
- `--ph-under-nav-tuck` (default 0px)

These variables define the instrument’s basis relative to the app shell.

### 1.2 Anchor basis
The instrument is anchored to the **Program Health shell**, not to legacy rectangular content grids.

- The disc is positioned via **canonical left anchor** + disc center offset.
- The overlay/tip layer uses the same basis and must not introduce independent coordinate frames.

---

## 2) Canonical plane topology (layers + responsibilities)

### 2.1 Planes
The instrument is composed of these planes, in this order:

1) **Shell Plane**
   - Owned by the Program Health route/layout.
   - Provides header/nav dimensions via CSS vars.

2) **Instrument Plane**
   - Owns disc, rings, sectors, radial grid, and any “hole”/core render.
   - Must be sovereign: no legacy rectangular containment constraints.

3) **Overlay Plane**
   - Owns tooltips, read-ray highlights, labels that track instrument geometry.
   - Must be disciplined: overlays are derived from instrument geometry, not free-positioned UI.

4) **Interaction Plane**
   - Owns pointer capture regions (hover/active), click/drag behavior, scroll wheel rotation (future).
   - Must preserve determinism: input maps to canonical geometry.

### 2.2 Z-index discipline (canonical)
Exact z-index numbers may vary, but the ordering must not.

- Shell Plane: lowest
- Instrument Plane: above shell
- Overlay Plane: above instrument
- Interaction Plane: above overlay (only for invisible capture regions; must not visually obscure)

No element may “jump planes” ad hoc.

---

## 3) Canonical anchors and equations

### 3.1 Disc anchor (canonical)
The disc center is defined as:

- `discCenterX = calc(var(--ph-radial-left, 0px) + var(--ph-nav-w) + var(--ph-gutter) - var(--ph-under-nav-tuck, 0px) + DISC_CENTER_X_OFFSET)`
- `discCenterY = calc(var(--ph-header-h, 72px) + DISC_CENTER_Y_OFFSET)`

`DISC_CENTER_X_OFFSET` and `DISC_CENTER_Y_OFFSET` are implementation constants owned by the instrument plane.

**Invariant:** The disc must never be constrained by a legacy rectangular grid container. The instrument plane must provide sufficient bounds to render at canonical scale.

### 3.2 Overlay tip anchor (canonical)
Tooltip (or “tip”) placement is derived from instrument geometry via `tipX`, `tipY` computed in the same coordinate frame as the instrument.

Canonical example (from current runtime conventions):

- `top: calc(var(--ph-header-h, 72px) + <TIP_Y_OFFSET_PX>px);`
- `left: calc(var(--ph-radial-left, 0px) + var(--ph-nav-w) + var(--ph-gutter) - var(--ph-under-nav-tuck, 0px) + <TIP_X_OFFSET_PX>px);`

**Hard rule:** If `top` is expressed as `calc(50% + tipYpx)`, then `50%` must refer to the **instrument plane** height, not the viewport or an unrelated container. Prefer shell-variable anchoring over `%` anchoring.

---

## 4) Canonical interaction fields

### 4.1 Sector field
- Sectors are the canonical interaction regions.
- Hover/active state must be derived from pointer position projected into the disc coordinate system.
- No “DOM-only” hover regions outside disc geometry.

### 4.2 Read-ray entry highlight (required behavior)
When an active sector enters the read-ray:
- The sector receives a **translucent fill** using the primary theme color (implementation in CSS or inline style).
- The highlight must not defeat legibility of labels/lineage overlays.

This is a required canonical behavior; styling is allowed to evolve.

---

## 5) Allowed evolution vs locked foundation

### 5.1 Locked foundation (requires a plane spec delta + commit)
- Coordinate system definition
- Plane topology and ordering
- Anchor equations (disc center / overlay basis)
- Interaction field boundaries (what constitutes a sector, ring, ray, etc.)

### 5.2 Allowed evolution (does not require renegotiation)
- Glow tuning, blur values, subtle gradients
- Typography, spacing within overlays
- Micro-offset adjustments that do not change the basis
- Adding new overlays that remain disciplined

---

## 6) Change protocol (mandatory)
Any change to locked foundation requires:
1) Update this document with a **delta section** (append-only, dated).
2) Apply the corresponding code change.
3) Commit both together.

### Delta log
- YYYY-MM-DD: <short description>

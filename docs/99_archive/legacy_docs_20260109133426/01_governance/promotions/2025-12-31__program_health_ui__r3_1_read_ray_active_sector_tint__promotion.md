# Program Health UI — R3.1: Read-Ray Entry Tint (Primary) + Entry Pulse
**Date:** 2025-12-31  
**Project:** xc-ecosystem  
**Module:** Program Health UI  
**Surface:** Spatial instrument (not a dashboard)  
**Status:** READY

---

## 0) Contract
Governed by:
- `/docs/canonical_planes/program_health_plane.md`
- `/docs/governance/authoring_authority.md`

Non-negotiables:
- Highlight is geometry-derived (disc polar math), not DOM-hover derived.
- No topology/plane re-ordering in this promotion.
- “Primary theme color” for this repo maps to `var(--brand)` (see `app/globals.css`).

---

## 1) Objective
When the active sector engages the read-ray (i.e., the slice under the read-line math reference), the sector receives a translucent primary tint, with a subtle “entry pulse” when the active slice changes.

Implementation already has:
- Active slice selection: `sliceIndexUnderReadLine(discSpinDeg)`
- Active sector wash: `phActiveSectorWash` gradient + `.ph-active-sector-wash` path

This promotion makes the wash:
- more clearly primary-tinted (still translucent)
- pulse on entry (on slice change), without inventing new geometry

---

## 2) Scope
Edit only:
- `app/ui/program-health/CapabilityDriftMap.tsx`
- `app/ui/program-health/styles.css`

Add new promotion record:
- `public/docs/01_governance/promotions/2025-12-31__program_health_ui__r3_1_read_ray_active_sector_tint__promotion.md`

---

## 3) Required code changes (exact, no guessing)

### 3.1 CapabilityDriftMap.tsx — strengthen the primary-tinted wash gradient
File: `app/ui/program-health/CapabilityDriftMap.tsx`

Locate this exact block inside `RadialPlaneScaffold` -> `<defs>`:

<radialGradient id="phActiveSectorWash" cx="50%" cy="50%" r="72%">
  <stop offset="0%" stopColor="color-mix(in oklab, transparent 88%, var(--brand) 12%)" />
  <stop offset="55%" stopColor="color-mix(in oklab, transparent 90%, var(--brand) 10%)" />
  <stop offset="100%" stopColor="transparent" />
</radialGradient>

Replace it with:

<radialGradient id="phActiveSectorWash" cx="50%" cy="50%" r="72%">
  <stop offset="0%" stopColor="color-mix(in oklab, transparent 78%, var(--brand) 22%)" />
  <stop offset="55%" stopColor="color-mix(in oklab, transparent 84%, var(--brand) 16%)" />
  <stop offset="100%" stopColor="transparent" />
</radialGradient>

---

### 3.2 CapabilityDriftMap.tsx — pulse the wash on “entry” by remounting on slice change
File: `app/ui/program-health/CapabilityDriftMap.tsx`

Locate the active wash path returned by this IIFE in `RadialPlaneScaffold`:

return (
  <path
    d={d}
    className="ph-active-sector-wash"
    fill="url(#phActiveSectorWash)"
    pointerEvents="none"
  />
);

Replace with:

return (
  <path
    key={`ph-active-sector-wash-${idx}`}
    d={d}
    className="ph-active-sector-wash ph-ray-enter"
    fill="url(#phActiveSectorWash)"
    pointerEvents="none"
  />
);

---

### 3.3 styles.css — add entry pulse animation (disciplined, translucent)
File: `app/ui/program-health/styles.css`

Locate:

.ph-active-sector-wash {
  opacity: 0.32;
  transition: opacity 180ms ease;
}

Replace with:

.ph-active-sector-wash {
  opacity: 0.30;
  transition: opacity 180ms ease;
}

@keyframes ph-ray-enter {
  from { opacity: 0; }
  to { opacity: 0.30; }
}

.ph-active-sector-wash.ph-ray-enter {
  animation: ph-ray-enter 280ms ease-out;
}

---

## 4) Acceptance criteria
- The active sector wash is clearly primary-tinted and still translucent.
- When disc spin causes the active slice to change, the wash visibly “pulses” on entry.
- No runtime errors.
- No change to coordinate basis, plane topology, or overlay positioning.

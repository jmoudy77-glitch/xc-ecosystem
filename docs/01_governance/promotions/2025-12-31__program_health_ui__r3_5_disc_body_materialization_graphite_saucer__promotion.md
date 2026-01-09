# Program Health UI — R3.5 Disc Body Materialization (Graphite Ice Saucer + NOW-Weighted Thickness)
Date: 2025-12-31
Project: xc-ecosystem
Module: Program Health UI

## Intent
Materialize the Program Health disc as a physical object (not a wireframe plane):
- Add a visible side wall (disc thickness)
- Encode certainty gradient: thicker near NOW, thinner toward the outer horizons
- Add a smooth saucer falloff at the rim (temporal uncertainty)
- Preserve all existing interaction/rotation behavior from R3.4

## Changes
- CapabilityDriftMap: add 3 non-interactive body layers inside the tilted disc container:
  - ph-disc-sidewall (baseline thickness)
  - ph-disc-sidewallCore (NOW-thickener)
  - ph-disc-saucer (rim falloff shading)
- styles.css: add required CSS for the new layers and enforce correct stacking under the SVG + radial node layer

## Notes
- No data wiring changes.
- No absence melt/tunnel geology in this promotion; this is body materialization only.

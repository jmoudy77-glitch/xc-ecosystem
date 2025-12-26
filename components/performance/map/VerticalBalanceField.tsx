"use client";
// components/performance/map/VerticalBalanceField.tsx

import { useEffect, useMemo, useRef, useState } from "react";

import { HoverBriefPopover } from "./BalanceGlob";

export type VerticalBalanceFieldProps = {
  /** Signed distribution in [-1, +1]. + = toward top pole, - = toward bottom pole */
  distributionX: number;

  /** Strain heat in [0, 1]. For now pass 0 to keep strain visually disabled. */
  strainHeat01: number;

  /** Which side receives strain overlay */
  strainTarget: "A" | "B" | "both" | null;

  /** If true, render only base + distribution (strain suppressed regardless of strainHeat01). */
  suppressStrain?: boolean;

  /** Visual size in px */
  width?: number;
  height?: number;
  
  /** Optional hover/focus popover brief (intermediate context layer). */
  briefHeader?: string;
  briefBody?: string;
  /** Optional positioning override for the popover container. */
  briefPopoverClassName?: string;
};

/**
 * Containerless vertical field renderer.
 * Layers: base -> distribution -> strain (optional) -> liveness.
 */
export default function VerticalBalanceField(props: VerticalBalanceFieldProps) {
  const {
    distributionX,
    strainHeat01,
    strainTarget,
    suppressStrain = false, // default OFF now that strainHeat01 is wired
    width = 200,
    height = 330,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const t0Ref = useRef<number>(0);

  const x = useMemo(() => clamp(distributionX, -1, 1), [distributionX]);
  const heat = useMemo(() => clamp(strainHeat01, 0, 1), [strainHeat01]);

  const [showBrief, setShowBrief] = useState(false);
  const hasBrief = Boolean(props.briefHeader && props.briefBody);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const overscanScale = 1.5;
    const renderH = Math.round(height * overscanScale);
    const bleedY = (renderH - height) / 2;

    canvas.width = width * dpr;
    canvas.height = renderH * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!t0Ref.current) t0Ref.current = performance.now();

    const draw = () => {

      // Clear
      ctx.clearRect(0, 0, width, renderH);

      ctx.save();
      // Draw into a taller buffer while keeping the visible coordinate system (0..height)
      // centered within the overscan area.
      ctx.translate(0, bleedY);

      // --- Layer 1: Base Field (neutral, no meaning) ---
      // drawBaseField(ctx, width, height, bleedY);

      // --- Layer 2: Distribution Field (calm, desaturated) ---
      drawDistribution(ctx, width, height, x, bleedY);

      // --- Layer 3: Strain (heat overlay; can be suppressed via prop) ---
      if (!suppressStrain) {
        drawStrain(ctx, width, height, heat, strainTarget);
      }

      // --- Layer 4: Liveness (intensity/breadth modulation only) ---
      // drawLiveness(ctx, width, height, x, t);

      // Final soft mask: removes rectangular silhouette without introducing a visible container
      // applySoftFieldMask(ctx, width, height);

      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [width, height, x, heat, strainTarget, suppressStrain]);

  return (
    <div
      className="relative"
      onMouseEnter={() => hasBrief && setShowBrief(true)}
      onMouseLeave={() => setShowBrief(false)}
      onFocus={() => hasBrief && setShowBrief(true)}
      onBlur={() => setShowBrief(false)}
      tabIndex={hasBrief ? 0 : -1}
      aria-label={hasBrief ? props.briefHeader : undefined}
    >
      {/* Hover/focus popover brief (intermediate, intentionally lightweight) */}
      {hasBrief && (
        <HoverBriefPopover
          show={showBrief}
          header={props.briefHeader as string}
          body={props.briefBody as string}
          className={props.briefPopoverClassName}
        />
      )}

      <canvas
        ref={canvasRef}
        className="pointer-events-none select-none"
        aria-hidden="true"
      />
    </div>
  );
}

// ---------------------------
// Drawing helpers
// ---------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function applySoftFieldMask(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
) {
  // Keep interior fully visible; only feather edges to avoid a “container” read.
  // 1) Hard clip to a tall capsule.
  // 2) Apply a very narrow alpha feather on edges via destination-in.

  const padX = w * 0.10;
  const padY = h * 0.06;
  const x = padX;
  const y = padY;
  const cw = w - padX * 2;
  const ch = h - padY * 2;
  const r = Math.min(cw, ch) * 0.35;

  ctx.save();

  // Capsule clip path
  ctx.beginPath();
  roundedRect(ctx, x, y, cw, ch, r);
  ctx.clip();

  // Edge feather (narrow)
  ctx.globalCompositeOperation = "destination-in";

  // Start from fully opaque within the clip
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.fillRect(0, 0, w, h);

  // Feather sides
  const sideFeather = Math.max(10, Math.floor(w * 0.08));
  const left = ctx.createLinearGradient(0, 0, sideFeather, 0);
  left.addColorStop(0.0, "rgba(255,255,255,0.0)");
  left.addColorStop(1.0, "rgba(255,255,255,1.0)");
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, sideFeather, h);

  const right = ctx.createLinearGradient(w - sideFeather, 0, w, 0);
  right.addColorStop(0.0, "rgba(255,255,255,1.0)");
  right.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = right;
  ctx.fillRect(w - sideFeather, 0, sideFeather, h);

  // Feather top/bottom
  const endFeather = Math.max(10, Math.floor(h * 0.10));
  const top = ctx.createLinearGradient(0, 0, 0, endFeather);
  top.addColorStop(0.0, "rgba(255,255,255,0.0)");
  top.addColorStop(1.0, "rgba(255,255,255,1.0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, endFeather);

  const bottom = ctx.createLinearGradient(0, h - endFeather, 0, h);
  bottom.addColorStop(0.0, "rgba(255,255,255,1.0)");
  bottom.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, h - endFeather, w, endFeather);

  ctx.restore();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function drawBaseField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bleedY: number
) {
  // Extremely subtle neutral base (avoid persistent haze)
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0, "rgba(255,255,255,0.00)");
  g.addColorStop(0.25, "rgba(255,255,255,0.02)");
  g.addColorStop(0.5, "rgba(255,255,255,0.03)");
  g.addColorStop(0.75, "rgba(255,255,255,0.02)");
  g.addColorStop(1.0, "rgba(255,255,255,0.00)");
  ctx.fillStyle = g;
  // Fill into overscan so subtle base does not hard-clip at the visible bounds.
  ctx.fillRect(0, -bleedY, w, h + bleedY * 2);
}

function drawDistribution(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  x: number,
  bleedY: number
) {
  // Distribution should create form via cast distance.
  // We keep TWO semantic poles (A=top cool, B=bottom warm), but articulate shape
  // by modeling each pole as a small mixture of lobes (sub-fields) along the vertical axis.

  const xn = clamp(x, -1, 1);
  const wA = (xn + 1) / 2; // 0..1 (toward top pole)
  const wB = 1 - wA;

  const N = 30; // emitters along Y (modest for perf)

  // Radius envelope (hard constraint). Prevent any bloom from touching container edges.
  const minR = w * 0.12;
  const maxR = w * 0.36;

  // Lobe model: mu in [0..1] top->bottom, sigma controls spread, w is contribution.
  // These are intentionally conservative; we can tune after seeing shape.
  type Lobe = { mu: number; sigma: number; w: number; rgb: readonly [number, number, number] };

  const lobesA: Lobe[] = [
    { mu: 0.10, sigma: 0.10, w: 0.95, rgb: [120, 200, 255] as const }, // cyan tip
    { mu: 0.26, sigma: 0.14, w: 0.75, rgb: [120, 170, 255] as const }, // blue core
    { mu: 0.44, sigma: 0.18, w: 0.42, rgb: [135, 145, 255] as const }, // periwinkle bridge
    { mu: 0.60, sigma: 0.22, w: 0.22, rgb: [165, 130, 255] as const }, // violet reach
  ];

  const lobesB: Lobe[] = [
    { mu: 0.90, sigma: 0.10, w: 0.85, rgb: [255, 205, 120] as const }, // amber tip
    { mu: 0.74, sigma: 0.14, w: 0.70, rgb: [255, 190, 120] as const }, // warm core
    { mu: 0.56, sigma: 0.18, w: 0.40, rgb: [255, 165, 110] as const }, // orange bridge
    { mu: 0.40, sigma: 0.22, w: 0.20, rgb: [255, 140, 105] as const }, // red-orange reach
  ];

  // Hue alignment to distribution geometry:
  // Keep lobe GEOMETRY fixed (mu/sigma/w), but allow the palette (rgb) to attach to dominance.
  // xn >= 0 => A is dominant (top); xn < 0 => B is dominant (bottom).
  const applyPalette = (
    geom: Lobe[],
    palette: ReadonlyArray<readonly [number, number, number]>
  ): Lobe[] => geom.map((L, idx) => ({ ...L, rgb: palette[idx] ?? L.rgb }));

  const coolPalette = lobesA.map((L) => L.rgb);
  const warmPalette = lobesB.map((L) => L.rgb);

  const AisDominant = xn >= 0;
  const colorLobesA: Lobe[] = applyPalette(lobesA, AisDominant ? coolPalette : warmPalette);
  const colorLobesB: Lobe[] = applyPalette(lobesB, AisDominant ? warmPalette : coolPalette);

  const mixStrength = (yN: number, lobes: Lobe[]) => {
    let s = 0;
    for (const L of lobes) s += L.w * gauss(yN, L.mu, L.sigma);
    return s;
  };

  const mixRGB = (yN: number, lobes: Lobe[]) => {
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let sw = 0;
    for (const L of lobes) {
      const wgt = L.w * gauss(yN, L.mu, L.sigma);
      sw += wgt;
      sr += wgt * L.rgb[0];
      sg += wgt * L.rgb[1];
      sb += wgt * L.rgb[2];
    }
    if (sw <= 1e-6) return [255, 255, 255] as const;
    return [sr / sw, sg / sw, sb / sw] as const;
  };

  // Precompute normalizers once so both passes share consistent scaling.
  const normA = mixStrength(0.10, lobesA) || 1;
  const normB = mixStrength(0.90, lobesB) || 1;

  // Core pass: adds a firmer, more definitive nucleus so the field reads as “solid”
  // without becoming a chart. We draw a smaller-radius, higher-alpha bloom using
  // normal compositing, then let the existing additive pass provide atmosphere.
  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  for (let i = 0; i < N; i++) {
    const yN = i / (N - 1);
    const y = yN * h;

    const eA = mixStrength(yN, lobesA) / normA;
    const eB = mixStrength(yN, lobesB) / normB;

    const cA = mixRGB(yN, colorLobesA);
    const cB = mixRGB(yN, colorLobesB);

    const iA = clamp(wA * eA + 0.08 * wA * (1 - eB), 0, 1);
    const iB = clamp(wB * eB + 0.08 * wB * (1 - eA), 0, 1);

    if (iA > 0.002) {
      const r = lerp(minR * 0.55, maxR * 0.75, ease01(iA));
      const g = ctx.createRadialGradient(w * 0.5, y, 0, w * 0.5, y, r);
      g.addColorStop(0.0, `rgba(${cA[0]},${cA[1]},${cA[2]},${0.22 * iA})`);
      g.addColorStop(0.35, `rgba(${cA[0]},${cA[1]},${cA[2]},${0.10 * iA})`);
      g.addColorStop(1.0, `rgba(${cA[0]},${cA[1]},${cA[2]},0.00)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, -bleedY, w, h + bleedY * 2);
    }

    if (iB > 0.002) {
      const r = lerp(minR * 0.55, maxR * 0.75, ease01(iB));
      const g = ctx.createRadialGradient(w * 0.5, y, 0, w * 0.5, y, r);
      g.addColorStop(0.0, `rgba(${cB[0]},${cB[1]},${cB[2]},${0.20 * iB})`);
      g.addColorStop(0.35, `rgba(${cB[0]},${cB[1]},${cB[2]},${0.09 * iB})`);
      g.addColorStop(1.0, `rgba(${cB[0]},${cB[1]},${cB[2]},0.00)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, -bleedY, w, h + bleedY * 2);
    }
  }

  ctx.restore();

  // Additive accumulation so cast builds naturally
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < N; i++) {
    const yN = i / (N - 1);
    const y = yN * h;

    // Raw envelopes
    const eA = mixStrength(yN, lobesA) / normA;
    const eB = mixStrength(yN, lobesB) / normB;

    const cA = mixRGB(yN, colorLobesA);
    const cB = mixRGB(yN, colorLobesB);

    // Intensity is distribution weight * envelope with a small continuity bleed.
    // This keeps a coherent “field” instead of isolated blobs.
    const iA = clamp(wA * eA + 0.08 * wA * (1 - eB), 0, 1);
    const iB = clamp(wB * eB + 0.08 * wB * (1 - eA), 0, 1);

    if (iA > 0.002) {
      const r = lerp(minR, maxR, ease01(iA));
      const g = ctx.createRadialGradient(w * 0.5, y, 0, w * 0.5, y, r);
      g.addColorStop(0.0, `rgba(${cA[0]},${cA[1]},${cA[2]},${0.30 * iA})`);
      g.addColorStop(0.35, `rgba(${cA[0]},${cA[1]},${cA[2]},${0.16 * iA})`);
      g.addColorStop(1.0, `rgba(${cA[0]},${cA[1]},${cA[2]},0.00)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, -bleedY, w, h + bleedY * 2);
    }

    if (iB > 0.002) {
      const r = lerp(minR, maxR, ease01(iB));
      const g = ctx.createRadialGradient(w * 0.5, y, 0, w * 0.5, y, r);
      g.addColorStop(0.0, `rgba(${cB[0]},${cB[1]},${cB[2]},${0.24 * iB})`);
      g.addColorStop(0.35, `rgba(${cB[0]},${cB[1]},${cB[2]},${0.12 * iB})`);
      g.addColorStop(1.0, `rgba(${cB[0]},${cB[1]},${cB[2]},0.00)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, -bleedY, w, h + bleedY * 2);
    }
  }

  ctx.restore();
}

function drawStrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  heat01: number,
  target: "A" | "B" | "both" | null
) {
  if (!target || heat01 <= 0) return;

  // Strain is “heat” overlay; conservative curve assumed upstream.
  const alpha = clamp(heat01, 0, 1) * 0.55;

  const drawHalf = (which: "A" | "B") => {
    const yCenter = which === "A" ? h * 0.35 : h * 0.65;
    const g = ctx.createRadialGradient(w * 0.5, yCenter, 0, w * 0.5, yCenter, h * 0.8);
    g.addColorStop(0.0, `rgba(255,120,80,${alpha})`);
    g.addColorStop(0.55, `rgba(255,120,80,${alpha * 0.35})`);
    g.addColorStop(1.0, "rgba(255,120,80,0.00)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };

  if (target === "both") {
    drawHalf("A");
    drawHalf("B");
  } else {
    drawHalf(target);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function drawLiveness(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  x: number,
  t: number
) {
  // Intensity/breadth modulation only. No hue change.
  // Slow traversal: 8–15s end-to-end. Use 12s nominal.
  const period = 12;
  const phase = (t % period) / period; // 0..1

  // Direction toward dominant distribution:
  // x>0 -> travel upward (toward A/top); x<0 -> travel downward (toward B/bottom)
  const dir = x >= 0 ? -1 : 1;

  // Position along vertical axis with soft in/out
  const eased = smoothstep(0.05, 0.95, phase);
  const y = dir < 0 ? lerp(h * 0.9, h * 0.1, eased) : lerp(h * 0.1, h * 0.9, eased);

  // Very subtle amplitude
  const amp = 0.06; // keep conservative
  const band = ctx.createRadialGradient(w * 0.5, y, 0, w * 0.5, y, h * 0.55);
  band.addColorStop(0.0, `rgba(255,255,255,${amp})`);
  band.addColorStop(0.35, `rgba(255,255,255,${amp * 0.35})`);
  band.addColorStop(1.0, "rgba(255,255,255,0.00)");

  ctx.fillStyle = band;
  ctx.fillRect(0, 0, w, h);
}

function gauss(x: number, mu: number, sigma: number) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z);
}

function ease01(t: number) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
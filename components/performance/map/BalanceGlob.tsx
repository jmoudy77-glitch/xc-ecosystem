// components/performance/map/BalanceGlob.tsx
import { useMemo, useState } from "react";
type Props = {
  /** -1 = pulled fully toward bottom label, +1 = pulled fully toward top label */
  tension: number; // [-1..+1]
  /** 0..1 severity (drives color intensity + glow) */
  severity: number; // [0..1]
  width?: number;
  height?: number;

  /** Optional dichotomy labels for hover brief. If provided, a popover brief will render on hover/focus. */
  topLabel?: string;
  bottomLabel?: string;

  /** Optional placeholder brief copy. If omitted, a generic placeholder will be shown. */
  briefText?: string;

  /**
   * Optional stable ID seed used to make SVG <defs> IDs deterministic across SSR/CSR.
   * Strongly recommended.
   */
  idSeed?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type HoverBriefPopoverProps = {
  show: boolean;
  header: string;
  body: string;
  /** Optional footer line shown below a divider */
  footer?: string;
  /** Tailwind class overrides for positioning if needed */
  className?: string;
};

export function HoverBriefPopover({
  show,
  header,
  body,
  footer = "Understand how this impacts your system in the Brief.",
  className,
}: HoverBriefPopoverProps) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-1/2 z-30 w-[320px] -translate-x-full -translate-y-1/2 rounded-xl border border-white/10 bg-black/70 p-3 text-left text-sm text-slate-100 shadow-2xl backdrop-blur transition-opacity duration-150 ${
        show ? "opacity-100" : "opacity-0"
      } ${className || ""}`}
      role="note"
      aria-hidden={!show}
    >
      <div className="text-[13px] font-semibold text-slate-50">{header}</div>
      <div className="mt-2 text-[12.5px] leading-5 text-slate-200">{body}</div>
      <div className="mt-3 border-t border-white/10 pt-2 text-[12px] font-medium text-slate-200">
        {footer}
      </div>
    </div>
  );
}

export default function BalanceGlob({
  tension,
  severity,
  width = 220,
  height = 260,
  topLabel,
  bottomLabel,
  briefText,
  idSeed,
}: Props) {
  const t = clamp(tension, -1, 1);
  const s = clamp(severity, 0, 1);

  // Deterministic ids per component instance to avoid SVG <defs> collisions AND
  // prevent SSR/CSR hydration mismatches (which can happen if ordering differs).
  // Parent should pass a stable idSeed (recommended). We also provide a deterministic
  // fallback based on inputs so the IDs remain stable across SSR/CSR.
  const idPrefix = useMemo(() => {
    const seed = idSeed?.trim();
    const fallback = `glob-${width}x${height}-t${Math.round(t * 1000)}-s${Math.round(
      s * 1000
    )}`;
    return (seed || fallback).replace(/[^a-zA-Z0-9_-]/g, "");
  }, [idSeed, width, height, t, s]);

  const gooId = `goo-${idPrefix}`;
  const gooMaskId = `gooMask-${idPrefix}`;

  const bloomId = `bloom-${idPrefix}`;
  const lightBarId = `lightBar-${idPrefix}`;
  const lightBarBlurId = `lightBarBlur-${idPrefix}`;

  const beamFadeLeftId = `beamFadeLeft-${idPrefix}`;
  const beamFadeLeftGId = `beamFadeLeftG-${idPrefix}`;
  const beamFadeRightId = `beamFadeRight-${idPrefix}`;
  const beamFadeRightGId = `beamFadeRightG-${idPrefix}`;
  const beamBlurId = `beamBlur-${idPrefix}`;

  const waterTintId = `waterTint-${idPrefix}`;
  const waterDepthId = `waterDepth-${idPrefix}`;

  // Radii: contents “flow” toward stronger pole.
  // We keep the middle body fuller so the glob reads as liquid mass (not a skinny peanut).
  const base = 56;
  const delta = 22 * Math.abs(t);

  const topR = clamp(base + (t > 0 ? delta : -delta * 0.55), 38, 92);
  const botR = clamp(base + (t < 0 ? delta : -delta * 0.55), 38, 92);

  // Middle radius keeps continuity and reduces “nipple” tips.
  const midR = clamp(base * 0.72 - 8 * Math.abs(t), 34, 52);

  const cx = width / 2;
  const yTop = height * 0.36;
  const yMid = height * 0.53;
  const yBot = height * 0.72;

  // Water appearance (no tension hues for now) — make the body readable on dark UI
  // Increase body readability: the current look is mostly specular highlight.
  const waterA = clamp(0.46 + 0.40 * s, 0.46, 0.86); // overall water visibility

  // A slightly more readable (still glassy) palette for water colors
  const waterTop = `rgba(120, 210, 255, ${waterA * 0.95})`;
  const waterMid = `rgba(210, 250, 255, ${waterA * 0.72})`;
  const waterBot = `rgba(70, 165, 245, ${waterA * 0.92})`;

  // A faint internal band suggests refraction/meniscus.
  const bandA = clamp(0.12 + 0.20 * s, 0.12, 0.34);

  // Outer rim keeps silhouette readable.
  const rimA = clamp(0.16 + 0.18 * s, 0.16, 0.38);

  // Ambient bloom around the glob (subtle).
  const bloomA = clamp(0.14 + 0.22 * s, 0.14, 0.34);

  // Light-through-glass: a thin vertical bar behind the glob.
  // Intensity should track *imbalance* (|t|) while still respecting severity.
  const imbalance = Math.abs(t);
  const lightA = clamp(0.10 + 0.62 * (0.25 + 0.75 * imbalance) * s, 0.06, 0.72);

  // Make end colors survive blur/blend: ends slightly stronger, center slightly softer.
  const lightEndA = clamp(lightA * 1.35, 0.08, 0.92);
  const lightCenterA = clamp(lightA * 0.85, 0.06, 0.80);

  // Center is always “healthy” green; ends encode direction of imbalance.
  const lightCenter = `rgba(90, 255, 190, ${lightCenterA})`; // green (center)
  const lightYellow = `rgba(255, 215, 90, ${lightEndA})`; // greater-volume end
  const lightRed = `rgba(255, 80, 110, ${lightEndA})`;    // lesser-volume end

  // If pulled toward the top (t>0): top has greater volume (yellow), bottom lesser (red).
  // If pulled toward the bottom (t<0): top lesser (red), bottom greater (yellow).
  const lightTop = t >= 0 ? lightYellow : lightRed;
  const lightBot = t >= 0 ? lightRed : lightYellow;

  // Width of the light bar in px (very thin, like a tight “beam” behind the glass)
  const lightBarW = clamp(6 + 10 * s, 6, 16);

  // Side-cast beams: light projected outward from the bar at ~45° on both sides
  const sideBeamW = clamp(18 + 26 * s, 18, 52);
  const sideBeamLen = clamp(height * 0.95, height * 0.85, height);

  const [showBrief, setShowBrief] = useState(false);

  const hasBrief = Boolean(topLabel && bottomLabel);
  const briefHeader = hasBrief ? `${topLabel} ↔ ${bottomLabel}` : "";
  const briefBody =
    briefText?.trim() ||
    (hasBrief
      ? `Placeholder brief: This dimension summarizes the current balance between ${topLabel} and ${bottomLabel}. We will surface the contributing signals and drivers here.`
      : "");

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => hasBrief && setShowBrief(true)}
      onMouseLeave={() => setShowBrief(false)}
      onFocus={() => hasBrief && setShowBrief(true)}
      onBlur={() => setShowBrief(false)}
    >
      {/* Hover/focus popover brief (intermediate, intentionally lightweight) */}
      {hasBrief && (
        <HoverBriefPopover
          show={showBrief}
          header={briefHeader}
          body={briefBody}
          footer="Understand how this impacts your system in the Brief."
        />
      )}

      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img">
      <defs>
        <filter id={gooId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 12 -5"
            result="goo"
          />
          {/* Smooth the threshold edge so the ends stay bulbous instead of pointy */}
          <feGaussianBlur in="goo" stdDeviation="1.25" result="gooSmooth" />
          <feComposite in="SourceGraphic" in2="gooSmooth" operator="atop" />
        </filter>

        {/* subtle bloom to read as liquid on dark UI */}
        <filter id={bloomId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 0.55 0"
            result="ba"
          />
          <feMerge>
            <feMergeNode in="ba" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* light bar softening */}
        <filter id={lightBarBlurId} x="-80%" y="-20%" width="260%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.25" result="lb" />
          <feColorMatrix
            in="lb"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 0.85 0"
            result="lba"
          />
          <feMerge>
            <feMergeNode in="lba" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* vertical light beam shining through the glass */}
        <linearGradient id={lightBarId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lightTop} />
          <stop offset="32%" stopColor={lightCenter} />
          <stop offset="68%" stopColor={lightCenter} />
          <stop offset="100%" stopColor={lightBot} />
        </linearGradient>

        {/*
          Side-beams should carry the SAME top/center/bottom color transitions as the main bar.
          Because a single <linearGradient> can’t vary in both axes, we:
          - paint the beam with the vertical lightBar gradient (red/green/amber)
          - apply a mask that fades opacity outward horizontally (from the bar to the outside)
        */}
        <mask id={beamFadeLeftId} maskUnits="userSpaceOnUse">
          <linearGradient id={beamFadeLeftGId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0.90" />
            <stop offset="45%" stopColor="white" stopOpacity="0.40" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <rect x="0" y="0" width={sideBeamW} height={sideBeamLen} fill={`url(#${beamFadeLeftGId})`} />
        </mask>

        <mask id={beamFadeRightId} maskUnits="userSpaceOnUse">
          <linearGradient id={beamFadeRightGId} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0.90" />
            <stop offset="45%" stopColor="white" stopOpacity="0.40" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <rect x={-sideBeamW} y="0" width={sideBeamW} height={sideBeamLen} fill={`url(#${beamFadeRightGId})`} />
        </mask>

        {/* soften the side-cast beams so they read as projected light through glass */}
        <filter id={beamBlurId} x="-120%" y="-40%" width="340%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="sb" />
          <feColorMatrix
            in="sb"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 0.85 0"
            result="sba"
          />
          <feMerge>
            <feMergeNode in="sba" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id={waterTintId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={waterTop} />
          <stop offset="40%" stopColor={waterMid} />
          <stop offset="70%" stopColor={waterMid} />
          <stop offset="100%" stopColor={waterBot} />
        </linearGradient>

        {/* Depth shading to suggest refraction */}
        <radialGradient id={waterDepthId} cx="32%" cy="24%" r="95%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
          <stop offset="42%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="70%" stopColor="rgba(0,0,0,0.10)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.24)" />
        </radialGradient>

        {/* Mask that captures the goo silhouette so we can paint it once */}
        <mask id={gooMaskId} maskUnits="userSpaceOnUse">
          <rect x="0" y="0" width={width} height={height} fill="black" />
          <g filter={`url(#${gooId})`}>
            <circle cx={cx} cy={yTop} r={topR} fill="white" />
            <circle cx={cx} cy={yMid} r={midR} fill="white" />
            <circle cx={cx} cy={yBot} r={botR} fill="white" />
          </g>
        </mask>
      </defs>

      {/* contact shadow (helps read “liquid sitting in space”) */}
      <ellipse
        cx={cx}
        cy={yBot + botR * 0.78}
        rx={Math.max(34, botR * 0.95)}
        ry={Math.max(10, botR * 0.22)}
        fill="rgba(0,0,0,0.45)"
        opacity={0.55}
      />

      {/* goo silhouette (paint once), then apply glass effects inside that silhouette */}
      <g mask={`url(#${gooMaskId})`}>
        {/* subtle bluish backdrop constrained to the glob silhouette (helps the water read on dark UI) */}
        <g style={{ mixBlendMode: "screen" }} opacity={0.11}>
          <rect x={0} y={0} width={width} height={height} fill="rgba(55,110,185,0.12)" />
        </g>

        {/* base water/glass volume */}
        <rect x={0} y={0} width={width} height={height} fill={`url(#${waterTintId})`} />

        {/* depth shading */}
        <rect x={0} y={0} width={width} height={height} fill={`url(#${waterDepthId})`} opacity={0.75} />

        {/* refraction band (meniscus) */}
        <ellipse
          cx={cx}
          cy={(yTop + yBot) / 2 + t * 6}
          rx={Math.max(topR, botR) * 0.74}
          ry={Math.max(16, Math.min(topR, botR) * 0.22)}
          fill={`rgba(255,255,255,${bandA})`}
          opacity={0.95}
        />

        {/* subtle bloom overlay */}
        <g filter={`url(#${bloomId})`} opacity={bloomA}>
          <rect x={0} y={0} width={width} height={height} fill={`url(#${waterTintId})`} />
        </g>

        {/* transmitted light: thin core bar + side-cast beams at ~45° */}
        <g style={{ mixBlendMode: "screen" }} opacity={0.92}>
          {/* thin core bar */}
          <g filter={`url(#${lightBarBlurId})`} opacity={0.95}>
            <rect
              x={cx - lightBarW / 2}
              y={0}
              width={lightBarW}
              height={height}
              rx={lightBarW / 2}
              fill={`url(#${lightBarId})`}
            />
          </g>

          {/* left-cast beam (carries vertical red/green/amber like the core bar, fades outward) */}
          <g filter={`url(#${beamBlurId})`} opacity={0.98}>
            <g transform={`translate(${cx} ${height * 0.52}) rotate(-45)`}>
              <rect
                x={0}
                y={-sideBeamLen / 2}
                width={sideBeamW}
                height={sideBeamLen}
                rx={sideBeamW / 2}
                fill={`url(#${lightBarId})`}
                mask={`url(#${beamFadeLeftId})`}
              />
            </g>
          </g>

          {/* right-cast beam (carries vertical red/green/amber like the core bar, fades outward) */}
          <g filter={`url(#${beamBlurId})`} opacity={0.98}>
            <g transform={`translate(${cx} ${height * 0.52}) rotate(45)`}>
              <rect
                x={-sideBeamW}
                y={-sideBeamLen / 2}
                width={sideBeamW}
                height={sideBeamLen}
                rx={sideBeamW / 2}
                fill={`url(#${lightBarId})`}
                mask={`url(#${beamFadeRightId})`}
              />
            </g>
          </g>
        </g>
      </g>

      {/* subtle rim to keep silhouette readable on dark backgrounds (approx via masked stroke overlay) */}
      <g mask={`url(#${gooMaskId})`} opacity={0.75}>
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="none"
          stroke={`rgba(255,255,255,${rimA})`}
          strokeWidth={1.5}
        />
      </g>

      {/* faint floor reflection */}
      <g opacity={0.18} transform={`translate(0 ${height}) scale(1 -1)`}>
        <g filter={`url(#${gooId})`} opacity={0.9}>
          <circle cx={cx} cy={yTop} r={topR} fill={`url(#${waterTintId})`} />
          <circle cx={cx} cy={yMid} r={midR} fill={`url(#${waterTintId})`} />
          <circle cx={cx} cy={yBot} r={botR} fill={`url(#${waterTintId})`} />
        </g>
        <rect x={0} y={0} width={width} height={height} fill="rgba(0,0,0,0.55)" />
      </g>
    </svg>
    </div>
  );
}
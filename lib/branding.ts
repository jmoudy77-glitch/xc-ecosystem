// lib/branding.ts
//
// Program / school branding → semantic theme tokens → CSS variables.
// Designed so we won't have to refactor later when multi-tenant gets fancy.

import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export type ProgramThemeTokens = {
  // =========================
  // v1 Theme Token Contract
  // =========================
  // Core neutrals
  appBg: string; // --app-bg
  surface1: string; // --surface-1
  surface2: string; // --surface-2
  surface3: string; // --surface-3
  border: string; // --border
  borderMuted: string; // --border-muted
  text: string; // --text
  textMuted: string; // --text-muted
  textSubtle: string; // --text-subtle
  focusRing: string; // --focus-ring

  // Brand + accents
  brand: string; // --brand
  brandContrast: string; // --brand-contrast
  accent: string; // --accent
  accentContrast: string; // --accent-contrast
  brandSoft: string; // --brand-soft
  brandRail: string; // --brand-rail
  link: string; // --link

  // Semantic support colors
  success: string; // --success
  successContrast: string; // --success-contrast
  warning: string; // --warning
  warningContrast: string; // --warning-contrast
  danger: string; // --danger
  dangerContrast: string; // --danger-contrast
  info: string; // --info
  infoContrast: string; // --info-contrast

  // Identity
  logoUrl?: string | null;
  wordmarkUrl?: string | null;

  // =========================
  // Surface System (v1)
  // Semantic surface roles used by global utilities (bg-canvas, panel, panel-muted, ring-panel)
  // =========================
  canvasBg: string; // --canvas-bg
  panelBg: string; // --panel-bg
  panelMutedBg: string; // --panel-muted-bg
  panelRing: string; // --panel-ring

  // =========================
  // Legacy aliases (kept for backwards compatibility)
  // =========================
  // These map to the older theming approach used in existing screens.
  // New code should prefer the v1 token keys above.
  background: string; // legacy
  foreground: string; // legacy
  brandPrimary: string; // legacy
  brandSecondary: string; // legacy
  surface: string; // legacy
  borderSubtle: string; // legacy
  mutedForeground: string; // legacy
};

export const DEFAULT_THEME: ProgramThemeTokens = {
  // v1 neutrals (default dark) — hue-agnostic (no slate/navy tint)
  appBg: "#070708",
  surface1: "#0f1012",
  surface2: "#15171a",
  surface3: "#1c1f24",
  border: "#2a2d33",
  borderMuted: "#1f2227",
  text: "#f2f4f8",
  textMuted: "#a6adb8",
  textSubtle: "#6d7480",
  focusRing: "#38bdf8",

  // v1 brand + accents
  brand: "#2563eb",
  brandContrast: "#ffffff",
  accent: "#22c55e",
  accentContrast: "#052e16",
  brandSoft: "#2563eb33", // ~20% alpha
  brandRail: "#2563eb",
  link: "#38bdf8",

  // v1 semantic support
  success: "#22c55e",
  successContrast: "#052e16",
  warning: "#f97316",
  warningContrast: "#431407",
  danger: "#ef4444",
  dangerContrast: "#450a0a",
  info: "#38bdf8",
  infoContrast: "#082f49",

  // identity
  logoUrl: null,
  wordmarkUrl: null,

  // Surface System (v1)
  // Keep canvas slightly lifted from appBg so panels never visually merge.
  canvasBg: "#0b0c0d",
  panelBg: "#15171a",
  // Muted panels blend toward canvas for depth without aggressive glass.
  panelMutedBg: "#121316",
  panelRing: "#2a2d33",

  // legacy aliases (kept)
  background: "#070708",
  foreground: "#f2f4f8",
  brandPrimary: "#15171a",
  brandSecondary: "#0f1012",
  surface: "#0f1012",
  borderSubtle: "#2a2d33",
  mutedForeground: "#a6adb8",
};
function hexWithAlpha(hex: string, alphaHex: string): string {
  // Supports #RGB or #RRGGBB; falls back to original if format is unexpected.
  const h = hex.trim();
  if (!h.startsWith("#")) return hex;
  const raw = h.slice(1);
  if (raw.length === 3) {
    const r = raw[0];
    const g = raw[1];
    const b = raw[2];
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`;
  }
  if (raw.length === 6) {
    return `#${raw}${alphaHex}`;
  }
  return hex;
}

type RGB = { r: number; g: number; b: number };

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function parseHexColor(hex: string): RGB | null {
  const h = hex.trim();
  if (!h.startsWith("#")) return null;
  const raw = h.slice(1);
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    return { r, g, b };
  }
  if (raw.length === 6) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    return { r, g, b };
  }
  return null;
}

function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mix(a: string, b: string, t: number): string {
  const A = parseHexColor(a);
  const B = parseHexColor(b);
  if (!A || !B) return a;
  const tt = clamp01(t);
  return rgbToHex({
    r: A.r + (B.r - A.r) * tt,
    g: A.g + (B.g - A.g) * tt,
    b: A.b + (B.b - A.b) * tt,
  });
}

function relativeLuminance(hex: string): number {
  const c = parseHexColor(hex);
  if (!c) return 0;
  const srgb = [c.r, c.g, c.b].map((v) => v / 255);
  const lin = srgb.map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrastText(bgHex: string): string {
  // Simple, durable contrast pick for UI chrome.
  return relativeLuminance(bgHex) > 0.55 ? "#0b0f19" : "#ffffff";
}

function ensureNeutral(hex: string, fallback: string): string {
  // For now, we treat user-provided background/surface as authoritative.
  // If not a valid hex, fall back to a known-neutral default.
  return parseHexColor(hex) ? hex.trim() : fallback;
}

type ThemeMode = "dark" | "light" | "system";

function normalizeThemeMode(mode?: string | null): ThemeMode {
  const m = (mode ?? "").trim().toLowerCase();
  if (m === "light") return "light";
  if (m === "system") return "system";
  return "dark";
}

function isValidHexColor(hex?: string | null) {
  if (!hex) return false;
  return parseHexColor(hex.trim()) !== null;
}

function pickDefaultAccent(mode: ThemeMode, secondary?: string | null): string {
  // Coaches commonly set secondary to black/white; use it if it's a usable contrast accent,
  // otherwise fall back to a safe default.
  const sec = isValidHexColor(secondary) ? secondary!.trim() : null;

  if (mode === "light") {
    // In light mode, a dark accent is useful; prefer secondary if it's dark enough.
    if (sec && relativeLuminance(sec) < 0.35) return sec;
    return "#111827"; // slate-900-ish neutral
  }

  // Dark/system defaults: white accent is reliable.
  if (sec && relativeLuminance(sec) > 0.75) return sec; // if they gave a bright secondary, use it
  return "#ffffff";
}

function deriveNeutralDefaults(mode: ThemeMode) {
  // Hue-agnostic neutrals (no slate/navy tint). These are our "auto" defaults when coach leaves fields blank.
  if (mode === "light") {
    const appBg = "#f7f7f8";
    const surface1 = "#ffffff";
    const text = "#0b0f19";
    const textMuted = "#4b5563";
    return { appBg, surface1, text, textMuted };
  }

  // dark + system (we treat system as dark for now; can be expanded later)
  const appBg = "#070708";
  const surface1 = "#0f1012";
  const text = "#f2f4f8";
  const textMuted = "#a6adb8";
  return { appBg, surface1, text, textMuted };
}

function deriveFromMinimalBranding(opts: {
  primary?: string | null;
  secondary?: string | null;
  accent?: string | null;
  mode?: ThemeMode;
}) {
  const mode = opts.mode ?? "dark";
  const neutrals = deriveNeutralDefaults(mode);

  const brand = isValidHexColor(opts.primary) ? opts.primary!.trim() : DEFAULT_THEME.brand;

  const accent =
    isValidHexColor(opts.accent)
      ? opts.accent!.trim()
      : pickDefaultAccent(mode, opts.secondary ?? null);

  const link = brand; // brand-tinted atmosphere by default
  const focusRing = link;

  return { mode, ...neutrals, brand, accent, link, focusRing };
}

// Optional: how we conceptually map “brand roles” → semantic usage buckets
export type BrandRole =
  | "primary"
  | "secondary"
  | "accent"
  | "neutral"
  | "success"
  | "warning"
  | "danger";

export const BRAND_ROLE_TO_SEMANTIC: Record<BrandRole, keyof ProgramThemeTokens> =
  {
    primary: "brand",
    secondary: "accent",
    accent: "accent",
    neutral: "surface1",
    success: "success",
    warning: "warning",
    danger: "danger",
  };

type ProgramBrandingRow = {
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  surface_color: string | null;
  foreground_color: string | null;
  muted_foreground_color: string | null;
  success_color: string | null;
  warning_color: string | null;
  danger_color: string | null;
  link_color: string | null;
  logo_url: string | null;
  wordmark_url: string | null;
  theme_mode?: string | null;
};

type SchoolRow = {
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
};

type ProgramRow = {
  id: string;
  school_id: string | null;
};

async function fetchProgramBranding(programId: string) {
  const supabase = await supabaseServerComponent();

  const { data: programBranding, error: brandingError } =
    await supabase
      .from("program_branding")
      .select("*")
      .eq("program_id", programId)
      .maybeSingle<ProgramBrandingRow>();

  if (brandingError) {
    console.error("[branding] error loading program_branding", brandingError);
  }

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, school_id")
    .eq("id", programId)
    .maybeSingle<ProgramRow>();

  if (programError) {
    console.error("[branding] error loading program", programError);
  }

  let school: SchoolRow | null = null;

  if (program?.school_id) {
    const { data: schoolRow, error: schoolError } = await supabase
      .from("schools")
      .select("primary_color, secondary_color, logo_url")
      .eq("id", program.school_id)
      .maybeSingle<SchoolRow>();

    if (schoolError) {
      console.error("[branding] error loading school", schoolError);
    }

    school = schoolRow ?? null;
  }

  return { programBranding, school };
}

function coalesceColor(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const v of values) {
    if (v && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

/**
 * Load the theme for a given program.
 *
 * For now, callers can pass `null`/`undefined` and we’ll just return DEFAULT_THEME,
 * but the function is structured so we can easily route by active program later.
 */
export async function loadProgramTheme(
  programId?: string | null
): Promise<ProgramThemeTokens> {
  if (!programId) {
    return DEFAULT_THEME;
  }

  const { programBranding, school } = await fetchProgramBranding(programId);

  if (!programBranding && !school) {
    return DEFAULT_THEME;
  }

  // Build the theme by layering:
  // DEFAULT_THEME → school colors → program_branding overrides
  const base = { ...DEFAULT_THEME };

  const themeMode = normalizeThemeMode(programBranding?.theme_mode ?? null);

  const bg = coalesceColor(programBranding?.background_color);
  const fg = coalesceColor(programBranding?.foreground_color);
  const surface = coalesceColor(programBranding?.surface_color);

  const brandPrimary = coalesceColor(
    programBranding?.primary_color,
    school?.primary_color
  );
  const brandSecondary = coalesceColor(
    programBranding?.secondary_color,
    school?.secondary_color
  );
  const accent = coalesceColor(programBranding?.accent_color);

  const derived = deriveFromMinimalBranding({
    primary: brandPrimary,
    secondary: brandSecondary,
    accent,
    mode: themeMode,
  });

  const muted = coalesceColor(programBranding?.muted_foreground_color);
  const success = coalesceColor(programBranding?.success_color);
  const warning = coalesceColor(programBranding?.warning_color);
  const danger = coalesceColor(programBranding?.danger_color);
  const link = coalesceColor(programBranding?.link_color);
  const logoUrl = coalesceColor(programBranding?.logo_url, school?.logo_url);
  const wordmarkUrl = coalesceColor(programBranding?.wordmark_url);

  // -------------------------
  // v1 derived tokens
  // Goal:
  // - Neutrals are hue-agnostic (no default slate/navy tint).
  // - "Atmosphere" (rails/soft fills/focus) is brand-tinted (per your #2 choice).
  // -------------------------

  // Core neutrals: prefer explicit program_branding, else fall back to DEFAULT_THEME v1 neutrals.
  const appBg = ensureNeutral(bg ?? derived.appBg ?? base.appBg, base.appBg);
  const surface1Base = ensureNeutral(surface ?? derived.surface1 ?? base.surface1, base.surface1);

  // Elevation ladder (neutral): small lifts toward text (not toward brand).
  // This keeps black/red themes from inheriting a blue cast.
  const surface1 = surface1Base;
  const surface2 = mix(surface1, base.text, 0.06);
  const surface3 = mix(surface1, base.text, 0.10);

  const text = ensureNeutral(fg ?? derived.text ?? base.text, base.text);
  const textMuted = ensureNeutral(muted ?? derived.textMuted ?? base.textMuted, base.textMuted);
  const textSubtle = mix(textMuted, appBg, 0.35);

  // Borders remain neutral; derive from surfaces/text so they work for any palette.
  const border = mix(surface2, text, 0.14);
  const borderMuted = mix(surface1, text, 0.10);

  // -------------------------
  // Surface System (v1)
  // Intent: canvas is distinct from appBg; panels are distinct from canvas.
  // Keep this neutral (no brand tint) so it works across any primary/secondary colors.
  // -------------------------
  const canvasBg = appBg; // subtle lift off app background
  const panelBg = surface2;
  const panelMutedBg = mix(panelBg, canvasBg, 0.35); // muted depth without aggressive translucency
  const panelRing = border;

  // Brand & accents
  const brand = (brandPrimary ?? derived.brand ?? base.brand).trim();
  const brandContrast = contrastText(brand);

  const accentResolved = (accent ?? derived.accent ?? base.accent).trim();
  const accentContrast = contrastText(accentResolved);

  // Brand-tinted atmosphere: use brand unless explicit link_color is provided.
  const linkResolved = (link ?? derived.link ?? brand).trim();
  const focusRing = link ?? derived.focusRing ?? linkResolved;

  const brandSoft = hexWithAlpha(brand, "33"); // ~20% alpha
  const brandRail = brand;

  return {
    // v1
    appBg,
    surface1,
    surface2,
    surface3,
    border,
    borderMuted,
    text,
    textMuted,
    textSubtle,
    focusRing,

    // Surface System (v1)
    canvasBg,
    panelBg,
    panelMutedBg,
    panelRing,

    brand,
    brandContrast,
    accent: accentResolved,
    accentContrast,
    brandSoft,
    brandRail,
    link: linkResolved,

    success: success ?? base.success,
    successContrast: "#052e16",
    warning: warning ?? base.warning,
    warningContrast: "#431407",
    danger: danger ?? base.danger,
    dangerContrast: "#450a0a",
    info: linkResolved,
    infoContrast: "#082f49",

    logoUrl: logoUrl ?? base.logoUrl ?? null,
    wordmarkUrl: wordmarkUrl ?? base.wordmarkUrl ?? null,

    // legacy (kept)
    background: appBg,
    foreground: text,
    brandPrimary: surface2,
    brandSecondary: surface1,
    surface: surface1,
    borderSubtle: border,
    mutedForeground: textMuted,
  };
}
// lib/branding.ts
//
// Program / school branding → semantic theme tokens → CSS variables.
// Designed so we won't have to refactor later when multi-tenant gets fancy.

import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export type ProgramThemeTokens = {
  // Core page colors (map directly to --background / --foreground)
  background: string;
  foreground: string;

  // Brand + accents
  brandPrimary: string;
  brandSecondary: string;
  accent: string;

  // Surfaces & borders
  surface: string;
  borderSubtle: string;

  // Status colors
  success: string;
  warning: string;
  danger: string;

  // Text
  mutedForeground: string;
  link: string;

  // Identity
  logoUrl?: string | null;
  wordmarkUrl?: string | null;
};

// Default “XC Ecosystem” dark palette – roughly your current slate stack
export const DEFAULT_THEME: ProgramThemeTokens = {
  background: "#020617",
  foreground: "#e5e7eb",
  brandPrimary: "#0f172a",
  brandSecondary: "#1e293b",
  accent: "#22c55e",
  surface: "#020617",
  borderSubtle: "#1f2937",
  success: "#22c55e",
  warning: "#f97316",
  danger: "#ef4444",
  mutedForeground: "#9ca3af",
  link: "#38bdf8",
  logoUrl: null,
  wordmarkUrl: null,
};

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
    primary: "brandPrimary",
    secondary: "brandSecondary",
    accent: "accent",
    neutral: "surface",
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

  const bg = coalesceColor(
    programBranding?.background_color,
    school?.primary_color ? "#020617" : null // optional tweak
  );
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
  const muted = coalesceColor(programBranding?.muted_foreground_color);
  const success = coalesceColor(programBranding?.success_color);
  const warning = coalesceColor(programBranding?.warning_color);
  const danger = coalesceColor(programBranding?.danger_color);
  const link = coalesceColor(programBranding?.link_color);
    const logoUrl = coalesceColor(
    programBranding?.logo_url,
    school?.logo_url
  );
  const wordmarkUrl = coalesceColor(programBranding?.wordmark_url);

    return {
    background: bg ?? base.background,
    foreground: fg ?? base.foreground,
    brandPrimary: brandPrimary ?? base.brandPrimary,
    brandSecondary: brandSecondary ?? base.brandSecondary,
    accent: accent ?? base.accent,
    surface: surface ?? base.surface,
    borderSubtle: base.borderSubtle,
    success: success ?? base.success,
    warning: warning ?? base.warning,
    danger: danger ?? base.danger,
    mutedForeground: muted ?? base.mutedForeground,
    link: link ?? base.link,
    logoUrl: logoUrl ?? base.logoUrl ?? null,
    wordmarkUrl: wordmarkUrl ?? base.wordmarkUrl ?? null,
  };
}
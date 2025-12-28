'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

type KernelUpsertProgramBrandingInput = {
  programId: string;

  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;

  backgroundColor?: string | null;
  surfaceColor?: string | null;

  foregroundColor?: string | null;
  mutedForegroundColor?: string | null;

  successColor?: string | null;
  warningColor?: string | null;
  dangerColor?: string | null;

  linkColor?: string | null;

  logoUrl?: string | null;
  wordmarkUrl?: string | null;
  mascotName?: string | null;

  themeMode?: 'light' | 'dark' | 'system' | string | null;

  metadata?: Record<string, any> | null;
};

type KernelUpsertProgramBrandingResult = {
  canonicalEventId: string;
  brandingId: string;
};

function getSupabaseServerClient() {
  const cookieStore = cookies() as any;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

export async function kernelUpsertProgramBranding(
  input: KernelUpsertProgramBrandingInput
): Promise<KernelUpsertProgramBrandingResult> {
  const supabase = getSupabaseServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error('Unauthorized');
  }

  const params = {
    p_program_id: input.programId,

    p_primary_color: input.primaryColor ?? null,
    p_secondary_color: input.secondaryColor ?? null,
    p_accent_color: input.accentColor ?? null,

    p_background_color: input.backgroundColor ?? null,
    p_surface_color: input.surfaceColor ?? null,

    p_foreground_color: input.foregroundColor ?? null,
    p_muted_foreground_color: input.mutedForegroundColor ?? null,

    p_success_color: input.successColor ?? null,
    p_warning_color: input.warningColor ?? null,
    p_danger_color: input.dangerColor ?? null,

    p_link_color: input.linkColor ?? null,

    p_logo_url: input.logoUrl ?? null,
    p_wordmark_url: input.wordmarkUrl ?? null,
    p_mascot_name: input.mascotName ?? null,

    p_theme_mode: input.themeMode ?? null,

    p_metadata: input.metadata ?? null,
  };

  const { data, error } = await supabase.rpc('kernel_upsert_program_branding', params);

  if (error) {
    throw new Error(`kernel_upsert_program_branding failed: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const canonicalEventId = row?.canonical_event_id as string | undefined;
  const brandingId = row?.branding_id as string | undefined;

  if (!canonicalEventId || !brandingId) {
    throw new Error('kernel_upsert_program_branding returned incomplete response');
  }

  return { canonicalEventId, brandingId };
}

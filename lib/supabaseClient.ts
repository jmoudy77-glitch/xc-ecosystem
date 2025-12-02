// lib/supabaseClient.ts
//
// Browser-side Supabase client using @supabase/ssr.
// This ensures sessions are stored as cookies (NOT localStorage)
// so that the server can read them using supabaseServer(req).

import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
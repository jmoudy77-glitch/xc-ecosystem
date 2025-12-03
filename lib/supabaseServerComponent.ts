// lib/supabaseServerComponent.ts
//
// Supabase client for Server Components / Server Actions in the Next.js App Router.
// Mirrors the cookie access pattern from supabaseServer.ts.

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
// import type { Database } from "@/lib/types/database"; // if you have generated types

export function supabaseServerComponent() {
  // Treat this like `req.cookies` in supabaseServer.ts
  const cookieStore = cookies() as any;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 👇 Same pattern as supabaseServer.ts: `.get(name)?.value`
        get(name: string) {
          return cookieStore.get(name)?.value as string | undefined;
        },
        // In Server Components, cookies() is effectively read-only.
        // We provide no-op implementations so Supabase doesn't blow up.
        set(_name: string, _value: string, _options: CookieOptions) {
          // no-op
        },
        remove(_name: string, _options: CookieOptions) {
          // no-op
        },
      },
    }
  );

  return supabase;
}
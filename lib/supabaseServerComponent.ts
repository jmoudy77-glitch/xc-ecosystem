// lib/supabaseServerComponent.ts
//
// Supabase client for Server Components / Server Actions in the Next.js App Router.
// Uses the async cookies() API in Next 16.

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
// import type { Database } from "@/lib/types/database"; // if you have generated types

export async function supabaseServerComponent() {
  // Next 16: cookies() returns a Promise
  const cookieStore = (await (cookies as any)()) as any;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore?.get?.(name) as any;

          if (!cookie) return undefined;
          if (typeof cookie === "string") return cookie;
          return cookie.value as string | undefined;
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
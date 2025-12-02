// lib/supabaseServer.ts
//
// Server-side Supabase client for Next.js App Router using @supabase/ssr.
// Binds to the incoming NextRequest so Supabase can read/write auth cookies.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export function supabaseServer(req: NextRequest) {
  if (!req) {
    throw new Error("supabaseServer(req) was called without a NextRequest.");
  }

  // Mutable response that Supabase can write auth cookies into
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ Explicitly typed parameters so TS is happy
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          res.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  return { supabase, res };
}
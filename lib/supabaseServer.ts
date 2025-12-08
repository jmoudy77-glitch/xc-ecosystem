// lib/supabaseServer.ts
//
// Server-side Supabase client for Next.js App Router using @supabase/ssr.
// Binds to the incoming NextRequest so Supabase can read/write auth cookies.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export function supabaseServer(cookieStoreOrReq?: any, res?: NextResponse) {
  // For route handlers, a NextResponse can be passed in; otherwise we create one.
  const response = res ?? NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // App Router server components: cookieStore from `cookies()`
          if (cookieStoreOrReq && typeof cookieStoreOrReq.get === "function") {
            const value = cookieStoreOrReq.get(name);
            // cookies().get(name) returns { name, value } or undefined
            if (value && typeof value === "object" && "value" in value) {
              return (value as any).value;
            }
            return value;
          }

          // Route handlers / pages: NextRequest with req.cookies.get
          if (
            cookieStoreOrReq &&
            cookieStoreOrReq.cookies &&
            typeof cookieStoreOrReq.cookies.get === "function"
          ) {
            return cookieStoreOrReq.cookies.get(name)?.value;
          }

          return undefined;
        },
        set(name: string, value: string, options: any) {
          // Route handlers: use response.cookies.set
          if (response && (response as any).cookies && typeof (response as any).cookies.set === "function") {
            (response as any).cookies.set(name, value, options);
          }
        },
        remove(name: string, options: any) {
          if (response && (response as any).cookies && typeof (response as any).cookies.set === "function") {
            (response as any).cookies.set(name, "", { ...(options || {}), maxAge: 0 });
          }
        },
      },
    }
  );

  return { supabase, res: response };
}
// lib/supabaseServer.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type CookieLike = {
  name: string;
  value: string;
};

type CookieStoreLike = {
  getAll?: () => CookieLike[];
  cookies?: {
    getAll?: () => CookieLike[];
  };
};

export async function supabaseServer(cookieStoreOrReq?: CookieStoreLike, res?: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = res ?? NextResponse.next();
  const cookieStore =
    cookieStoreOrReq?.cookies && typeof cookieStoreOrReq.cookies.getAll === "function"
      ? cookieStoreOrReq.cookies
      : cookieStoreOrReq;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => {
        if (typeof cookieStore?.getAll === "function") return cookieStore.getAll();
        return [];
      },
      setAll: (cookies) => {
        if (response?.cookies?.set) {
          for (const c of cookies) response.cookies.set(c.name, c.value, c as any);
        }
      },
    },
  });

  return { supabase, res: response };
}

// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type SupabaseServerResult = {
  supabase: SupabaseClient;
  accessToken: string | null;
};

// Minimal interface so TS knows cookies().get() exists and returns { value }
interface CookieStore {
  get(name: string): { value: string } | undefined;
}

export function supabaseServer(): SupabaseServerResult {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars"
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // cookies() returns a special object; we narrow it to something with .get()
  const cookieStore = cookies() as unknown as CookieStore;
  const accessTokenCookie = cookieStore.get("sb-access-token");
  const accessToken = accessTokenCookie ? accessTokenCookie.value : null;

  return { supabase, accessToken };
}



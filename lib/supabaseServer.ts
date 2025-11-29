// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type SupabaseServerResult = {
  supabase: SupabaseClient;
  accessToken: string | null;
};

export async function supabaseServer(): Promise<SupabaseServerResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars"
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // In your Next version, cookies() is async → await it
  const cookieStore = await cookies();
  const accessTokenCookie = cookieStore.get("sb-access-token");
  const accessToken = accessTokenCookie?.value ?? null;

  return { supabase, accessToken };
}




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

  // In your Next version, cookies() is async
  const cookieStore = await cookies();

  // Supabase v2 auth cookie looks like: sb-<project-ref>-auth-token
  const allCookies = cookieStore.getAll();
  const authCookie = allCookies.find((c) =>
    c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );

  let accessToken: string | null = null;

  if (authCookie) {
    try {
      // Cookie value is JSON: { access_token, refresh_token, ... }
      const parsed = JSON.parse(authCookie.value) as {
        access_token?: string;
      };

      if (parsed.access_token) {
        accessToken = parsed.access_token;
      }
    } catch (err) {
      console.error("Failed to parse Supabase auth cookie:", err);
    }
  }

  return { supabase, accessToken };
}




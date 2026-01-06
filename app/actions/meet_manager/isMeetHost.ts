/* File: app/actions/meet_manager/isMeetHost.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function supabaseServer(cookieStore: any) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) throw new Error("Missing Supabase env vars.");

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

export async function isMeetHost(meetId: string): Promise<boolean> {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  const { data, error } = await supabase.rpc("mm_is_meet_host", { p_meet_id: meetId });
  if (error) throw error;

  return Boolean(data);
}

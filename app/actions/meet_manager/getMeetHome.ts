"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getMeetHome(meetId: string) {
  const cookieStore = cookies() as any;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data, error } = await supabase
    .from("meets")
    .select("id, meet_type, lifecycle_state, start_date, location, is_invitational")
    .eq("id", meetId)
    .single();

  if (error) throw error;
  return data;
}

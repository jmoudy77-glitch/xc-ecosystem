"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getMeetEvents(meetId: string) {
  const cookieStore = (await cookies()) as any;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data, error } = await supabase
    .from("meet_events")
    .select("*")
    .eq("meet_id", meetId)
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return data;
}

// app/lib/supabaseServer.ts
// Shim to provide a createSupabaseServerClient helper for app/* imports.

import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { supabase } = await supabaseServer(cookieStore);
  return supabase;
}

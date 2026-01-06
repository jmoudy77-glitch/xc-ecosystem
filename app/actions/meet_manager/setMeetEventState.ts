/* File: app/actions/meet_manager/setMeetEventState.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type EventType = "XC" | "TRACK" | "FIELD";

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

export async function setMeetEventState(eventId: string, eventType: EventType, nextState: string) {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  const patch: any = { updated_at: new Date().toISOString() };

  if (eventType === "XC") {
    patch.xc_state = nextState;
    patch.tf_state = null;
    patch.field_state = null;
  } else if (eventType === "TRACK") {
    patch.xc_state = null;
    patch.tf_state = nextState;
    patch.field_state = null;
  } else {
    patch.xc_state = null;
    patch.tf_state = null;
    patch.field_state = nextState;
  }

  const { error } = await supabase.from("meet_events").update(patch).eq("id", eventId);
  if (error) throw error;
}

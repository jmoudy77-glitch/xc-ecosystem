// app/athletes/me/page.tsx

import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function AthleteMePage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 1) Get authenticated Supabase user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // 2) Resolve app-level user (public.users)
  const { data: appUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .maybeSingle<{ id: string }>();

  if (!appUser) {
    // Auth user exists but no app profile yet
    redirect("/account");
  }

  // 3) Resolve athlete linked to this user
  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, is_claimed")
    .eq("user_id", appUser.id)
    .maybeSingle<{ id: string; is_claimed: boolean }>();

  if (!athlete) {
    // User has no athlete record yet — send to onboarding
    redirect("/onboarding/athlete");
  }

  // 4) Final: athlete home (single athlete surface)
  // Claim completion should be handled via modal/UX on the athlete page, not via redirects,
  // to avoid redirect loops and keep athletes on their primary page.
  redirect(`/athletes/${athlete.id}`);
}

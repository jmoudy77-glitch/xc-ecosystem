// app/home/page.tsx

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export default async function HomeResolverPage() {
  const cookieStore = (await cookies()) as any;

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

  // 1) Must be authenticated
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // 2) Resolve app-level user
  const { data: appUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .maybeSingle<{ id: string }>();

  if (!appUser) {
    // Auth exists but app profile not created yet
    redirect("/account");
  }

  // 3) Coach/staff: prefer program membership when present
  // Resolve their program membership; if none, send to coach onboarding or athlete fallback.
  const { data: membership, error: membershipError } = await supabase
    .from("program_members")
    .select("program_id")
    .eq("user_id", appUser.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ program_id: string }>();

  if (membershipError) {
    // Fail safe to dashboard if membership query fails
    redirect("/dashboard");
  }

  if (!membership?.program_id) {
    // No program membership: check if they are an athlete
    const { data: athlete } = await supabase
      .from("athletes")
      .select("id, is_claimed")
      .eq("user_id", appUser.id)
      .maybeSingle<{ id: string; is_claimed: boolean }>();

    if (athlete) {
      // Athlete path
      redirect("/athletes/me");
    }

    // Otherwise send to coach onboarding
    redirect("/onboarding/coach");
  }

  const programId = membership.program_id;

  // Check for teams under the program
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, is_primary")
    .eq("program_id", programId)
    .order("created_at", { ascending: true });

  if (teamsError) {
    redirect("/dashboard");
  }

  if (!teams || teams.length === 0) {
    // Bootstrap teams
    redirect(`/programs/${programId}/teams`);
  }

  const primaryTeam = teams.find((t) => t.is_primary) ?? teams[0];

  // Send coach to the team surface; that page can handle seasons bootstrap and day-to-day management.
  redirect(`/programs/${programId}/teams/${primaryTeam.id}`);
}

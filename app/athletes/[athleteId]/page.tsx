// app/athletes/[athleteId]/page.tsx
import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import AthleteProfileClient from "./AthleteProfileClient";

type PageProps = {
  params: Promise<{
    athleteId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Athlete Profile | XC Ecosystem",
};

// Simple server-side Supabase client using the anon key.
// This runs only on the server in this file and is not exposed to the browser.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

export default async function AthletePage({ params }: PageProps) {
  const { athleteId } = await params;

  // Fetch athlete by ID from Supabase
  const { data, error } = await supabase
    .from("athletes")
    .select(
      [
        "id",
        "first_name",
        "last_name",
        "grad_year",
        "hs_school_name",
        "hs_city",
        "hs_state",
        "event_group",
        "avatar_url",
        "gender",
      ].join(",")
    )
    .eq("id", athleteId)
    .single();

  if (error) {
    console.error("[AthletePage] Supabase error", error);
  }

  if (error || !data) {
    // Basic fallback – we can upgrade to notFound() later
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 text-sm text-slate-300">
        <p className="mb-2 text-base font-semibold text-slate-100">
          Athlete not found
        </p>
        <p className="text-slate-400">
          We couldn&apos;t find an athlete matching that ID. Please check the
          link or return to your roster or recruiting board.
        </p>
      </div>
    );
  }

  // Map DB row into the shape AthleteProfileClient expects
  const row = data as any;

  const athlete = {
    id: row.id as string,
    fullName: `${row.first_name} ${row.last_name}`,
    gradYear: row.grad_year as number | null,
    schoolName: (row.hs_school_name as string | null) ?? null,
    schoolLocation: [
      row.hs_city as string | null,
      row.hs_state as string | null,
    ]
      .filter(Boolean)
      .join(", "),
    eventGroup: (row.event_group as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    gender: (row.gender as string | null) ?? null,
  };

  // TODO: real role detection from auth + membership
  const roleContext = {
    isCoachView: true,
    isAthleteSelf: false,
  };

  return (
    <div className="mx-auto w-full max-w-[95vw] px-0 md:px-2 py-4 md:py-4">
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4 md:px-6 md:py-6">
        <AthleteProfileClient athlete={athlete} roleContext={roleContext} />
      </div>
    </div>
  );
}
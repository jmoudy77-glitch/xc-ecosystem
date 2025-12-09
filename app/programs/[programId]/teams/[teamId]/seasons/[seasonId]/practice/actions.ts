//app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/actions.ts
"use server";

import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { revalidatePath } from "next/cache";

const STATUS_OPTIONS = ["planned", "published", "completed", "canceled"] as const;
export type PracticeStatus = (typeof STATUS_OPTIONS)[number];

export type CreatePracticePlanInput = {
  programId: string;
  teamId: string;
  teamSeasonId: string;
  practiceDate: string; // YYYY-MM-DD
  startTime?: string | null; // HH:MM
  endTime?: string | null;   // HH:MM
  location?: string | null;
  label: string;
  notes?: string | null;
  status: PracticeStatus;
};

function combineDateTime(date: string, time?: string | null): string | null {
  if (!time) return null;
  const d = new Date(`${date}T${time}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function createPracticePlan(
  input: CreatePracticePlanInput
): Promise<{ success: boolean; error?: string }> {
  if (!input.label.trim()) {
    return { success: false, error: "Label is required." };
  }

  if (!input.practiceDate) {
    return { success: false, error: "Practice date is required." };
  }

  const supabase = await supabaseServerComponent();

  const { error } = await supabase.from("practice_plans").insert({
    program_id: input.programId,
    team_season_id: input.teamSeasonId,
    practice_date: input.practiceDate,
    start_time: combineDateTime(input.practiceDate, input.startTime),
    end_time: combineDateTime(input.practiceDate, input.endTime),
    location: input.location || null,
    label: input.label.trim(),
    notes: input.notes || null,
    status: input.status,
  });

  if (error) {
    console.error("[createPracticePlan] insert error:", error.message || error);
    return {
      success: false,
      error: error.message ?? "Failed to create practice.",
    };
  }

  const path = `/programs/${input.programId}/teams/${input.teamId}/seasons/${input.teamSeasonId}/practice`;
  revalidatePath(path);

  return { success: true };
}
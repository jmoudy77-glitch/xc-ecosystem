import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function getSeasonRoster(seasonId: string) {
  const { data: rosterRows, error: rosterError } = await supabaseAdmin
    .from("team_roster")
    .select(
      `
      id,
      team_season_id,
      athlete_id,
      program_recruit_id,
      status,
      role,
      scholarship_amount,
      scholarship_unit,
      scholarship_notes,
      created_at,
      athletes (
        id,
        first_name,
        last_name,
        grad_year,
        avatar_url
      )
    `
    )
    .eq("team_season_id", seasonId)
    .order("created_at", { ascending: true });

  if (rosterError) {
    throw rosterError;
  }

  const roster = (rosterRows ?? []).map((row: any) => {
    const athleteRel = (row as any).athletes;
    const athleteRecord = Array.isArray(athleteRel) ? athleteRel[0] : athleteRel;

    const firstName = athleteRecord?.first_name as string | undefined;
    const lastName = athleteRecord?.last_name as string | undefined;
    const fullName =
      [firstName, lastName].filter(Boolean).join(" ") || "Athlete";

    return {
      id: row.id as string,
      teamSeasonId: row.team_season_id as string,
      athleteId: (row.athlete_id as string | null) ?? null,
      programRecruitId:
        (row.program_recruit_id as string | null) ?? null,
      status: (row.status as string | null) ?? null,
      role: (row.role as string | null) ?? null,

      // Fields expected by SeasonRosterClient
      name: fullName,
      email: null,
      avatarUrl: (athleteRecord?.avatar_url as string | null) ?? null,

      // Extra metadata
      athleteName: fullName,
      gradYear:
        (athleteRecord?.grad_year as number | null | undefined) ?? null,
      scholarshipAmount:
        (row.scholarship_amount as number | null) ?? null,
      scholarshipUnit:
        (row.scholarship_unit as string | null) ?? "percent",
      scholarshipNotes:
        (row.scholarship_notes as string | null) ?? null,
      createdAt: row.created_at as string | null,
    };
  });

  return roster;
}

type RouteParams = {
  params: Promise<{
    athleteId: string;
  }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { athleteId } = await params;

  if (!athleteId) {
    return NextResponse.json(
      { error: "Missing athleteId in route params" },
      { status: 400 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const bucket = "avatars";
    const ext = file.type.split("/")[1] || "jpg";
    const filePath = `athletes/${athleteId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      console.error("[AvatarUpload] upload error", uploadError);
      return NextResponse.json(
        { error: "Failed to upload avatar" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);

    const { error: updateError } = await supabaseAdmin
      .from("athletes")
      .update({ avatar_url: publicUrl })
      .eq("id", athleteId);

    if (updateError) {
      console.error("[AvatarUpload] update error", updateError);
      return NextResponse.json(
        { error: "Failed to save avatar URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (err) {
    console.error("[AvatarUpload] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error uploading avatar" },
      { status: 500 }
    );
  }
}
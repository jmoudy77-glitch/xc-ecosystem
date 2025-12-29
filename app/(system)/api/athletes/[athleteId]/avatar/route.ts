import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSeasonRoster } from "./getSeasonRoster";

export const runtime = "nodejs";

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

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      avatarUrl: publicUrl,
    });
  } catch (err) {
    console.error("[AvatarUpload] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error uploading avatar" },
      { status: 500 }
    );
  }
}

// app/api/athletes/[athleteId]/media/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const BUCKET = "athlete-media";

// POST: upload highlight or action shot
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ athleteId: string }> }
) {
  const { athleteId } = await context.params;

  if (!athleteId) {
    return NextResponse.json({ error: "Missing athleteId" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const role = formData.get("role");
  const sortOrder = formData.get("sortOrder");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (role !== "highlight_reel" && role !== "action_shot" && role !== "gallery") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { supabase } = supabaseServer(req);

  // Determine media_type from mimetype
  const contentType = file.type || "";
  const mediaType: "photo" | "video" =
    contentType.startsWith("video") ? "video" : "photo";

  // If this is a highlight reel, delete any existing one first (replace behavior)
  if (role === "highlight_reel") {
    const { data: existing, error: existingError } = await supabase
      .from("athlete_media")
      .select("id, storage_bucket, path")
      .eq("athlete_id", athleteId)
      .eq("role", "highlight_reel")
      .maybeSingle();

    if (existingError) {
      console.error("[athlete-media-upload] error loading existing highlight", existingError);
    }

    if (existing) {
      const bucket = existing.storage_bucket || BUCKET;
      const path = existing.path;

      if (path) {
        const { error: storageDeleteError } = await supabase.storage
          .from(bucket)
          .remove([path]);

        if (storageDeleteError) {
          console.error(
            "[athlete-media-upload] failed to delete old highlight from storage",
            storageDeleteError
          );
        }
      }

      const { error: dbDeleteError } = await supabase
        .from("athlete_media")
        .delete()
        .eq("id", existing.id);

      if (dbDeleteError) {
        console.error(
          "[athlete-media-upload] failed to delete old highlight row",
          dbDeleteError
        );
      }
    }
  }

  // Build a unique path in the bucket
  const fileExt = file.name.split(".").pop() || (mediaType === "video" ? "mp4" : "jpg");
  const fileName = `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = `athletes/${athleteId}/${fileName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });

  if (uploadError) {
    console.error("[athlete-media-upload] storage upload error", uploadError);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  // Insert into athlete_media
  const { data: mediaRow, error: insertError } = await supabase
    .from("athlete_media")
    .insert({
      athlete_id: athleteId,
      media_type: mediaType,
      role,
      url: publicUrl,
      storage_bucket: BUCKET,
      path: filePath,
      sort_order: sortOrder ? Number(sortOrder) : 0,
      is_active: true,
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("[athlete-media-upload] db insert error", insertError);
    return NextResponse.json(
      { error: "Failed to save media record" },
      { status: 500 }
    );
  }

  return NextResponse.json({ media: mediaRow }, { status: 201 });
}

// DELETE: remove a specific media item (action shot or highlight)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ athleteId: string }> }
) {
  const { athleteId } = await context.params;

  const { mediaId } = (await req.json().catch(() => ({}))) as {
    mediaId?: string;
  };

  if (!mediaId) {
    return NextResponse.json({ error: "Missing mediaId" }, { status: 400 });
  }

  const { supabase } = supabaseServer(req);

  // Load the media row (RLS will ensure athlete can only see their own)
  const { data: mediaRow, error: mediaError } = await supabase
    .from("athlete_media")
    .select("id, athlete_id, storage_bucket, path")
    .eq("id", mediaId)
    .maybeSingle();

  if (mediaError) {
    console.error("[athlete-media-delete] failed to load media row", mediaError);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }

  if (!mediaRow) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // (Optional safety) Check athlete_id matches the route's athleteId
  if (mediaRow.athlete_id !== athleteId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bucket = mediaRow.storage_bucket || BUCKET;
  const path = mediaRow.path;

  if (path) {
    const { error: storageDeleteError } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (storageDeleteError) {
      console.error(
        "[athlete-media-delete] failed to delete from storage",
        storageDeleteError
      );
      // We continue anyway so we don't leave dangling DB rows.
    }
  }

  const { error: dbDeleteError } = await supabase
    .from("athlete_media")
    .delete()
    .eq("id", mediaId);

  if (dbDeleteError) {
    console.error("[athlete-media-delete] failed to delete db row", dbDeleteError);
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
// app/api/users/avatar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    // 1) Get authed user via cookie-bound server client
    const { supabase } = await supabaseServer(req);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[avatar] auth.getUser error:", authError.message);
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing or invalid file" },
        { status: 400 }
      );
    }

    // 2) Build a path in the avatars bucket
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // 3) Upload to Supabase Storage using service-role client
    const { data: uploadData, error: uploadError } = await (supabaseAdmin as any)
      .storage.from("avatars")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      console.error("[avatar] upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload avatar" },
        { status: 500 }
      );
    }

    // 4) Get a public URL for the uploaded file
    const {
      data: { publicUrl },
    } = (supabaseAdmin as any).storage.from("avatars").getPublicUrl(uploadData.path);

    // 5) Update users.avatar_url for THIS auth user
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("auth_id", user.id);

    if (updateError) {
      console.error("[avatar] user update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save avatar URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ avatarUrl: publicUrl }, { status: 200 });
  } catch (err: unknown) {
    console.error("[avatar] unexpected error:", err);
    const message =
      err instanceof Error ? err.message : "Unexpected error uploading avatar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
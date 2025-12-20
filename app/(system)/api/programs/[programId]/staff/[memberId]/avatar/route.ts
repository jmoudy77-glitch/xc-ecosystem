// app/api/programs/[programId]/staff/[memberId]/avatar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "staff-avatars";

type RouteParams = {
  programId: string;
  memberId: string; // this is public.users.id for the staff user
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  const { programId, memberId } = await context.params;
  const staffUserId = memberId;

  try {
    // 1) Auth via Supabase (Auth user)
    const { supabase } = supabaseServer(req);
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[StaffAvatar] auth.getUser error:", authError.message);
    }

    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2) Resolve viewer's public.users.id
    const { data: viewerRow, error: viewerError } = await supabaseAdmin
      .from("users")
      .select("id, auth_id")
      .eq("auth_id", authUser.id)
      .maybeSingle();

    if (viewerError || !viewerRow) {
      console.error("[StaffAvatar] viewer users row error:", viewerError);
      return NextResponse.json(
        { error: "Viewer user record missing" },
        { status: 400 }
      );
    }

    const viewerUserId = viewerRow.id as string;

    // 3) Confirm viewer is a member of this program & get their role
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("program_members")
      .select("id, role")
      .eq("program_id", programId)
      .eq("user_id", viewerUserId)
      .maybeSingle();

    if (membershipError || !membership) {
      console.error("[StaffAvatar] membership error:", membershipError);
      return NextResponse.json(
        { error: "Not a member of this program" },
        { status: 403 }
      );
    }

    const viewerRole = membership.role as string | null;
    const managerRoles = ["head_coach", "director", "admin"];
    const isManager =
      viewerRole !== null &&
      managerRoles.includes(viewerRole.toLowerCase());
    const isSelf = viewerUserId === staffUserId;

    if (!isSelf && !isManager) {
      return NextResponse.json(
        { error: "Not allowed to update this avatar" },
        { status: 403 }
      );
    }

    // 4) Parse file from multipart/form-data
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file in upload" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileExt = file.name.split(".").pop() || "jpg";
    const objectPath = `${programId}/${staffUserId}/${Date.now()}.${fileExt}`;

    // 5) Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(objectPath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError || !uploadData) {
      console.error("[StaffAvatar] upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload avatar" },
        { status: 500 }
      );
    }

    // 6) Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(uploadData.path);

    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      return NextResponse.json(
        { error: "Failed to resolve avatar URL" },
        { status: 500 }
      );
    }

    // 7) Save avatar_url on users table for that staff member
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", staffUserId);

    if (updateError) {
      console.error(
        "[StaffAvatar] update users.avatar_url error:",
        updateError
      );
      return NextResponse.json(
        { error: "Failed to save avatar URL" },
        { status: 500 }
      );
    }

    // 8) Done
    return NextResponse.json(
      {
        ok: true,
        avatarUrl: publicUrl,
        isSelf,
        isManager,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[StaffAvatar] unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error uploading avatar" },
      { status: 500 }
    );
  }
}
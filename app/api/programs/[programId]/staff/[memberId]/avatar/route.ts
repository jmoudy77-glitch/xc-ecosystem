// app/api/programs/[programId]/staff/[memberId]/avatar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const AVATAR_BUCKET = "staff-avatars"; // make sure this bucket exists in Supabase

// Roles allowed to edit other staff members' photos
const MANAGER_ROLES = ["head_coach", "director", "admin"];

export async function POST(
  req: NextRequest,
  { params }: { params: { programId: string; memberId: string } }
) {
  const { programId, memberId } = params;
  const staffUserId = memberId; // this slug represents the target user_id

  if (!programId || !staffUserId) {
    return NextResponse.json(
      { error: "Missing programId or staffUserId" },
      { status: 400 }
    );
  }

  // 1) Auth current user
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[staff avatar] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const actingUserId = authUser.id;

  // 2) Check acting user's membership + role in this program
  const { data: actingMembership, error: actingMembershipError } =
    await supabaseAdmin
      .from("program_members")
      .select("id, user_id, role")
      .eq("program_id", programId)
      .eq("user_id", actingUserId)
      .maybeSingle();

  if (actingMembershipError) {
    console.error(
      "[staff avatar] acting membership select error:",
      actingMembershipError
    );
    return NextResponse.json(
      { error: "Failed to load membership" },
      { status: 500 }
    );
  }

  if (!actingMembership) {
    // user is not part of this program at all
    return NextResponse.json(
      { error: "Not a member of this program" },
      { status: 403 }
    );
  }

  const actingRole = (actingMembership.role as string | null) ?? null;
  const isSelf = actingUserId === staffUserId;
  const isManager =
    actingRole !== null && MANAGER_ROLES.includes(actingRole.toLowerCase());

  if (!isSelf && !isManager) {
    return NextResponse.json(
      { error: "You do not have permission to edit this staff photo" },
      { status: 403 }
    );
  }

  // 3) Ensure the target user is actually a staff member of this program
  const { data: targetMembership, error: targetMembershipError } =
    await supabaseAdmin
      .from("program_members")
      .select("id, user_id")
      .eq("program_id", programId)
      .eq("user_id", staffUserId)
      .maybeSingle();

  if (targetMembershipError) {
    console.error(
      "[staff avatar] target membership select error:",
      targetMembershipError
    );
    return NextResponse.json(
      { error: "Failed to load target staff membership" },
      { status: 500 }
    );
  }

  if (!targetMembership) {
    return NextResponse.json(
      { error: "Target user is not staff on this program" },
      { status: 404 }
    );
  }

  // 4) Read the uploaded file from multipart/form-data
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "No file uploaded (expected field 'file')" },
      { status: 400 }
    );
  }

  const fileExt = file.name.split(".").pop() || "jpg";
  const objectPath = `${programId}/${staffUserId}/${Date.now()}.${fileExt}`;

  // 5) Upload to Supabase Storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) {
    console.error("[staff avatar] upload error:", uploadError);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);

  // 6) Update the users.avatar_url for that staff user
  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ avatar_url: publicUrl })
    .eq("id", staffUserId);

  if (updateError) {
    console.error("[staff avatar] users update error:", updateError);
    return NextResponse.json(
      { error: "Failed to update staff profile" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true, avatarUrl: publicUrl, isSelf, isManager },
    { status: 200 }
  );
}
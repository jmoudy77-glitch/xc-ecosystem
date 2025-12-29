// app/api/programs/[programId]/billing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  // Derive programId purely from the URL path:
  // /api/programs/:programId/billing
  let programId: string | undefined;

  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    // segments = ["api", "programs", "<programId>", "billing"]
    const programsIndex = segments.indexOf("programs");
    if (programsIndex !== -1 && segments.length > programsIndex + 1) {
      programId = segments[programsIndex + 1];
    }
  } catch {
    // ignore URL parse errors, we'll handle missing programId below
  }

  if (!programId) {
    return NextResponse.json(
      { error: "Missing programId in path" },
      { status: 400 }
    );
  }

  try {
    const { supabase } = await supabaseServer(req);

    // Get logged-in user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.warn("[Program Billing] auth error:", authError);
    }

    if (!authUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Resolve internal user
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_id", authUser.id)
      .maybeSingle();

    if (userError) {
      console.error("[Program Billing] users select error:", userError);
      return NextResponse.json(
        { error: "Failed to load user record" },
        { status: 500 }
      );
    }

    if (!userRow) {
      return NextResponse.json(
        { error: "User record missing" },
        { status: 404 }
      );
    }

    const internalUserId = userRow.id as string;

    // Verify membership
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("program_members")
      .select("id, role")
      .eq("program_id", programId)
      .eq("user_id", internalUserId)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "[Program Billing] membership select error:",
        membershipError
      );
      return NextResponse.json(
        { error: "Failed to verify membership" },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this program" },
        { status: 403 }
      );
    }

    // Load program subscription (latest)
    const { data: subs, error: subsError } = await supabaseAdmin
      .from("program_subscriptions")
      .select("*")
      .eq("program_id", programId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (subsError) {
      console.error("[Program Billing] subscriptions select error:", subsError);
      return NextResponse.json(
        { error: "Failed to load subscription" },
        { status: 500 }
      );
    }

    const subscription = subs && subs.length > 0 ? subs[0] : null;

    return NextResponse.json(
      {
        programId,
        subscription,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Program Billing] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error loading billing" },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Make sure these are defined in your env (server-side):
// NEXT_PUBLIC_SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY  (preferred) or SUPABASE_ANON_KEY as a fallback
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This client runs only on the server in this route handler
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { practicePlanId, cancelNote } = body;

    console.log("[practice/cancel] incoming body", body);

    if (!practicePlanId) {
      return NextResponse.json(
        { error: "Missing practicePlanId" },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from("practice_plans")
      .update({
        status: "canceled",
        notes: cancelNote ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", practicePlanId);

    if (updateError) {
      console.error("[practice/cancel] updateError:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel practice", details: updateError.message },
        { status: 500 },
      );
    }

    console.log(
      "[practice/cancel] practice",
      practicePlanId,
      "canceled successfully",
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[practice/cancel] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error", details: err?.message },
      { status: 500 },
    );
  }
}
// app/(system)/api/brainstorm/sessions/[sessionId]/pages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const { supabase } = supabaseServer(req);

    // List pages for this brainstorm session.
    // RLS should enforce that the caller can only see pages for sessions they have access to.
    const { data, error } = await supabase
      .from("brainstorm_pages")
      .select("*")
      .eq("session_id", sessionId)
      .order("page_index", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

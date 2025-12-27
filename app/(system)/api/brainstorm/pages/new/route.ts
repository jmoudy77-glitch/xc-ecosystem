// app/(system)/api/brainstorm/pages/new/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const BodySchema = z.object({
  session_id: z.string().uuid(),
  // Optional: archive the current page when creating a new one
  current_page_id: z.string().uuid().optional(),
  title: z.string().min(1).max(120).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { session_id, current_page_id, title } = parsed.data;

    const { supabase } = supabaseServer(req);

    // 1) Ensure session exists (and RLS enforces access)
    const { data: session, error: sessionError } = await supabase
      .from("brainstorm_sessions")
      .select("id")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found or not accessible" },
        { status: 404 }
      );
    }

    // 2) Find next page_index
    const { data: lastPage, error: lastPageError } = await supabase
      .from("brainstorm_pages")
      .select("page_index")
      .eq("session_id", session_id)
      .order("page_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastPageError) {
      return NextResponse.json(
        { error: "Failed to read existing pages", details: lastPageError },
        { status: 500 }
      );
    }

    const nextIndex = (lastPage?.page_index ?? 0) + 1;

    // 3) Optionally archive the current page
    if (current_page_id) {
      const { error: archiveError } = await supabase
        .from("brainstorm_pages")
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq("id", current_page_id)
        .eq("session_id", session_id);

      if (archiveError) {
        return NextResponse.json(
          { error: "Failed to archive current page", details: archiveError },
          { status: 500 }
        );
      }
    }

    // 4) Create new page
    const { data: newPage, error: insertError } = await supabase
      .from("brainstorm_pages")
      .insert({
        session_id,
        page_index: nextIndex,
        title: title ?? `Page ${nextIndex}`,
      })
      .select("*")
      .single();

    if (insertError || !newPage) {
      return NextResponse.json(
        { error: "Failed to create new page", details: insertError },
        { status: 500 }
      );
    }

    // 5) Return new page
    return NextResponse.json({ data: newPage }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
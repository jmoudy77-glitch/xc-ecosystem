// app/(system)/api/brainstorm/pages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const listPagesQuerySchema = z.object({
  programId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

const createPageBodySchema = z.object({
  programId: z.string().uuid(),
  sessionId: z.string().uuid(),
  title: z.string().min(1).max(160).optional(),
});

async function getProgramMemberOrError(req: NextRequest, programId: string) {
  const { supabase } = await supabaseServer(req);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      user: null,
      programMember: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: programMember, error: pmError } = await supabase
    .from("program_members")
    .select("id, program_id")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .maybeSingle();

  if (pmError || !programMember) {
    return {
      supabase,
      user,
      programMember: null,
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, user, programMember, errorResponse: null };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parsed = listPagesQuerySchema.safeParse({
      programId: url.searchParams.get("programId"),
      sessionId: url.searchParams.get("sessionId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { programId, sessionId } = parsed.data;

    // AuthZ: must be a member of this program.
    const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
    if (errorResponse) return errorResponse;

    // Validate session belongs to this program.
    const { data: session, error: sessionError } = await supabase
      .from("brainstorm_sessions")
      .select("id, program_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error("[brainstorm/pages] session lookup failed:", sessionError);
      return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
    }

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.program_id !== programId) {
      return NextResponse.json(
        { error: "Session does not belong to this program" },
        { status: 403 }
      );
    }

    const { data: pages, error: pagesError } = await supabase
      .from("brainstorm_pages")
      .select("*")
      .eq("session_id", sessionId)
      .order("page_index", { ascending: true });

    if (pagesError) {
      console.error("[brainstorm/pages] pages lookup failed:", pagesError);
      return NextResponse.json({ error: "Failed to load pages" }, { status: 500 });
    }

    return NextResponse.json({ data: pages ?? [] });
  } catch (err) {
    console.error("[brainstorm/pages] unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = createPageBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { programId, sessionId, title } = parsed.data;

    // AuthZ: must be a member of this program.
    const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
    if (errorResponse) return errorResponse;

    // Validate session belongs to this program.
    const { data: session, error: sessionError } = await supabase
      .from("brainstorm_sessions")
      .select("id, program_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error("[brainstorm/pages] session lookup failed:", sessionError);
      return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
    }

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.program_id !== programId) {
      return NextResponse.json(
        { error: "Session does not belong to this program" },
        { status: 403 }
      );
    }

    // Compute next page_index (append-only)
    const { data: lastPage, error: lastPageError } = await supabase
      .from("brainstorm_pages")
      .select("page_index")
      .eq("session_id", sessionId)
      .order("page_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastPageError) {
      console.error("[brainstorm/pages] last page lookup failed:", lastPageError);
      return NextResponse.json({ error: "Failed to compute next page" }, { status: 500 });
    }

    const nextIndex = (lastPage?.page_index ?? -1) + 1;
    const computedTitle = title ?? `Page ${nextIndex + 1}`;

    const { data: page, error: insertError } = await supabase
      .from("brainstorm_pages")
      .insert({
        session_id: sessionId,
        page_index: nextIndex,
        title: computedTitle,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("[brainstorm/pages] insert failed:", insertError);
      return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
    }

    return NextResponse.json({ data: page }, { status: 201 });
  } catch (err) {
    console.error("[brainstorm/pages] unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
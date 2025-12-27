// app/api/brainstorm/sessions/[sessionId]/pages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function error(status: number, message: string, extra?: any) {
  return NextResponse.json(
    { error: message, ...(extra ? { extra } : {}) },
    { status }
  );
}

/**
 * GET
 * Returns all pages for a brainstorm session (active + archived),
 * ordered chronologically.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;
  const { supabase } = supabaseServer(req);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return error(401, "Unauthorized");

  const { data, error: dbErr } = await supabase
    .from("brainstorm_pages")
    .select("*")
    .eq("session_id", sessionId)
    .order("page_index", { ascending: true });

  if (dbErr) {
    return error(500, "Failed to load brainstorm pages", { supabase: dbErr });
  }

  return NextResponse.json({ data });
}

/**
 * POST
 * Creates a new page.
 *
 * If an active page exists:
 * - it is marked archived
 * - its archived_at timestamp is set
 *
 * Then a fresh active page is created.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;
  const { supabase } = supabaseServer(req);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return error(401, "Unauthorized");

  // Find current active page (if any)
  const { data: activePage, error: activeErr } = await supabase
    .from("brainstorm_pages")
    .select("*")
    .eq("session_id", sessionId)
    .eq("is_active", true)
    .maybeSingle();

  if (activeErr) {
    return error(500, "Failed to resolve active page", {
      supabase: activeErr,
    });
  }

  // Archive active page
  if (activePage) {
    const { error: archiveErr } = await supabase
      .from("brainstorm_pages")
      .update({
        is_active: false,
        archived_at: new Date().toISOString(),
      })
      .eq("id", activePage.id);

    if (archiveErr) {
      return error(500, "Failed to archive active page", {
        supabase: archiveErr,
      });
    }
  }

  const nextPageIndex =
    activePage && typeof activePage.page_index === "number"
      ? activePage.page_index + 1
      : 0;

  // Create new active page
  const { data: newPage, error: createErr } = await supabase
    .from("brainstorm_pages")
    .insert({
      session_id: sessionId,
      page_index: nextPageIndex,
      is_active: true,
      created_by_user_id: auth.user.id,
    })
    .select("*")
    .single();

  if (createErr) {
    return error(500, "Failed to create new brainstorm page", {
      supabase: createErr,
    });
  }

  return NextResponse.json({ data: newPage }, { status: 201 });
}
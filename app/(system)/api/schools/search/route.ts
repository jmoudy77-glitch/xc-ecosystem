// app/api/schools/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * School search endpoint for autocomplete.
 *
 * Supports query params:
 *   - q: string (required)   → matched against name, city, state
 *   - level: string (optional) → 'hs', 'college', etc.
 *
 * Example:
 *   GET /api/schools/search?q=oak%20ridge&level=hs
 *
 * Returns:
 *   { schools: Array<{ id, name, city, state, country, level, is_claimed }> }
 */

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const level = url.searchParams.get("level");

    const trimmed = q.trim();

    if (!trimmed) {
      return NextResponse.json(
        { error: "Missing query parameter 'q'." },
        { status: 400 },
      );
    }

    // Build a base query on schools
    let query = supabaseAdmin
      .from("schools")
      .select("id, name, city, state, country, level, is_claimed")
      .order("name", { ascending: true })
      .limit(15);

    if (level) {
      query = query.eq("level", level);
    }

    // For matching, we do a simple ILIKE on name, city, or state
    // Supabase doesn't support OR chains directly via the client,
    // so we use a raw ilike on name and then filter client-side
    // for city/state matches if needed. For now, prioritize name.
    query = query.ilike("name", `%${trimmed}%`);

    const { data, error } = await query;

    if (error) {
      console.error("[/api/schools/search] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to search schools" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ schools: [] }, { status: 200 });
    }

    // Optionally refine client-side by city/state if user typed a comma or space
    const lowered = trimmed.toLowerCase();
    const words = lowered.split(/[,\s]+/).filter(Boolean);

    let filtered = data;

    if (words.length > 1) {
      filtered = data.filter((row) => {
        const name = (row.name ?? "").toLowerCase();
        const city = (row.city ?? "").toLowerCase();
        const state = (row.state ?? "").toLowerCase();

        return words.every((w) => {
          return (
            name.includes(w) ||
            city.includes(w) ||
            state.includes(w)
          );
        });
      });
    }

    return NextResponse.json(
      {
        schools: filtered.map((s) => ({
          id: s.id,
          name: s.name,
          city: s.city,
          state: s.state,
          country: s.country,
          level: s.level,
          is_claimed: s.is_claimed,
        })),
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[/api/schools/search] Unexpected error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to search schools";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

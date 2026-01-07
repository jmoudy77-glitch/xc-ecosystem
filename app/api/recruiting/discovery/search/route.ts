import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type SearchRequest = {
  programId: string;
  sport?: string;
  q?: string | null;
  eventGroup?: string | null;
  gradYear?: number | null;
  limit?: number;
  offset?: number;
};

function normalizeQuery(q?: string | null) {
  const s = (q ?? "").trim();
  return s.length ? s : "";
}

export async function POST(req: Request) {
  const body = (await req.json()) as SearchRequest;
  const cookieStore = (await cookies()) as any;

  if (!body?.programId) {
    return NextResponse.json({ error: "Missing programId" }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  const paRes = await supabase
    .from("program_athletes")
    .select("athlete_id")
    .eq("program_id", body.programId)
    .limit(5000);

  const returningIds =
    paRes.error || !Array.isArray(paRes.data)
      ? []
      : paRes.data
          .map((r: any) => (typeof r?.athlete_id === "string" ? r.athlete_id : null))
          .filter((v: any): v is string => !!v);

  const limit = Math.min(Math.max(body.limit ?? 50, 1), 200);
  const offset = Math.max(body.offset ?? 0, 0);

  let q = supabase
    .from("athletes")
    .select("id, first_name, last_name, grad_year, event_group, hs_school_name, hs_city, hs_state, avatar_url")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (returningIds.length > 0) {
    q = q.not("id", "in", `(${returningIds.join(",")})`);
  }

  if (body.eventGroup && body.eventGroup !== "all") {
    q = q.eq("event_group", body.eventGroup);
  }

  if (typeof body.gradYear === "number") {
    q = q.eq("grad_year", body.gradYear);
  }

  const queryText = normalizeQuery(body.q);
  if (queryText) {
    const clauses = queryText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const ors: string[] = [];
    for (const clause of clauses) {
      const tokens = clause.split(/\s+/).filter(Boolean);
      if (tokens.length >= 2) {
        const a = tokens[0];
        const b = tokens[1];
        ors.push(
          `and(first_name.ilike.%${a}%,last_name.ilike.%${b}%)`,
          `and(first_name.ilike.%${b}%,last_name.ilike.%${a}%)`,
          `hs_school_name.ilike.%${clause}%`
        );
      } else {
        const t = tokens[0];
        ors.push(
          `first_name.ilike.%${t}%`,
          `last_name.ilike.%${t}%`,
          `hs_school_name.ilike.%${t}%`,
          `hs_state.ilike.%${t}%`
        );
      }
    }

    if (ors.length > 0) {
      q = q.or(ors.join(","));
    }
  } else {
    const hasFilter = (body.eventGroup && body.eventGroup !== "all") || typeof body.gradYear === "number";
    if (!hasFilter) {
      return NextResponse.json({ rows: [] });
    }
  }

  const res = await q;
  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 400 });
  }

  const athleteIds = Array.isArray(res.data)
    ? res.data
        .map((r: any) => (typeof r?.id === "string" ? r.id : null))
        .filter((v: any): v is string => !!v)
    : [];

  const scoreByAthleteId = new Map<string, number>();
  if (athleteIds.length > 0) {
    const scoresRes = await supabase
      .from("athlete_scores")
      .select("athlete_id, global_overall")
      .in("athlete_id", athleteIds);

    if (!scoresRes.error && Array.isArray(scoresRes.data)) {
      for (const s of scoresRes.data as any[]) {
        const id = typeof s?.athlete_id === "string" ? s.athlete_id : null;
        if (!id) continue;
        const v = Number(s?.global_overall);
        if (!Number.isFinite(v)) continue;
        scoreByAthleteId.set(id, v);
      }
    }
  }

  const rows = (res.data ?? []).map((r: any) => ({
    id: r.id,
    displayName: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
    eventGroup: r.event_group ?? null,
    gradYear: r.grad_year ?? null,
    avatarUrl: r.avatar_url ?? null,
    originMeta: {
      school: r.hs_school_name ?? null,
      city: r.hs_city ?? null,
      state: r.hs_state ?? null,
      score: scoreByAthleteId.get(r.id) ?? null,
    },
  }));

  return NextResponse.json({ rows });
}

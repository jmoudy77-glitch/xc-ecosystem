import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type FiltersRequest = {
  programId: string;
  sport?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as FiltersRequest;
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

  let egQ = supabase.from("athletes").select("id, event_group").not("event_group", "is", null).limit(3000);
  let gyQ = supabase.from("athletes").select("id, grad_year").not("grad_year", "is", null).limit(3000);

  if (returningIds.length > 0) {
    const inList = `(${returningIds.join(",")})`;
    egQ = egQ.not("id", "in", inList);
    gyQ = gyQ.not("id", "in", inList);
  }

  const egRes = await egQ;

  if (egRes.error) {
    return NextResponse.json({ error: egRes.error.message }, { status: 400 });
  }

  const gyRes = await gyQ;

  if (gyRes.error) {
    return NextResponse.json({ error: gyRes.error.message }, { status: 400 });
  }

  const eventGroups = Array.from(
    new Set(
      (egRes.data ?? [])
        .map((r: any) => (typeof r?.event_group === "string" ? r.event_group : null))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const gradYears = Array.from(
    new Set(
      (gyRes.data ?? [])
        .map((r: any) => (typeof r?.grad_year === "number" ? r.grad_year : null))
        .filter((v: any) => typeof v === "number")
    )
  ).sort((a, b) => a - b);

  return NextResponse.json({ eventGroups, gradYears });
}

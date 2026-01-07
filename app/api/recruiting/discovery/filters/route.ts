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

  const egRes = await supabase
    .from("athletes")
    .select("event_group")
    .not("event_group", "is", null)
    .limit(5000);

  if (egRes.error) {
    return NextResponse.json({ error: egRes.error.message }, { status: 400 });
  }

  const gyRes = await supabase
    .from("athletes")
    .select("grad_year")
    .not("grad_year", "is", null)
    .limit(5000);

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

import { NextResponse } from "next/server";
import { readProgramHealthA2View } from "@/app/actions/program-health/readProgramHealthA2View";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const programId = searchParams.get("programId");
  const horizon = searchParams.get("horizon");

  if (!programId) {
    return NextResponse.json({ error: "Missing programId" }, { status: 400 });
  }

  const data = await readProgramHealthA2View({
    programId,
    horizon: horizon ?? null,
  });

  return NextResponse.json({ data });
}

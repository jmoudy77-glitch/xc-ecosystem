import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ meetId: string; feedType: string }> }
) {
  const { meetId, feedType } = await params;
  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "Display feed not implemented yet.",
      meetId,
      feedType,
    },
    { status: 501 }
  );
}

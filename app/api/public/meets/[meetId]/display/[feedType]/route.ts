import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { meetId: string; feedType: string } }
) {
  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "Display feed not implemented yet.",
      meetId: params.meetId,
      feedType: params.feedType,
    },
    { status: 501 }
  );
}

import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { meetId: string } }
) {
  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "Public Track & Field live results feed not implemented yet.",
      meetId: params.meetId,
      discipline: "TF",
    },
    { status: 501 }
  );
}

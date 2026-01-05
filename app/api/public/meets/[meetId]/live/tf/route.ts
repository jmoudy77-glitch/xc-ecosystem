import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ meetId: string }> }
) {
  const { meetId } = await params;
  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "Public Track & Field live results feed not implemented yet.",
      meetId,
      discipline: "TF",
    },
    { status: 501 }
  );
}

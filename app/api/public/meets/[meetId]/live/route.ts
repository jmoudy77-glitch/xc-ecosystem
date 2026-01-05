import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { meetId: string } }
) {
  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "Public live results feed not implemented yet.",
      meetId: params.meetId,
    },
    { status: 501 }
  );
}

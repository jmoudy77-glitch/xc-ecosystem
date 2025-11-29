// app/api/me/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      message: "Hello from /api/me stub",
    },
    { status: 200 }
  );
}





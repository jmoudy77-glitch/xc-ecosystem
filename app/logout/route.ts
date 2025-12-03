// app/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const { supabase, res } = supabaseServer(req);

  // Clear Supabase auth cookies server-side
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[/logout] supabase.auth.signOut error:", error);
  }

  // Redirect to login, preserving any cookie changes from `res`
  const redirectUrl = new URL("/login", req.url);

  const redirectResponse = NextResponse.redirect(redirectUrl);
  // merge cookie headers from Supabase-modified `res` into redirect
  res.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}
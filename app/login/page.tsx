// app/login/page.tsx
// Server wrapper: redirects authenticated users to /dashboard,
// otherwise shows the client-side login form.

import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import LoginPageClient from "./LoginPageClient";

export default async function LoginPage() {
  const supabase = await supabaseServerComponent();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.warn("[/login] auth.getUser error:", error.message);
  }

  if (user) {
    // Post-login routing is resolved centrally
    redirect("/home");
  }

  return <LoginPageClient />;
}
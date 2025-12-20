// app/staff/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy/global /staff route.
 * We keep this path for backward compatibility, but Staff is an Administration concern
 * and is always program-scoped in this app.
 */
export default function StaffLegacyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function go() {
      try {
        // 1) Try to resolve active program from /api/me
        const meRes = await fetch("/api/me", { cache: "no-store" });
        const me = await meRes.json().catch(() => ({} as any));
        const programId = me?.activeProgramId || me?.programId || me?.program?.id;

        if (cancelled) return;

        if (meRes.ok && programId) {
          router.replace(`/programs/${programId}/staff`);
          return;
        }

        // 2) Fallback: load first accessible program
        const programsRes = await fetch("/api/programs", { cache: "no-store" });
        const programs = await programsRes.json().catch(() => [] as any[]);

        const firstProgramId = Array.isArray(programs)
          ? programs[0]?.id
          : programs?.data?.[0]?.id;

        if (cancelled) return;

        if (programsRes.ok && firstProgramId) {
          router.replace(`/programs/${firstProgramId}/staff`);
          return;
        }
      } catch {
        // fall through
      }

      if (!cancelled) {
        router.replace("/dashboard");
      }
    }

    go();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}

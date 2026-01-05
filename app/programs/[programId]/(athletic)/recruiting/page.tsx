// app/programs/[programId]/recruiting/page.tsx

import Link from "next/link";
import RecruitingM1Client from "./RecruitingM1Client";

type PageProps = {
  params: Promise<{ programId: string }>;
};

export default async function RecruitingPage({ params }: PageProps) {
  const { programId } = await params;
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">Recruiting</div>
          <div className="truncate text-xl font-semibold">Stabilization</div>
        </div>
        <Link
          href={`/programs/${programId}/recruiting/discovery`}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Discovery Portal
        </Link>
      </div>
      <RecruitingM1Client programId={programId} />
    </main>
  );
}

// app/programs/[programId]/recruiting/page.tsx

import RecruitingDiscoveryModalClient from "./RecruitingDiscoveryModalClient";
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
        <RecruitingDiscoveryModalClient programId={programId} />
      </div>
      <RecruitingM1Client programId={programId} />
    </main>
  );
}

// app/programs/[programId]/recruiting/page.tsx

import RecruitingM1Client from "./RecruitingM1Client";

type PageProps = {
  params: Promise<{ programId: string }>;
};

export default async function RecruitingPage({ params }: PageProps) {
  const { programId } = await params;
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <RecruitingM1Client programId={programId} />
    </main>
  );
}

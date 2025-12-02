// app/programs/[programId]/scoring/page.tsx
import ProgramScoringPageClient from "./ProgramScoringPageClient";

type PageProps = {
  params: Promise<{
    programId: string;
  }>;
};

export default async function ProgramScoringPage({ params }: PageProps) {
  const { programId } = await params;

  return <ProgramScoringPageClient programId={programId} />;
}

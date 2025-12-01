// app/programs/[programId]/page.tsx
import ProgramOverviewPageClient from "./ProgramOverviewPageClient";

type PageProps = {
  params: Promise<{
    programId: string;
  }>;
};

export default async function ProgramOverviewPage({ params }: PageProps) {
  const { programId } = await params;

  return <ProgramOverviewPageClient programId={programId} />;
}

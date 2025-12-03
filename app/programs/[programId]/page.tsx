// app/programs/[programId]/page.tsx
import ProgramOverviewPageClient from "./ProgramOverviewPageClient";

type PageProps = {
  params: {
    programId: string;
  };
};

export default function ProgramOverviewPage({ params }: PageProps) {
  const { programId } = params;

  return <ProgramOverviewPageClient programId={programId} />;
}
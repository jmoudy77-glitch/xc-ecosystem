// app/programs/[programId]/billing/page.tsx
import ProgramBillingPageClient from "./ProgramBillingPageClient";

type PageProps = {
  params: Promise<{
    programId: string;
  }>;
};

export default async function ProgramBillingPage({ params }: PageProps) {
  const { programId } = await params;

  return <ProgramBillingPageClient programId={programId} />;
}

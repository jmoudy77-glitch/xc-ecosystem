// FILE: app/programs/[programId]/program-health/page.tsx

import { readProgramHealthView } from "@/app/actions/program-health/readProgramHealthView";
import { ProgramHealthPage } from "@/app/ui/program-health/ProgramHealthPage";

export default async function ProgramHealthRoute({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const model = await readProgramHealthView(programId);

  return (
    <>
      <ProgramHealthPage programId={programId} model={model} />
    </>
  );
}

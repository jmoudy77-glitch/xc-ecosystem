import { readProgramHealthView } from "@/app/actions/program-health/readProgramHealthView";
import { ProgramHealthPage } from "@/app/ui/program-health/ProgramHealthPage";

export default async function ProgramHealthRoute({ params }: { params: { programId: string } }) {
  const model = await readProgramHealthView(params.programId);
  return <ProgramHealthPage programId={params.programId} model={model} />;
}

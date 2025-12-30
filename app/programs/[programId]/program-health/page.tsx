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
      <div className="fixed bottom-4 right-4 z-50 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white">
        PAGE.TSX LIVE
      </div>
    </>
  );
}

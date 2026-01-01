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

  // STEP 2 PROOF LOG
  console.log("[PH PAGE]", {
    programId,
    nodeCount: model.capabilityNodes?.length ?? 0,
    absenceCount: model.absences?.length ?? 0,
    firstAbsenceId: model.absences?.[0]?.id ?? null,
    firstAbsenceNodeId:
      // prefer normalized field if present
      (model.absences?.[0] as any)?.capabilityNodeId ??
      // otherwise read from details payload (canonical)
      ((model.absences?.[0] as any)?.details?.capability_node_id ?? null),
  });

  return (
    <>
      <ProgramHealthPage programId={programId} model={model} />
      <div className="fixed bottom-4 right-4 z-50 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white">
        PAGE.TSX LIVE
      </div>
    </>
  );
}

// app/programs/[programId]/program-health/a2-sandbox/page.tsx

import { readProgramHealthA2Sandbox } from "@/app/actions/program-health/readProgramHealthA2Sandbox";

export default async function ProgramHealthA2SandboxPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;

  const model = await readProgramHealthA2Sandbox(programId);

  return (
    <pre style={{ padding: 16, fontSize: 12 }}>
      {JSON.stringify(model.sandbox, null, 2)}
    </pre>
  );
}

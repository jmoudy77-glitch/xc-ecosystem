// app/programs/[programId]/teams/[teamId]/(administration)/roster-planning/page.tsx

import RosterSandboxClient from "@/app/programs/[programId]/teams/[teamId]/RosterSandboxClient";

export default async function RosterPlanningPage({
  params,
}: {
  params: Promise<{ programId: string; teamId: string }>;
}) {
  const { programId, teamId } = await params;

  return (
    <div className="w-full p-4">
      <RosterSandboxClient programId={programId} teamId={teamId} />
    </div>
  );
}

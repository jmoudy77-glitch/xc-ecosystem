import { M3RuntimePanel } from "@/app/components/m3/M3RuntimePanel";
import { M3ImpactsPanel } from "@/app/components/m3/M3ImpactsPanel";

export default function ProgramHealthM3DebugPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <div className="text-lg font-semibold text-zinc-100">Program Health · M3 Debug</div>
        <div className="mt-1 text-sm text-zinc-400">
          Read-only M3 posture for Program Health consumption (advisory, non-authoritative).
        </div>
      </div>

      <M3RuntimePanel title="PH M3 Runtime State" stateUrl="/api/program-health/m3/state" />
      <M3ImpactsPanel
        title="PH M3 Impacts (read-only)"
        impactsUrl="/api/program-health/m3/impacts"
      />
    </div>
  );
}

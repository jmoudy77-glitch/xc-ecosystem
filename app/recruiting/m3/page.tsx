import { M3RuntimePanel } from "@/app/components/m3/M3RuntimePanel";
import { M3ImpactsPanel } from "@/app/components/m3/M3ImpactsPanel";

export default function RecruitingM3DebugPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <div className="text-lg font-semibold text-zinc-100">Recruiting · M3 Debug</div>
        <div className="mt-1 text-sm text-zinc-400">
          Wiring surface for server-side M3 runtime state and impacts feed.
        </div>
      </div>

      <M3RuntimePanel title="Recruiting M3 Runtime State" stateUrl="/api/recruiting/m3/state" />
      <M3ImpactsPanel title="Recruiting M3 Impacts" impactsUrl="/api/recruiting/m3/impacts" />
    </div>
  );
}

/* File: app/components/meet_manager/BuildMeetSelectorClient.tsx */
"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { BuildMeetOption } from "@/app/actions/meet_manager/getBuildMeetOptions";

type Props = {
  hosted: BuildMeetOption[];
  attending: BuildMeetOption[];
  attendingForHosted: BuildMeetOption[];
};

function labelFor(o: BuildMeetOption, suffix?: string) {
  const date = o.startDate ? ` • ${o.startDate}` : "";
  const type = o.meetType ? `${o.meetType}` : "MEET";
  const state = o.lifecycleState ? ` • ${o.lifecycleState}` : "";
  return `${type}${date}${state}${suffix ? ` — ${suffix}` : ""}`;
}

export function BuildMeetSelectorClient({ hosted, attending, attendingForHosted }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const hostMeetId = sp.get("hostMeetId") ?? "";
  const attendMeetId = sp.get("attendMeetId") ?? "";

  const attendingAll = useMemo(() => {
    // De-dupe by meetId; keep explicit attending records first.
    const seen = new Set<string>();
    const out: Array<{ o: BuildMeetOption; suffix?: string }> = [];

    for (const a of attending) {
      if (seen.has(a.meetId)) continue;
      seen.add(a.meetId);
      out.push({ o: a });
    }

    for (const h of attendingForHosted) {
      if (seen.has(h.meetId)) continue;
      seen.add(h.meetId);
      out.push({ o: h, suffix: "your roster for hosted meet" });
    }

    return out;
  }, [attending, attendingForHosted]);

  const setParam = (key: "hostMeetId" | "attendMeetId", value: string) => {
    const next = new URLSearchParams(sp.toString());

    if (value) next.set(key, value);
    else next.delete(key);

    // Single-source-of-truth: one active context at a time.
    // Selecting host clears attend; selecting attend clears host.
    if (key === "hostMeetId" && value) next.delete("attendMeetId");
    if (key === "attendMeetId" && value) next.delete("hostMeetId");

    router.replace(`?${next.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground">Hosted</div>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={hostMeetId}
          onChange={(e) => setParam("hostMeetId", e.target.value)}
        >
          <option value="">Select hosted meet…</option>
          {hosted.map((h) => (
            <option key={h.meetId} value={h.meetId}>
              {labelFor(h)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground">Attending</div>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={attendMeetId}
          onChange={(e) => setParam("attendMeetId", e.target.value)}
        >
          <option value="">Select attending meet…</option>
          {attendingAll.map(({ o, suffix }) => (
            <option key={`${o.meetId}:${suffix ?? ""}`} value={o.meetId}>
              {labelFor(o, suffix)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

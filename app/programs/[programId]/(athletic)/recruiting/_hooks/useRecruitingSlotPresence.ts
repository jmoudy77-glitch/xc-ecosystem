"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type RecruitingSlotPresenceRow = {
  event_group_key: string;
  slot_id: string;
  has_primary: boolean;
};

export type RecruitingSlotPresenceKey = string; // `${event_group_key}::${slot_id}`

function keyOf(row: { event_group_key: string; slot_id: string }): RecruitingSlotPresenceKey {
  return `${row.event_group_key}::${row.slot_id}`;
}

export function useRecruitingSlotPresence(args: {
  programId: string;
  sport: string;
}) {
  const { programId, sport } = args;

  const [rows, setRows] = useState<RecruitingSlotPresenceRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    if (!programId || !sport) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/recruiting/slots/presence/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, sport }),
      });

      const json = await res.json();
      if (json?.ok) setRows(json.data ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [programId, sport]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const byKey = useMemo(() => {
    const map = new Map<RecruitingSlotPresenceKey, RecruitingSlotPresenceRow>();
    for (const r of rows) map.set(keyOf(r), r);
    return map;
  }, [rows]);

  const hasPrimary = useCallback(
    (eventGroupKey: string, slotId: string) => {
      return byKey.get(`${eventGroupKey}::${slotId}`)?.has_primary ?? false;
    },
    [byKey]
  );

  return {
    rows,
    byKey,
    hasPrimary,
    isLoading,
    refresh,
  };
}

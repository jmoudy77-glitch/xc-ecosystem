// components/brainstorm/BrainstormWhiteboard.tsx
"use client";

import { useEffect, useState } from "react";
import { BrainstormObjectBase } from "@/lib/brainstorm/types";
import { WhiteboardObjectRenderer } from "./WhiteboardObjectRenderer";

type Props = {
  pageId: string;
};

export function BrainstormWhiteboard({ pageId }: Props) {
  const [objects, setObjects] = useState<BrainstormObjectBase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const res = await fetch(`/api/brainstorm/pages/${pageId}/objects`);
      const json = await res.json();
      if (!active) return;
      setObjects(json.data ?? []);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [pageId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Loading whiteboard…
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden bg-surface">
      <div className="absolute inset-0">
        {objects.map((obj) => (
          <WhiteboardObjectRenderer key={obj.id} object={obj} />
        ))}
      </div>
    </div>
  );
}
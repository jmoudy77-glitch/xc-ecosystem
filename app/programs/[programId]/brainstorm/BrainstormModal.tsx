// app/programs/[programId]/brainstorm/BrainstormModal.tsx

/**
 * STEP 1 — Modal bootstrap:
 * - POST   /api/brainstorm/sessions           -> create session
 * - POST   /api/brainstorm/sessions/:id/pages/new -> create first page
 * - GET    /api/brainstorm/sessions/:id/pages -> list pages
 *
 * Outcome:
 * - sessionId set
 * - pages set
 * - activePageId set
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// (keep your existing imports)

type BrainstormPage = {
  id: string;
  session_id: string;
  page_index: number;
  title?: string | null;
  created_at?: string;
};

// If you already have these in-file, do NOT duplicate; just wire the functions/useEffect below.

async function jsonOrThrow(res: Response) {
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg = json?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

export default function BrainstormModal(props: any) {
  // ------------------------------------------------------------------------------------
  // Existing props you likely already have:
  // - open:boolean
  // - onClose:() => void
  // - programId:string
  // - context: BrainstormContext (programId/scopeType/scopeId/teamId/athleteId)
  // ------------------------------------------------------------------------------------

  const { open } = props;

  // If you already have these states in your file, keep your names and remove duplicates.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pages, setPages] = useState<BrainstormPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const bootKeyRef = useRef<string>("");

  // Build a stable “boot key” so we create ONE session per open/context.
  // Adjust these to match what you actually pass as context.
  const bootKey = useMemo(() => {
    const c = props.context;
    if (!c) return "";
    // programId + scopeType + scopeId is the minimum stable identity for “this entry”
    return [
      c.programId ?? "",
      c.scopeType ?? "",
      c.scopeId ?? "",
      c.teamId ?? "",
      c.athleteId ?? "",
    ].join("|");
  }, [props.context]);

  async function createSession() {
    const c = props.context;
    const res = await fetch(`/api/brainstorm/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // IMPORTANT: send the same shape your API expects.
        // This matches the updated lib/brainstorm/context.ts model.
        programId: c.programId,
        scopeType: c.scopeType,
        scopeId: c.scopeId,
        teamId: c.teamId,
        athleteId: c.athleteId,

        // Optional: title shown in lists (if your API supports it)
        title: props.title ?? "Brainstorm",
      }),
    });

    const json = await jsonOrThrow(res);
    return json.data; // expects { id: string, ... }
  }

  async function createFirstPage(newSessionId: string) {
    const res = await fetch(`/api/brainstorm/sessions/${newSessionId}/pages/new`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Optional: title, if supported
      body: JSON.stringify({ title: "Page 1" }),
    });

    const json = await jsonOrThrow(res);
    return json.data as BrainstormPage; // expects { id, session_id, page_index, ... }
  }

  async function fetchPages(forSessionId: string) {
    const res = await fetch(`/api/brainstorm/sessions/${forSessionId}/pages`, {
      method: "GET",
    });
    const json = await jsonOrThrow(res);
    return (json.data ?? []) as BrainstormPage[];
  }

  // ------------------------------
  // STEP 1: bootstrap on open
  // ------------------------------
  useEffect(() => {
    if (!open) return;
    if (!props.context?.programId) return;
    if (!bootKey) return;

    // Prevent double-boot on re-renders.
    if (bootKeyRef.current === bootKey && sessionId) return;

    let cancelled = false;

    async function boot() {
      try {
        setBooting(true);

        // Reset UI state for new boot target
        setSessionId(null);
        setPages([]);
        setActivePageId(null);

        const createdSession = await createSession();
        if (cancelled) return;

        const newSessionId = createdSession.id as string;
        setSessionId(newSessionId);

        // Always create first page on entry (per your spec: session is tied to this instance in time)
        const firstPage = await createFirstPage(newSessionId);
        if (cancelled) return;

        // Pull list (so rail is correct, and future “New Page” appends consistently)
        const list = await fetchPages(newSessionId);
        if (cancelled) return;

        setPages(list.length ? list : [firstPage]);
        setActivePageId(firstPage.id);

        bootKeyRef.current = bootKey;
      } catch (e: any) {
        // You can wire this into your toast system if you have one.
        console.error("[brainstorm] bootstrap failed:", e?.message ?? e);
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bootKey]);

  // ----------------------------------------------------------------
  // From here: render based on booting/sessionId/activePageId
  // ----------------------------------------------------------------

  // Example gating:
  if (open && (booting || !sessionId || !activePageId)) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Initializing brainstorm…
      </div>
    );
  }

  // ...keep your existing JSX that renders the modal,
  // using `sessionId`, `pages`, `activePageId`.
  return (
    <div>
      {/* your existing modal layout */}
      {/* make sure BrainstormWhiteboard gets activePageId */}
      {/* <BrainstormWhiteboard pageId={activePageId!} /> */}
    </div>
  );
}
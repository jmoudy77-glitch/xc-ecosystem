// app/programs/[programId]/brainstorm/BrainstormModal.tsx

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GlassModalShell } from "@/components/ui/GlassModalShell";
import { DndContext, DragEndEvent, DragStartEvent, useDroppable } from "@dnd-kit/core";
import { BrainstormWhiteboard } from "@/components/brainstorm/BrainstormWhiteboard";

export type BrainstormScopeType =
  | "program"
  | "team"
  | "team_season"
  | "athlete"
  | "execution_balance";

export type BrainstormContext = {
  programId: string;
  scopeType: BrainstormScopeType;
  scopeId: string;
  teamId?: string;
  teamSeasonId?: string;
  athleteId?: string;
  title?: string;
};

type BrainstormModalProps = {
  open: boolean;
  onClose: () => void;
  context: BrainstormContext;
};

type ChatRole = "coach" | "ai";
type ChatMessage = {
  id: string;
  role: ChatRole;
  body: string;
  createdAt: number;
};

type IndexItemType = "decision" | "assumption" | "constraint" | "question" | "risk" | "event";
type IndexItem = {
  id: string;
  type: IndexItemType;
  label: string;
  // References into the session (message ids, whiteboard object ids, etc.).
  refs?: { messageIds?: string[]; boardObjectIds?: string[]; pageIds?: string[] };
  createdAt: number;
  resolvedAt?: number | null;
};

type BoardObjectType = "image" | "file" | "note" | "ai_viz";
type BoardObject = {
  id: string;
  type: BoardObjectType;
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  text?: string;
  // For dropped artifacts
  fileName?: string;
  mimeType?: string;
  // Data URL for images (scaffold only)
  dataUrl?: string;
  createdBy: "coach" | "ai";
  createdAt: number;
};

type BoardPage = {
  id: string;
  title: string;
  createdAt: number;
  objects: BoardObject[];
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function pillClasses(type: IndexItemType) {
  const base = "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-white/10";
  switch (type) {
    case "decision":
      return `${base} bg-panel-muted/45 text-[var(--foreground)]`;
    case "assumption":
      return `${base} bg-panel-muted/35 text-[var(--muted-foreground)]`;
    case "constraint":
      return `${base} bg-panel-muted/40 text-[var(--foreground)]`;
    case "question":
      return `${base} bg-panel-muted/35 text-[var(--foreground)]`;
    case "risk":
      return `${base} bg-panel-muted/40 text-[var(--foreground)]`;
    case "event":
      return `${base} bg-panel-muted/35 text-[var(--foreground)]`;
    default:
      return base;
  }
}

function IndexRow({ item, onJump }: { item: IndexItem; onJump: (item: IndexItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onJump(item)}
      className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-panel-muted/35 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
    >
      <span className={pillClasses(item.type)}>{item.type.toUpperCase()}</span>
      <span className="min-w-0 flex-1 text-[11px] text-[var(--foreground)]">
        <span className="line-clamp-2">{item.label}</span>
        {item.resolvedAt ? (
          <span className="ml-2 text-[10px] text-[var(--muted-foreground)]">resolved</span>
        ) : null}
      </span>
      <span className="mt-0.5 text-[10px] text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100">
        Jump
      </span>
    </button>
  );
}

function BoardDropZone({
  children,
  onFilesDropped,
}: {
  children: React.ReactNode;
  onFilesDropped: (files: FileList, dropPoint: { x: number; y: number }) => void;
}) {
  const { setNodeRef } = useDroppable({ id: "brainstorm-board" });
  const ref = useRef<HTMLDivElement | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const dt = e.dataTransfer;
      if (!dt?.files || dt.files.length === 0) return;

      const rect = ref.current?.getBoundingClientRect();
      const x = rect ? e.clientX - rect.left : e.clientX;
      const y = rect ? e.clientY - rect.top : e.clientY;
      onFilesDropped(dt.files, { x, y });
    },
    [onFilesDropped]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={(node) => {
        ref.current = node;
        setNodeRef(node);
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="relative h-full w-full overflow-hidden rounded-xl bg-panel/35 ring-1 ring-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
    >
      {children}
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
        <div className="rounded-full bg-panel-muted/35 px-3 py-1 text-[10px] text-[var(--muted-foreground)] ring-1 ring-white/10">
          Drag & drop files/images here. Click objects to add anchored notes.
        </div>
      </div>
    </div>
  );
}

function AnalyticsProbePanel({
  open,
  onClose,
  context,
}: {
  open: boolean;
  onClose: () => void;
  context: BrainstormContext;
}) {
  if (!open) return null;

  return (
    <div className="absolute right-12 top-16 z-50 w-[420px] rounded-xl bg-panel/55 p-4 ring-1 ring-white/10 shadow-[0_18px_55px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-[var(--foreground)]">Analytics Probe</div>
          <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
            Opens to the current context (scope: {context.scopeType}). Configure a graph/table here.
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-panel-muted/35 px-2 py-1 text-[10px] font-semibold text-[var(--foreground)] ring-1 ring-white/10 hover:bg-panel-muted/45"
        >
          Close
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-panel-muted/25 p-2 ring-1 ring-white/10">
          <div className="text-[10px] font-semibold text-[var(--foreground)]">Visualization</div>
          <div className="mt-2 space-y-2">
            <select className="w-full rounded-md bg-panel/40 px-2 py-1 text-[11px] text-[var(--foreground)] ring-1 ring-white/10">
              <option>Line</option>
              <option>Scatter</option>
              <option>Bar</option>
              <option>Histogram</option>
              <option>Table</option>
            </select>
            <select className="w-full rounded-md bg-panel/40 px-2 py-1 text-[11px] text-[var(--foreground)] ring-1 ring-white/10">
              <option>Auto (context default)</option>
              <option>Athlete performances</option>
              <option>Training sessions</option>
              <option>Roster / scholarships</option>
              <option>Performance rollups</option>
            </select>
          </div>
        </div>

        <div className="rounded-lg bg-panel-muted/25 p-2 ring-1 ring-white/10">
          <div className="text-[10px] font-semibold text-[var(--foreground)]">Filters</div>
          <div className="mt-2 space-y-2">
            <input
              placeholder="Time window (e.g., last 8 weeks)"
              className="w-full rounded-md bg-panel/40 px-2 py-1 text-[11px] text-[var(--foreground)] ring-1 ring-white/10 placeholder:text-[var(--muted-foreground)]"
            />
            <input
              placeholder="Athletes / event codes (optional)"
              className="w-full rounded-md bg-panel/40 px-2 py-1 text-[11px] text-[var(--foreground)] ring-1 ring-white/10 placeholder:text-[var(--muted-foreground)]"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-panel-muted/25 p-2 ring-1 ring-white/10">
        <div className="text-[10px] font-semibold text-[var(--foreground)]">Preview (placeholder)</div>
        <div className="mt-2 h-[160px] rounded-md bg-panel/35 ring-1 ring-white/10" />
        <div className="mt-2 flex items-center justify-between">
          <div className="text-[10px] text-[var(--muted-foreground)]">
            Probes are temporary until you pin a snapshot to the board.
          </div>
          <button
            type="button"
            className="rounded-md bg-panel-muted/35 px-2 py-1 text-[10px] font-semibold text-[var(--foreground)] ring-1 ring-white/10 hover:bg-panel-muted/45"
          >
            Pin snapshot
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BrainstormModal({ open, onClose, context }: BrainstormModalProps) {
  const [mounted, setMounted] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: uid("m"),
      role: "ai",
      body:
        "This is the Brainstorm workspace. Use the chat to explore; use the board to externalize. The index below will capture decisions, questions, constraints, and events.",
      createdAt: Date.now(),
    },
  ]);
  const [draft, setDraft] = useState("");

  const [indexItems, setIndexItems] = useState<IndexItem[]>(() => [
    {
      id: uid("idx"),
      type: "constraint",
      label: "Index items are meant to be quick-reference anchors (not a summary).",
      createdAt: Date.now(),
    },
  ]);

  const [pages, setPages] = useState<BoardPage[]>(() => [
    {
      id: uid("page"),
      title: "Page 1",
      createdAt: Date.now(),
      objects: [],
    },
  ]);
  const [activePageId, setActivePageId] = useState(() => pages[0].id);
  const activePage = useMemo(() => pages.find((p) => p.id === activePageId) ?? pages[0], [pages, activePageId]);

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [showProbe, setShowProbe] = useState(false);
  const [probeMode, setProbeMode] = useState<"graph" | "table" | null>(null);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // --- Minimal indexing heuristics (scaffold): create index items from coach messages.
  const maybeIndexMessage = useCallback((msg: ChatMessage) => {
    if (msg.role !== "coach") return;
    const body = msg.body.trim();
    if (!body) return;

    const now = Date.now();
    const next: IndexItem[] = [];

    if (body.endsWith("?") || body.toLowerCase().startsWith("why") || body.toLowerCase().startsWith("how")) {
      next.push({
        id: uid("idx"),
        type: "question",
        label: body.length > 120 ? `${body.slice(0, 117)}…` : body,
        refs: { messageIds: [msg.id] },
        createdAt: now,
      });
    }

    if (body.toLowerCase().includes("must") || body.toLowerCase().includes("cannot") || body.toLowerCase().includes("non-negotiable")) {
      next.push({
        id: uid("idx"),
        type: "constraint",
        label: body.length > 120 ? `${body.slice(0, 117)}…` : body,
        refs: { messageIds: [msg.id] },
        createdAt: now,
      });
    }

    if (next.length) setIndexItems((prev) => [...next, ...prev]);
  }, []);

  const sendCoachMessage = useCallback(() => {
    const body = draft.trim();
    if (!body) return;
    const msg: ChatMessage = { id: uid("m"), role: "coach", body, createdAt: Date.now() };
    setMessages((prev) => [...prev, msg]);
    setDraft("");
    maybeIndexMessage(msg);
  }, [draft, maybeIndexMessage]);

  const onIndexJump = useCallback(
    (item: IndexItem) => {
      // Scaffold behavior: jump to first referenced message, else no-op.
      const mid = item.refs?.messageIds?.[0];
      if (!mid) return;
      const el = document.getElementById(`msg-${mid}`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    []
  );

  const addFreeNote = useCallback(() => {
    const note: BoardObject = {
      id: uid("obj"),
      type: "note",
      x: 40,
      y: 40,
      w: 260,
      h: 120,
      title: "Note",
      text: "",
      createdBy: "coach",
      createdAt: Date.now(),
    };
    setPages((prev) =>
      prev.map((p) => (p.id === activePageId ? { ...p, objects: [...p.objects, note] } : p))
    );
    setSelectedObjectId(note.id);
  }, [activePageId]);

  const addAnchoredNote = useCallback(
    (anchorId: string) => {
      const note: BoardObject = {
        id: uid("obj"),
        type: "note",
        x: 40,
        y: 40,
        w: 260,
        h: 120,
        title: "Anchored note",
        text: `Anchor: ${anchorId}`,
        createdBy: "coach",
        createdAt: Date.now(),
      };
      setPages((prev) =>
        prev.map((p) => (p.id === activePageId ? { ...p, objects: [...p.objects, note] } : p))
      );
      setSelectedObjectId(note.id);
    },
    [activePageId]
  );

  const onFilesDropped = useCallback(
    async (files: FileList, dropPoint: { x: number; y: number }) => {
      const now = Date.now();
      const newObjects: BoardObject[] = [];

      // Scaffold only: images become data URLs; other files become file tiles.
      for (let i = 0; i < files.length; i++) {
        const f = files.item(i);
        if (!f) continue;
        const isImage = f.type.startsWith("image/");

        if (isImage) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(new Error("Failed to read image"));
            reader.readAsDataURL(f);
          });

          newObjects.push({
            id: uid("obj"),
            type: "image",
            x: dropPoint.x + i * 18,
            y: dropPoint.y + i * 18,
            w: 320,
            h: 200,
            title: f.name,
            fileName: f.name,
            mimeType: f.type,
            dataUrl,
            createdBy: "coach",
            createdAt: now,
          });
        } else {
          newObjects.push({
            id: uid("obj"),
            type: "file",
            x: dropPoint.x + i * 18,
            y: dropPoint.y + i * 18,
            w: 300,
            h: 72,
            title: f.name,
            fileName: f.name,
            mimeType: f.type || "application/octet-stream",
            createdBy: "coach",
            createdAt: now,
          });
        }
      }

      if (newObjects.length) {
        setPages((prev) =>
          prev.map((p) => (p.id === activePageId ? { ...p, objects: [...p.objects, ...newObjects] } : p))
        );
      }
    },
    [activePageId]
  );

  const archiveToNewPage = useCallback(async () => {
    try {
      const res = await fetch("/api/brainstorm/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: context.programId,
          sessionId: context.scopeId,
        }),
      });

      if (!res.ok) {
        console.error("[Brainstorm] failed to create new page", await res.text());
        return;
      }

      const { data: page } = await res.json();

      setPages((prev) => [
        ...prev,
        {
          id: page.id,
          title: page.title,
          createdAt: Date.now(),
          objects: [],
        },
      ]);

      setActivePageId(page.id);
      setSelectedObjectId(null);
    } catch (err) {
      console.error("[Brainstorm] unexpected error creating page", err);
    }
  }, [context.programId, context.scopeId]);

  const updateObject = useCallback(
    (objectId: string, patch: Partial<BoardObject>) => {
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId
            ? {
                ...p,
                objects: p.objects.map((o) => (o.id === objectId ? { ...o, ...patch } : o)),
              }
            : p
        )
      );
    },
    [activePageId]
  );

  const selectedObject = useMemo(
    () => activePage.objects.find((o) => o.id === selectedObjectId) ?? null,
    [activePage.objects, selectedObjectId]
  );

  const modalTitle = context.title ?? "Brainstorm";

  if (!open || !mounted) return null;

  const body = (
    <GlassModalShell
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-[96vw]"
      heightClassName="h-[86vh]"
      header={
        <div>
          <div className="text-sm font-semibold text-[var(--foreground)]">
            {modalTitle}
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            Scope: {context.scopeType}
          </div>
        </div>
      }
    >
      <DndContext
        onDragStart={(e: DragStartEvent) => setActiveDragId(String(e.active.id))}
        onDragEnd={(e: DragEndEvent) => {
          setActiveDragId(null);
          void e;
        }}
      >
        <div className="flex h-full flex-col gap-3">
          {/* Top context strip: Tension + Event Groups */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-panel/35 px-3 py-2 ring-1 ring-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Context
              </div>

              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold text-[var(--foreground)]">Tension</div>
                <select className="rounded-md bg-panel/40 px-2 py-1 text-[11px] text-[var(--foreground)] ring-1 ring-white/10">
                  <option>None selected</option>
                  <option>Scholarship cap vs roster size</option>
                  <option>Travel load vs recovery</option>
                  <option>Peak performance vs injury risk</option>
                </select>
              </div>

              <div className="h-6 w-px bg-white/10" />

              <div className="flex min-w-0 items-center gap-2">
                <div className="shrink-0 text-[11px] font-semibold text-[var(--foreground)]">Event Group</div>
                <div className="flex min-w-0 flex-wrap gap-1">
                  {[
                    "Sprints",
                    "Mids",
                    "Distance",
                    "Jumps",
                    "Throws",
                  ].map((g) => (
                    <button
                      key={g}
                      type="button"
                      className="rounded-full bg-panel-muted/30 px-2 py-0.5 text-[10px] font-semibold text-[var(--foreground)] ring-1 ring-white/10 hover:bg-panel-muted/40"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addFreeNote}
                className="rounded-md bg-panel-muted/35 px-2 py-1 text-[10px] font-semibold text-[var(--foreground)] ring-1 ring-white/10 hover:bg-panel-muted/45"
              >
                + Note
              </button>
              <button
                type="button"
                onClick={archiveToNewPage}
                className="rounded-md bg-panel-muted/35 px-2 py-1 text-[10px] font-semibold text-[var(--foreground)] ring-1 ring-white/10 hover:bg-panel-muted/45"
              >
                New Page
              </button>
            </div>
          </div>

          {/* Main layout: Whiteboard (left) + Conversation/Index (right) + Edge selectors */}
          <div className="relative grid h-full grid-cols-[1fr_360px_44px] gap-3 pointer-events-auto select-none">
            {/* Left: Whiteboard */}
            <div
              className="relative h-full min-h-0 overflow-hidden rounded-xl bg-panel/20 ring-1 ring-white/10 pointer-events-auto"
              style={{ zIndex: 1 }}
              onPointerDownCapture={(e) => {
                e.stopPropagation();
              }}
              onMouseDownCapture={(e) => {
                e.stopPropagation();
              }}
            >
              <BrainstormWhiteboard pageId={activePageId} />
            </div>

            {/* Right: Conversation + Index */}
            <div className="flex h-full flex-col gap-3 pointer-events-auto" style={{ zIndex: 2 }}>
              <div className="flex h-[58%] flex-col overflow-hidden rounded-xl bg-panel/35 ring-1 ring-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                <div className="flex items-center justify-between px-3 py-2">
                  <div>
                    <div className="text-xs font-semibold text-[var(--foreground)]">Conversation</div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">Single thread (coach + AI)</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Scaffold: add a deterministic AI response placeholder
                      const msg: ChatMessage = {
                        id: uid("m"),
                        role: "ai",
                        body:
                          "AI response placeholder. In production, this will be streamed, and index entries will be created from typed intent (decision/assumption/etc.).",
                        createdAt: Date.now(),
                      };
                      setMessages((prev) => [...prev, msg]);
                    }}
                    className="rounded-md bg-panel-muted/35 px-2 py-1 text-[10px] font-semibold text-[var(--foreground)] ring-1 ring-white/10 hover:bg-panel-muted/45"
                  >
                    Nudge AI
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-3 select-text">
                  <div className="space-y-2">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        id={`msg-${m.id}`}
                        className={`rounded-lg p-2 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
                          m.role === "coach" ? "bg-panel-muted/35" : "bg-panel-muted/25"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-semibold text-[var(--foreground)]">
                            {m.role === "coach" ? "Coach" : "AI"}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              // Promote to board as a note (scaffold)
                              const obj: BoardObject = {
                                id: uid("obj"),
                                type: "note",
                                x: 24,
                                y: 24,
                                w: 320,
                                h: 140,
                                title: `${m.role === "coach" ? "Coach" : "AI"} excerpt`,
                                text: m.body,
                                createdBy: m.role,
                                createdAt: Date.now(),
                              };
                              setPages((prev) =>
                                prev.map((p) =>
                                  p.id === activePageId ? { ...p, objects: [...p.objects, obj] } : p
                                )
                              );
                              setSelectedObjectId(obj.id);
                            }}
                            className="rounded-md bg-panel-muted/35 px-2 py-0.5 text-[10px] text-[var(--muted-foreground)] ring-1 ring-white/10 hover:text-[var(--foreground)]"
                          >
                            Pin
                          </button>
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-[11px] text-[var(--foreground)]">{m.body}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/10 p-2">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type as coach…"
                      className="h-[54px] flex-1 resize-none rounded-md bg-panel/35 px-2 py-1 text-[11px] text-[var(--foreground)] ring-1 ring-white/10 placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 select-text"
                    />
                    <button
                      type="button"
                      onClick={sendCoachMessage}
                      className="rounded-md bg-panel-muted/35 px-3 py-2 text-xs font-semibold text-[var(--foreground)] ring-1 ring-white/10 hover:bg-panel-muted/45 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex h-[42%] flex-col overflow-hidden rounded-xl bg-panel/35 ring-1 ring-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                <div className="flex items-center justify-between px-3 py-2">
                  <div>
                    <div className="text-xs font-semibold text-[var(--foreground)]">Index</div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">
                      Live table of contents (decisions, questions, constraints…)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIndexItems((prev) => [
                        {
                          id: uid("idx"),
                          type: "decision",
                          label: "(Manual) Decision placeholder",
                          createdAt: Date.now(),
                        },
                        ...prev,
                      ]);
                    }}
                    className="rounded-md bg-panel-muted/35 px-2 py-1 text-[10px] font-semibold text-[var(--foreground)] ring-1 ring-white/10 hover:bg-panel-muted/45"
                  >
                    + Decision
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2">
                  <div className="space-y-1">{indexItems.map((it) => <IndexRow key={it.id} item={it} onJump={onIndexJump} />)}</div>
                </div>
              </div>
            </div>

            {/* Far-right: Graph/Table selectors (edge rail) */}
            <div className="flex h-full flex-col items-center gap-2 rounded-xl bg-panel/20 py-3 ring-1 ring-white/10 pointer-events-auto" style={{ zIndex: 3 }}>
              <button
                type="button"
                onClick={() => {
                  setProbeMode("graph");
                  setShowProbe(true);
                }}
                className="w-9 rounded-lg bg-panel-muted/30 px-2 py-2 text-[10px] font-semibold text-[var(--foreground)] ring-1 ring-white/10 hover:bg-panel-muted/40"
                title="Graph"
              >
                G
              </button>
              <button
                type="button"
                onClick={() => {
                  setProbeMode("table");
                  setShowProbe(true);
                }}
                className="w-9 rounded-lg bg-panel-muted/30 px-2 py-2 text-[10px] font-semibold text-[var(--foreground)] ring-1 ring-white/10 hover:bg-panel-muted/40"
                title="Table"
              >
                T
              </button>
              <div className="mt-auto flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProbeMode(null);
                    setShowProbe(false);
                  }}
                  className="w-9 rounded-lg bg-panel-muted/30 px-2 py-2 text-[10px] font-semibold text-[var(--muted-foreground)] ring-1 ring-white/10 hover:bg-panel-muted/40 hover:text-[var(--foreground)]"
                  title="Close probes"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          {/* Analytics probe overlay (placeholder) */}
          <AnalyticsProbePanel
            open={showProbe}
            onClose={() => {
              setShowProbe(false);
              setProbeMode(null);
            }}
            context={context}
          />
        </div>
      </DndContext>
      {activeDragId ? null : null}
    </GlassModalShell>
  );

  return createPortal(body, document.body);
}

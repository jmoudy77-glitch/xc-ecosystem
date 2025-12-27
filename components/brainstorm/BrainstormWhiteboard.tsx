// components/brainstorm/BrainstormWhiteboard.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrainstormObjectBase } from "@/lib/brainstorm/types";
import { WhiteboardObjectRenderer } from "./WhiteboardObjectRenderer";

type Props = {
  pageId: string;
};

export function BrainstormWhiteboard({ pageId }: Props) {
  const [objects, setObjects] = useState<BrainstormObjectBase[]>([]);
  const objectsRef = useRef<BrainstormObjectBase[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [boardCursor, setBoardCursor] = useState<
    "default" | "crosshair" | "grab" | "grabbing" | "move" | "pointer" | "text"
  >("default");

  // --- Dev hover debugger ---
  const isDev = process.env.NODE_ENV !== "production";
  const [debugHover, setDebugHover] = useState<string>("");
  const [debugPt, setDebugPt] = useState<{ x: number; y: number } | null>(null);

  function updateHoverDebug(clientX: number, clientY: number) {
    if (!isDev) return;
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!el) {
      setDebugHover("(no element)");
      setDebugPt({ x: clientX, y: clientY });
      return;
    }

    const tag = el.tagName.toLowerCase();
    const aria = el.getAttribute("aria-label") || "";
    const role = el.getAttribute("role") || "";
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" ? el.className : "";

    setDebugHover(
      [
        tag + id,
        role ? `role=${role}` : "",
        aria ? `aria-label="${aria}"` : "",
        cls ? `class="${cls}"` : "",
      ]
        .filter(Boolean)
        .join(" | ")
    );
    setDebugPt({ x: clientX, y: clientY });
  }

  // Keep an always-fresh snapshot for pointer/async handlers that read outside render.
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  const [selectedObjectIds, setSelectedObjectIds] = useState<Set<string>>(() => new Set());

  const boardRef = useRef<HTMLDivElement | null>(null);
  const [boardSize, setBoardSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  function getNextZIndex() {
    const maxZ = objectsRef.current.reduce((m, o) => Math.max(m, o.z_index ?? 0), 0);
    return maxZ + 1;
  }

  function clientPointToBoardPoint(clientX: number, clientY: number) {
    const el = boardRef.current;
    if (!el) return { x: 24, y: 24 };
    const rect = el.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  async function createTextNoteAt(x: number, y: number) {
    const tempId = `temp_${crypto.randomUUID()}`;
    const temp: BrainstormObjectBase = {
      id: tempId,
      page_id: pageId,
      object_type: "text_note",
      payload_json: { text: "" },
      x,
      y,
      width: 320,
      height: 180,
      z_index: getNextZIndex(),
      created_at: new Date().toISOString(),
      created_by_user_id: "",
    };

    // Optimistic insert
    setObjects((prev) => [...prev, temp]);
    setSelectedObjectIds(new Set([tempId]));

    try {
      const res = await fetch(`/api/brainstorm/pages/${pageId}/objects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          object_type: "text_note",
          payload_json: { text: "" },
          x,
          y,
          width: 320,
          height: 180,
          z_index: temp.z_index,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to create text note");
      }

      const created: BrainstormObjectBase = json.data;

      setObjects((prev) => prev.map((o) => (o.id === tempId ? created : o)));
      setSelectedObjectIds(new Set([created.id]));
    } catch {
      // Roll back optimistic insert on failure
      setObjects((prev) => prev.filter((o) => o.id !== tempId));
      setSelectedObjectIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }
  }

  async function deleteObject(objectId: string) {
    // Optimistic UI remove
    setObjects((prev) => prev.filter((o) => o.id !== objectId));
    setSelectedObjectIds((prev) => {
      const next = new Set(prev);
      next.delete(objectId);
      return next;
    });

    try {
      await fetch(`/api/brainstorm/objects/${objectId}`, {
        method: "DELETE",
      });
    } catch {
      // non-fatal; best-effort
    }
  }

  function clearSelection() {
    setSelectedObjectIds(new Set());
  }

  function isMultiModifier(e: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) {
    return !!(e.shiftKey || e.metaKey || e.ctrlKey);
  }

  function toggleSelection(objectId: string) {
    setSelectedObjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(objectId)) next.delete(objectId);
      else next.add(objectId);
      return next;
    });
  }

  function selectOnly(objectId: string) {
    setSelectedObjectIds(new Set([objectId]));
  }

  async function persistManyPositions(updates: Array<{ id: string; x: number; y: number }>) {
    await Promise.all(
      updates.map(async (u) => {
        try {
          await fetch(`/api/brainstorm/objects/${u.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ x: u.x, y: u.y }),
          });
        } catch {
          // non-fatal
        }
      })
    );
  }

  async function deleteMany(objectIds: string[]) {
    // Optimistic UI remove
    setObjects((prev) => prev.filter((o) => !objectIds.includes(o.id)));
    setSelectedObjectIds((prev) => {
      const next = new Set(prev);
      for (const id of objectIds) next.delete(id);
      return next;
    });

    await Promise.all(
      objectIds.map(async (id) => {
        try {
          await fetch(`/api/brainstorm/objects/${id}`, { method: "DELETE" });
        } catch {
          // best-effort
        }
      })
    );
  }

  async function bringManyToFront(objectIds: string[]) {
    // Optimistic z-order (stable ordering)
    setObjects((prev) => {
      const maxZ = prev.reduce((m, o) => Math.max(m, o.z_index ?? 0), 0);
      let i = 1;
      return prev.map((o) =>
        objectIds.includes(o.id) ? { ...o, z_index: maxZ + i++ } : o
      );
    });

    const maxZ = objectsRef.current.reduce((m, o) => Math.max(m, o.z_index ?? 0), 0);
    let i = 1;
    await Promise.all(
      objectIds.map(async (id) => {
        try {
          await fetch(`/api/brainstorm/objects/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ z_index: maxZ + i++ }),
          });
        } catch {
          // non-fatal
        }
      })
    );
  }

  async function bringToFront(objectId: string) {
    await bringManyToFront([objectId]);
  }

  const selectedObjects = useMemo(
    () => objects.filter((o) => selectedObjectIds.has(o.id)),
    [objects, selectedObjectIds]
  );

  const primarySelectedObject = useMemo(
    () => {
      if (selectedObjects.length === 1) return selectedObjects[0];
      return null;
    },
    [selectedObjects]
  );

  const selectionBounds = useMemo(() => {
    if (selectedObjects.length === 0) return null;

    const xs = selectedObjects.map((o) => o.x);
    const ys = selectedObjects.map((o) => o.y);
    const rights = selectedObjects.map((o) => o.x + (o.width ?? 240));
    const bottoms = selectedObjects.map((o) => o.y + (o.height ?? 120));

    return {
      left: Math.min(...xs),
      top: Math.min(...ys),
      right: Math.max(...rights),
      bottom: Math.max(...bottoms),
    };
  }, [selectedObjects]);

  const dragRef = useRef<{
    pointerId: number;
    anchorObjectId: string;
    startX: number;
    startY: number;
    origins: Record<string, { x: number; y: number }>;
    didMove: boolean;
  } | null>(null);

  const resizeRef = useRef<{
    pointerId: number;
    objectId: string;
    handle: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    aspect: number; // w/h
    didResize: boolean;
    lockAspect: boolean;
  } | null>(null);

  const nudgeDebounceRef = useRef<number | null>(null);
  const pendingNudgeIdsRef = useRef<Set<string>>(new Set());

  async function persistObjectPosition(objectId: string, x: number, y: number) {
    try {
      await fetch(`/api/brainstorm/objects/${objectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x, y }),
      });
    } catch {
      // non-fatal; optimistic UI already updated
    }
  }

  async function persistObjectSize(objectId: string, width: number | null, height: number | null) {
    try {
      await fetch(`/api/brainstorm/objects/${objectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ width, height }),
      });
    } catch {
      // non-fatal; optimistic UI already updated
    }
  }

  function startResize(e: React.PointerEvent<HTMLDivElement>, objectId: string, handle: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw") {
    e.stopPropagation();

    const obj = objects.find((o) => o.id === objectId);
    if (!obj) return;

    // Resizing is only for a single (primary) selection.
    if (!selectedObjectIds.has(objectId)) {
      selectOnly(objectId);
    }

    const startW = obj.width ?? 240;
    const startH = obj.height ?? 120;
    const aspect = startH === 0 ? 1 : startW / startH;

    resizeRef.current = {
      pointerId: e.pointerId,
      objectId,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: obj.x,
      startY: obj.y,
      startW,
      startH,
      aspect,
      didResize: false,
      lockAspect: !!e.shiftKey,
    };
    setIsResizing(true);

    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function handleBackgroundPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (isResizing) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest?.("[data-whiteboard-object-id]")) return;

    clearSelection();
  }

  useEffect(() => {
    let active = true;

    // New page = new whiteboard selection context
    clearSelection();

    // Track board size for anchored selection UI
    const el = boardRef.current;
    const ro = el
      ? new ResizeObserver(() => {
          setBoardSize({ w: el.clientWidth, h: el.clientHeight });
        })
      : null;

    if (el) {
      setBoardSize({ w: el.clientWidth, h: el.clientHeight });
      ro?.observe(el);
    }

    async function load() {
      setLoading(true);
      const res = await fetch(`/api/brainstorm/pages/${pageId}/objects`);
      const json = await res.json();
      if (!active) return;
      const next = json.data ?? [];
      setObjects(next);
      objectsRef.current = next;
      setLoading(false);
    }

    load();
    return () => {
      ro?.disconnect();
      active = false;
    };
  }, [pageId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Avoid hijacking keystrokes while typing in inputs/textareas/contenteditable
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      const isTypingTarget =
        tag === "input" ||
        tag === "textarea" ||
        (t?.getAttribute?.("role") === "textbox") ||
        !!t?.isContentEditable;

      if (e.key === "Escape") {
        clearSelection();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedObjectIds.size > 0) {
          // If user is typing, let Backspace/Delete behave normally.
          if (isTypingTarget) return;
          e.preventDefault();
          void deleteMany(Array.from(selectedObjectIds));
        }
        return;
      }

      // Arrow-key nudge (A)
      if (
        (e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight") &&
        selectedObjectIds.size > 0
      ) {
        if (isTypingTarget) return;

        e.preventDefault();

        const baseStep = e.shiftKey ? 10 : 1;
        const step = (e.metaKey || e.ctrlKey) ? 25 : baseStep;

        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;

        const ids = Array.from(selectedObjectIds);
        pendingNudgeIdsRef.current = new Set(ids);

        setObjects((prev) =>
          prev.map((o) => {
            if (!selectedObjectIds.has(o.id)) return o;
            return {
              ...o,
              x: o.x + dx,
              y: o.y + dy,
            };
          })
        );

        // Debounce persistence so we don't spam PATCH on key-repeat.
        if (nudgeDebounceRef.current) {
          window.clearTimeout(nudgeDebounceRef.current);
        }

        nudgeDebounceRef.current = window.setTimeout(() => {
          const idsToPersist = Array.from(pendingNudgeIdsRef.current);
          if (idsToPersist.length === 0) return;

          // Read latest positions from the most recent objects snapshot
          const latest = objectsRef.current;

          const updates: Array<{ id: string; x: number; y: number }> = [];
          for (const id of idsToPersist) {
            const final = latest.find((o) => o.id === id);
            if (final) updates.push({ id, x: final.x, y: final.y });
          }

          if (updates.length > 0) {
            void persistManyPositions(updates);
          }
        }, 120);

        return;
      }
    }

    function onPointerMove(e: PointerEvent) {
      const r = resizeRef.current;
      if (!r) return;
      if (r.pointerId !== e.pointerId) return;

      const dx = e.clientX - r.startClientX;
      const dy = e.clientY - r.startClientY;
      if (dx !== 0 || dy !== 0) r.didResize = true;

      const minW = 120;
      const minH = 72;

      let newX = r.startX;
      let newY = r.startY;
      let newW = r.startW;
      let newH = r.startH;

      const lock = r.lockAspect;

      // Horizontal adjustments
      if (r.handle.includes("e")) {
        newW = r.startW + dx;
      }
      if (r.handle.includes("w")) {
        newW = r.startW - dx;
        newX = r.startX + dx;
      }

      // Vertical adjustments
      if (r.handle.includes("s")) {
        newH = r.startH + dy;
      }
      if (r.handle.includes("n")) {
        newH = r.startH - dy;
        newY = r.startY + dy;
      }

      // Aspect lock on corner handles
      const isCorner = r.handle.length === 2;
      if (lock && isCorner) {
        // Prefer the dominant delta
        const wFromDx = (r.handle.includes("e") ? r.startW + dx : r.startW - dx);
        const hFromDy = (r.handle.includes("s") ? r.startH + dy : r.startH - dy);

        const dw = Math.abs(wFromDx - r.startW);
        const dh = Math.abs(hFromDy - r.startH);

        if (dw >= dh) {
          newW = wFromDx;
          newH = newW / r.aspect;
          if (r.handle.includes("n")) {
            newY = r.startY + (r.startH - newH);
          }
          if (r.handle.includes("w")) {
            newX = r.startX + (r.startW - newW);
          }
        } else {
          newH = hFromDy;
          newW = newH * r.aspect;
          if (r.handle.includes("n")) {
            newY = r.startY + (r.startH - newH);
          }
          if (r.handle.includes("w")) {
            newX = r.startX + (r.startW - newW);
          }
        }
      }

      // Clamp
      if (newW < minW) {
        if (r.handle.includes("w")) {
          newX -= (minW - newW);
        }
        newW = minW;
      }
      if (newH < minH) {
        if (r.handle.includes("n")) {
          newY -= (minH - newH);
        }
        newH = minH;
      }

      setObjects((prev) =>
        prev.map((o) => {
          if (o.id !== r.objectId) return o;
          return { ...o, x: newX, y: newY, width: newW, height: newH };
        })
      );
    }

    async function onPointerUp(e: PointerEvent) {
      const r = resizeRef.current;
      if (!r) return;
      if (r.pointerId !== e.pointerId) return;

      resizeRef.current = null;
      setIsResizing(false);
      setBoardCursor("default");

      const final = objectsRef.current.find((o) => o.id === r.objectId);
      if (final) {
        void persistObjectSize(final.id, final.width ?? null, final.height ?? null);
        // If resize also moved the object (west/north handles), persist position too.
        void persistObjectPosition(final.id, final.x, final.y);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (nudgeDebounceRef.current) {
        window.clearTimeout(nudgeDebounceRef.current);
        nudgeDebounceRef.current = null;
      }
      setIsDragging(false);
      setIsResizing(false);
    };
  }, [selectedObjectIds, objects]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Loading whiteboard…
      </div>
    );
  }

  return (
    <div
      ref={boardRef}
      className="relative flex-1 overflow-hidden bg-surface select-none"
      style={{ cursor: boardCursor === "default" ? "crosshair" : boardCursor, touchAction: "none" }}
      onPointerEnter={() => {
        // Ensure we never leave the board in a browser-decided cursor state.
        setBoardCursor((c) => (c === "default" ? "crosshair" : c));
      }}
      onMouseEnter={() => {
        setBoardCursor((c) => (c === "default" ? "crosshair" : c));
      }}
      onPointerDown={handleBackgroundPointerDown}
      onPointerDownCapture={(e) => {
        // Capture-phase: ensure the board reacts even if nested elements stop propagation.
        // Do NOT change selection logic here; just keep cursor feedback reliable.
        const target = e.target as HTMLElement | null;
        const objEl = target?.closest?.("[data-whiteboard-object-id]") as HTMLElement | null;
        if (objEl) {
          const isSelected = objEl.getAttribute("aria-selected") === "true";
          setBoardCursor(isSelected ? "grab" : "pointer");
        } else {
          setBoardCursor("crosshair");
        }
      }}
      onPointerMoveCapture={(e) => {
        if (isResizing) return;
        if (isDragging) return;
        updateHoverDebug(e.clientX, e.clientY);
        const target = e.target as HTMLElement | null;
        const objEl = target?.closest?.("[data-whiteboard-object-id]") as HTMLElement | null;
        if (objEl) {
          const isSelected = objEl.getAttribute("aria-selected") === "true";
          setBoardCursor(isSelected ? "grab" : "pointer");
        } else {
          setBoardCursor("crosshair");
        }
      }}
      onPointerMove={(e) => {
        if (isResizing) {
          setBoardCursor("default");
          return;
        }

        if (isDragging) {
          setBoardCursor("grabbing");
          return;
        }

        const target = e.target as HTMLElement | null;
        const objEl = target?.closest?.("[data-whiteboard-object-id]") as HTMLElement | null;

        if (objEl) {
          const isSelected = objEl.getAttribute("aria-selected") === "true";
          setBoardCursor(isSelected ? "grab" : "pointer");
        } else {
          setBoardCursor("crosshair");
        }
      }}
      onMouseMove={(e) => {
        // Mouse fallback for environments where pointer events are intercepted.
        if (isResizing) {
          setBoardCursor("default");
          return;
        }
        if (isDragging) {
          setBoardCursor("grabbing");
          return;
        }
        updateHoverDebug(e.clientX, e.clientY);
        const target = e.target as HTMLElement | null;
        const objEl = target?.closest?.("[data-whiteboard-object-id]") as HTMLElement | null;
        if (objEl) {
          const isSelected = objEl.getAttribute("aria-selected") === "true";
          setBoardCursor(isSelected ? "grab" : "pointer");
        } else {
          setBoardCursor("crosshair");
        }
      }}
      onPointerLeave={() => {
        if (isDragging) return;
        if (isResizing) return;
        setBoardCursor("crosshair");
      }}
      onMouseLeave={() => {
        if (isDragging) return;
        if (isResizing) return;
        setBoardCursor("crosshair");
      }}
      onDoubleClick={(e) => {
        // Only create on empty-space double click (not on an existing object)
        const target = e.target as HTMLElement | null;
        if (target?.closest?.("[data-whiteboard-object-id]")) return;

        const pt = clientPointToBoardPoint(e.clientX, e.clientY);
        void createTextNoteAt(pt.x, pt.y);
      }}
      role="application"
      aria-label="Brainstorm whiteboard"
    >
      <div className="absolute inset-0">
        {objects.map((obj) => {
          const isSelected = selectedObjectIds.has(obj.id);

          return (
            <div
              key={obj.id}
              className={
                "absolute relative select-none" +
                (isSelected
                  ? " ring-2 ring-primary ring-offset-2 ring-offset-background rounded-md"
                  : "")
              }
              style={{
                left: obj.x,
                top: obj.y,
                width: obj.width ?? undefined,
                height: obj.height ?? undefined,
                zIndex: obj.z_index,
                cursor: isResizing
                  ? "default"
                  : isDragging && isSelected
                    ? "grabbing"
                    : isSelected
                      ? "grab"
                      : "pointer",
              }}
              onPointerDown={(e) => {
                e.stopPropagation();

                const multi = isMultiModifier(e);

                if (multi) {
                  // Toggle without forcing single-selection.
                  toggleSelection(obj.id);
                } else {
                  // If clicking an unselected object, make it the only selection.
                  if (!selectedObjectIds.has(obj.id)) {
                    selectOnly(obj.id);
                  }
                }

                // Start drag only when not using multi-modifiers.
                if (multi) return;

                const selectedNow = (() => {
                  // If multi-modifier is held, this handler returns early before dragging.
                  // Otherwise, ensure we drag either the existing selection (if already selected)
                  // or just this object (if it was unselected and we just selectedOnly()).
                  if (selectedObjectIds.has(obj.id)) return Array.from(selectedObjectIds);
                  return [obj.id];
                })();
                const origins: Record<string, { x: number; y: number }> = {};
                for (const id of selectedNow) {
                  const o = objects.find((x) => x.id === id);
                  if (o) origins[id] = { x: o.x, y: o.y };
                }

                dragRef.current = {
                  pointerId: e.pointerId,
                  anchorObjectId: obj.id,
                  startX: e.clientX,
                  startY: e.clientY,
                  origins,
                  didMove: false,
                };
                setIsDragging(true);
                setBoardCursor("grabbing");

                try {
                  (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
              }}
              onPointerMove={(e) => {
                const drag = dragRef.current;
                if (!drag) return;
                if (drag.pointerId !== e.pointerId) return;

                const dx = e.clientX - drag.startX;
                const dy = e.clientY - drag.startY;
                if (dx !== 0 || dy !== 0) drag.didMove = true;

                setObjects((prev) =>
                  prev.map((o) => {
                    const origin = drag.origins[o.id];
                    if (!origin) return o;
                    return {
                      ...o,
                      x: origin.x + dx,
                      y: origin.y + dy,
                    };
                  })
                );
              }}
              onPointerUp={async (e) => {
                const drag = dragRef.current;
                if (!drag) return;
                if (drag.pointerId !== e.pointerId) return;

                dragRef.current = null;
                setIsDragging(false);
                setBoardCursor("default");

                // Persist final positions (best-effort)
                const updates: Array<{ id: string; x: number; y: number }> = [];
                for (const id of Object.keys(drag.origins)) {
                  const final = objectsRef.current.find((o) => o.id === id);
                  if (final) updates.push({ id, x: final.x, y: final.y });
                }
                if (updates.length > 0) {
                  void persistManyPositions(updates);
                }

                try {
                  (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
              }}
              onPointerCancel={(e) => {
                const drag = dragRef.current;
                if (!drag) return;
                if (drag.pointerId !== e.pointerId) return;

                // Revert to origin on cancel
                setObjects((prev) =>
                  prev.map((o) => {
                    const origin = drag.origins[o.id];
                    if (!origin) return o;
                    return { ...o, x: origin.x, y: origin.y };
                  })
                );

                dragRef.current = null;
                setIsDragging(false);
                setBoardCursor("default");

                try {
                  (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
              }}
              data-whiteboard-object-id={obj.id}
              aria-selected={isSelected}
            >
              <WhiteboardObjectRenderer object={obj} />
              {primarySelectedObject?.id === obj.id ? (
                <div className="pointer-events-none absolute inset-0">
                  {/* Corner + edge handles */}
                  <div
                    className="pointer-events-auto absolute -left-1.5 -top-1.5 h-3 w-3 rounded-sm border bg-background shadow cursor-nwse-resize"
                    onPointerDown={(e) => startResize(e, obj.id, "nw")}
                    title="Resize (Shift = lock aspect)"
                  />
                  <div
                    className="pointer-events-auto absolute left-1/2 -top-1.5 h-3 w-3 -translate-x-1/2 rounded-sm border bg-background shadow cursor-ns-resize"
                    onPointerDown={(e) => startResize(e, obj.id, "n")}
                    title="Resize"
                  />
                  <div
                    className="pointer-events-auto absolute -right-1.5 -top-1.5 h-3 w-3 rounded-sm border bg-background shadow cursor-nesw-resize"
                    onPointerDown={(e) => startResize(e, obj.id, "ne")}
                    title="Resize (Shift = lock aspect)"
                  />

                  <div
                    className="pointer-events-auto absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-sm border bg-background shadow cursor-ew-resize"
                    onPointerDown={(e) => startResize(e, obj.id, "w")}
                    title="Resize"
                  />
                  <div
                    className="pointer-events-auto absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-sm border bg-background shadow cursor-ew-resize"
                    onPointerDown={(e) => startResize(e, obj.id, "e")}
                    title="Resize"
                  />

                  <div
                    className="pointer-events-auto absolute -left-1.5 -bottom-1.5 h-3 w-3 rounded-sm border bg-background shadow cursor-nesw-resize"
                    onPointerDown={(e) => startResize(e, obj.id, "sw")}
                    title="Resize (Shift = lock aspect)"
                  />
                  <div
                    className="pointer-events-auto absolute left-1/2 -bottom-1.5 h-3 w-3 -translate-x-1/2 rounded-sm border bg-background shadow cursor-ns-resize"
                    onPointerDown={(e) => startResize(e, obj.id, "s")}
                    title="Resize"
                  />
                  <div
                    className="pointer-events-auto absolute -right-1.5 -bottom-1.5 h-3 w-3 rounded-sm border bg-background shadow cursor-nwse-resize"
                    onPointerDown={(e) => startResize(e, obj.id, "se")}
                    title="Resize (Shift = lock aspect)"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Contextual inline controls (anchored to selection) */}
      {selectedObjectIds.size > 0 ? (
        (() => {
          const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

          // A conservative estimate of pill size for clamping.
          const pillW = 260;
          const pillH = 32;

          let left = 8;
          let top = 8;

          if (primarySelectedObject) {
            const w = primarySelectedObject.width ?? 240;
            const preferredLeft = primarySelectedObject.x + w + 10;
            const preferredTop = primarySelectedObject.y - 6;
            left = clamp(preferredLeft, 8, Math.max(8, boardSize.w - pillW - 8));
            top = clamp(preferredTop, 8, Math.max(8, boardSize.h - pillH - 8));
          } else if (selectionBounds) {
            // Anchor to the top-right of the bounding box.
            const preferredLeft = selectionBounds.right + 10;
            const preferredTop = selectionBounds.top - 6;
            left = clamp(preferredLeft, 8, Math.max(8, boardSize.w - pillW - 8));
            top = clamp(preferredTop, 8, Math.max(8, boardSize.h - pillH - 8));
          }

          const ids = Array.from(selectedObjectIds);

          return (
            <div
              className="absolute z-[9999] flex items-center gap-2 rounded-md border bg-background/90 px-2 py-1 text-xs shadow backdrop-blur"
              style={{ left, top }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="text-muted-foreground">Selected:</span>
              {primarySelectedObject ? (
                <span className="font-medium">{primarySelectedObject.object_type}</span>
              ) : (
                <span className="font-medium">{ids.length} objects</span>
              )}
              <span className="mx-1 h-4 w-px bg-border" />
              <button
                type="button"
                className="rounded px-2 py-1 hover:bg-muted"
                onClick={() => void bringManyToFront(ids)}
                title="Bring to front"
              >
                Front
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 hover:bg-muted text-destructive"
                onClick={() => void deleteMany(ids)}
                title="Delete (Del / Backspace)"
              >
                Delete
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 hover:bg-muted"
                onClick={() => clearSelection()}
                title="Clear selection (Esc)"
              >
                Clear
              </button>
            </div>
          );
        })()
      ) : null}
      {isDev && debugHover ? (
        <div className="pointer-events-none absolute left-2 top-2 z-[10000] rounded bg-black/70 px-2 py-1 text-[10px] text-white">
          <div className="font-mono">{debugHover}</div>
          {debugPt ? (
            <div className="mt-0.5 font-mono opacity-80">
              x:{Math.round(debugPt.x)} y:{Math.round(debugPt.y)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
// components/ui/select.tsx
// Canonical glass Select component (dependency-free)
// Matches Training surface recipe and integrates with SurfaceShell tokens

"use client";

import * as React from "react";
import { createPortal } from "react-dom";

// ------------------------------
// Context
// ------------------------------

type SelectContextType = {
  value: string | null;
  setValue: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerEl: HTMLElement | null;
  setTriggerEl: (el: HTMLElement | null) => void;
};

const SelectContext = React.createContext<SelectContextType | null>(null);

function useSelectContext() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) {
    throw new Error("Select components must be used within <Select>");
  }
  return ctx;
}

// ------------------------------
// Root
// ------------------------------

type SelectProps = {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
};

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [triggerEl, setTriggerEl] = React.useState<HTMLElement | null>(null);

  return (
    <SelectContext.Provider
      value={{ value, setValue: onValueChange, open, setOpen, triggerEl, setTriggerEl }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

// ------------------------------
// Trigger
// ------------------------------

type SelectTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export function SelectTrigger({ children, className = "", ...props }: SelectTriggerProps) {
  const { open, setOpen, setTriggerEl } = useSelectContext();
  const btnRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (btnRef.current) setTriggerEl(btnRef.current);
    return () => setTriggerEl(null);
  }, [setTriggerEl]);

  return (
    <button
      ref={btnRef}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={[
        "w-full inline-flex items-center justify-between gap-2",
        "rounded-lg bg-black/20 backdrop-blur-md",
        "px-3 py-2 text-sm text-foreground",
        "ring-1 ring-white/8 shadow-sm shadow-black/30",
        "hover:bg-black/25 transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-brand/40",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
      <svg
        viewBox="0 0 20 20"
        className="h-4 w-4 text-muted"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}

// ------------------------------
// Value
// ------------------------------

type SelectValueProps = {
  placeholder?: string;
};

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useSelectContext();

  return (
    <span className="truncate">
      {value && value.length ? value : placeholder}
    </span>
  );
}

// ------------------------------
// Content
// ------------------------------

type SelectContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function SelectContent({ children, className = "" }: SelectContentProps) {
  const { open, setOpen, triggerEl } = useSelectContext();
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const computePosition = React.useCallback(() => {
    if (!triggerEl) return;
    const r = triggerEl.getBoundingClientRect();
    const margin = 8; // px
    const viewportH = window.innerHeight;

    // Default to opening downward.
    let top = r.bottom + margin;
    let maxHeight = Math.max(120, viewportH - top - margin);

    // If we would be too close to bottom, try opening upward.
    const contentH = ref.current?.offsetHeight ?? 0;
    const wouldOverflow = top + Math.min(contentH || 320, maxHeight) > viewportH - margin;
    const roomAbove = r.top - margin - margin;

    if (wouldOverflow && roomAbove > 140) {
      // Open upward.
      const desiredTop = r.top - margin - (contentH || 320);
      top = Math.max(margin, desiredTop);
      maxHeight = Math.max(120, r.top - margin - top);
    }

    setPos({
      top,
      left: r.left,
      width: r.width,
      maxHeight,
    });
  }, [triggerEl]);

  React.useEffect(() => {
    if (!open) return;

    // Compute position after paint so ref measurements are available.
    const raf = requestAnimationFrame(() => {
      computePosition();
    });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function onScrollOrResize() {
      computePosition();
    }

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onScrollOrResize);
    // Capture scroll anywhere (including nested scroll containers)
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, computePosition, setOpen]);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      const withinContent = ref.current && ref.current.contains(t);
      const withinTrigger = triggerEl && triggerEl.contains(t);
      if (!withinContent && !withinTrigger) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, setOpen, triggerEl]);

  if (!open || !triggerEl) return null;

  const node = (
    <div
      ref={ref}
      role="listbox"
      style={{
        position: "fixed",
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        width: pos?.width ?? triggerEl.getBoundingClientRect().width,
        zIndex: 9999,
      }}
      className={[
        "overflow-hidden rounded-xl",
        "bg-black/70 backdrop-blur-md",
        "ring-1 ring-white/10",
        "shadow-lg shadow-black/40",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-[radial-gradient(700px_120px_at_50%_0%,rgba(255,255,255,0.07),transparent_70%)]" />
      <div
        className="relative overflow-y-auto p-1"
        style={{ maxHeight: pos?.maxHeight ?? 288 }}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

// ------------------------------
// Item
// ------------------------------

type SelectItemProps = {
  value: string;
  children: React.ReactNode;
};

export function SelectItem({ value, children }: SelectItemProps) {
  const { value: current, setValue, setOpen } = useSelectContext();
  const selected = current === value;

  return (
    <div
      role="option"
      aria-selected={selected}
      onClick={() => {
        setValue(value);
        setOpen(false);
      }}
      className={[
        "relative cursor-pointer select-none rounded-lg",
        "px-2.5 py-2 text-sm",
        selected ? "bg-white/12 text-foreground" : "text-foreground",
        "hover:bg-white/10",
      ].join(" ")}
    >
      {children}
      {selected && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground">
          ✓
        </span>
      )}
    </div>
  );
}
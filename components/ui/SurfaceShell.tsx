// /components/ui/SurfaceShell.tsx
"use client";

import * as React from "react";

// Training page is the canonical reference for surface depth, lighting, and scroll behavior.
// New pages should compose WorkspacePanel + SurfaceCard rather than reimplement surfaces.

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Canonical “Training” surface tokens.
 * Do not change per-page. If we tune glass globally, we tune here.
 */
export const GLASS = {
  shell: "panel ring-1 ring-panel",
  shellMuted: "panel-muted ring-1 ring-panel",
  chrome: "bg-panel/70 backdrop-blur-2xl ring-1 ring-white/10",
  chromeSoft: "bg-panel/65 ring-1 ring-white/10",
};

export const GLASS_SCROLLBAR =
  "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 " +
  "[&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:rounded-full " +
  "[&::-webkit-scrollbar-thumb]:bg-white/10 " +
  "hover:[&::-webkit-scrollbar-thumb]:bg-white/20 " +
  "[&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-white/10";

/**
 * Training’s “sheen” + hairline that gives depth.
 * Use on primary panels (workspace + rails).
 */
export function PanelSheen({
  className,
  heightClassName = "h-20",
  strengthClassName = "bg-[radial-gradient(800px_140px_at_50%_0%,rgba(255,255,255,0.08),transparent_70%)]",
}: {
  className?: string;
  heightClassName?: string;
  strengthClassName?: string;
}) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0",
          heightClassName,
          strengthClassName,
          className,
        )}
      />
    </>
  );
}

/**
 * The exact “two-column” Training panel container:
 * - rounded-xl
 * - panel + chrome
 * - shadow recipe
 * - optional sheen
 */
export function WorkspacePanel({
  className,
  children,
  withSheen = true,
}: {
  className?: string;
  children: React.ReactNode;
  withSheen?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl p-4 flex flex-col overflow-hidden",
        GLASS.shell,
        GLASS.chrome,
        "shadow-[0_18px_70px_rgba(0,0,0,0.28)]",
        className,
      )}
    >
      {withSheen ? <PanelSheen /> : null}
      {children}
    </div>
  );
}

/**
 * Training’s large section shell (used for the week surface).
 */
export function SurfaceShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "relative w-full overflow-visible rounded-xl p-5",
        "shadow-[0_22px_90px_rgba(0,0,0,0.30)]",
        GLASS.shell,
        GLASS.chrome,
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl",
        "ring-1 ring-panel",
        "bg-panel/85 backdrop-blur-md",
        "shadow-sm shadow-black/25",
        className,
      ].join(" ")}
    >
      {/* Top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      {/* Training-style sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(700px_120px_at_50%_0%,rgba(255,255,255,0.07),transparent_70%)]" />

      {children}
    </div>
  );
}

/**
 * Muted inner scroll area used inside panels (Training recipe).
 */
export function MutedScrollArea({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg p-3 flex-1 min-h-0 overflow-y-auto",
        GLASS.shellMuted,
        GLASS_SCROLLBAR,
        className,
      )}
    >
      {children}
    </div>
  );
}
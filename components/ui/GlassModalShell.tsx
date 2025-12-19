"use client";

import React from "react";
import { createPortal } from "react-dom";

export function GlassModalShell({
  open,
  onClose,
  header,
  footer,
  children,
  maxWidthClassName = "max-w-6xl",
  heightClassName = "h-[90vh]",
}: {
  open: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClassName?: string;
  heightClassName?: string;
}) {
  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 backdrop-blur-md px-3 py-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Layered scrim for dark-on-dark glass */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_15%,rgba(255,255,255,0.06),transparent_55%),linear-gradient(to_bottom,rgba(0,0,0,0.20),rgba(0,0,0,0.55))]" />

      <div
        className={`relative flex w-full ${maxWidthClassName} ${heightClassName} flex-col overflow-hidden rounded-xl panel bg-panel-muted/75 backdrop-blur-xl shadow-[0_30px_90px_rgba(0,0,0,0.65)] ring-1 ring-panel`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
        {/* Glass edge + soft sheen to separate from dark background */}
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(900px_120px_at_50%_0%,rgba(255,255,255,0.08),transparent_70%)]" />

        {header ? <div className="relative">{header}</div> : null}

        <div className="relative flex-1 min-h-0 overflow-hidden">{children}</div>

        {footer ? <div className="relative">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
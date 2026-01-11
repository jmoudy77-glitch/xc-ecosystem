"use client";

import * as React from "react";

export function M3CapabilitySupportDot({
  supported,
  tooltipMode = "title",
}: {
  supported: boolean;
  tooltipMode?: "title" | "none";
}) {
  if (!supported) return null;

  const title =
    tooltipMode === "title"
      ? "Pipeline candidates provide partial stabilization coverage here."
      : undefined;

  return (
    <span
      aria-label="Pipeline candidates provide partial stabilization coverage here."
      title={title}
      className="inline-block h-2 w-2 rounded-full ring-1 ring-panel opacity-80"
    />
  );
}

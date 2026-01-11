"use client";

import * as React from "react";
import type { RecruitingM3UIPayload } from "./useRecruitingM3UIPayload";

const RecruitingM3UIContext = React.createContext<RecruitingM3UIPayload | null>(null);

export function RecruitingM3UIProvider({
  value,
  children,
}: {
  value: RecruitingM3UIPayload | null;
  children: React.ReactNode;
}) {
  return <RecruitingM3UIContext.Provider value={value}>{children}</RecruitingM3UIContext.Provider>;
}

export function useRecruitingM3UI() {
  return React.useContext(RecruitingM3UIContext);
}

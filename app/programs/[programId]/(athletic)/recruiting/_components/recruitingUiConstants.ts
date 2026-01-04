// app/programs/[programId]/recruiting/_components/recruitingUiConstants.ts

export const RECRUITING_UI = {
  slotMaxOccupancy: 4,

  avatar: {
    sizePx: 40,
    ringPx: 2,
  },

  meter: {
    widthPx: 72,
    heightPx: 8,
    radiusPx: 999,
  },

  badge: {
    offsetTopPx: -6,
    offsetRightPx: -6,
    sizePx: 18,
  },

  slot: {
    minHeightPx: 56,
    radiusClass: "rounded-xl",
  },
} as const;

export type RecruitingUiConstants = typeof RECRUITING_UI;

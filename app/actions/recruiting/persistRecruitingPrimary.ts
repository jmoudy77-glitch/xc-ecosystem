"use server";

import { persistRecruitingPrimary as _persistRecruitingPrimary } from "@/lib/modules/recruiting/actions/persistRecruitingPrimary";

export async function persistRecruitingPrimary(...args: Parameters<typeof _persistRecruitingPrimary>) {
  return _persistRecruitingPrimary(...args);
}

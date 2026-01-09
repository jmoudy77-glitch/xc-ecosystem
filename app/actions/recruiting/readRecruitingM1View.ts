"use server";

import { readRecruitingM1View as _readRecruitingM1View } from "@/lib/modules/recruiting/actions/readRecruitingM1View";

export async function readRecruitingM1View(...args: Parameters<typeof _readRecruitingM1View>) {
  return _readRecruitingM1View(...args);
}

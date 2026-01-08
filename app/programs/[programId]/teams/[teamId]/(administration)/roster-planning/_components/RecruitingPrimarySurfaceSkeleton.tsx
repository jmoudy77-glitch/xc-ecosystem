// app/programs/[programId]/teams/[teamId]/(administration)/roster-planning/_components/RecruitingPrimarySurfaceSkeleton.tsx

import * as React from "react";
import {
  RecruitingPrimarySurfaceSkeleton as BaseRecruitingPrimarySurfaceSkeleton,
} from "@/app/programs/[programId]/(athletic)/recruiting/_components/RecruitingPrimarySurfaceSkeleton";

export function RecruitingPrimarySurfaceSkeleton(
  props: React.ComponentProps<typeof BaseRecruitingPrimarySurfaceSkeleton>
) {
  return (
    <div className="relative h-full w-full flex flex-col">
      <BaseRecruitingPrimarySurfaceSkeleton {...props} />
    </div>
  );
}

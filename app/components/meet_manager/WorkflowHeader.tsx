/* File: app/components/meet_manager/WorkflowHeader.tsx */
import Link from "next/link";

type Props = {
  programId: string;
  current: "initiate" | "build" | "compete" | "review";
  rightSlot?: React.ReactNode;
};

const steps = [
  { key: "initiate", label: "Initiate", href: (pid: string) => `/programs/${pid}/meets` },
  { key: "build", label: "Build", href: (pid: string) => `/programs/${pid}/meets/builder` },
  { key: "compete", label: "Compete", href: (pid: string) => `/programs/${pid}/meets/ops` },
  { key: "review", label: "Review", href: (pid: string) => `/programs/${pid}/meets/review` },
] as const;

export function WorkflowHeader({ programId, current, rightSlot }: Props) {
  return (
    <div className="mb-4 rounded-md border bg-background px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          {steps.map((s, i) => {
            const isCurrent = s.key === current;
            return (
              <div key={s.key} className="flex items-center gap-2">
                {isCurrent ? (
                  <span className="rounded bg-muted px-2 py-1 font-medium">
                    {s.label}
                  </span>
                ) : (
                  <Link
                    href={s.href(programId)}
                    className="px-2 py-1 text-muted-foreground hover:text-foreground"
                  >
                    {s.label}
                  </Link>
                )}
                {i < steps.length - 1 && (
                  <span className="text-muted-foreground">→</span>
                )}
              </div>
            );
          })}
        </div>

        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    </div>
  );
}

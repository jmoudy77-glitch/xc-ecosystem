// app/dashboard/programs/[programId]/page.tsx
// Simple Program Overview page so /dashboard/programs/[programId] is a valid route.

export default function ProgramOverviewPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Program overview</h1>
      <p className="text-sm text-muted-foreground">
        This will become the central overview for this specific program
        (roster summary, recruiting snapshot, upcoming tasks, etc.).
      </p>
      <p className="text-sm text-muted-foreground">
        Use the navigation above to manage staff, teams &amp; divisions,
        inquiries, and your recruiting board.
      </p>
    </div>
  );
}
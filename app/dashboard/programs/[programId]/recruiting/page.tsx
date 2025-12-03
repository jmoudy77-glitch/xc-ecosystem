// app/dashboard/programs/[programId]/recruiting/page.tsx

export default function ProgramRecruitingPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Recruiting Board
        </h1>
        <p className="text-sm text-slate-300">
          Athletes who have been officially attached to this program as recruits.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-sm font-medium text-slate-100">No recruits yet.</p>
        <p className="mt-1 text-sm text-slate-300">
          When you convert an athlete inquiry or manually attach an athlete as a
          recruit, they&apos;ll appear here.
        </p>
      </section>
    </div>
  );
}
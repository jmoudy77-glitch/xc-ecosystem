// app/claim/complete/page.tsx

import Link from "next/link";

export default function ClaimCompletePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-10">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-950/75 p-6 text-slate-100 shadow-[0_0_0_1px_rgba(15,23,42,0.2),0_20px_80px_rgba(0,0,0,0.65)] md:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Claim complete
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Your athlete profile is now linked to your account. You can update
            details anytime from your profile.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/athletes/me"
              className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-slate-500"
            >
              View profile
            </Link>

            <Link
              href="/"
              className="rounded-md border border-slate-800 bg-transparent px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-600"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
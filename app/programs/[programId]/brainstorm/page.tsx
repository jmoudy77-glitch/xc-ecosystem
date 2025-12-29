// app/programs/[programId]/brainstorm/page.tsx

import BrainstormPageClient from "./BrainstormPageClient";

export default async function Page({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  return <BrainstormPageClient programId={programId} />;
}

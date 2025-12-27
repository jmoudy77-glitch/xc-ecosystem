// app/programs/[programId]/brainstorm/page.tsx

import BrainstormPageClient from "./BrainstormPageClient";

export default function Page({ params }: { params: { programId: string } }) {
  return <BrainstormPageClient programId={params.programId} />;
}

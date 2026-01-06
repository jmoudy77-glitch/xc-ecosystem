/* File: app/programs/[programId]/meets/[meetId]/builder/page.tsx */
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ programId: string; meetId: string }>;
};

export default async function MeetBuilderDeepLinkRedirect({ params }: PageProps) {
  const { programId, meetId } = await params;

  // Build is a single continuous surface per locked contract.
  // Deep-linking routes into Build with attending context selected.
  redirect(`/programs/${programId}/meets/builder?attendMeetId=${encodeURIComponent(meetId)}`);
}

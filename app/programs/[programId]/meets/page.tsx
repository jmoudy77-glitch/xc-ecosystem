import { redirect } from "next/navigation";

export default async function MeetsIndexPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  redirect(`/programs/${programId}/meets`);
}

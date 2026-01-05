import { redirect } from "next/navigation";

export default function MeetsIndexPage({
  params,
}: {
  params: { programId: string };
}) {
  redirect(`/programs/${params.programId}/meets`);
}

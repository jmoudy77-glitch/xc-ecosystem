import RecruitDiscoveryPortalClient from "./RecruitDiscoveryPortalClient";

type PageProps = {
  params: Promise<{ programId: string }>;
};

export default async function RecruitDiscoveryPortalPage(props: PageProps) {
  const { programId } = await props.params;
  return <RecruitDiscoveryPortalClient programId={programId} />;
}

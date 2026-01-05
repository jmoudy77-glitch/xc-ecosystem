import { getMeetHome } from "@/app/actions/meet_manager/getMeetHome";

export default async function MeetHomePage({
  params,
}: {
  params: { programId: string; meetId: string };
}) {
  const meet = await getMeetHome(params.meetId);

  return (
    <div style={{ padding: 24 }}>
      <h1>Meet Manager</h1>
      <div>
        <strong>Meet ID:</strong> {meet.id}
      </div>
      <div>
        <strong>Type:</strong> {meet.meet_type}
      </div>
      <div>
        <strong>Status:</strong> {meet.lifecycle_state}
      </div>
    </div>
  );
}

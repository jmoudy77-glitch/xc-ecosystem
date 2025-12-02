// app/programs/[programId]/staff/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type StaffMember = {
  id: string;
  userId: string;
  role: string | null;
  email: string | null;
  joinedAt: string | null;
};

type StaffResponse = {
  programId: string;
  staff: StaffMember[];
};

const ROLE_OPTIONS = [
  { value: "head_coach", label: "Head Coach" },
  { value: "assistant_coach", label: "Assistant Coach" },
  { value: "recruiting_coordinator", label: "Recruiting Coordinator" },
  { value: "analyst", label: "Analyst" },
  { value: "staff", label: "Staff" },
];

export default function ProgramStaffPage() {
  const params = useParams();
  const router = useRouter();
  const programId = (params?.programId ?? "") as string;

  const [data, setData] = useState<StaffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null); // memberId currently being updated
  const [removing, setRemoving] = useState<string | null>(null);

  async function loadStaff(activeProgramId: string) {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/programs/${activeProgramId}/staff`, {
        credentials: "include",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const body = (await res.json().catch(() => ({}))) as any;

      if (!res.ok) {
        setErrorMsg(
          (body && (body.error as string)) ||
            `Failed to load staff (HTTP ${res.status})`,
        );
        return;
      }

      setData(body as StaffResponse);
    } catch (err: any) {
      console.error("[ProgramStaffPage] fetch error:", err);
      setErrorMsg(err?.message || "Unexpected error loading staff");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!programId) return;
    void loadStaff(programId);
  }, [programId, router]);

  async function handleRoleChange(memberId: string, newRole: string) {
    if (!programId) return;
    setSaving(memberId);

    try {
      const res = await fetch(
        `/api/programs/${programId}/staff/${memberId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: newRole }),
        },
      );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error(
          "[ProgramStaffPage] role update failed:",
          res.status,
          body,
        );
        setErrorMsg(
          (body && (body.error as string)) ||
            `Failed to update role (HTTP ${res.status})`,
        );
        return;
      }

      // Refresh staff list
      await loadStaff(programId);
    } catch (err: any) {
      console.error("[ProgramStaffPage] role update error:", err);
      setErrorMsg(err?.message || "Unexpected error updating role");
    } finally {
      setSaving(null);
    }
  }

  async function handleRemove(memberId: string) {
    if (!programId) return;
    setRemoving(memberId);

    try {
      const res = await fetch(
        `/api/programs/${programId}/staff/${memberId}`,
        {
          method: "DELETE",
        },
      );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error(
          "[ProgramStaffPage] remove failed:",
          res.status,
          body,
        );
        setErrorMsg(
          (body && (body.error as string)) ||
            `Failed to remove member (HTTP ${res.status})`,
        );
        return;
      }

      // Refresh staff list
      await loadStaff(programId);
    } catch (err: any) {
      console.error("[ProgramStaffPage] remove error:", err);
      setErrorMsg(err?.message || "Unexpected error removing member");
    } finally {
      setRemoving(null);
    }
  }

  if (!programId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold">Program Staff</h1>
          <p className="mt-2 text-sm text-slate-400">
            No program selected. Navigate here from the dashboard program list.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Team Management
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">
            Program staff
          </h1>
          <p className="text-xs text-slate-500">
            Manage coaches and staff attached to this program. Changes here
            affect access to rosters, boards, and recruiting tools.
          </p>
        </header>

        {/* Error */}
        {errorMsg && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/70 px-4 py-3 text-sm text-red-100">
            <p className="font-semibold">Something went wrong</p>
            <p className="mt-1 text-xs text-red-200">{errorMsg}</p>
          </div>
        )}

        {/* Staff table */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Staff list
              </p>
              <p className="text-[11px] text-slate-500">
                Program ID:{" "}
                <span className="font-mono text-[11px] text-slate-300">
                  {data?.programId ?? programId}
                </span>
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-100 opacity-60 cursor-not-allowed"
            >
              Invite staff (coming soon)
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading staff…</p>
          ) : !data || data.staff.length === 0 ? (
            <p className="text-sm text-slate-400">
              No staff members found for this program yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/80">
                  <tr>
                    <th className="px-4 py-2 font-semibold text-slate-300">
                      Email
                    </th>
                    <th className="px-4 py-2 font-semibold text-slate-300">
                      Role
                    </th>
                    <th className="px-4 py-2 font-semibold text-slate-300">
                      Joined
                    </th>
                    <th className="px-4 py-2 font-semibold text-slate-300 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.staff.map((member) => (
                    <tr
                      key={member.id}
                      className="border-t border-slate-800 hover:bg-slate-900/70"
                    >
                      <td className="px-4 py-2 text-xs text-slate-50">
                        {member.email ?? "Unknown"}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-100">
                        <select
                          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
                          value={
                            member.role ??
                            ROLE_OPTIONS[ROLE_OPTIONS.length - 1].value
                          }
                          disabled={saving === member.id || removing === member.id}
                          onChange={(e) =>
                            void handleRoleChange(member.id, e.target.value)
                          }
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-[11px] text-slate-400">
                        {member.joinedAt
                          ? new Date(member.joinedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          className="rounded-full border border-red-500/60 bg-transparent px-3 py-1 text-[11px] font-medium text-red-200 hover:bg-red-950/60 disabled:opacity-50"
                          disabled={removing === member.id || saving === member.id}
                          onClick={() => void handleRemove(member.id)}
                        >
                          {removing === member.id ? "Removing…" : "Remove"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

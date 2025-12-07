"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";

type StaffListItem = {
  userId: string;
  fullName: string;
  email: string | null;
  role: string | null;
  avatarUrl: string | null;
  joinedAt: string | null;
};

type Props = {
  programId: string;
  isManager: boolean;
  staff: StaffListItem[];
};

const ROLE_LABELS: Record<string, string> = {
  head_coach: "Head Coach",
  assistant: "Assistant Coach",
  director: "Director",
  admin: "Program Admin",
  operations: "Operations",
  volunteer: "Volunteer",
};

function roleLabel(role: string | null): string {
  if (!role) return "Staff";
  const key = role.toLowerCase();
  return ROLE_LABELS[key] ?? role;
}

export default function StaffListClient({ programId, isManager, staff }: Props) {
  const router = useRouter();

  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("assistant");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/programs/${programId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add staff member.");
        setSaving(false);
        return;
      }

      setEmail("");
      setRole("assistant");
      setShowAdd(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to add staff member:", err);
      setError("Unexpected error adding staff member.");
      setSaving(false);
    }
  }

  async function handleRemove(userId: string, label: string) {
    if (!isManager) return;

    const ok = window.confirm(
      `Remove ${label} from this program's staff?`,
    );
    if (!ok) return;

    setError(null);
    setDeletingId(userId);

    try {
      const res = await fetch(
        `/api/programs/${programId}/staff/${userId}`,
        { method: "DELETE" },
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to remove staff member.");
        setDeletingId(null);
        return;
      }

      router.refresh();
    } catch (err) {
      console.error("Failed to remove staff member:", err);
      setError("Unexpected error removing staff member.");
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold text-slate-100">
            Staff &amp; roles
          </h1>
          <p className="mt-1 text-[11px] text-slate-500">
            Manage who is on staff for this program and what access each person has.
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-sky-500"
          >
            {showAdd ? "Cancel" : "Add staff"}
          </button>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-rose-400">
          {error}
        </p>
      )}

      {/* Add staff form (manager-only) */}
      {isManager && showAdd && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3 text-sm"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-300">Staff email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
              placeholder="coach@example.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-300">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
            >
              <option value="assistant">Assistant Coach</option>
              <option value="head_coach">Head Coach</option>
              <option value="director">Director</option>
              <option value="admin">Program Admin</option>
              <option value="operations">Operations</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add staff member"}
          </button>
        </form>
      )}

      {/* Staff list */}
      <div className="space-y-2">
        {staff.length === 0 && (
          <p className="text-sm text-slate-500">
            No staff members have been added to this program yet.
          </p>
        )}

        {staff.map((member) => {
          const label =
            member.fullName ||
            member.email?.split("@")[0] ||
            "this staff member";

          return (
            <div
              key={member.userId}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
            >
              <button
                onClick={() =>
                  router.push(
                    `/programs/${programId}/staff/${member.userId}`,
                  )
                }
                className="flex flex-1 items-center justify-between text-left hover:text-slate-50"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={member.avatarUrl || undefined}
                    name={member.fullName || member.email || "Staff member"}
                    size="sm"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-100">
                      {member.fullName || member.email || "Staff member"}
                    </span>
                    {member.email && (
                      <span className="text-xs text-slate-400">
                        {member.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center rounded-full border border-slate-700 px-2 py-[2px] text-[10px] uppercase tracking-wide text-slate-200">
                    {roleLabel(member.role)}
                  </span>
                  {member.joinedAt && (
                    <span className="text-[10px] text-slate-500">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </button>

              {isManager && (
                <button
                  onClick={() => handleRemove(member.userId, label)}
                  disabled={deletingId === member.userId}
                  className="shrink-0 rounded-md border border-rose-700/60 bg-rose-900/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-100 hover:border-rose-500 hover:bg-rose-900/70 disabled:opacity-60"
                >
                  {deletingId === member.userId ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
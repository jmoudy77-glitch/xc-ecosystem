"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MANAGER_ROLES } from "@/lib/staffRoles";

type Props = {
  programId: string;
  memberId: string;
  initialRole: string | null;
  canEdit: boolean; // isManager computed in server component
};

const ROLE_OPTIONS = [
  { value: "head_coach", label: "Head Coach" },
  { value: "assistant", label: "Assistant Coach" },
  { value: "director", label: "Director" },
  { value: "admin", label: "Program Admin" },
  { value: "operations", label: "Operations" },
  { value: "volunteer", label: "Volunteer" },
];

export default function StaffRoleEditor({
  programId,
  memberId,
  initialRole,
  canEdit,
}: Props) {
  const router = useRouter();

  const [role, setRole] = useState(initialRole ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) {
    return (
      <div className="mt-2 text-[12px] text-slate-400">
        <p>
          <span className="font-semibold text-slate-300">Role:</span>{" "}
          {initialRole || "Unspecified"}
        </p>
        <p className="text-[11px] text-slate-500">
          Only program managers ({MANAGER_ROLES.join(", ")}) can change roles.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(
        `/api/programs/${programId}/staff/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update role.");
        setSaving(false);
        return;
      }

      router.refresh(); // reload server component
    } catch (err) {
      console.error(err);
      setError("Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-3">
      <label className="flex flex-col gap-1 text-[12px] text-slate-300">
        Role in this program
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[12px] text-slate-100"
        >
          <option value="">Select a role…</option>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-[11px] text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-sky-600 px-3 py-1 text-[11px] font-semibold text-slate-900 hover:bg-sky-500"
      >
        {saving ? "Saving…" : "Save Role"}
      </button>
    </form>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  programId: string;
  memberId: string;        // public.users.id for the staff member
  initialRole: string | null;
  canEdit: boolean;        // computed server-side (manager or not)
};

const ROLE_OPTIONS = [
  { value: "head_coach", label: "Head coach" },
  { value: "assistant", label: "Assistant coach" },
  { value: "director", label: "Director of XC / T&F" },
  { value: "admin", label: "Program admin" },
  { value: "volunteer", label: "Volunteer coach" },
  { value: "operations", label: "Operations / support" },
];

function roleLabel(role: string | null | undefined): string {
  const normalized = role?.toLowerCase() ?? "";
  const option = ROLE_OPTIONS.find((o) => o.value === normalized);
  return option?.label ?? "Staff";
}

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

  const currentLabel = roleLabel(role || initialRole);

  if (!canEdit) {
    // Read-only view
    return (
      <div className="mt-2 text-[11px] text-slate-400">
        <p className="mb-1">
          Current role:{" "}
          <span className="inline-flex items-center rounded-full border border-slate-700 px-2 py-[2px] text-[10px] uppercase tracking-wide text-slate-200">
            {currentLabel}
          </span>
        </p>
        <p>
          Only head coaches, directors, and program admins can change staff
          roles.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!role) {
      setError("Please select a role first.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/programs/${programId}/staff/${memberId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to update role.");
        setSaving(false);
        return;
      }

      // Hard refresh the page so server component sees updated membership
      router.refresh();
      setSaving(false);
    } catch (err) {
      console.error("Failed to update staff role:", err);
      setError("Unexpected error updating role.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 text-[11px]">
      <label className="flex flex-col gap-1">
        <span className="text-slate-300">Role in this program</span>
        <select
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Select a role…</option>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-[10px] text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={saving || !role}
        className="inline-flex items-center rounded-md border border-sky-600 bg-sky-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-950 hover:bg-sky-500 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-400"
      >
        {saving ? "Saving…" : "Save role"}
      </button>
    </form>
  );
}
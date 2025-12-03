"use client";

// app/(dashboard)/programs/[programId]/inquiries/page.tsx
// Inquiries Inbox for a program.
// Uses /api/programs/[programId]/inquiries (GET) and
// /api/programs/[programId]/inquiries/[inquiryId] (PATCH).

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type InquiryStatus = "new" | "watching" | "converted" | "closed";

type AthleteInquiry = {
  id: string;
  program_id: string;
  athlete_id: string;
  source_program_id: string | null;
  status: InquiryStatus;
  message: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  grad_year: number | null;
  primary_event: string | null;
  pr_blob: unknown | null;
  coach_notes: string | null;
  requirements: string | null;
  created_at: string;
  updated_at: string;
};

type InquiriesApiResponse =
  | {
      programId: string;
      inquiries: AthleteInquiry[];
      error?: undefined;
    }
  | {
      error: string;
      programId?: undefined;
      inquiries?: undefined;
    };

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  watching: "Watching",
  converted: "Converted",
  closed: "Closed",
};

const STATUS_BADGE_CLASSES: Record<InquiryStatus, string> = {
  new: "bg-blue-500/10 text-blue-300 border-blue-500/40",
  watching: "bg-amber-500/10 text-amber-300 border-amber-500/40",
  converted: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  closed: "bg-slate-500/10 text-slate-300 border-slate-500/40",
};

export default function ProgramInquiriesPage() {
  const params = useParams<{ programId: string }>();
  const programId = params?.programId;

  const [inquiries, setInquiries] = useState<AthleteInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "all">(
    "new",
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!programId) return;

    let cancelled = false;

    async function loadInquiries() {
      setLoading(true);
      setError(null);

      try {
        const query =
          statusFilter === "all" ? "" : `?status=${encodeURIComponent(statusFilter)}`;
        const res = await fetch(
          `/api/programs/${programId}/inquiries${query}`,
        );

        const data: InquiriesApiResponse = await res.json();

        if (!res.ok) {
          const message =
            "error" in data && data.error
              ? data.error
              : "Failed to load inquiries";
          if (!cancelled) {
            setError(message);
          }
          return;
        }

        if (!cancelled) {
          setInquiries(data.inquiries ?? []);
        }
      } catch (err) {
        console.error("[ProgramInquiriesPage] loadInquiries error:", err);
        if (!cancelled) {
          setError("Unexpected error loading inquiries");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInquiries();

    return () => {
      cancelled = true;
    };
  }, [programId, statusFilter]);

  async function updateInquiryStatus(id: string, status: InquiryStatus) {
    if (!programId) return;

    setUpdatingId(id);
    setError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/inquiries/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        console.error(
          "[ProgramInquiriesPage] updateInquiryStatus error:",
          data,
        );
        setError(
          data?.error ??
            "Failed to update inquiry. If this was a conversion, the recruit may not have been created.",
        );
        return;
      }

      // Update local state
      setInquiries((prev) =>
        prev.map((inq) =>
          inq.id === id
            ? {
                ...inq,
                status,
                updated_at: new Date().toISOString(),
              }
            : inq,
        ),
      );
    } catch (err) {
      console.error("[ProgramInquiriesPage] updateInquiryStatus error:", err);
      setError("Unexpected error updating inquiry");
    } finally {
      setUpdatingId(null);
    }
  }

  const hasInquiries = inquiries.length > 0;

  return (
    <div className="flex flex-col gap-4 px-4 py-6 md:px-8">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Inquiries Inbox
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage athletes who have reached out to your program before they
            become official recruits.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 p-1 text-xs md:text-sm">
          {(["all", "new", "watching", "converted", "closed"] as const).map(
            (status) => {
              const isAll = status === "all";
              const label = isAll
                ? "All"
                : STATUS_LABELS[status as InquiryStatus];
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={[
                    "rounded px-2 py-1 transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/60",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            },
          )}
        </div>
      </div>

      {loading && (
        <div className="rounded-md border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          Loading inquiries…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && !hasInquiries && (
        <div className="rounded-md border border-border bg-background/60 px-4 py-6 text-sm text-muted-foreground">
          <p className="font-medium">No inquiries found.</p>
          <p className="mt-1">
            When athletes submit inquiries or you log interest manually, they
            will appear here so you can review and decide whether to convert
            them to recruits.
          </p>
        </div>
      )}

      {!loading && !error && hasInquiries && (
        <div className="overflow-x-auto rounded-md border border-border bg-background/60">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Athlete ID</th>
                <th className="px-3 py-2">Grad Year</th>
                <th className="px-3 py-2">Event Group</th>
                <th className="px-3 py-2">Message</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Received</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => (
                <tr
                  key={inq.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                >
                  <td className="px-3 py-2">
                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                        STATUS_BADGE_CLASSES[inq.status],
                      ].join(" ")}
                    >
                      {STATUS_LABELS[inq.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs md:text-sm">
                    {inq.athlete_id}
                  </td>
                  <td className="px-3 py-2 text-xs md:text-sm">
                    {inq.grad_year ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs md:text-sm">
                    {inq.primary_event ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs md:text-sm">
                    {inq.message
                      ? inq.message.length > 80
                        ? inq.message.slice(0, 80) + "…"
                        : inq.message
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs md:text-sm">
                    <div className="flex flex-col">
                      {inq.contact_email && (
                        <a
                          href={`mailto:${inq.contact_email}`}
                          className="hover:underline"
                        >
                          {inq.contact_email}
                        </a>
                      )}
                      {inq.contact_phone && (
                        <span className="text-muted-foreground">
                          {inq.contact_phone}
                        </span>
                      )}
                      {!inq.contact_email && !inq.contact_phone && "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs md:text-sm">
                    {new Date(inq.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-xs md:text-sm">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={updatingId === inq.id}
                        onClick={() => updateInquiryStatus(inq.id, "watching")}
                        className="rounded border border-border bg-background px-2 py-1 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Watching
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === inq.id}
                        onClick={() => updateInquiryStatus(inq.id, "converted")}
                        className="rounded border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Convert to Recruit
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === inq.id}
                        onClick={() => updateInquiryStatus(inq.id, "closed")}
                        className="rounded border border-destructive/50 bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Close
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

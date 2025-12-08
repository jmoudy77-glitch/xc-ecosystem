// app/athletes/[athleteId]/AthleteMediaSection.tsx
"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";

type AthleteMedia = {
  id: string;
  media_type: "photo" | "video";
  role: "highlight_reel" | "action_shot" | "gallery";
  url: string;
  sort_order: number;
};

type Props = {
  athleteId: string;
  highlight: AthleteMedia | null;
  actionShots: AthleteMedia[];
  canEdit?: boolean; // pass true when viewing as the athlete
};

export function AthleteMediaSection({
  athleteId,
  highlight,
  actionShots,
  canEdit = false,
}: Props) {
  const [isUploadingHighlight, setIsUploadingHighlight] = useState(false);
  const [isUploadingAction, setIsUploadingAction] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function uploadMedia(
    file: File,
    role: "highlight_reel" | "action_shot",
    sortOrder = 0
  ) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("role", role);
    formData.append("sortOrder", String(sortOrder));

    const res = await fetch(`/api/athletes/${athleteId}/media`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("Upload failed", body);
      alert("Upload failed. Check console for details.");
      return null;
    }

    const body = await res.json();
    return body.media as AthleteMedia;
  }

  async function handleHighlightChange(e: FormEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setIsUploadingHighlight(true);
    try {
      await uploadMedia(file, "highlight_reel", 0);
      // Since POST replaces existing highlight, just reload for now
      window.location.reload();
    } finally {
      setIsUploadingHighlight(false);
      input.value = "";
    }
  }

  async function handleActionShotChange(e: FormEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setIsUploadingAction(true);
    try {
      await uploadMedia(file, "action_shot", actionShots.length);
      window.location.reload();
    } finally {
      setIsUploadingAction(false);
      input.value = "";
    }
  }

  async function handleDelete(mediaId: string) {
    if (!confirm("Remove this media item?")) return;

    setDeletingId(mediaId);
    try {
      const res = await fetch(`/api/athletes/${athleteId}/media`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mediaId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Delete failed", body);
        alert("Delete failed. Check console for details.");
        return;
      }

      window.location.reload();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3 md:flex-row md:justify-end">
      {/* Highlight card (video-safe: no Next/Image on mp4 URLs) */}
      <div className="relative h-28 w-full overflow-hidden rounded-2xl bg-slate-800 md:h-28 md:w-44">
        {highlight ? (
          <>
            <a
              href={highlight.url}
              target="_blank"
              rel="noreferrer"
              className="flex h-full w-full items-center justify-center"
            >
              <div className="flex flex-col items-center justify-center gap-1 text-xs text-slate-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/80 backdrop-blur">
                  <span className="ml-0.5 text-xs font-semibold">▶</span>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  Highlight Reel
                </span>
              </div>
            </a>

            {canEdit && (
              <button
                type="button"
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/80 text-[10px] text-slate-200 hover:bg-red-600"
                onClick={() => handleDelete(highlight.id)}
                disabled={deletingId === highlight.id}
              >
                {deletingId === highlight.id ? "…" : "×"}
              </button>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-slate-400">
            <span>No highlight reel yet</span>
          </div>
        )}

        {canEdit && (
          <label className="absolute bottom-2 left-2 cursor-pointer rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-100 hover:bg-slate-900">
            {isUploadingHighlight ? "Uploading..." : highlight ? "Replace" : "Upload Highlight"}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onInput={handleHighlightChange}
              disabled={isUploadingHighlight}
            />
          </label>
        )}
      </div>

      {/* Action shots */}
      <div className="flex w-full flex-row gap-2 md:w-auto">
        {actionShots.length > 0 ? (
          actionShots.map((shot) => (
            <div
              key={shot.id}
              className="relative h-24 flex-1 overflow-hidden rounded-2xl bg-slate-800"
            >
              <Image
                src={shot.url}
                alt="Action shot"
                fill
                className="object-cover"
              />
              {canEdit && (
                <button
                  type="button"
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/80 text-[10px] text-slate-200 hover:bg-red-600"
                  onClick={() => handleDelete(shot.id)}
                  disabled={deletingId === shot.id}
                >
                  {deletingId === shot.id ? "…" : "×"}
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="flex h-24 flex-1 items-center justify-center rounded-2xl bg-slate-900 text-xs text-slate-500">
            No action shots yet
          </div>
        )}

        {canEdit && (
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-600 bg-slate-900/60 text-center text-[10px] text-slate-400 hover:border-slate-400 hover:text-slate-200">
            {isUploadingAction ? "Uploading..." : "+ Action Shot"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onInput={handleActionShotChange}
              disabled={isUploadingAction}
            />
          </label>
        )}
      </div>
    </div>
  );
}
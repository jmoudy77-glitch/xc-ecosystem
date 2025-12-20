// app/programs/[programId]/staff/StaffAvatarUploader.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  canEdit: boolean;
  isSelf: boolean;
  programId: string;
  targetUserId: string; // public.users.id of the staff member
};

async function cropAndResizeToSquare(
  file: File,
  size = 320
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;

          canvas.width = size;
          canvas.height = size;

          ctx.drawImage(
            img,
            sx,
            sy,
            minSide,
            minSide,
            0,
            0,
            size,
            size
          );

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to create image blob"));
                return;
              }
              resolve(blob);
            },
            "image/jpeg",
            0.9
          );
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = (err) => reject(err);
      img.src = reader.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export default function StaffAvatarUploader({
  canEdit,
  isSelf,
  programId,
  targetUserId,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  if (!canEdit) return null;

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Crop + resize client-side
      const processedBlob = await cropAndResizeToSquare(file, 320);
      const processedFileName =
        file.name.replace(/\.[^.]+$/, "") + "-square.jpg";

      const formData = new FormData();
      formData.append("file", processedBlob, processedFileName);

      const endpoint = isSelf
        ? "/api/users/avatar"
        : `/api/programs/${programId}/staff/${targetUserId}/avatar`;

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("[StaffAvatarUploader] upload error:", body.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("[StaffAvatarUploader] unexpected error:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="mt-2">
      <label className="cursor-pointer text-[10px] text-slate-400 hover:text-slate-200 underline">
        {uploading ? "Uploading…" : "Change photo"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </label>
      <p className="mt-1 text-[10px] text-slate-500">
        Auto-crops to a square and resizes for best fit on staff cards.
      </p>
    </div>
  );
}
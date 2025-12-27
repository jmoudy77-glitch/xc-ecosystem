// components/brainstorm/objects/ImageObject.tsx
import { BrainstormObjectBase } from "@/lib/brainstorm/types";

export function ImageObject({ object }: { object: BrainstormObjectBase }) {
  const src = object.payload_json?.url;
  if (!src) return null;

  return (
    <img
      src={src}
      className="rounded border shadow-sm max-w-full max-h-full"
      draggable={false}
    />
  );
}
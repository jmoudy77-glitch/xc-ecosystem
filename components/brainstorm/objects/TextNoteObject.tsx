// components/brainstorm/objects/TextNoteObject.tsx
import { BrainstormObjectBase } from "@/lib/brainstorm/types";

export function TextNoteObject({ object }: { object: BrainstormObjectBase }) {
  const text = object.payload_json?.text ?? "";

  return (
    <div className="rounded-md bg-background border shadow-sm p-3 min-w-[160px]">
      <div className="text-sm whitespace-pre-wrap">{text}</div>
    </div>
  );
}
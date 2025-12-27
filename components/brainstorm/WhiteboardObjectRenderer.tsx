// components/brainstorm/WhiteboardObjectRenderer.tsx
import type { CSSProperties } from "react";
import { BrainstormObjectBase } from "@/lib/brainstorm/types";
import { TextNoteObject } from "./objects/TextNoteObject";
import { ImageObject } from "./objects/ImageObject";

type Props = {
  object: BrainstormObjectBase;
};

export function WhiteboardObjectRenderer({ object }: Props) {
  const style: CSSProperties = {
    position: "absolute",
    left: object.x,
    top: object.y,
    width: object.width ?? "auto",
    height: object.height ?? "auto",
    zIndex: object.z_index,
  };

  switch (object.object_type) {
    case "text_note":
      return (
        <div style={style}>
          <TextNoteObject object={object} />
        </div>
      );

    case "image":
      return (
        <div style={style}>
          <ImageObject object={object} />
        </div>
      );

    default:
      return (
        <div style={style} className="border border-dashed p-2 text-xs">
          Unsupported object: {object.object_type}
        </div>
      );
  }
}
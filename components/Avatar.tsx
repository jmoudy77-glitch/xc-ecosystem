// components/Avatar.tsx
import * as React from "react";

type AvatarSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

export interface AvatarProps {
  src?: string | null;          // Supabase image URL or public path
  name?: string | null;         // Used to derive initials
  size?: AvatarSize;
  variant?: "circle" | "square";
  bordered?: boolean;
  className?: string;
}

export function Avatar({
  src,
  name,
  size = "md",
  variant = "circle",
  bordered = true,
  className = "",
}: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);

  const initials = React.useMemo(() => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }, [name]);

  const baseClasses =
    "inline-flex items-center justify-center overflow-hidden shrink-0";
  const sizeClass = sizeClasses[size];
  const shapeClass = variant === "square" ? "rounded-md" : "rounded-full";
  const decorationClass = bordered
    ? "border border-slate-700 bg-slate-900/70 text-slate-100"
    : "text-slate-100";

  // If we have a src and it hasn't failed, show the image
  if (src && !imgError) {
    return (
      <div
        className={`${baseClasses} ${sizeClass} ${shapeClass} ${decorationClass} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name ?? "Avatar"}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback: initials or generic placeholder
  return (
    <div
      className={`${baseClasses} ${sizeClass} ${shapeClass} ${decorationClass} ${className}`}
    >
      {initials ? (
        <span className="font-semibold">{initials}</span>
      ) : (
        <span className="text-xs opacity-60">?</span>
      )}
    </div>
  );
}
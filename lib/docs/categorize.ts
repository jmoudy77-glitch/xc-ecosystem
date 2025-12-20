import path from "path";
import type { DocsBucket } from "./buckets";

const SNAPSHOT_RE = /^\d{4}-\d{2}-\d{2}.*snapshot/i;

export function bucketForDoc(relPath: string): DocsBucket {
  const r = relPath.toLowerCase();
  const name = path.posix.basename(relPath).toLowerCase();

  if (
    name.includes("constitution") ||
    name.includes("conflict_resolution") ||
    name.includes("ui_architecture_doctrine") ||
    name.includes("design_protocol")
  ) return "Governance";

  if (r.startsWith("session-snapshots/") || SNAPSHOT_RE.test(name) || name.includes("snapshot")) return "Snapshots";

  if (r.startsWith("ui/") || r.startsWith("theme/")) return "UI & UX";

  if (r.startsWith("architecture/") || r.startsWith("schema/") || r.startsWith("security/") || r.startsWith("development/")) return "Architecture";

  // Product-ish buckets
  if (
    r.startsWith("product/") ||
    r.startsWith("features/") ||
    r.startsWith("team-ops/") ||
    r.startsWith("planning/") ||
    r.startsWith("ai/") ||
    r.startsWith("results/") ||
    r.startsWith("milestones/")
  ) return "Product";

  // Default
  return "Product";
}

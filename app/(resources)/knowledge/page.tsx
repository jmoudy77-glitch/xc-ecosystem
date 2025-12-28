import Link from "next/link";
import { getDocsIndex } from "@/lib/docs";

function groupByBucket(items: Awaited<ReturnType<typeof getDocsIndex>>) {
  const map = new Map<string, typeof items>();
  for (const it of items) {
    const arr = map.get(it.bucket) ?? [];
    arr.push(it);
    map.set(it.bucket, arr);
  }
  return map;
}

function bucketOrderKey(bucket: string): number {
  const m = /^(\d+)[-_]/.exec(bucket);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

function prettifyBucketTitle(bucket: string): string {
  // "02_architecture" -> "Architecture"
  const withoutPrefix = bucket.replace(/^\d+[ -_]+/, "");
  const spaced = withoutPrefix.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

function isArchiveBucket(bucket: string): boolean {
  return /^99\b/.test(bucket) || bucket.toLowerCase().includes("archive");
}

export default async function KnowledgeHome() {
  const items = await getDocsIndex();
  const grouped = groupByBucket(items);

  const buckets = Array.from(grouped.keys()).sort((a, b) => {
    const ak = bucketOrderKey(a);
    const bk = bucketOrderKey(b);
    if (ak !== bk) return ak - bk;
    return a.localeCompare(b);
  });

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "34px 18px 46px" }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, letterSpacing: "-0.03em", lineHeight: 1.15 }}>Knowledge Base</h1>
          <p style={{ margin: "10px 0 0", opacity: 0.72, maxWidth: 760, lineHeight: 1.45 }}>
            Internal docs organized by top-level folder. This mirrors the filesystem for developer-first navigation.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/docs/milestones/milestone-map.html" style={{ textDecoration: "none" }}>
            <span
              style={{
                padding: "10px 12px",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              Milestone Map
            </span>
          </Link>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 18,
          marginTop: 22,
          alignItems: "start",
        }}
      >
        {buckets.map((bucketId) => {
          const docsUnsorted = grouped.get(bucketId) ?? [];
          const docs = [...docsUnsorted].sort((a, b) => String(a.title).localeCompare(String(b.title)));

          const previewCount = isArchiveBucket(bucketId) ? 12 : 8;
          const title = prettifyBucketTitle(bucketId);

          return (
            <section
              key={bucketId}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                padding: 16,
                background: "rgba(255,255,255,0.03)",
                boxShadow: "0 1px 0 rgba(0,0,0,0.18)",
                gridColumn: isArchiveBucket(bucketId) ? "1 / -1" : undefined,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, letterSpacing: "-0.01em" }}>{title}</h2>
              <p style={{ margin: "8px 0 14px", opacity: 0.7, fontSize: 13, lineHeight: 1.45 }}>
                Folder: <span style={{ opacity: 0.9 }}>{bucketId}</span>
              </p>

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
                {docs.slice(0, previewCount).map((d) => (
                  <li
                    key={d.path}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      padding: "6px 0",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Link href={`/knowledge/${d.slug.join("/")}`} style={{ textDecoration: "none" }}>
                      <span style={{ fontWeight: 650, letterSpacing: "-0.01em" }}>{d.title}</span>
                    </Link>
                    <span style={{ opacity: 0.52, fontSize: 12, lineHeight: 1.2 }}>{d.path}</span>
                  </li>
                ))}
              </ul>

              {docs.length > previewCount ? (
                <div style={{ marginTop: 14 }}>
                  <Link
                    href={`/knowledge/bucket/${encodeURIComponent(bucketId)}`}
                    style={{ textDecoration: "none", opacity: 0.78 }}
                  >
                    View all ({docs.length})
                  </Link>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

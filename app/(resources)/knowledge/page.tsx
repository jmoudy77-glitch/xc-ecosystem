import Link from "next/link";
import { BUCKETS } from "@/lib/docs/buckets";
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

export default async function KnowledgeHome() {
  const items = await getDocsIndex();
  const grouped = groupByBucket(items);

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "34px 18px 46px" }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, letterSpacing: "-0.03em", lineHeight: 1.15 }}>Knowledge Base</h1>
          <p style={{ margin: "10px 0 0", opacity: 0.72, maxWidth: 760, lineHeight: 1.45 }}>
            Internal docs organized for fast recall. Search is coming next; for now, buckets keep it cognitively aligned.
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
        {BUCKETS.map((b) => {
          const bucketId = String(b.id);
          const isSnapshots = bucketId === "snapshots";
          const previewCount = isSnapshots ? 12 : 8;

          const docsUnsorted = grouped.get(bucketId) ?? [];
          const docs = [...docsUnsorted].sort((a, b) => {
            if (isSnapshots) {
              // Newest-first for snapshots (filenames are date-prefixed)
              return String(b.path).localeCompare(String(a.path));
            }
            return String(a.title).localeCompare(String(b.title));
          });
          return (
            <section
              key={bucketId}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                padding: isSnapshots ? 18 : 16,
                background: "rgba(255,255,255,0.03)",
                boxShadow: "0 1px 0 rgba(0,0,0,0.18)",
                gridColumn: isSnapshots ? "1 / -1" : undefined,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, letterSpacing: "-0.01em" }}>{b.title}</h2>
              <p style={{ margin: "8px 0 14px", opacity: 0.7, fontSize: 13, lineHeight: 1.45 }}>{b.description}</p>

              <ul
                style={
                  isSnapshots
                    ? {
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        display: "grid",
                        gap: 12,
                        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                        alignItems: "start",
                      }
                    : { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }
                }
              >
                {/* Each li draws a subtle divider via borderTop; the first item will visually blend with the section header via padding. */}
                {docs.slice(0, previewCount).map((d) => (
                  <li
                    key={d.path}
                    style={
                      isSnapshots
                        ? {
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.02)",
                          }
                        : {
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            padding: "6px 0",
                            borderTop: "1px solid rgba(255,255,255,0.06)",
                          }
                    }
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

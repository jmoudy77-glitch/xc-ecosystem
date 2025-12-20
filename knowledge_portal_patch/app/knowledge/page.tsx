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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 18px" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.02em" }}>Knowledge Base</h1>
          <p style={{ margin: "8px 0 0", opacity: 0.75 }}>
            Internal docs organized for fast recall. Search is coming next; for now, buckets keep it cognitively aligned.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/milestones" style={{ textDecoration: "none" }}>
            <span style={{ padding: "10px 12px", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12 }}>
              Milestone Map
            </span>
          </Link>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 18 }}>
        {BUCKETS.map((b) => {
          const docs = grouped.get(b.id) ?? [];
          return (
            <section
              key={b.id}
              style={{
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: 16,
                padding: 16,
                background: "rgba(255,255,255,0.6)",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18 }}>{b.title}</h2>
              <p style={{ margin: "8px 0 12px", opacity: 0.75, fontSize: 14 }}>{b.description}</p>

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                {docs.slice(0, 8).map((d) => (
                  <li key={d.path} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <Link href={`/knowledge/${d.slug.join("/")}`} style={{ textDecoration: "none" }}>
                      <span style={{ fontWeight: 600 }}>{d.title}</span>
                    </Link>
                    <span style={{ opacity: 0.6, fontSize: 12 }}>{d.path}</span>
                  </li>
                ))}
              </ul>

              {docs.length > 8 ? (
                <div style={{ marginTop: 12 }}>
                  <Link href={`/knowledge/bucket/${encodeURIComponent(b.id)}`} style={{ textDecoration: "none" }}>
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

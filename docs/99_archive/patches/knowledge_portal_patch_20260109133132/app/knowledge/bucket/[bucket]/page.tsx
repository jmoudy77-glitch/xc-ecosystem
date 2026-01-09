import Link from "next/link";
import { BUCKETS, type DocsBucket } from "@/lib/docs/buckets";
import { getDocsIndex } from "@/lib/docs";

export default async function BucketPage({ params }: { params: { bucket: string } }) {
  const bucket = decodeURIComponent(params.bucket) as DocsBucket;
  const meta = BUCKETS.find((b) => b.id === bucket);

  const items = (await getDocsIndex()).filter((d) => d.bucket === bucket);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 18px" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>{meta?.title ?? bucket}</h1>
          <p style={{ margin: "8px 0 0", opacity: 0.75 }}>{meta?.description ?? ""}</p>
        </div>
        <Link href="/knowledge" style={{ textDecoration: "none" }}>
          ← Back
        </Link>
      </header>

      <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0", display: "grid", gap: 10 }}>
        {items.map((d) => (
          <li key={d.path} style={{ border: "1px solid rgba(0,0,0,0.10)", borderRadius: 14, padding: 12 }}>
            <Link href={`/knowledge/${d.slug.join("/")}`} style={{ textDecoration: "none" }}>
              <div style={{ fontWeight: 700 }}>{d.title}</div>
            </Link>
            <div style={{ opacity: 0.65, fontSize: 12, marginTop: 4 }}>{d.path}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

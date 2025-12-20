import Link from "next/link";
import { notFound } from "next/navigation";
import { readDocBySlug } from "@/lib/docs";

// NOTE: This page assumes you have `react-markdown` + `remark-gfm` installed.
//   npm i react-markdown remark-gfm
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default async function DocPage({ params }: { params: { slug: string[] } }) {
  const slug = params.slug ?? [];
  const doc = await readDocBySlug(slug);
  if (!doc) return notFound();

  const { item, markdown } = doc;

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "26px 18px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.02em" }}>{item.title}</h1>
          <div style={{ marginTop: 6, opacity: 0.65, fontSize: 13 }}>
            {item.bucket} • {item.path}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/knowledge" style={{ textDecoration: "none" }}>Knowledge</Link>
          <Link href="/milestones" style={{ textDecoration: "none" }}>Milestones</Link>
        </div>
      </header>

      <article style={{ lineHeight: 1.6 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}

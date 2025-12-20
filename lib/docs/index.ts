import fs from "fs/promises";
import path from "path";
import { cache } from "react";
import type { DocsBucket } from "./buckets";
import { bucketForDoc } from "./categorize";

export type DocIndexItem = {
  path: string;      // posix relative path within /docs, e.g. "architecture/system-architecture.md"
  slug: string[];    // path split without .md
  title: string;     // first H1 or filename
  bucket: DocsBucket;
};

function docsRoot(): string {
  // Docs live under /app/public/docs
  // Allow override via env for future flexibility
  return (
    process.env.DOCS_ROOT ||
    path.join(process.cwd(), "public", "docs")
  );
}

function toPosix(p: string) {
  return p.split(path.sep).join(path.posix.sep);
}

function stripMdExt(rel: string) {
  return rel.replace(/\.md$/i, "");
}

function inferTitle(markdown: string, fallback: string): string {
  // Find first markdown heading. Prefer H1.
  const lines = markdown.split(/\r?\n/);
  for (const line of lines.slice(0, 80)) {
    const m = /^#\s+(.+?)\s*$/.exec(line);
    if (m?.[1]) return m[1].trim();
  }
  // Fallback: first non-empty line
  for (const line of lines.slice(0, 30)) {
    const t = line.trim();
    if (t) return t.replace(/^#+\s*/, "").slice(0, 80);
  }
  return fallback;
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === "__MACOSX" || ent.name === ".DS_Store") continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await listMarkdownFiles(abs)));
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith(".md")) {
      out.push(abs);
    }
  }
  return out;
}

export const getDocsIndex = cache(async (): Promise<DocIndexItem[]> => {
  const root = docsRoot();
  const absFiles = await listMarkdownFiles(root);

  const items: DocIndexItem[] = [];
  for (const abs of absFiles) {
    const rel = toPosix(path.relative(root, abs));
    const md = await fs.readFile(abs, "utf8");
    const fallback = path.posix.basename(rel, ".md").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
    const title = inferTitle(md, fallback);
    // Bucket assignment: allow explicit directory→bucket overrides for stability.
    // (This prevents missing panels when new top-level folders are added.)
    const relLower = rel.toLowerCase();
    const bucket = relLower.startsWith("ai/") ? ("ai" as DocsBucket) : bucketForDoc(rel);
    const slug = stripMdExt(rel).split("/").filter(Boolean);

    items.push({ path: rel, slug, title, bucket });
  }

  // Stable sort: bucket, then title
  items.sort((a, b) => {
    if (a.bucket !== b.bucket) return a.bucket.localeCompare(b.bucket);
    return a.title.localeCompare(b.title);
  });

  return items;
});

export async function readDocBySlug(slug: string[]): Promise<{ item: DocIndexItem; markdown: string } | null> {
  const index = await getDocsIndex();
  const key = slug.join("/");
  const item = index.find((d) => d.slug.join("/") === key);
  if (!item) return null;

  const abs = path.join(docsRoot(), ...item.slug) + ".md";
  const markdown = await fs.readFile(abs, "utf8");
  return { item, markdown };
}

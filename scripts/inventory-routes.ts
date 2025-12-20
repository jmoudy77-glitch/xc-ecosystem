import fs from "fs";
import path from "path";

const APP_DIR = path.join(process.cwd(), "app");

const ROUTE_FILES = new Set([
  "page.tsx",
  "page.ts",
  "route.ts",
  "route.js",
]);

function stripRouteGroups(route: string) {
  // Remove route group segments like "/(system)" anywhere in the path.
  const stripped = route
    .replace(/\/\([^/]+\)/g, "")
    .replace(/\/+/, "/");

  const collapsed = stripped.replace(/\/+?/g, "/");
  const trimmed = collapsed.replace(/\/$/, "");
  return trimmed === "" ? "/" : trimmed;
}

function walk(dir: string, base = ""): string[] {
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const ent of entries) {
    if (ent.name.startsWith(".")) continue;

    const abs = path.join(dir, ent.name);
    const rel = path.join(base, ent.name);

    if (ent.isDirectory()) {
      out.push(...walk(abs, rel));
    } else if (ROUTE_FILES.has(ent.name)) {
      // strip trailing /page.tsx or /route.ts
      const routePath = base || "/";
      out.push(routePath === "" ? "/" : `/${routePath}`);
    }
  }

  return out;
}

function normalize(routes: string[]) {
  return Array.from(
    new Set(
      routes.map((r) => {
        const cleaned = stripRouteGroups(r);
        return cleaned
          .replace(/\/page$/, "")
          .replace(/\/route$/, "")
          .replace(/\/+/g, "/")
          .replace(/\/$/, "");
      })
    )
  ).sort();
}

const routes = normalize(walk(APP_DIR));

console.log("\n📍 Route Inventory\n");
routes.forEach((r) => console.log(r));
console.log(`\nTotal routes: ${routes.length}\n`);
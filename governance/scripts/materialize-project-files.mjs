import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const repoRoot = process.cwd();
const govRoot = path.join(repoRoot, "governance");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dst) {
  ensureDir(dst);
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function walkFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function writeText(p, s) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, s);
}

function isTextFile(p) {
  const ext = path.extname(p).toLowerCase();
  return [
    ".md",
    ".txt",
    ".sql",
    ".json",
    ".yml",
    ".yaml",
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".cjs",
  ].includes(ext);
}

function concatTree(rootDir, title) {
  const files = walkFiles(rootDir).filter(isTextFile);
  let out = `# ${title}\n\n`;
  out += `Root: ${path.relative(repoRoot, rootDir)}\n\n`;
  for (const f of files) {
    const rel = path.relative(rootDir, f);
    const ext = path.extname(f).toLowerCase().replace(".", "") || "text";
    out += `\n---\n\n## ${rel}\n\n\`\`\`${ext}\n${readText(f)}\n\`\`\`\n`;
  }
  return out;
}

const moduleKey = process.argv[2];
if (!moduleKey) die("usage: node governance/scripts/materialize-project-files.mjs <module_key>");

const kernelGenesis = path.join(govRoot, "kernel", "genesis");
const moduleGenesis = path.join(govRoot, "modules", moduleKey, "genesis");

if (!fs.existsSync(kernelGenesis)) die(`missing kernel genesis: ${kernelGenesis}`);
if (!fs.existsSync(moduleGenesis)) die(`missing module genesis: ${moduleGenesis}`);

const outRoot = path.join(govRoot, "artifacts", "materialized", moduleKey);
rmrf(outRoot);
ensureDir(outRoot);

const outGenesis = path.join(outRoot, "genesis");
copyDir(kernelGenesis, outGenesis);
copyDir(moduleGenesis, outGenesis); // overlays module tree into genesis/module/<moduleKey>/...

// helpful top-level plaintext anchors (search-first)
const kernelVersionPath = path.join(outGenesis, "meta", "kernel_version.md");
const phIndexPath = path.join(outGenesis, "module", moduleKey, "indexes", `${moduleKey}_index.md`);
const ledgerPath = path.join(outGenesis, "ledger", "LEDGER.md");

writeText(path.join(outRoot, "KERNEL_VERSION.md"), fs.existsSync(kernelVersionPath) ? readText(kernelVersionPath) : "missing genesis/meta/kernel_version.md\n");
writeText(path.join(outRoot, "MODULE_INDEX.md"), fs.existsSync(phIndexPath) ? readText(phIndexPath) : `missing genesis/module/${moduleKey}/indexes/${moduleKey}_index.md\n`);
writeText(path.join(outRoot, "LEDGER.md"), fs.existsSync(ledgerPath) ? readText(ledgerPath) : "missing genesis/ledger/LEDGER.md\n");

writeText(
  path.join(outRoot, "PROJECT_HANDOFF.md"),
  [
    "# Program Health Project Handoff (Authoritative Anchor)",
    "",
    "Active Kernel: see KERNEL_VERSION.md",
    "Active Module: program_health (see MODULE_INDEX.md)",
    "",
    "Authoritative Law Roots:",
    "- genesis/constitution/ratified/",
    "- genesis/module/program_health/ratified/",
    "",
    "Authoritative Registry Specs:",
    "- genesis/module/program_health/registries/",
    "- genesis/module/program_health/rls/",
    "",
    "Reality Anchor:",
    "- LEDGER.md (or genesis/ledger/LEDGER.md)",
    "",
    "Thread Start Capsule (paste at top of each new thread):",
    "",
    "Active Kernel: <from KERNEL_VERSION.md>",
    "Active Module: program_health",
    "Authoritative Index: MODULE_INDEX.md",
    "Reality Anchor: LEDGER.md",
    "",
    "Release Stamp:",
    "",
    "See PROJECT_RELEASE.md for authoritative commit + timestamp",
    "",
  ].join("\n")
);

// Release stamp
writeText(
  path.join(outRoot, "PROJECT_RELEASE.md"),
  [
    "# Program Health Project Release (Authoritative)",
    "",
    `Repo Commit: ${execSync("git rev-parse HEAD").toString().trim()}`,
    `Generated At: ${new Date().toISOString()}`,
    `Kernel Version: ${fs.existsSync(kernelVersionPath) ? readText(kernelVersionPath).match(/version:\\s*(.*)/)?.[1] : "unknown"}`,
    "",
  ].join("\n")
);

// single-file “search anywhere” fallback (in case folder upload doesn’t preserve hierarchy)
writeText(path.join(outRoot, "GENESIS_KERNEL_ALL.md"), concatTree(path.join(govRoot, "kernel", "genesis"), "Kernel Genesis (Full Text)"));
writeText(path.join(outRoot, "GENESIS_MODULE_ALL.md"), concatTree(path.join(govRoot, "modules", moduleKey, "genesis"), `Module Genesis (${moduleKey}) (Full Text)`));
writeText(path.join(outRoot, "GENESIS_ALL.md"), concatTree(outGenesis, `Genesis (Kernel + ${moduleKey} Overlay) (Full Text)`));

writeText(
  path.join(outRoot, "UPLOAD_INSTRUCTIONS.md"),
  [
    "# Upload Instructions (Project Files)",
    "",
    "Goal: make law + ledger searchable as plaintext within the Project.",
    "",
    "Upload ALL plaintext files under this folder:",
    `- governance/artifacts/materialized/${moduleKey}/`,
    "",
    "Minimum required uploads (if you want the smallest set):",
    "- KERNEL_VERSION.md",
    "- MODULE_INDEX.md",
    "- LEDGER.md",
    "- PROJECT_HANDOFF.md",
    "- GENESIS_ALL.md  (single-file searchable corpus)",
    "",
    "If folder uploads preserve paths in your UI:",
    "- upload the entire 'genesis/' folder as well (recommended).",
    "",
    "After upload:",
    "- delete the inert zip capsules from Project Files (they are not searchable).",
    "",
  ].join("\n")
);

console.log(`materialized: ${path.relative(repoRoot, outRoot)}`);

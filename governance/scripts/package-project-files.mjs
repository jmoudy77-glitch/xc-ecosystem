import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = process.cwd();
const govRoot = path.join(repoRoot, "governance");
const distDir = path.join(govRoot, "artifacts");

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

function zipDir(srcDir, outZip) {
  ensureDir(path.dirname(outZip));
  const cwd = srcDir;
  if (fs.existsSync(outZip)) fs.unlinkSync(outZip);
  execFileSync("zip", ["-r", outZip, "."], { cwd, stdio: "inherit" });
}

const moduleKey = process.argv[2];
if (!moduleKey) die("usage: node governance/scripts/package-project-files.mjs <module_key>");

const kernelSrc = path.join(govRoot, "kernel");
const moduleSrc = path.join(govRoot, "modules", moduleKey);

if (!fs.existsSync(kernelSrc)) die(`missing kernel at ${kernelSrc}`);
if (!fs.existsSync(moduleSrc)) die(`missing module overlay at ${moduleSrc}`);

ensureDir(distDir);

const stageRoot = path.join(distDir, `.stage_${moduleKey}`);
rmrf(stageRoot);
ensureDir(stageRoot);

const stageKernel = path.join(stageRoot, "kernel");
const stageModule = path.join(stageRoot, "module");
const stageCombined = path.join(stageRoot, "combined");

copyDir(kernelSrc, stageKernel);
copyDir(moduleSrc, stageModule);
copyDir(kernelSrc, stageCombined);
copyDir(moduleSrc, stageCombined);

const kernelZip = path.join(distDir, `project_files__kernel.zip`);
const moduleZip = path.join(distDir, `project_files__module__${moduleKey}.zip`);
const combinedZip = path.join(distDir, `project_files__combined__${moduleKey}.zip`);

zipDir(stageKernel, kernelZip);
zipDir(stageModule, moduleZip);
zipDir(stageCombined, combinedZip);

rmrf(stageRoot);

console.log("");
console.log("Artifacts written:");
console.log(`- ${path.relative(repoRoot, kernelZip)}`);
console.log(`- ${path.relative(repoRoot, moduleZip)}`);
console.log(`- ${path.relative(repoRoot, combinedZip)}`);

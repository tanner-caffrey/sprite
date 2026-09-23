#!/usr/bin/env node
// What's changed since the last release.
//
//   bun run changelog              since the newest v* tag (or the whole history if none)
//   bun run changelog v0.2.0       since a given tag/commit
//   bun run changelog --release    also print a suggested `git tag` for package.json's version
//   bun run changelog --draft      print a CHANGELOG.md stub for package.json's version
//
// Commits are grouped by the version they were shipped under (read from
// package.json at each commit), newest first. Each group shows the commit
// subjects plus the body of the version-bump commit itself, since that's
// where the real release notes live.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf-8" }).trimEnd();

const args = process.argv.slice(2);
const release = args.includes("--release");
const fromArg = args.find((a) => !a.startsWith("--"));

let from = fromArg ?? null;
if (!from) {
  try {
    from = git("describe", "--tags", "--abbrev=0", "--match", "v*");
  } catch {
    from = null;
  }
}

const range = from ? `${from}..HEAD` : "HEAD";
const log = git("log", "--reverse", "--format=%H%x00%h%x00%s%x00%b%x01", range);
const commits = log
  .split("\u0001")
  .map((c) => c.trim())
  .filter(Boolean)
  .map((c) => {
    const [sha, short, subject, body] = c.split("\u0000");
    return { sha, short, subject, body: (body ?? "").trim() };
  });

if (commits.length === 0) {
  console.log(from ? `nothing since ${from}.` : "no commits.");
  process.exit(0);
}

function versionAt(sha) {
  try {
    return JSON.parse(git("show", `${sha}:package.json`)).version ?? "?";
  } catch {
    return "?";
  }
}

// group by the package.json version each commit landed under
const groups = [];
let prevVersion = from ? versionAt(from) : null;
for (const c of commits) {
  const v = versionAt(c.sha);
  c.bump = v !== prevVersion;
  prevVersion = v;
  let g = groups[groups.length - 1];
  if (!g || g.version !== v) {
    g = { version: v, commits: [] };
    groups.push(g);
  }
  g.commits.push(c);
}
groups.reverse();

const current = JSON.parse(readFileSync(join(root, "package.json"), "utf-8")).version;
console.log(`# changes since ${from ?? "the beginning"} (${commits.length} commit${commits.length === 1 ? "" : "s"})\n`);
for (const g of groups) {
  console.log(`## v${g.version}`);
  for (const c of g.commits) {
    console.log(`- ${c.subject} (${c.short})`);
    if (c.bump && c.body) {
      for (const line of c.body.split("\n")) console.log(`    ${line}`);
    }
  }
  console.log();
}

if (args.includes("--draft")) {
  const mine = groups.find((g) => g.version === current);
  console.log(`\n## v${current} — <title>`);
  for (const cm of mine?.commits ?? []) console.log(`- ${cm.subject.replace(/^sprite v[\d.]+: /, "")}`);
  console.log("\n(paste into CHANGELOG.md above the previous release, then rewrite for humans)");
}

if (release) {
  const tag = `v${current}`;
  const exists = git("tag", "--list", tag) === tag;
  console.log(exists ? `tag ${tag} already exists.` : `to release:\n  git tag -a ${tag} -m "sprite ${tag}" && git push origin ${tag}`);
}

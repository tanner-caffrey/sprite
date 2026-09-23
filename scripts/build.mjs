#!/usr/bin/env node
// Bundle mods/sprite.tsx (+ its npm deps) into mods/sprite.bundled.mjs.
// `letta install` does not run a package-manager install for git packages,
// so the shipped mod must carry the Agent SDK inside it. Tests keep importing
// the .tsx source; the manifest points at the bundle.
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
execFileSync(
  "bun",
  ["build", "mods/sprite.tsx", "--target=bun", "--format=esm", "--outfile=mods/sprite.bundled.mjs",
   "--external=react", "--external=ink"],
  { cwd: root, stdio: "inherit" },
);
console.log("built mods/sprite.bundled.mjs");

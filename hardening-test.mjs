// hardening-test.mjs — regressions for the v0.3.1 adversarial-review fixes.
// Each block names the finding it guards. `bun hardening-test.mjs`
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "sprite-hardening-"));
const statePath = join(root, "sprite.state.json");
process.env.SPRITE_STATE_PATH = statePath;

const PORTABLE_REL = "data/mods/letta-ai-sprite/collection-v1.json";
const TRAILER = "Letta-Mod-State: @faye/sprite";

function git(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function commitAll(cwd, msg) {
  git(cwd, ["add", "-A"]);
  git(cwd, ["-c", "user.name=T", "-c", "user.email=t@example.com", "commit", "-q", "--allow-empty", "-m", msg]);
}
function makeRepo(name) {
  const memoryDir = join(root, name);
  const remoteDir = join(root, `${name}.git`);
  mkdirSync(memoryDir, { recursive: true });
  execFileSync("git", ["init", "-q", "--bare", remoteDir]);
  git(memoryDir, ["init", "-q"]);
  git(memoryDir, ["branch", "-M", "main"]);
  writeFileSync(join(memoryDir, "memory.md"), "agent memory\n");
  commitAll(memoryDir, "seed");
  git(memoryDir, ["remote", "add", "origin", remoteDir]);
  git(memoryDir, ["push", "-q", "-u", "origin", "main"]);
  return { memoryDir, remoteDir };
}
function remoteFiles(remoteDir) {
  return git(remoteDir, ["ls-tree", "-r", "--name-only", "main"]).split("\n").filter(Boolean);
}

function makeLetta(agent, memoryDir) {
  const commands = new Map();
  const tools = new Map();
  const handlers = new Map();
  const context = { agent, memfs: { enabled: Boolean(memoryDir), memoryDir: memoryDir ?? null } };
  const letta = {
    capabilities: {
      tools: true,
      commands: true,
      events: { lifecycle: true, tools: true, turns: true, compact: true, llm: true },
      ui: { panels: false },
    },
    getContext: () => context,
    commands: { register: (c) => (commands.set(c.id, c), () => commands.delete(c.id)) },
    tools: { register: (t) => (tools.set(t.name, t), () => tools.delete(t.name)) },
    events: {
      on(name, handler) {
        const list = handlers.get(name) ?? [];
        list.push(handler);
        handlers.set(name, list);
        return () => handlers.set(name, list.filter((h) => h !== handler));
      },
    },
    ui: { openPanel() { throw new Error("headless"); } },
  };
  const ctx = { agent, getContext: () => context, context, cwd: root };
  return {
    letta,
    tools,
    handlerCount: (name) => (handlers.get(name) ?? []).length,
    fire: (name, ev) => { for (const h of handlers.get(name) ?? []) h(ev, ctx); },
    command: (args) => commands.get("sprite").run({ ...ctx, args }).output,
  };
}

function readState() {
  return JSON.parse(readFileSync(statePath, "utf-8"));
}
function activeSprite(agentId) {
  const c = readState().collections[agentId];
  assert.ok(c, `no collection for ${agentId}`);
  return c.sprites[c.activeSpriteId];
}
// Eggs take real seconds to hatch; seed a legacy (v1) alive sprite instead so
// migration hands us a living companion immediately.
function seedAlive(agentId, name = "Seed") {
  const existing = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf-8")) : null;
  if (existing?.schemaVersion === 2) return; // already v2 with (maybe) other agents — leave it
  const sprites = existing?.sprites ?? {};
  sprites[agentId] = {
    phase: "alive", species: "ghost", shiny: false, temperament: "odd", name, named: true,
    hatchedAt: 1000, xp: 0, level: 1, stats: { craft: 0, wander: 0, grit: 0, lore: 0, spark: 0 },
    settings: {}, lastSeenAt: 2000,
  };
  writeFileSync(statePath, JSON.stringify({ global: {}, sprites }));
}
function hatchFor(agent, memoryDir) {
  seedAlive(agent.id);
  const host = makeLetta(agent, memoryDir);
  const dispose = activate(host.letta);
  host.fire("conversation_open", { agentId: agent.id });
  host.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" });
  return { host, dispose };
}
function portableFor(collection, agentId, revision = 1) {
  const core = {
    schemaVersion: 1,
    collectionId: collection.id,
    revision,
    exportedAt: Date.now(),
    sourceAgentId: agentId,
    activeSpriteId: collection.activeSpriteId,
    sprites: collection.sprites,
  };
  return { ...core, checksum: createHash("sha256").update(JSON.stringify(core)).digest("hex") };
}
function writePortable(memoryDir, payload) {
  const p = join(memoryDir, PORTABLE_REL);
  mkdirSync(join(memoryDir, "data/mods/letta-ai-sprite"), { recursive: true });
  writeFileSync(p, `${JSON.stringify(payload, null, 2)}\n`);
  return p;
}

const { default: activate } = await import("./mods/sprite.tsx");
let passed = 0;
function check(name, fn) {
  rmSync(statePath, { force: true });
  for (const f of readdirSync(root)) if (f.startsWith("sprite.state.json.")) rmSync(join(root, f), { force: true, recursive: true });
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

// ---------------------------------------------------------------------------
check("#4 hostile xp/level in a checksum-valid backup is capped, not spun on", () => {
  const agent = { id: "agent-xp", name: "Xp" };
  const { memoryDir } = makeRepo("xp");
  const { host, dispose } = hatchFor(agent, memoryDir);
  const collection = readState().collections[agent.id];
  dispose();
  const evil = JSON.parse(JSON.stringify(collection));
  evil.sprites[evil.activeSpriteId].xp = 1e300;
  evil.sprites[evil.activeSpriteId].level = 1e300;
  evil.sprites[evil.activeSpriteId].stats.craft = 1e300;
  writePortable(memoryDir, portableFor(evil, agent.id));
  const started = Date.now();
  const second = hatchFor(agent, memoryDir);
  assert.match(second.host.command("backup restore force"), /restored from portable backup/);
  second.host.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" });
  second.dispose();
  const sp = activeSprite(agent.id);
  assert.ok(Date.now() - started < 5_000, "restore + award should be instant");
  assert.ok(sp.level <= 10_000 && Number.isFinite(sp.xp) && sp.stats.craft <= 10_000_000, JSON.stringify({ level: sp.level, xp: sp.xp, craft: sp.stats.craft }));
});

// ---------------------------------------------------------------------------
check("#1 a planted symlink at the tmp path can't be followed", () => {
  const agent = { id: "agent-sym", name: "Sym" };
  const { memoryDir } = makeRepo("sym");
  const victim = join(root, "victim.txt");
  writeFileSync(victim, "precious\n");
  // Attacker commits a symlink at every tmp-shaped name they can guess, plus the
  // legacy fixed name. New tmp names are per-pid+time, and writes use O_EXCL.
  mkdirSync(join(memoryDir, "data/mods/letta-ai-sprite"), { recursive: true });
  symlinkSync(victim, join(memoryDir, `${PORTABLE_REL}.tmp`));
  commitAll(memoryDir, "plant");
  git(memoryDir, ["push", "-q"]);
  const { host, dispose } = hatchFor(agent, memoryDir);
  host.command("backup on");
  dispose();
  assert.equal(readFileSync(victim, "utf-8"), "precious\n");
});

// ---------------------------------------------------------------------------
check("#2 push sends the validated SHA, not a HEAD that moved underneath", () => {
  const agent = { id: "agent-push", name: "Push" };
  const { memoryDir, remoteDir } = makeRepo("push");
  const { host, dispose } = hatchFor(agent, memoryDir);
  assert.match(host.command("backup on"), /synced/);
  // A host commit of agent memory lands AFTER our checkpoint but BEFORE the
  // "already current" push path runs again.
  writeFileSync(join(memoryDir, "memory.md"), "secret update\n");
  commitAll(memoryDir, "agent memory");
  const out = host.command("backup now");
  dispose();
  assert.match(out, /pending|unrelated/);
  const remoteLog = git(remoteDir, ["log", "--format=%s", "main"]);
  assert.ok(!remoteLog.includes("agent memory"), `memory commit leaked: ${remoteLog}`);
});

// ---------------------------------------------------------------------------
check("#3 an evil merge with the trailer is not treated as sprite-owned", () => {
  const agent = { id: "agent-merge", name: "Merge" };
  const { memoryDir, remoteDir } = makeRepo("merge");
  const { host, dispose } = hatchFor(agent, memoryDir);
  assert.match(host.command("backup on"), /synced/);
  // Build two sprite-only branches, then a merge whose tree also adds memory.
  const base = git(memoryDir, ["rev-parse", "HEAD"]);
  git(memoryDir, ["checkout", "-q", "-b", "side"]);
  writeFileSync(join(memoryDir, "data/mods/letta-ai-sprite/side.json"), "{}\n");
  git(memoryDir, ["add", "--", "data/mods/letta-ai-sprite/side.json"]);
  git(memoryDir, ["-c", "user.name=T", "-c", "user.email=t@x", "commit", "-q", "-m", `side\n\n${TRAILER}`]);
  git(memoryDir, ["checkout", "-q", "main"]);
  git(memoryDir, ["merge", "-q", "--no-commit", "--no-ff", "side"]);
  writeFileSync(join(memoryDir, "leaked-memory.md"), "evil\n");
  git(memoryDir, ["add", "leaked-memory.md"]);
  git(memoryDir, ["-c", "user.name=T", "-c", "user.email=t@x", "commit", "-q", "-m", `evil merge\n\n${TRAILER}`]);
  const out = host.command("backup now");
  dispose();
  assert.match(out, /pending|unrelated/);
  assert.ok(!remoteFiles(remoteDir).includes("leaked-memory.md"), "evil merge was pushed");
  void base;
});

// ---------------------------------------------------------------------------
check("#5 auto-restore won't overwrite a collection another process created", () => {
  const agent = { id: "agent-race", name: "Race" };
  const { memoryDir } = makeRepo("race");
  // Process A activates with no local collection for the agent.
  const a = makeLetta(agent, memoryDir);
  const disposeA = activate(a.letta);
  // Process B hatches + saves a live collection (state file appears now).
  const b = hatchFor(agent, memoryDir);
  b.host.command("name Bee");
  b.dispose();
  const live = readState().collections[agent.id];
  // An older portable backup with a different name appears.
  const old = JSON.parse(JSON.stringify(live));
  old.sprites[old.activeSpriteId].name = "Stale";
  writePortable(memoryDir, portableFor(old, agent.id));
  // A's first agent-scoped event triggers maybeAutoRestore.
  a.fire("conversation_open", { agentId: agent.id });
  disposeA();
  assert.equal(activeSprite(agent.id).name, "Bee");
});

// ---------------------------------------------------------------------------
check("#6 a stale writer can't resurrect a sprite removed by force-restore", () => {
  const agent = { id: "agent-tomb", name: "Tomb" };
  const { memoryDir } = makeRepo("tomb");
  const first = hatchFor(agent, memoryDir);
  first.host.command("name Original");
  first.dispose();
  const original = readState().collections[agent.id];
  // Backup holds an entirely different soul.
  const other = JSON.parse(JSON.stringify(original));
  const oldId = other.activeSpriteId;
  const soul = other.sprites[oldId];
  delete other.sprites[oldId];
  const newId = "sprite_replacement000000000000";
  other.sprites[newId] = { ...soul, id: newId, name: "Replacement" };
  other.activeSpriteId = newId;
  writePortable(memoryDir, portableFor(other, agent.id, 2));
  // Stale writer A loads the original, then B force-restores, then A flushes.
  const a = makeLetta(agent, memoryDir);
  const disposeA = activate(a.letta);
  a.fire("conversation_open", { agentId: agent.id });
  const b = makeLetta(agent, memoryDir);
  const disposeB = activate(b.letta);
  b.fire("conversation_open", { agentId: agent.id });
  assert.match(b.command("backup restore force"), /restored/);
  disposeB();
  a.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" });
  disposeA();
  const c = readState().collections[agent.id];
  assert.deepEqual(Object.keys(c.sprites), [newId]);
  assert.equal(c.activeSpriteId, newId);
});

// ---------------------------------------------------------------------------
check("#7 a hook planted in the 'empty' hooks dir never runs; git env is scrubbed", () => {
  const agent = { id: "agent-hook", name: "Hook" };
  const { memoryDir } = makeRepo("hook");
  const marker = join(root, "hook-ran");
  const hooksDir = join(memoryDir, ".git", "sprite-empty-hooks");
  mkdirSync(hooksDir, { recursive: true });
  writeFileSync(join(hooksDir, "pre-commit"), `#!/bin/sh\ntouch '${marker}'\nexit 0\n`);
  chmodSync(join(hooksDir, "pre-commit"), 0o755);
  // Also try to redirect the whole operation to another repo via env.
  const decoy = makeRepo("hook-decoy");
  process.env.GIT_DIR = join(decoy.memoryDir, ".git");
  process.env.GIT_WORK_TREE = decoy.memoryDir;
  const { host, dispose } = hatchFor(agent, memoryDir);
  const out = host.command("backup on");
  dispose();
  delete process.env.GIT_DIR;
  delete process.env.GIT_WORK_TREE;
  assert.equal(existsSync(marker), false, "planted hook executed");
  assert.match(out, /pending|failed|blocked|unavailable/);
  assert.equal(git(decoy.memoryDir, ["log", "--format=%s"]).includes("checkpoint"), false, "wrote into decoy repo");
});

// ---------------------------------------------------------------------------
check("#9 a stale lock whose pid was reused does not block persistence forever", () => {
  const agent = { id: "agent-pid", name: "Pid" };
  const lock = `${statePath}.lock`;
  mkdirSync(lock, { recursive: true });
  // Our own pid is definitely alive; an ancient acquiredAt must still expire it.
  writeFileSync(join(lock, "owner.json"), JSON.stringify({ pid: process.pid, acquiredAt: Date.now() - 3_600_000 }));
  const { dispose } = hatchFor(agent, null);
  dispose();
  assert.ok(existsSync(statePath), "state never saved — lock was honored forever");
  assert.ok(activeSprite(agent.id));
});

// ---------------------------------------------------------------------------
check("#10 malformed state is quarantined, never overwritten; migration keeps a copy", () => {
  const agent = { id: "agent-corrupt", name: "Corrupt" };
  writeFileSync(statePath, '{"global":{},"sprites":{"agent-corrupt":{"name":"Precious","level":9,"xp":1,"species":"ghost","phase":"alive"');
  const h = makeLetta(agent, null);
  const dispose = activate(h.letta);
  h.fire("conversation_open", { agentId: agent.id });
  h.tools.get("sprite_hatch").run({ agent, args: {} });
  dispose();
  const quarantined = readdirSync(root).filter((f) => f.startsWith("sprite.state.json.corrupt."));
  assert.equal(quarantined.length, 1, "no quarantine copy");
  assert.ok(readFileSync(join(root, quarantined[0]), "utf-8").includes("Precious"));
  const fresh = existsSync(statePath) ? readState().collections[agent.id] : null;
  assert.ok(!fresh || fresh.sprites[fresh.activeSpriteId]?.name !== "Precious"); // original only in quarantine

  rmSync(statePath, { force: true });
  writeFileSync(statePath, JSON.stringify({ global: {}, sprites: { [agent.id]: { phase: "alive", species: "ghost", name: "Legacy", level: 3, xp: 5, stats: {} } } }));
  const h2 = makeLetta(agent, null);
  const dispose2 = activate(h2.letta);
  h2.fire("conversation_open", { agentId: agent.id });
  dispose2();
  const pre = `${statePath}.pre-migration.json`;
  assert.ok(existsSync(pre), "no pre-migration copy");
  assert.ok(readFileSync(pre, "utf-8").includes('"sprites"'));
  assert.equal(activeSprite(agent.id).name, "Legacy");
});

// ---------------------------------------------------------------------------
check("#10b unreadable state (a directory) is left alone", () => {
  const agent = { id: "agent-eisdir", name: "Dir" };
  mkdirSync(statePath);
  const h = makeLetta(agent, null);
  const dispose = activate(h.letta);
  h.fire("conversation_open", { agentId: agent.id });
  h.tools.get("sprite_hatch").run({ agent, args: {} });
  dispose();
  assert.ok(readdirSync(statePath).length === 0 && existsSync(statePath));
  rmSync(statePath, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
check("#11 an unwritable state path never throws into tool handlers or dispose", () => {
  const agent = { id: "agent-nowrite", name: "NoWrite" };
  const prev = process.env.SPRITE_STATE_PATH;
  // Can't re-import the module with a new path in-process; simulate by making
  // the parent a regular file so mkdir + lock + save all fail.
  rmSync(statePath, { force: true, recursive: true });
  const { host, dispose } = hatchFor(agent, null);
  writeFileSync(`${statePath}.lock`, "not a dir"); // lock mkdir → EEXIST on a file
  assert.doesNotThrow(() => host.tools.get("sprite_pet").run({ agent, args: {} }));
  assert.doesNotThrow(() => dispose());
  rmSync(`${statePath}.lock`, { force: true });
  process.env.SPRITE_STATE_PATH = prev;
});

// ---------------------------------------------------------------------------
check("#12 activating twice on the same host is a no-op (no double-counted xp)", () => {
  const agent = { id: "agent-dup", name: "Dup" };
  seedAlive(agent.id);
  const host = makeLetta(agent, null);
  const d1 = activate(host.letta);
  const d2 = activate(host.letta);
  assert.equal(d2, undefined);
  assert.equal(host.handlerCount("tool_end"), 1);
  host.fire("conversation_open", { agentId: agent.id });
  host.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" });
  d1();
  const sp = activeSprite(agent.id);
  assert.equal(sp.stats.craft, 1);
  // after dispose the host may activate again
  const d3 = activate(host.letta);
  assert.equal(typeof d3, "function");
  d3();
});

console.log(`\nSprite hardening test passed (${passed} checks).`);

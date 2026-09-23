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
  let existing = null;
  try {
    existing = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf-8")) : null;
  } catch {
    existing = null; // malformed on purpose in some checks — overwrite
  }
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
  const result = fn();
  if (result && typeof result.then === "function") {
    return result.then(() => { passed += 1; console.log(`  ✓ ${name}`); });
  }
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
  // A git shim: the first time it sees `push`, it first commits agent memory
  // on top of HEAD (simulating another process racing in between validation
  // and push), then runs the real push with the same args.
  const shimDir = join(root, "git-shim");
  mkdirSync(shimDir, { recursive: true });
  const flag = join(root, "push-raced");
  writeFileSync(
    join(shimDir, "git"),
    `#!/bin/sh
if [ ! -e '${flag}' ]; then
  for a in "$@"; do
    if [ "$a" = push ]; then
      touch '${flag}'
      echo "secret update" > '${join(memoryDir, "memory.md")}'
      /usr/bin/git -C '${memoryDir}' add -A
      /usr/bin/git -C '${memoryDir}' -c user.name=T -c user.email=t@x commit -q -m "agent memory"
      break
    fi
  done
fi
exec /usr/bin/git "$@"
`,
  );
  chmodSync(join(shimDir, "git"), 0o755);
  const prevPath = process.env.PATH;
  process.env.PATH = `${shimDir}:${prevPath}`;
  const { host, dispose } = hatchFor(agent, memoryDir);
  const out = host.command("backup on");
  dispose();
  process.env.PATH = prevPath;
  assert.ok(existsSync(flag), "shim never intercepted a push");
  const remoteLog = git(remoteDir, ["log", "--format=%s", "main"]);
  assert.ok(!remoteLog.includes("agent memory"), `memory commit leaked: ${remoteLog} (${out})`);
  assert.ok(remoteLog.includes("checkpoint"), `checkpoint itself should still have pushed: ${remoteLog}`);
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
check("#7a a hook planted in the 'empty' hooks dir never runs", () => {
  const agent = { id: "agent-hook", name: "Hook" };
  const { memoryDir } = makeRepo("hook");
  const marker = join(root, "hook-ran");
  const hooksDir = join(memoryDir, ".git", "sprite-empty-hooks");
  mkdirSync(hooksDir, { recursive: true });
  writeFileSync(join(hooksDir, "pre-commit"), `#!/bin/sh\ntouch '${marker}'\nexit 0\n`);
  chmodSync(join(hooksDir, "pre-commit"), 0o755);
  const { host, dispose } = hatchFor(agent, memoryDir);
  const out = host.command("backup on");
  dispose();
  assert.equal(existsSync(marker), false, "planted hook executed");
  assert.match(out, /blocked|pending|busy/);
});

check("#7b GIT_DIR/GIT_WORK_TREE in the environment cannot redirect the checkpoint", () => {
  const agent = { id: "agent-env", name: "Env" };
  const { memoryDir, remoteDir } = makeRepo("env");
  const decoy = makeRepo("env-decoy");
  process.env.GIT_DIR = join(decoy.memoryDir, ".git");
  process.env.GIT_WORK_TREE = decoy.memoryDir;
  const { host, dispose } = hatchFor(agent, memoryDir);
  const out = host.command("backup on");
  dispose();
  delete process.env.GIT_DIR;
  delete process.env.GIT_WORK_TREE;
  assert.match(out, /synced/, out);
  assert.ok(git(remoteDir, ["log", "--format=%s", "main"]).includes("checkpoint"), "checkpoint should land in the real repo");
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
check("#10b unreadable state (a directory, then a chmod-000 file) is left alone", () => {
  const agent = { id: "agent-eisdir", name: "Dir" };
  mkdirSync(statePath);
  let h = makeLetta(agent, null);
  let dispose = activate(h.letta);
  h.fire("conversation_open", { agentId: agent.id });
  h.tools.get("sprite_hatch").run({ agent, args: {} });
  dispose();
  assert.ok(readdirSync(statePath).length === 0 && existsSync(statePath));
  rmSync(statePath, { recursive: true, force: true });

  if (process.getuid?.() !== 0) {
    const precious = JSON.stringify({ global: {}, sprites: { [agent.id]: { phase: "alive", species: "ghost", name: "Precious", level: 2, xp: 0, stats: {} } } });
    writeFileSync(statePath, precious);
    chmodSync(statePath, 0o000);
    h = makeLetta(agent, null);
    dispose = activate(h.letta);
    h.fire("conversation_open", { agentId: agent.id });
    h.tools.get("sprite_hatch").run({ agent, args: {} });
    dispose();
    chmodSync(statePath, 0o600);
    assert.equal(readFileSync(statePath, "utf-8"), precious, "unreadable file was overwritten");
    assert.equal(readdirSync(root).filter((f) => f.startsWith("sprite.state.json.corrupt.")).length, 0, "EACCES must not quarantine");
  }
});

// ---------------------------------------------------------------------------
check("#11 persistence failure inside dispose still unregisters handlers", () => {
  const agent = { id: "agent-nowrite", name: "NoWrite" };
  const { host, dispose } = hatchFor(agent, null);
  // Make the lock dir un-creatable: a regular file at the lock path whose
  // owner.json read fails → EEXIST → clearStaleLock → statSync ok but not a
  // dir → rename works... so instead make the *parent* unwritable.
  if (process.getuid?.() !== 0) {
    chmodSync(root, 0o500);
    try {
      assert.doesNotThrow(() => host.tools.get("sprite_pet").run({ agent, args: {} }));
      assert.doesNotThrow(() => dispose());
    } finally {
      chmodSync(root, 0o700);
    }
  } else {
    dispose();
  }
  assert.equal(host.handlerCount("tool_end"), 0, "handlers leaked after dispose");
  assert.equal(host.handlerCount("conversation_open"), 0);
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

// ---------------------------------------------------------------------------
check("#8 stale-lock reclamation never removes a lock that was re-acquired in between", () => {
  const agent = { id: "agent-reclaim", name: "Reclaim" };
  seedAlive(agent.id);
  const lock = `${statePath}.lock`;
  // Stale lock from a dead pid. Then, "between inspect and rename", a fresh
  // lock replaces it — simulated by making the fresh lock's owner.json present
  // with a live pid + fresh token under the SAME path before activation flushes.
  mkdirSync(lock, { recursive: true });
  writeFileSync(join(lock, "owner.json"), JSON.stringify({ pid: process.pid, acquiredAt: Date.now(), token: "fresh-live" }));
  const { host, dispose } = hatchFor(agent, null);
  host.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" });
  dispose();
  // The live lock must survive — we (a live pid, young acquiredAt) hold it.
  assert.ok(existsSync(join(lock, "owner.json")), "live lock was removed by a stale reclaim");
  assert.equal(JSON.parse(readFileSync(join(lock, "owner.json"), "utf-8")).token, "fresh-live");
  rmSync(lock, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
check("#10c quarantine happens under the lock and only if the bytes are unchanged", () => {
  const agent = { id: "agent-qrace", name: "QRace" };
  const bad = '{"global":{},"sprites":{"x":';
  writeFileSync(statePath, bad);
  // Process A loads the malformed file (outside the lock)…
  const a = makeLetta(agent, null);
  const disposeA = activate(a.letta);
  // …then process B replaces it with a valid collection before A ever flushes.
  const b = hatchFor(agent, null);
  b.host.command("name Valid");
  b.dispose();
  const valid = readFileSync(statePath, "utf-8");
  // A now touches state + flushes: it must NOT move B's valid file aside, and
  // after refreshing from disk it should see B's sprite rather than nothing.
  a.fire("conversation_open", { agentId: agent.id });
  a.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" });
  const seen = a.tools.get("sprite_status").run({ agent, args: {} });
  disposeA();
  assert.match(String(seen), /Valid/, String(seen));
  assert.equal(readdirSync(root).filter((f) => f.startsWith("sprite.state.json.corrupt.")).length, 0, "valid file was quarantined");
  assert.equal(activeSprite(agent.id).name, "Valid");
  void valid;
});

// ---------------------------------------------------------------------------
check("#6b a writer with NO base view of the collection still honors a force-restore", () => {
  const agent = { id: "agent-nobase", name: "NoBase" };
  const { memoryDir } = makeRepo("nobase");
  // Process A activates before any collection exists for the agent.
  const a = makeLetta(agent, memoryDir);
  const disposeA = activate(a.letta);
  // Process B creates one, then force-restores a different soul over it.
  const b = hatchFor(agent, memoryDir);
  b.host.command("name Original");
  const original = readState().collections[agent.id];
  const other = JSON.parse(JSON.stringify(original));
  const oldId = other.activeSpriteId;
  const soul = other.sprites[oldId];
  delete other.sprites[oldId];
  const newId = "sprite_nobase00000000000000000";
  other.sprites[newId] = { ...soul, id: newId, name: "Replacement" };
  other.activeSpriteId = newId;
  writePortable(memoryDir, portableFor(other, agent.id, 2));
  assert.match(b.host.command("backup restore force"), /restored/);
  b.dispose();
  // A (no base for this collection) now builds its own local view and flushes.
  a.fire("conversation_open", { agentId: agent.id });
  a.tools.get("sprite_hatch").run({ agent, args: {} });
  a.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" });
  disposeA();
  const c = readState().collections[agent.id];
  assert.deepEqual(Object.keys(c.sprites), [newId], JSON.stringify(Object.keys(c.sprites)));
  assert.ok((c.generation ?? 0) >= 1, "generation was dropped by the no-base merge");
});

// ---------------------------------------------------------------------------
check("#12b a host whose activation throws can activate again once repaired", () => {
  const agent = { id: "agent-throw", name: "Throw" };
  seedAlive(agent.id);
  const host = makeLetta(agent, null);
  const realRegister = host.letta.commands.register;
  host.letta.commands.register = () => { throw new Error("boom"); };
  assert.throws(() => activate(host.letta), /boom/);
  assert.equal(host.handlerCount("tool_end"), 0, "partial activation leaked handlers");
  host.letta.commands.register = realRegister;
  const dispose = activate(host.letta);
  assert.equal(typeof dispose, "function", "host stuck as 'active' after failed init");
  dispose();
});

// ---------------------------------------------------------------------------
check("#4b stat merge across two windows clamps at MAX_STAT", () => {
  const agent = { id: "agent-statcap", name: "StatCap" };
  seedAlive(agent.id);
  const st = JSON.parse(readFileSync(statePath, "utf-8"));
  st.sprites[agent.id].stats.craft = 9_999_999;
  writeFileSync(statePath, JSON.stringify(st));
  const a = makeLetta(agent, null);
  const disposeA = activate(a.letta);
  a.fire("conversation_open", { agentId: agent.id });
  const b = makeLetta(agent, null);
  const disposeB = activate(b.letta);
  b.fire("conversation_open", { agentId: agent.id });
  a.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" });
  b.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" });
  disposeA();
  disposeB();
  assert.ok(activeSprite(agent.id).stats.craft <= 10_000_000, String(activeSprite(agent.id).stats.craft));
});

// ---------------------------------------------------------------------------
await check("#14 breeding: seed delimiter can't collide; chimera has poses + a voice", async () => {
  const g = await import("./breeding/genetics.mjs");
  const h = await import("./breeding/hybrids.mjs");
  assert.notEqual(g.childFateSeed("a", "b|c", "n"), g.childFateSeed("a|b", "c", "n"));
  assert.notEqual(g.childFateSeed("a", "b", "1|2"), g.childFateSeed("a", "b|1", "2"));
  assert.ok(h.HYBRID_POSES.chimera?.idle && h.HYBRID_CORPUS.chimera?.pet?.length > 0);
});

// ---------------------------------------------------------------------------
await check("bars: lap math is monotonic, wraps cleanly, and every lap style renders", async () => {
  const seedAgent = { id: "agent-bars", name: "Bars" };
  seedAlive(seedAgent.id);
  const st = JSON.parse(readFileSync(statePath, "utf-8"));
  st.sprites[seedAgent.id].stats = { craft: 0, wander: 99, grit: 100, lore: 1300, spark: 12345678 };
  writeFileSync(statePath, JSON.stringify(st));
  const host = makeLetta(seedAgent, null);
  const dispose = activate(host.letta);
  host.fire("conversation_open", { agentId: seedAgent.id });
  const line = () => host.command("").split("\n")[2];
  assert.match(line(), /CRAFT ▱{8}  WANDER ▰{7}▱  GRIT ▱{8} ×1  LORE ▰+▱* ×\d+  SPARK .* ×\d+/, line());
  host.command("settings laps odometer");
  assert.match(line(), /CRAFT ⟨0⟩▱{7}  WANDER ⟨0⟩▰{7}  GRIT ⟨1⟩▱{7}/, line());
  host.command("settings laps belt");
  assert.match(line(), /GRIT ▰{8}/, line()); // lap 1, nothing into it yet → a full bar of lap-0 glyph
  host.command("settings laps pips");
  assert.match(line(), /GRIT ▱{8} ·  /, line());
  assert.equal(host.command("settings laps nope"), "laps must be count|odometer|belt|pips");
  assert.equal(host.command("settings hue maybe"), "hue must be on|off");
  dispose();
});

console.log(`\nSprite hardening test passed (${passed} checks).`);

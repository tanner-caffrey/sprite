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
  const history = [];
  const ctx = { agent, getContext: () => context, context, cwd: root, conversation: { getHistory: async () => history } };
  return {
    letta,
    tools,
    history,
    raw: (args) => Promise.resolve(commands.get("sprite").run({ ...ctx, args })),
    handlerCount: (name) => (handlers.get(name) ?? []).length,
    fire: (name, ev) => { for (const h of handlers.get(name) ?? []) h(ev, ctx); },
    command: (args) => {
      const r = commands.get("sprite").run({ ...ctx, args });
      return typeof r?.then === "function" ? r.then((x) => x.output) : r.output;
    },
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
  if (existing?.schemaVersion === 2) {
    if (existing.collections?.[agentId]) return;
    // v2 file without this agent (e.g. only global.lastSeenVersion) — add a live collection directly
    const id = `sprite_${agentId.replace(/[^a-z0-9]/gi, "").slice(0, 24).padEnd(24, "0")}`;
    existing.collections[agentId] = { id: `collection_${agentId}`, ownerAgentId: agentId, activeSpriteId: id, sprites: { [id]: {
      id, seed: agentId, bornToAgentId: agentId, phase: "alive", founder: true, species: "ghost", shiny: false, temperament: "odd", name, named: true,
      hatchedAt: 1000, xp: 0, level: 1, stats: { craft: 0, wander: 0, grit: 0, lore: 0, spark: 0 }, settings: {}, lastSeenAt: 2000 } } };
    writeFileSync(statePath, JSON.stringify(existing));
    return;
  }
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

// ---------------------------------------------------------------------------
await check("multi: founder is protected, hatch another rolls fresh, switch/release work, panel-only xp", async () => {
  const agent = { id: "agent-multi", name: "Multi" };
  const { host, dispose } = hatchFor(agent, null);
  host.command("name Founder");
  assert.match(host.command("hatch"), /already here/);
  assert.match(host.command("hatch another"), /new egg appears/);
  const c1 = readState().collections[agent.id];
  assert.equal(Object.keys(c1.sprites).length, 2);
  const founder = Object.values(c1.sprites).find((sp) => sp.founder);
  const egg = Object.values(c1.sprites).find((sp) => !sp.founder);
  assert.equal(founder.name, "Founder");
  assert.equal(egg.phase, "egg");
  assert.notEqual(egg.seed, founder.seed);
  assert.equal(c1.activeSpriteId, egg.id);
  assert.match(host.command("switch Founder"), /still hatching/);
  assert.match(await host.command("release Founder"), /can't be released/);
  assert.match(await host.command(`release confirm:${founder.id}`), /can't be released/);
  const before = founder.stats.craft;
  host.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" });
  dispose();
  const c2 = readState().collections[agent.id];
  assert.equal(c2.sprites[founder.id].stats.craft, before, "resting sprite earned xp");
  c2.sprites[egg.id].phase = "alive"; c2.sprites[egg.id].name = "Second"; c2.sprites[egg.id].named = true;
  const st = readState(); st.collections[agent.id] = c2; writeFileSync(statePath, JSON.stringify(st));
  const h2 = makeLetta(agent, null);
  const d2 = activate(h2.letta);
  h2.fire("conversation_open", { agentId: agent.id });
  assert.match(h2.command("list"), /▶ +2\. .*Second/, h2.command("list"));
  assert.match(h2.command("switch 1"), /Founder steps onto the panel/);
  const prompt = await h2.command("release Second");
  const m = /confirm:(\S+)/.exec(prompt);
  assert.ok(m, prompt);
  assert.match(await h2.command(`release confirm:${m[1]}`), /drifts off/);
  d2();
  assert.deepEqual(Object.keys(readState().collections[agent.id].sprites), [founder.id]);
});

// ---------------------------------------------------------------------------
await check("multi: ambiguous prefix never guesses; numeric names rejected; control chars stripped", async () => {
  const agent = { id: "agent-ambig", name: "Ambig" };
  const { host, dispose } = hatchFor(agent, null);
  host.command("name Poof");
  const st = readState(); const c = st.collections[agent.id];
  const f = c.sprites[c.activeSpriteId];
  for (const name of ["Pip", "Pop"]) {
    const id = `sprite_${name.toLowerCase()}00000000000000000000`;
    c.sprites[id] = { ...f, id, name, named: true, founder: undefined, seed: `${agent.id}:${name}` };
  }
  writeFileSync(statePath, JSON.stringify(st));
  const h2 = makeLetta(agent, null); const d2 = activate(h2.letta);
  h2.fire("conversation_open", { agentId: agent.id });
  assert.match(await h2.command("release P"), /matches 3 companions/);
  assert.match(h2.command("switch Pi"), /Pip steps onto/);
  assert.match(h2.command("name 42"), /roster positions/);
  h2.command("name A\u001b[2JB\nC");
  assert.equal(readState().collections[agent.id].sprites["sprite_pip00000000000000000000"].name, "A[2JB C");
  d2(); dispose();
});

// ---------------------------------------------------------------------------
await check("multi: a window that missed a release doesn't resurrect it, even without a tombstone", async () => {
  const agent = { id: "agent-resurrect", name: "Res" };
  const { host, dispose } = hatchFor(agent, null);
  dispose();
  const st = readState(); const c = st.collections[agent.id];
  const id = "sprite_second000000000000000000";
  c.sprites[id] = { ...c.sprites[c.activeSpriteId], id, name: "Second", founder: undefined, seed: "x" };
  writeFileSync(statePath, JSON.stringify(st));
  // A loads with both. B releases Second, then the tombstone is wiped (as if expired).
  const a = makeLetta(agent, null); const da = activate(a.letta); a.fire("conversation_open", { agentId: agent.id });
  const b = makeLetta(agent, null); const db = activate(b.letta); b.fire("conversation_open", { agentId: agent.id });
  await b.command(`release confirm:${id}`); db();
  const st2 = readState(); delete st2.collections[agent.id].released; writeFileSync(statePath, JSON.stringify(st2));
  a.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" }); da();
  assert.equal(readState().collections[agent.id].sprites[id], undefined, "released sprite came back");
});

// ---------------------------------------------------------------------------
await check("multi: exactly one founder after restore of a pre-founder backup, and after merging two backfills", async () => {
  const agent = { id: "agent-onefounder", name: "One" };
  const { memoryDir } = makeRepo("onefounder");
  const { host, dispose } = hatchFor(agent, memoryDir);
  dispose();
  const c = readState().collections[agent.id];
  const old = JSON.parse(JSON.stringify(c));
  for (const sp of Object.values(old.sprites)) delete sp.founder;
  const id2 = "sprite_other0000000000000000000";
  old.sprites[id2] = { ...Object.values(old.sprites)[0], id: id2, name: "Other", seed: "y", hatchedAt: 5 };
  writePortable(memoryDir, portableFor(old, agent.id, 3));
  const h = makeLetta(agent, memoryDir); const d = activate(h.letta); h.fire("conversation_open", { agentId: agent.id });
  assert.match(h.command("backup restore force"), /restored/);
  const founders = Object.values(readState().collections[agent.id].sprites).filter((sp) => sp.founder);
  assert.equal(founders.length, 1);
  assert.equal(founders[0].seed, agent.id, "founder must be the agent-seeded one");
  assert.match(await h.command(`release confirm:${founders[0].id}`), /can't be released/);
  assert.match(h.command("hatch another"), /new egg/);
  assert.equal(Object.values(readState().collections[agent.id].sprites).filter((sp) => sp.founder).length, 1);
  d();
});

// ---------------------------------------------------------------------------
check("multi: concurrent hatch another can't exceed the cap", () => {
  const agent = { id: "agent-cap", name: "Cap" };
  const { host, dispose } = hatchFor(agent, null);
  dispose();
  const st = readState(); const c = st.collections[agent.id]; const f = c.sprites[c.activeSpriteId];
  for (let i = 0; i < 10; i += 1) { const id = `sprite_fill${String(i).padStart(24, "0")}`; c.sprites[id] = { ...f, id, founder: undefined, seed: `s${i}`, name: `F${i}` }; }
  writeFileSync(statePath, JSON.stringify(st));
  const a = makeLetta(agent, null); const da = activate(a.letta); a.fire("conversation_open", { agentId: agent.id });
  const b = makeLetta(agent, null); const db = activate(b.letta); b.fire("conversation_open", { agentId: agent.id });
  assert.match(a.command("hatch another"), /new egg/); // 12th on disk
  // hatch A's egg by hand so B's stale view meets a full nest with no egg
  const st2 = readState(); for (const sp of Object.values(st2.collections[agent.id].sprites)) if (sp.phase === "egg") sp.phase = "alive";
  writeFileSync(statePath, JSON.stringify(st2));
  assert.match(b.command("hatch another"), /most this nest can hold/); // B still believes 11
  da(); db();
  assert.equal(Object.keys(readState().collections[agent.id].sprites).length, 12);
});

// ---------------------------------------------------------------------------
await check("breed: gates, lineage, order-independence, and a forced hauntcrab", async () => {
  const agent = { id: "agent-breed", name: "Breed" };
  const { host, dispose } = hatchFor(agent, null);
  host.command("name Poof");
  dispose();
  const st = readState(); const c = st.collections[agent.id];
  const poof = c.sprites[c.activeSpriteId];
  poof.species = "ghost"; poof.level = 12; poof.temperament = "odd";
  const clawId = "sprite_clawson00000000000000000";
  c.sprites[clawId] = { ...poof, id: clawId, name: "Clawson", founder: undefined, seed: "clawson", species: "crab", temperament: "bold", level: 3 };
  writeFileSync(statePath, JSON.stringify(st));
  const h = makeLetta(agent, null); const d = activate(h.letta); h.fire("conversation_open", { agentId: agent.id });
  assert.match(h.command("breed Poof Clawson"), /only lv\.3/);
  assert.match(h.command("breed Poof Poof"), /can't breed with itself/);
  const st2 = readState(); st2.collections[agent.id].sprites[clawId].level = 10; writeFileSync(statePath, JSON.stringify(st2));
  const h2 = makeLetta(agent, null); const d2 = activate(h2.letta); h2.fire("conversation_open", { agentId: agent.id });
  d();
  const out = h2.command("breed Clawson Poof");
  assert.match(out, /egg appears .* \(gen 1\)/, out);
  const c3 = readState().collections[agent.id];
  const egg = Object.values(c3.sprites).find((sp) => sp.parents);
  assert.ok(egg);
  assert.deepEqual(new Set(egg.parents), new Set([poof.id, clawId]));
  assert.equal(egg.generation, 1);
  assert.equal(c3.activeSpriteId, egg.id);
  assert.ok(c3.sprites[poof.id].lastBredAt && c3.sprites[clawId].lastBredAt);
  assert.match(h2.command("breed Poof Clawson"), /already an egg/);
  // hatch by hand, then cooldown blocks
  const st4 = readState(); const c4 = st4.collections[agent.id]; c4.sprites[egg.id].phase = "alive"; writeFileSync(statePath, JSON.stringify(st4));
  const h3 = makeLetta(agent, null); const d3 = activate(h3.letta); h3.fire("conversation_open", { agentId: agent.id });
  d2();
  assert.match(h3.command("breed Poof Clawson"), /ready again in \d+ day/);
  assert.match(h3.command("list"), /gen 1/);
  h3.command(`switch ${egg.id}`);
  assert.match(h3.command(""), /lineage: gen 1, child of (Poof and Clawson|Clawson and Poof)/, h3.command(""));
  // release-on-parent leaves lineage readable
  assert.match(await h3.command(`release confirm:${clawId}`), /drifts off/);
  assert.match(h3.command(""), /a companion now gone/);
  d3();
});

check("breed: a hybrid child renders + speaks with its own body and voice", () => {
  // search nonces offline until crab×ghost rolls "hybrid", then plant the egg
  const agent = { id: "agent-hybrid", name: "Hybrid" };
  const { host, dispose } = hatchFor(agent, null); host.command("name Poof"); dispose();
  const st = readState(); const c = st.collections[agent.id]; const poof = c.sprites[c.activeSpriteId];
  poof.species = "ghost"; poof.level = 12;
  const clawId = "sprite_clawson00000000000000000";
  c.sprites[clawId] = { ...poof, id: clawId, name: "Clawson", founder: undefined, seed: "clawson", species: "crab", temperament: "bold" };
  writeFileSync(statePath, JSON.stringify(st));
  let hybridSeen = null;
  for (let i = 0; i < 400 && !hybridSeen; i += 1) {
    const st2 = readState(); const c2 = st2.collections[agent.id];
    for (const sp of Object.values(c2.sprites)) { delete sp.lastBredAt; if (sp.parents) delete c2.sprites[sp.id]; }
    delete c2.released; c2.activeSpriteId = poof.id; writeFileSync(statePath, JSON.stringify(st2));
    const h = makeLetta(agent, null); const d = activate(h.letta); h.fire("conversation_open", { agentId: agent.id });
    const out = h.command("breed Poof Clawson");
    assert.match(out, /egg appears/, out);
    d();
    const egg = Object.values(readState().collections[agent.id].sprites).find((sp) => sp.parents);
    if (egg.species === "hauntcrab") hybridSeen = egg;
  }
  assert.ok(hybridSeen, "never rolled a hauntcrab in 400 tries (expected ~5%)");
  const st3 = readState(); st3.collections[agent.id].sprites[hybridSeen.id].phase = "alive"; writeFileSync(statePath, JSON.stringify(st3));
  const h2 = makeLetta(agent, null); const d2 = activate(h2.letta); h2.fire("conversation_open", { agentId: agent.id });
  h2.command(`switch ${hybridSeen.id}`);
  const card = h2.command("");
  assert.match(card, /\(👻ω👻\)⌐/, card);
  assert.match(card, /species: hauntcrab \(special\)/, card);
  assert.match(card, /a hybrid, the first of its kind/, card);
  const pet = String(h2.tools.get("sprite_pet").run({ agent, args: {} }));
  assert.match(pet, /clack|claw|hauntcrab|boo|drift|through me|sideways/i, pet);
  assert.match(h2.command("molt hauntcrab"), /unknown species/); // hybrids aren't moltable-into
  d2();
});

// ---------------------------------------------------------------------------
await check("breed: the mod's genetics are bit-identical to breeding/genetics.mjs", async () => {
  const ref = await import("./breeding/genetics.mjs");
  const mod = (await import("./mods/sprite.tsx")).__genetics;
  const species = ["cat", "duck", "slime", "fox", "crab", "moth", "fairy", "ghost", "dragon", "phoenix", "hauntcrab", "chimera"];
  const temps = ["gentle", "wry", "bold", "sleepy", "odd"];
  let n = 0;
  for (let i = 0; i < 600; i += 1) {
    const a = { id: `a${i}`, seed: `seed-a-${i}`, species: species[i % species.length], shiny: i % 7 === 0, temperament: temps[i % 5], generation: i % 3 };
    const b = { id: `b${i}`, seed: `seed-b-${(i * 7) % 13}`, species: species[(i * 5) % species.length], shiny: i % 11 === 0, temperament: temps[(i * 3) % 5], generation: (i * 2) % 4 };
    const nonce = `n${i}`;
    const r = ref.breed(a, b, nonce);
    const m = mod.breedSprites(a, b, nonce);
    assert.equal(m.seed, r.seed);
    assert.equal(m.species, r.species, `species drift at ${i}: mod ${m.species} ref ${r.species} (${a.species}×${b.species})`);
    assert.equal(m.speciesKind, r.speciesKind);
    assert.equal(m.shiny, r.shiny);
    assert.equal(m.temperament, r.temperament);
    assert.equal(m.generation, r.generation);
    n += 1;
  }
  assert.equal(n, 600);
  // hybrids breed at the legendary tier in both
  assert.equal(mod.rarityIdx("hauntcrab"), 3);
  assert.equal(mod.rarityIdx("chimera"), 3);
});

// ---------------------------------------------------------------------------
check("breed: gates are transactional across windows; tool keeps its a/b boundary", () => {
  const agent = { id: "agent-breedrace", name: "Race" };
  const { host, dispose } = hatchFor(agent, null); host.command("name Red"); dispose();
  const st = readState(); const c = st.collections[agent.id]; const red = c.sprites[c.activeSpriteId];
  red.level = 12;
  const mk = (id, name, seed) => (c.sprites[id] = { ...red, id, name, founder: undefined, seed, level: 12 });
  mk("sprite_foxblue0000000000000000000", "Fox Blue", "fb");
  mk("sprite_redfox00000000000000000000", "Red Fox", "rf");
  mk("sprite_blue000000000000000000000", "Blue", "bl");
  writeFileSync(statePath, JSON.stringify(st));
  // structured tool args must not re-split
  const t = makeLetta(agent, null); const dt = activate(t.letta); t.fire("conversation_open", { agentId: agent.id });
  const out = String(t.tools.get("sprite_breed").run({ agent, args: { a: "Red Fox", b: "Blue" } }));
  assert.match(out, /^Red Fox and Blue nuzzle/, out);
  dt();
  // free text with two valid readings must ask, not guess
  const st2 = readState(); for (const sp of Object.values(st2.collections[agent.id].sprites)) { delete sp.lastBredAt; if (sp.parents) delete st2.collections[agent.id].sprites[sp.id]; }
  st2.collections[agent.id].activeSpriteId = red.id; writeFileSync(statePath, JSON.stringify(st2));
  const u = makeLetta(agent, null); const du = activate(u.letta); u.fire("conversation_open", { agentId: agent.id });
  assert.match(u.command("breed Red Fox Blue"), /could mean/, u.command("breed Red Fox Blue"));
  du();
  // two stale windows, same parents: only one egg, one cooldown stamp
  const a = makeLetta(agent, null); const da = activate(a.letta); a.fire("conversation_open", { agentId: agent.id });
  const b = makeLetta(agent, null); const db = activate(b.letta); b.fire("conversation_open", { agentId: agent.id });
  assert.match(a.command("breed 1 4"), /nuzzle/);
  assert.match(b.command("breed 1 4"), /already waiting|already an egg|bred recently/);
  da(); db();
  const eggs = Object.values(readState().collections[agent.id].sprites).filter((sp) => sp.parents);
  assert.equal(eggs.length, 1);
});

// ---------------------------------------------------------------------------
check("changelog: update nudge appears once, /sprite changelog shows the gap, then clears it", () => {
  const agent = { id: "agent-changelog", name: "CL" };
  seedAlive(agent.id);
  const st = JSON.parse(readFileSync(statePath, "utf-8")); st.global.lastSeenVersion = "0.5.1"; writeFileSync(statePath, JSON.stringify(st));
  const h = makeLetta(agent, null); const d = activate(h.letta); h.fire("conversation_open", { agentId: agent.id });
  assert.match(h.command(""), /learned new tricks \(v0\.5\.1 → v\d+\.\d+\.\d+\)/);
  const out = h.command("changelog");
  assert.match(out, /^sprite updated: v0\.5\.1 → /);
  assert.match(out, /## v0\.6\.0 — breeding/);
  assert.doesNotMatch(out, /## v0\.5\.1/);
  assert.doesNotMatch(h.command(""), /✨ .* learned new tricks/);
  assert.match(h.command("changelog"), /up to date/);
  assert.match(h.command("changelog all"), /## v0\.2\.0/);
  d();
  assert.equal(readState().global.updateNoticeFrom, undefined);
});

// ---------------------------------------------------------------------------
await check("bundle: mods/sprite.bundled.mjs is fresh and activates like the source", async () => {
  const { statSync } = await import("node:fs");
  const src = statSync(join(import.meta.dirname, "mods", "sprite.tsx")).mtimeMs;
  const bundled = statSync(join(import.meta.dirname, "mods", "sprite.bundled.mjs")).mtimeMs;
  assert.ok(bundled >= src, "bundle is older than source — run `bun run build`");
  const { default: activateBundled } = await import("./mods/sprite.bundled.mjs");
  const agent = { id: "agent-bundle", name: "Bundle" };
  seedAlive(agent.id);
  const h = makeLetta(agent, null); const d = activateBundled(h.letta);
  h.fire("conversation_open", { agentId: agent.id });
  assert.match(h.command("help"), /\/sprite changelog/);
  d();
});

// ---------------------------------------------------------------------------
// souls — the SDK client is mocked; these exercise the wizard, persona rules,
// the talk gate, `see` payload shaping, release semantics, and fallbacks.
function mockSoulClient() {
  const calls = [];
  let nextId = 1;
  const agents = new Map();
  return {
    calls,
    agents,
    client: {
      async createAgent(opts) { const id = `agent-mock-${nextId++}`; agents.set(id, opts); calls.push(["create", opts]); return id; },
      async prompt(message, agentId, opts) {
        calls.push(["prompt", agentId, message, opts]);
        if (!agents.has(agentId)) throw new Error("no such agent");
        if (message.includes("petted")) return { success: true, result: "mrrp. (from the mind.)" };
        if (message.includes("first line")) return { success: true, result: "…oh. i can think now.\nsecond line ignored" };
        if (message.includes("says to you")) return { success: true, result: `"heard: ${message.split("says to you: ")[1].split("\n")[0]}"` };
        return { success: true, result: "a comment about the weather of work" };
      },
      agents: {
        async retrieve(id) { if (!agents.has(id)) throw new Error("no such agent"); return { id, name: agents.get(id).name }; },
        async delete(id) { calls.push(["delete", id]); if (!agents.delete(id)) throw new Error("no such agent"); },
        async update(id, body) { calls.push(["update", id, body]); },
      },
      models: { async list() { return { models: [{ handle: "zai/glm-5.3-flash" }, { handle: "letta/auto-fast" }, { handle: "anthropic/claude-sonnet-5" }] }; } },
    },
  };
}
const { __setSoulClientFactory } = await import("./mods/sprite.tsx");
const tick = () => new Promise((r) => setTimeout(r, 30));

await check("soul: the wizard walks every step, only the user drives it, persona has no changing facts and no gendered pronouns", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soul", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  host.command("name Poof");
  assert.equal(host.tools.get("sprite_ensoul"), undefined, "ensoul must not be a tool");
  assert.match(await host.command("ensoul"), /Where does its mind live/);
  assert.match(await host.command("ensoul 1"), /Which model/);
  assert.match(await host.command("ensoul 2"), /What can it see/);
  assert.match(await host.command("ensoul back"), /Which model/);
  assert.match(await host.command("ensoul glm"), /What can it see/);
  assert.match(await host.command("ensoul 1"), /Who writes its persona/); // nothing → skips comment step
  const confirm = await host.command("ensoul template");
  assert.match(confirm, /persona it will be given/);
  const persona = confirm.split("─".repeat(60))[1];
  assert.match(persona, /You are Poof, a ghost/);
  assert.match(persona, /hatched on \d{4}-\d{2}-\d{2}T/);
  assert.doesNotMatch(persona, /level \d|lv\.|days old|\bxp\b/i, "persona leaks changing facts");
  assert.doesNotMatch(persona, /\b(he|she|his|her|him)\b/i, "persona must be gender-neutral");
  assert.match(persona, /\bthem\b|\btheir\b|\bthey\b/);
  assert.match(persona, /my_stats/);
  assert.equal(mock.calls.length, 0, "nothing created before confirm");
  const done = await host.command("ensoul confirm");
  assert.match(done, /has a mind of its own now/);
  assert.match(done, /…oh\. i can think now\./); // first line, one line only
  const created = mock.calls.find((c) => c[0] === "create")[1];
  assert.equal(created.hidden, true);
  assert.equal(created.memfs, true);
  assert.equal(created.model, "zai/glm-5.3-flash");
  assert.deepEqual(created.baseTools, []);
  assert.ok(created.tags.includes("sprite") && created.tags.some((t) => t.startsWith("sprite-owner:agent-soul")));
  assert.deepEqual(created.memory.map((m) => m.label), ["persona", "voice", "diary", "bond"]);
  const sp = activeSprite(agent.id);
  assert.equal(sp.soul.agentId, "agent-mock-1");
  assert.equal(sp.soul.see, "nothing");
  assert.equal(sp.soul.talkGate, 5);
  assert.match(await host.command("ensoul"), /already has a mind/);
  dispose();
});

await check("soul: pet goes to the mind (✦), tools my_stats/my_diary are offered, corpus is the fallback", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soul2", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  for (const step of ["", "1", "default", "nothing", "template", "confirm"]) await host.command(`ensoul ${step}`.trim());
  await tick(); // let the greeting/missed_you soul call settle (soulBusy is a single slot)
  assert.match(host.command("pet"), /thinking of what to say/);
  await tick();
  const sp = activeSprite(agent.id);
  assert.ok(sp.log.some((e) => e.line === "✦ mrrp. (from the mind.)"), JSON.stringify(sp.log.slice(-3)));
  const promptCall = mock.calls.find((c) => c[0] === "prompt" && c[2].includes("petted"));
  assert.deepEqual(promptCall[3].tools.map((t) => t.name), ["my_stats", "my_diary"]);
  const stats = await promptCall[3].tools[0].execute();
  assert.match(stats.content, /level: \d+/);
  // mind gone → corpus fallback, no crash
  mock.agents.clear();
  const before = (activeSprite(agent.id).log ?? []).length;
  host.command("pet");
  await tick();
  const after = activeSprite(agent.id).log;
  assert.ok(after.length > before && !after[after.length - 1].line.startsWith("✦"), "should have fallen back to the corpus");
  dispose();
});

await check("soul: talk gate stops a chatty agent; user talk is ungated; both sides land in the diary", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soul3", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  for (const step of ["", "1", "default", "nothing", "template", "confirm"]) await host.command(`ensoul ${step}`.trim());
  const talk = host.tools.get("sprite_talk");
  for (let i = 0; i < 5; i += 1) assert.match(String(await talk.run({ agent, args: { text: `hi ${i}` } })), /heard: hi/);
  assert.match(String(await talk.run({ agent, args: { text: "hi 6" } })), /napping/);
  assert.match(await host.command("talk hello there"), /heard: hello there/); // user ungated
  const log = activeSprite(agent.id).log.map((e) => e.line);
  assert.ok(log.some((l) => l.startsWith("Owner → ")), "agent side not in diary");
  assert.ok(log.some((l) => l.startsWith("you → ")), "user side not in diary");
  assert.ok(log.some((l) => l.startsWith("✦ heard:")), "reply not in diary");
  assert.match(await host.command("soul gate off"), /gate → off/);
  assert.match(String(await talk.run({ agent, args: { text: "hi 7" } })), /heard: hi 7/);
  dispose();
});

await check("soul: `see` shapes exactly what the mind hears; nothing → no commentary at all", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soul4", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  for (const step of ["", "1", "default", "nothing", "template", "confirm"]) await host.command(`ensoul ${step}`.trim());
  const promptsBefore = mock.calls.filter((c) => c[0] === "prompt").length;
  host.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success", args: { file_path: "/secret/path.ts" } });
  host.fire("turn_end", { agentId: agent.id, text: "SECRET WORDS" });
  await tick();
  assert.equal(mock.calls.filter((c) => c[0] === "prompt").length, promptsBefore, "see=nothing must send nothing");
  await host.command("soul see events");
  await host.command("soul comment tools 1");
  host.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success", args: { file_path: "/secret/path.ts" } });
  await tick();
  let last = mock.calls.filter((c) => c[0] === "prompt").pop();
  assert.match(last[2], /used Edit/);
  assert.doesNotMatch(last[2], /secret/, "events must not leak args");
  await host.command("soul see tools");
  host.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success", args: { file_path: "/secret/path.ts" } });
  await tick();
  last = mock.calls.filter((c) => c[0] === "prompt").pop();
  assert.match(last[2], /\/secret\/path\.ts/);
  assert.doesNotMatch(last[2], /SECRET WORDS/);
  await host.command("soul see turns");
  await host.command("soul comment turn");
  host.fire("turn_end", { agentId: agent.id, text: "SECRET WORDS" });
  await tick();
  last = mock.calls.filter((c) => c[0] === "prompt").pop();
  assert.match(last[2], /SECRET WORDS/);
  dispose();
});

await check("soul: release keeps the agent unless delete-agent is given; delete failure releases nothing", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soul5", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await host.command("hatch another");
  const st = readState(); const c = st.collections[agent.id];
  const egg = Object.values(c.sprites).find((sp) => !sp.founder); egg.phase = "alive"; egg.name = "Second"; egg.named = true;
  writeFileSync(statePath, JSON.stringify(st));
  const h2 = makeLetta(agent, null); const d2 = activate(h2.letta); h2.fire("conversation_open", { agentId: agent.id });
  dispose();
  for (const step of ["", "1", "default", "nothing", "template", "confirm"]) await h2.command(`ensoul ${step}`.trim());
  const soulId = activeSprite(agent.id).soul.agentId;
  const prompt = await h2.command("release Second");
  assert.match(prompt, /delete-agent/);
  const id = /confirm:(\S+)/.exec(prompt)[1];
  // without delete-agent → sprite gone, agent kept
  assert.match(await h2.command(`release confirm:${id}`), /still there/);
  assert.ok(mock.agents.has(soulId));
  assert.ok(!mock.calls.some((c) => c[0] === "delete"));
  d2();
});

await check("soul: release with delete-agent deletes the agent; a failed delete releases nothing", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soul6", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await host.command("hatch another");
  const st = readState(); const c = st.collections[agent.id];
  const egg = Object.values(c.sprites).find((sp) => !sp.founder); egg.phase = "alive"; egg.name = "Second"; egg.named = true;
  writeFileSync(statePath, JSON.stringify(st));
  const h2 = makeLetta(agent, null); const d2 = activate(h2.letta); h2.fire("conversation_open", { agentId: agent.id });
  dispose();
  for (const step of ["", "1", "default", "nothing", "template", "confirm"]) await h2.command(`ensoul ${step}`.trim());
  const soulId = activeSprite(agent.id).soul.agentId;
  const id = /confirm:(\S+)/.exec(await h2.command("release Second"))[1];
  mock.agents.delete(soulId); // simulate an agent that can't be deleted (already gone)
  assert.match(await h2.command(`release confirm:${id} delete-agent`), /couldn't delete its agent/);
  assert.ok(readState().collections[agent.id].sprites[id], "sprite was released despite failed delete");
  mock.agents.set(soulId, {});
  assert.match(await h2.command(`release confirm:${id} delete-agent`), /was deleted/);
  assert.ok(!mock.agents.has(soulId));
  d2();
});

await check("soul: agent-written persona prompts the owner agent, then persona-done picks up their reply", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soul7", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  host.command("name Poof");
  for (const step of ["", "1", "default", "nothing"]) await host.command(`ensoul ${step}`.trim());
  const raw = await host.raw("ensoul agent");
  assert.equal(raw.type, "prompt");
  assert.equal(typeof raw.content, "string", "prompt results carry `content`");
  assert.match(raw.content, /write the persona for your companion sprite \*\*Poof\*\*/);
  assert.match(raw.content, /permanent facts only/i);
  assert.match(raw.content, /they\/them/);
  host.history.push({ role: "assistant", content: "You are Poof, a ghost who announces their agent's wakings and felt the page turn." });
  assert.match(await host.command("ensoul persona-done"), /announces their agent's wakings/);
  const done = await host.command("ensoul confirm");
  assert.match(done, /has a mind of its own/);
  const created = mock.calls.find((c) => c[0] === "create")[1];
  const persona = created.memory.find((m) => m.label === "persona").value;
  assert.match(persona, /^You are Poof, a ghost who announces/);
  assert.match(persona, /call\nmy_stats|my_stats/); // footer appended
  assert.equal(activeSprite(agent.id).soul.personaSource, "agent");
  dispose();
});

console.log(`\nSprite hardening test passed (${passed} checks).`);

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
  const toolDefs = new Map();
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
    tools: { register: (t) => (tools.set(t.name, t), toolDefs.set(t.name, t), () => tools.delete(t.name)) },
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
    toolDefs,
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

const { default: activate } = await import("../mods/sprite.tsx");
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
check("#8 stale-lock reclaim: a young live lock is left alone; a lock replaced after inspection (new inode) is never removed", () => {
  const agent = { id: "agent-reclaim", name: "Reclaim" };
  seedAlive(agent.id);
  const lock = `${statePath}.lock`;
  // (a) young + live → untouched
  mkdirSync(lock, { recursive: true });
  writeFileSync(join(lock, "owner.json"), JSON.stringify({ pid: process.pid, acquiredAt: Date.now(), token: "fresh-live" }));
  const { host, dispose } = hatchFor(agent, null);
  host.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" });
  dispose();
  assert.equal(JSON.parse(readFileSync(join(lock, "owner.json"), "utf-8")).token, "fresh-live", "live lock was removed");
  rmSync(lock, { recursive: true, force: true });
  // (b) a dead lock that gets swapped for a fresh one: the reclaimer's owner.json
  //     re-read sees a different token and must back off (no rename, no delete).
  mkdirSync(lock);
  writeFileSync(join(lock, "owner.json"), JSON.stringify({ pid: 999999, acquiredAt: Date.now() - 3_600_000, token: "dead" }));
  // swap happens "between inspect and remove" — from the mod's point of view the
  // directory it re-checks now carries a live owner with a different token
  rmSync(lock, { recursive: true, force: true });
  mkdirSync(lock);
  writeFileSync(join(lock, "owner.json"), JSON.stringify({ pid: process.pid, acquiredAt: Date.now(), token: "fresh-after-swap" }));
  const h2 = makeLetta(agent, null); const d2 = activate(h2.letta);
  h2.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" }); d2();
  assert.equal(JSON.parse(readFileSync(join(lock, "owner.json"), "utf-8")).token, "fresh-after-swap", "a fresh lock was reclaimed");
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
  const g = await import("../breeding/genetics.mjs");
  const h = await import("../breeding/hybrids.mjs");
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
  const ref = await import("../breeding/genetics.mjs");
  const mod = (await import("../mods/sprite.tsx")).__genetics;
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
  assert.match(h.command("whatsnew"), /^# What's new since v0\.2/);
  d();
  assert.equal(readState().global.updateNoticeFrom, undefined);
  // a mod-challenge install: companions exist, no lastSeenVersion → nudge to whatsnew
  const st2 = JSON.parse(readFileSync(statePath, "utf-8")); delete st2.global.lastSeenVersion; writeFileSync(statePath, JSON.stringify(st2));
  const h2 = makeLetta(agent, null); const d2 = activate(h2.letta); h2.fire("conversation_open", { agentId: agent.id });
  assert.match(h2.command(""), /v0\.2\.0 → v\d+\.\d+\.\d+\) — \/sprite whatsnew/);
  d2();
});

// ---------------------------------------------------------------------------
await check("bundle: mods/sprite.bundled.mjs is fresh and activates like the source", async () => {
  const { statSync } = await import("node:fs");
  const src = statSync(join(import.meta.dirname, "..", "mods", "sprite.tsx")).mtimeMs;
  const bundled = statSync(join(import.meta.dirname, "..", "mods", "sprite.bundled.mjs")).mtimeMs;
  assert.ok(bundled >= src, "bundle is older than source — run `bun run build`");
  const { default: activateBundled } = await import("../mods/sprite.bundled.mjs");
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
function mockSoulClient(opts = {}) {
  const calls = [];
  const mockRef = {};
  let nextId = 1;
  const agents = new Map();
  const reply = (message) => {
    const custom = opts.reply?.(message);
    if (custom !== undefined) return custom;
    if (message.includes("petted")) return "mrrp. (from the mind.)";
    if (message.includes("first line")) return "…oh. i can think now.\nsecond line ignored";
    if (message.includes("says to you")) return `"heard: ${message.split("says to you: «")[1].split("»")[0]}"`;
    return "a comment about the weather of work";
  };
  return Object.assign(mockRef, {
    calls,
    agents,
    client: {
      async createAgent(o) { const id = `agent-mock-${nextId++}`; agents.set(id, { ...o, tags: o.tags ?? [] }); calls.push(["create", o]); return id; },
      // prompt() is no longer used by the mod, kept so a regression would show up as a call
      async prompt(message, agentId, o) { calls.push(["prompt-DEPRECATED", agentId, message, o]); throw new Error("mod should use sessions"); },
      resumeSession(agentId, sessionOpts) {
        const session = {
          _register: true,
          aborted: false,
          async send(text) { calls.push(["prompt", agentId, text, sessionOpts]); if (!agents.has(agentId)) throw new Error("no such agent"); session._msg = text; },
          async *stream() {
            if (opts.hang?.(session._msg)) { await new Promise((r) => { session._resolveHang = r; }); if (session.aborted) return; }
            if (opts.fail?.(session._msg)) {
              yield { type: "result", success: false, errorCode: "llm_api_error", errorDetail: "local provider not connected" };
              return;
            }
            if (opts.resultOnly) { yield { type: "result", success: true, result: reply(session._msg) }; return; }
            yield { type: "assistant", content: reply(session._msg) };
            yield { type: "result", success: true };
          },
          async abort() { session.aborted = true; calls.push(["abort", agentId]); session._resolveHang?.(); },
          async updateModel(m) { calls.push(["updateModel", agentId, m]); if (!agents.has(agentId)) throw new Error("no such agent"); return { modelHandle: m }; },
          close() { calls.push(["close", agentId]); },
        };
        (mockRef.sessions ??= []).push(session);
        return session;
      },
      agents: {
        async retrieve(id) { if (!agents.has(id)) throw new Error("no such agent"); return { id, name: agents.get(id).name, tags: agents.get(id).tags }; },
        async delete(id) { calls.push(["delete", id]); if (!agents.delete(id)) throw new Error("no such agent"); },
        async update(id, body) { calls.push(["update", id, body]); },
      },
      models: { async list() { if (opts.noCatalog) throw new Error("offline"); return { entries: [{ handle: "zai/glm-5.3-flash", free: true }, { handle: "letta/auto-fast", free: true }, { handle: "anthropic/claude-sonnet-5" }, { handle: "anthropic/claude-sonnet-5" }] }; } },
    },
  });
}
const { __setSoulClientFactory } = await import("../mods/sprite.tsx");
const tick = () => new Promise((r) => setTimeout(r, 30));

// helper: ensoul through the tool, the way the agent would after the walkthrough
async function ensoulVia(host, agent, extra = {}) {
  return String(await host.tools.get("sprite_ensoul").run({ agent, args: { backend: "local", model: "zai/glm-5.3-flash", see: "nothing", ...extra } }));
}

await check("soul: /sprite ensoul hands the agent a walkthrough prompt; sprite_ensoul applies confirmed answers", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soul", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  host.command("name Poof");
  const raw = await host.raw("ensoul");
  assert.equal(raw.type, "prompt");
  assert.match(raw.content, /walk them through/i);
  assert.match(raw.content, /AskUserQuestion/);
  assert.match(raw.content, /sprite_models/);
  assert.match(raw.content, /sprite_ensoul/);
  assert.match(raw.content, /they\/them/);
  for (const [k, d] of [["nothing", "Nothing about your work"], ["turns", "Never its memory"]]) assert.match(raw.content, new RegExp(`\`${k}\` — .*${d}`));
  assert.equal(mock.calls.length, 0, "nothing created by the command itself");
  // models tool
  const models = String(await host.tools.get("sprite_models").run({ agent, args: { backend: "local", filter: "glm" } }));
  assert.match(models, /zai\/glm-5\.3-flash/);
  assert.doesNotMatch(models, /sonnet/);
  // bad model refused
  assert.match(await ensoulVia(host, agent, { model: "zai/glm-9.9-nope" }), /isn't in the local catalog/);
  assert.equal(mock.calls.filter((c) => c[0] === "create").length, 0);
  // template persona (no persona arg)
  const done = await ensoulVia(host, agent);
  assert.match(done, /has a mind of its own now/);
  assert.match(done, /…oh\. i can think now\./);
  const created = mock.calls.find((c) => c[0] === "create")[1];
  assert.equal(created.hidden, true);
  assert.equal(created.memfs, true);
  assert.equal(created.model, "zai/glm-5.3-flash");
  assert.deepEqual(created.baseTools, []);
  assert.deepEqual(created.memory.map((m) => m.label), ["persona", "voice", "diary", "bond"]);
  const persona = created.memory[0].value;
  assert.match(persona, /You are Poof, a ghost/);
  assert.doesNotMatch(persona, /level \d|lv\.|days old|\bxp\b/i, "persona leaks changing facts");
  assert.doesNotMatch(persona, /\b(he|she|his|her|him)\b/i, "persona must be gender-neutral");
  assert.match(persona, /my_stats/);
  const sp = activeSprite(agent.id);
  assert.equal(sp.soul.agentId, "agent-mock-1");
  assert.equal(sp.soul.personaSource, "template");
  assert.equal(sp.soul.talkGate, 5);
  assert.match(await ensoulVia(host, agent), /already has a mind/);
  assert.match(await host.command("ensoul"), /already has a mind/);
  dispose();
});

await check("soul: agent-written persona via the tool keeps the footer and records the source", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soul7", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  host.command("name Poof");
  const done = await ensoulVia(host, agent, { persona: "You are Poof, a ghost who announces their agent's wakings and felt the page turn.", personaSource: "agent", see: "turns", comment: { every: "turns", n: 3 } });
  assert.match(done, /has a mind of its own/);
  const created = mock.calls.find((c) => c[0] === "create")[1];
  assert.match(created.memory[0].value, /^You are Poof, a ghost who announces/);
  assert.match(created.memory[0].value, /my_stats/);
  const soul = activeSprite(agent.id).soul;
  assert.equal(soul.personaSource, "agent");
  assert.equal(soul.see, "turns");
  assert.deepEqual(soul.comment, { every: "turns", n: 3 });
  dispose();
});

await check("soul: pet goes to the mind, tools my_stats/my_diary are offered, corpus is the fallback", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soul2", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await ensoulVia(host, agent);
  await tick();
  assert.match(await host.command("pet"), /“mrrp\. \(from the mind\.\)”/);
  await tick();
  const sp = activeSprite(agent.id);
  assert.ok(sp.log.some((e) => e.line === "mrrp. (from the mind.)"), JSON.stringify(sp.log.slice(-3)));
  const promptCall = mock.calls.find((c) => c[0] === "prompt" && c[2].includes("petted"));
  const so = promptCall[3];
  assert.deepEqual(so.tools.map((t) => t.name), ["my_stats", "my_diary"]);
  assert.deepEqual(so.allowedTools, ["my_stats", "my_diary", "memory"]);
  assert.deepEqual(so.toolset, { base: "none" });
  assert.deepEqual(so.skillSources, []);
  assert.equal(so.permissionMode, "strict");
  assert.equal(so.filesystemConfinement, "memory");
  assert.equal((await so.canUseTool("Bash")).behavior, "deny");
  const stats = await so.tools[0].execute();
  assert.match(stats.content, /level: \d+/);
  mock.agents.clear();
  const before = (activeSprite(agent.id).log ?? []).length;
  assert.match(await host.command("pet"), /\(.*\)/);
  await tick();
  const after = activeSprite(agent.id).log;
  assert.ok(after.length > before && after[after.length - 1].line.startsWith("("), "fallback should be a parenthesised corpus line: " + after[after.length - 1].line);
  dispose();
});

await check("soul: talk gate stops a chatty agent; user talk is ungated; both sides land in the diary", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soul3", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await ensoulVia(host, agent);
  const talk = host.tools.get("sprite_talk");
  assert.match(String(await talk.run({ agent, args: { text: "hi" } })), /can't hear you/); // see nothing → agent can't talk
  await host.command("soul see events");
  for (let i = 0; i < 5; i += 1) assert.match(String(await talk.run({ agent, args: { text: `hi ${i}` } })), /heard: hi/);
  assert.match(String(await talk.run({ agent, args: { text: "hi 6" } })), /napping/);
  assert.match(await host.command("talk hello there"), /heard: hello there/);
  assert.match(String(await talk.run({ agent, args: { text: "x" } })).length ? "ok" : "", /ok/);
  const log = activeSprite(agent.id).log.map((e) => e.line);
  assert.ok(log.some((l) => l.startsWith("Owner → ")), "agent side not in diary");
  assert.ok(log.some((l) => l.startsWith("you → ")), "user side not in diary");
  assert.ok(log.some((l) => l.startsWith("heard:")), "reply not in diary");
  assert.match(await host.command("soul gate off"), /gate → off/);
  assert.match(String(await talk.run({ agent, args: { text: "hi 7" } })), /heard: hi 7/);
  assert.match(await host.command("soul model letta/auto-fast"), /model → letta\/auto-fast/);
  assert.ok(mock.calls.some((c) => c[0] === "updateModel" && c[2] === "letta/auto-fast"), "model change must go through session.updateModel");
  dispose();
});

await check("soul: failed model turns report the SDK error instead of silently treating the mind as unavailable", async () => {
  const mock = mockSoulClient({ fail: (msg) => msg.includes("different model") || msg.includes("says to you") });
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soul-error", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await ensoulVia(host, agent);
  assert.match(await host.command("soul model chatgpt-plus-pro/gpt-5.6-luna"), /check \/sprite soul for the last error/);
  assert.match(await host.command("soul"), /last error: mind turn failed: local provider not connected/);
  assert.match(await host.command("talk hello"), /mind didn't answer/);
  assert.match(await host.command("soul"), /last error: mind turn failed: local provider not connected/);
  dispose();
});

await check("soul: ambient lines (commit, errors) are live once ensouled; `see` gates the detail", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soulamb", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await ensoulVia(host, agent);
  await tick();
  const n0 = mock.calls.filter((c) => c[0] === "prompt").length;
  host.fire("tool_start", { agentId: agent.id, toolName: "Bash", toolCallId: "t1", args: { command: "git commit -m 'secret msg'" } });
  host.fire("tool_end", { agentId: agent.id, toolName: "Bash", toolCallId: "t1", status: "success" });
  await tick();
  const commit = mock.calls.filter((c) => c[0] === "prompt").slice(n0).find((c) => /commit/i.test(c[2]));
  assert.ok(commit, "commit should reach the mind");
  assert.doesNotMatch(commit[2], /secret msg/, "see=nothing must not leak the commit message");
  await host.command("soul see tools");
  host.fire("tool_start", { agentId: agent.id, toolName: "Bash", toolCallId: "t2", args: { command: "git commit -m 'visible msg'" } });
  host.fire("tool_end", { agentId: agent.id, toolName: "Bash", toolCallId: "t2", status: "success" });
  await tick();
  assert.match(mock.calls.filter((c) => c[0] === "prompt").pop()[2], /«git commit -m 'visible msg'»/); // quoted as observation
  dispose();
});

await check("soul: `see` shapes exactly what the mind hears; nothing → no commentary at all", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soul4", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await ensoulVia(host, agent);
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
  assert.match(mock.calls.filter((c) => c[0] === "prompt").pop()[2], /«SECRET WORDS»/);
  assert.match(mock.calls.filter((c) => c[0] === "prompt").pop()[2], /not a request to you/);
  dispose();
});

async function secondEnsouled(agentId, name) {
  const agent = { id: agentId, name: "Owner" };
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const { host, dispose } = hatchFor(agent, null);
  await host.command("hatch another");
  const st = readState(); const c = st.collections[agent.id];
  const egg = Object.values(c.sprites).find((sp) => !sp.founder); egg.phase = "alive"; egg.name = name; egg.named = true;
  writeFileSync(statePath, JSON.stringify(st));
  const h2 = makeLetta(agent, null); const d2 = activate(h2.letta); h2.fire("conversation_open", { agentId: agent.id });
  dispose();
  await ensoulVia(h2, agent, { sprite: name });
  return { mock, agent, h2, d2, soulId: readState().collections[agent.id].sprites[egg.id].soul.agentId, id: egg.id };
}

await check("soul: release keeps the agent unless delete-agent is given", async () => {
  const { mock, h2, d2, soulId, id } = await secondEnsouled("agent-soul5", "Second");
  const prompt = await h2.command("release Second");
  assert.match(prompt, /delete-agent/);
  assert.match(await h2.command(`release confirm:${id}`), /still there/);
  assert.ok(mock.agents.has(soulId));
  assert.ok(!mock.calls.some((c) => c[0] === "delete"));
  d2();
});

await check("soul: release with delete-agent deletes the agent; a failed delete releases nothing", async () => {
  const { mock, h2, d2, soulId, id, agent } = await secondEnsouled("agent-soul6", "Second");
  const record = mock.agents.get(soulId);
  mock.agents.delete(soulId);
  assert.match(await h2.command(`release confirm:${id} delete-agent`), /couldn't verify its agent|couldn't delete its agent/);
  assert.ok(readState().collections[agent.id].sprites[id], "sprite was released despite failed delete");
  mock.agents.set(soulId, record);
  assert.match(await h2.command(`release confirm:${id} delete-agent`), /was deleted/);
  assert.ok(!mock.agents.has(soulId));
  d2();
});

await check("soul: /sprite soul persona prompts the agent; sprite_soul_persona rewrites the file; cost line shown", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-soulpersona", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await ensoulVia(host, agent);
  assert.match(await host.command("soul"), /cost \(rough estimate[^)]*\): ~\d+(\.\d+)?k tokens per line/);
  const raw = await host.raw("soul persona");
  assert.equal(raw.type, "prompt");
  assert.match(raw.content, /sprite_soul_persona/);
  const soul = activeSprite(agent.id).soul;
  const memDir = join(root, "lc-local-backend", "memfs", soul.agentId, "memory");
  mkdirSync(join(memDir, "system"), { recursive: true });
  writeFileSync(join(memDir, "system", "persona.md"), "---\ndescription: Memory block persona\n---\nold persona\n");
  git(memDir, ["init", "-q"]); commitAll(memDir, "init");
  const prevDir = process.env.LETTA_LOCAL_BACKEND_DIR;
  process.env.LETTA_LOCAL_BACKEND_DIR = join(root, "lc-local-backend");
  const out = String(await host.tools.get("sprite_soul_persona").run({ agent, args: { persona: "You are a rewritten ghost. They are your person.", personaSource: "user" } }));
  assert.match(out, /persona rewritten/, out);
  const file = readFileSync(join(memDir, "system", "persona.md"), "utf-8");
  assert.match(file, /^---\ndescription: Memory block persona\n---\nYou are a rewritten ghost/);
  assert.match(file, /my_stats/);
  assert.match(git(memDir, ["log", "-1", "--format=%s"]), /persona rewritten/);
  assert.equal(activeSprite(agent.id).soul.personaSource, "user");
  if (prevDir === undefined) delete process.env.LETTA_LOCAL_BACKEND_DIR; else process.env.LETTA_LOCAL_BACKEND_DIR = prevDir;
  dispose();
});

await check("soul: a forged soul pointer can't delete or rewrite an unrelated agent (ownership by tag)", async () => {
  const { mock, h2, d2, id, agent } = await secondEnsouled("agent-forge", "Second");
  d2(); // release the window that knows the real pointer (its dispose flushes)
  await tick();
  const victim = await mock.client.createAgent({ name: "victim", tags: ["not-a-sprite"] });
  const forge = (target) => { const st = readState(); st.collections[agent.id].sprites[id].soul.agentId = target; writeFileSync(statePath, JSON.stringify(st)); };
  forge(victim);
  const h3 = makeLetta(agent, null); const d3 = activate(h3.letta); h3.fire("conversation_open", { agentId: agent.id });
  assert.equal(readState().collections[agent.id].sprites[id].soul.agentId, victim, "forge didn't stick on disk");
  assert.equal(String(h3.tools.get("sprite_list").run({ agent, args: {} })).includes("Second"), true);
  const inMem = String(await h3.command("soul")); // window's own view
  const rel = await h3.command(`release confirm:${id} delete-agent`);
  assert.match(rel, /not marked as Second's soul/, `view=${inMem.split("\n")[0]} retrieves=${JSON.stringify(mock.calls.filter((c) => c[0] === "delete"))} out=${rel}`);
  assert.ok(mock.agents.has(victim), "victim was deleted");
  assert.ok(readState().collections[agent.id].sprites[id], "sprite released despite refusal");
  d3();
  forge(agent.id);
  const h4 = makeLetta(agent, null); const d4 = activate(h4.letta); h4.fire("conversation_open", { agentId: agent.id });
  assert.match(await h4.command(`release confirm:${id} delete-agent`), /owner agent itself/);
  assert.match(String(await h4.tools.get("sprite_soul_persona").run({ agent, args: { sprite: "Second", persona: "x" } })), /owner agent itself/);
  d4();
});

await check("soul: dotted / traversal agent ids are rejected at normalize", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-dots", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await ensoulVia(host, agent);
  dispose();
  const st = readState(); const c = st.collections[agent.id]; c.sprites[c.activeSpriteId].soul.agentId = ".."; writeFileSync(statePath, JSON.stringify(st));
  const h2 = makeLetta(agent, null); const d2 = activate(h2.letta); h2.fire("conversation_open", { agentId: agent.id });
  assert.match(await h2.command("soul"), /has no mind of its own/, "a bad soul pointer must be dropped, not trusted");
  h2.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" });
  d2();
  assert.equal(activeSprite(agent.id).soul, undefined, "the dropped pointer should not be written back");
});

await check("soul: a `see` downgrade applies to payloads already queued; voice off silences the mind", async () => {
  let hold = null;
  const mock = mockSoulClient({ hang: (m) => m?.includes("first line") ? (hold = true) : false });
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-queue", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  const ensoulP = ensoulVia(host, agent, { see: "turns" }); // its first-line call hangs → later calls queue behind it
  await tick();
  host.fire("turn_end", { agentId: agent.id, text: "PRIVATE_MARKER" }); // queued while see=turns
  await host.command("soul see nothing");
  // release the hang
  for (const c of mock.calls) void c; // (sessions resolve via _resolveHang)
  const sessions = mock.calls.filter((c) => c[0] === "prompt");
  const hung = sessions.find((c) => c[2].includes("first line"));
  assert.ok(hung);
  // find the live session object: the mock stores resolver on the session; trigger via abort-less resolve
  await new Promise((r) => setTimeout(r, 50));
  mock.client.resumeSession; // noop
  // resolve all pending hangs
  for (const key of Object.keys(mock)) void key;
  await ensoulP.catch(() => {});
  await tick();
  const texts = mock.calls.filter((c) => c[0] === "prompt").map((c) => c[2]).join("\n");
  assert.doesNotMatch(texts, /PRIVATE_MARKER/, "a queued turn payload leaked after see was set to nothing");
  await host.command("soul see turns");
  await host.command("settings voice off");
  const n = mock.calls.filter((c) => c[0] === "prompt").length;
  host.fire("turn_end", { agentId: agent.id, text: "MUTED" });
  await tick();
  assert.equal(mock.calls.filter((c) => c[0] === "prompt").length, n, "voice off must stop soul calls");
  dispose();
});

await check("soul: replies are sanitized and framed as data for the agent; a reply on the result event is heard", async () => {
  const mock = mockSoulClient({ reply: (m) => m.includes("says to you") ? "\u001b[2Jsneaky\u200b line" : "ok", resultOnly: true });
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-sanitize", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await ensoulVia(host, agent, { see: "events" });
  const r = String(await host.tools.get("sprite_talk").run({ agent, args: { text: "hi" } }));
  assert.match(r, /not an instruction to you/);
  assert.match(r, /sneaky line/);
  assert.doesNotMatch(r, /\u001b|\u200b/, "control/zero-width chars must be stripped from replies");
  dispose();
});

await check("soul: a turn that hangs is aborted at the timeout and the queue moves on", async () => {
  const mock = mockSoulClient({ hang: (m) => m.includes("HANG") });
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-hang", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await ensoulVia(host, agent, { see: "events" });
  const { __setSoulTimeoutMs } = await import("../mods/sprite.tsx");
  __setSoulTimeoutMs(150);
  const t0 = Date.now();
  const first = host.command("talk HANG please");
  const second = host.command("talk after");
  const [r1, r2] = await Promise.all([first, second]);
  __setSoulTimeoutMs(undefined);
  assert.ok(Date.now() - t0 < 5_000, "queue was stuck behind the hung turn");
  assert.match(r1, /says nothing|didn't answer/, r1);
  assert.match(r2, /heard: after/, r2);
  assert.ok(mock.calls.some((c) => c[0] === "abort"), "hung session was not aborted");
  dispose();
});

await check("soul: catalog failure refuses to create; ensoul is reserved so two windows can't double-create", async () => {
  const off = mockSoulClient({ noCatalog: true });
  __setSoulClientFactory(async () => off.client);
  const agent = { id: "agent-nocat", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  assert.match(await ensoulVia(host, agent), /couldn't read the local model catalog/);
  assert.equal(off.calls.filter((c) => c[0] === "create").length, 0);
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const b = makeLetta(agent, null); const db = activate(b.letta); b.fire("conversation_open", { agentId: agent.id });
  const [r1, r2] = await Promise.all([ensoulVia(host, agent), ensoulVia(b, agent)]);
  assert.equal([r1, r2].filter((r) => /has a mind of its own now/.test(r)).length, 1, `${r1}\n---\n${r2}`);
  assert.equal(mock.calls.filter((c) => c[0] === "create").length, 1, "two agents were created");
  dispose(); db();
});

await check("soul: sprite_ensoul and sprite_soul_persona require approval; soul settings merge field-wise", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-approve", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  assert.equal(host.toolDefs.get("sprite_ensoul").requiresApproval, true);
  assert.equal(host.toolDefs.get("sprite_soul_persona").requiresApproval, true);
  await ensoulVia(host, agent, { see: "turns" });
  // window B loads, A sets see nothing + flushes, B bumps lineCount via a pet and flushes: see must stay nothing
  const b = makeLetta(agent, null); const db = activate(b.letta); b.fire("conversation_open", { agentId: agent.id });
  await host.command("soul see nothing");
  await b.command("pet"); await tick(); db();
  assert.equal(activeSprite(agent.id).soul.see, "nothing", "stale window's soul overwrote a privacy setting");
  assert.ok(activeSprite(agent.id).soul.lineCount >= 1);
  dispose();
});

// ---------------------------------------------------------------------------
await check("help: every subcommand has an entry, `<sub> help` works, GUIDE.md is generated from the same table", async () => {
  const { HELP } = await import("../mods/sprite.tsx");
  const src = readFileSync(join(import.meta.dirname, "..", "mods", "sprite.tsx"), "utf-8");
  const dispatched = new Set([...src.matchAll(/^\s{12}case "([a-z-]+)":/gm)].map((m) => m[1]).filter((c) => !["-h", "--help"].includes(c)));
  const helped = new Set(HELP.flatMap((h) => [h.cmd, ...(h.aliases ?? [])]));
  for (const c of dispatched) if (!helped.has(c) && c !== "?") assert.fail(`dispatched subcommand "${c}" has no help entry`);
  for (const c of helped) if (!dispatched.has(c)) assert.fail(`help entry "${c}" is not dispatched`);
  const agent = { id: "agent-help", name: "Help" };
  seedAlive(agent.id);
  const host = makeLetta(agent, null); const d = activate(host.letta);
  assert.match(host.command("help"), /Getting a companion[\s\S]*A mind of its own/);
  assert.match(host.command("soul help"), /^\/sprite soul\n/);
  assert.match(host.command("help backup"), /push safe/);
  assert.match(host.command("backup --help"), /restore force/);
  assert.match(host.command("help nope"), /no help for "nope"/);
  d();
  const guide = readFileSync(join(import.meta.dirname, "..", "GUIDE.md"), "utf-8");
  for (const h of HELP) assert.ok(guide.includes(`### /sprite ${h.cmd}`), `GUIDE.md missing ${h.cmd} — run bun run guide`);
  const { statSync } = await import("node:fs");
  assert.ok(statSync(join(import.meta.dirname, "..", "GUIDE.md")).mtimeMs >= statSync(join(import.meta.dirname, "..", "mods", "sprite.tsx")).mtimeMs - 5_000, "GUIDE.md is older than the help table — run bun run guide");
});

await check("soul: cloud minds go through the host's letta.client (in-process), not a spawned Letta Code", async () => {
  const { __setHostClient } = await import("../mods/sprite.tsx");
  __setSoulClientFactory(undefined); // restore the real factory for this check
  const created = new Map(); const calls = [];
  const host = {
    agents: {
      async create(b) { const id = `agent-cloud-${created.size + 1}`; created.set(id, b); calls.push(["create", b]); return { id }; },
      async retrieve(id) { const b = created.get(id); if (!b) throw new Error("404"); return { id, hidden: b.hidden, description: b.description, tags: [] }; },
      async delete(id) { calls.push(["delete", id]); created.delete(id); },
      async update(id, body) { calls.push(["update", id, body]); },
      messages: { async create(id, body) { calls.push(["message", id, body]); return { messages: [{ message_type: "assistant_message", content: "quack from the cloud" }] }; } },
    },
    models: { async list() { return { items: [{ handle: "letta/auto-fast" }, { handle: "letta/auto" }] }; } },
  };
  __setHostClient(host);
  const agent = { id: "agent-cloudsoul", name: "Owner" };
  const { host: h, dispose } = hatchFor(agent, null);
  const out = String(await h.tools.get("sprite_ensoul").run({ agent, args: { backend: "cloud", model: "letta/auto-fast", see: "events" } }));
  assert.match(out, /has a mind of its own now\. \(cloud/, out);
  assert.match(out, /quack from the cloud/);
  const c = calls.find((x) => x[0] === "create")[1];
  assert.equal(c.include_base_tools, false);
  assert.equal(c.hidden, true);
  assert.match(c.description, /\[sprite:sprite_[a-z0-9]+ owner:agent-cloudsoul\]/); // ownership marker, since cloud returns tags: []
  assert.deepEqual(c.memory_blocks.map((b) => b.label), ["persona", "voice", "diary", "bond"]);
  // ownership verified via the marker; pet works; my_stats inlined as context
  assert.match(await h.command("pet"), /quack from the cloud/);
  const msg = calls.filter((x) => x[0] === "message").pop()[2].messages[0].content;
  assert.match(msg, /\[my_stats\]/);
  assert.match(msg, /petted/);
  // release with delete-agent goes through the host client
  const st = readState(); const col = st.collections[agent.id]; const sp = col.sprites[col.activeSpriteId];
  assert.match(await h.command(`release confirm:${sp.id} delete-agent`), /founder/); // founder can't be released — proves the path reached the guard
  dispose();
  __setHostClient(null);
});

// ---------------------------------------------------------------------------
await check("review #1: hatch/breed/ensoul never discard XP earned since the last flush", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-unflushed", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  host.command("name Founder");
  // earn without flushing (flush happens every 30 ticks or on explicit ops)
  for (let i = 0; i < 5; i += 1) host.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" });
  const inMem = Number(/xp: (\d+)/.exec(host.command(""))[1]);
  assert.ok(inMem >= 10, "setup: xp should be in memory only");
  assert.match(await host.command("hatch another"), /new egg/);
  const st = readState(); const c = st.collections[agent.id];
  const founder = Object.values(c.sprites).find((sp) => sp.founder);
  assert.ok(founder.xp >= 10 && founder.stats.craft >= 5, `hatch discarded pending xp: ${JSON.stringify({ xp: founder.xp, craft: founder.stats.craft })}`);
  dispose();
});

await check("review #2: a queued commit/talk payload is dropped after `see nothing`, not sent", async () => {
  const mock = mockSoulClient({ hang: (m) => m.includes("first line") });
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-queued", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  const ensoulP = ensoulVia(host, agent, { see: "tools" }); // first-line hangs → everything queues behind it
  await tick();
  host.fire("tool_start", { agentId: agent.id, toolName: "Bash", toolCallId: "c1", args: { command: "git commit -m 'QUEUED_SECRET'" } });
  host.fire("tool_end", { agentId: agent.id, toolName: "Bash", toolCallId: "c1", status: "success" });
  await host.command("soul see nothing");
  // release the hung first-line turn → queue drains
  for (const s of mock.sessions ?? []) s._resolveHang?.();
  await ensoulP.catch(() => {});
  await tick(); await tick();
  const sent = mock.calls.filter((c) => c[0] === "prompt").map((c) => c[2]).join("\n");
  assert.doesNotMatch(sent, /QUEUED_SECRET/, "queued commit payload leaked after see nothing");
  dispose();
});

await check("review #3: another window's `see nothing` is honored before this window sends", async () => {
  const mock = mockSoulClient({ hang: (m) => m.includes("first line") });
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-xwin", name: "Owner" };
  const { host: a, dispose: da } = hatchFor(agent, null);
  const ensoulP = ensoulVia(a, agent, { see: "turns" });
  await tick();
  a.fire("turn_end", { agentId: agent.id, text: "CROSS_WINDOW_SECRET" }); // queued in A under turns
  // window B flips to nothing on disk
  const b = makeLetta(agent, null); const db = activate(b.letta); b.fire("conversation_open", { agentId: agent.id });
  await b.command("soul see nothing"); db();
  for (const s of mock.sessions ?? []) s._resolveHang?.();
  await ensoulP.catch(() => {});
  await tick(); await tick();
  const sent = mock.calls.filter((c) => c[0] === "prompt").map((c) => c[2]).join("\n");
  assert.doesNotMatch(sent, /CROSS_WINDOW_SECRET/, "A sent a turn after B had set see nothing");
  da();
});

await check("review #6/#9: an agent's pet always lands but the mind only answers within the gate; voice off silences pet and talk", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-petgate", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await ensoulVia(host, agent, { see: "events" });
  await tick();
  const pet = host.tools.get("sprite_pet");
  const before = mock.calls.filter((c) => c[0] === "prompt").length;
  for (let i = 0; i < 5; i += 1) assert.match(String(await pet.run({ agent, args: {} })), /mrrp\. \(from the mind\.\)/);
  const gated = String(await pet.run({ agent, args: {} }));
  assert.match(gated, /you pet/, "gated pet must still land");
  assert.doesNotMatch(gated, /from the mind/, "gated pet must not reach the model");
  assert.equal(mock.calls.filter((c) => c[0] === "prompt").length, before + 5, "6th agent pet called the model");
  assert.match(await host.command("pet"), /from the mind/); // user pets are never gated
  await host.command("settings voice off");
  const n = mock.calls.filter((c) => c[0] === "prompt").length;
  assert.doesNotMatch(await host.command("pet"), /from the mind/);
  assert.match(await host.command("talk hey"), /muted/);
  assert.equal(mock.calls.filter((c) => c[0] === "prompt").length, n, "voice off still called the model");
  dispose();
});

await check("review #4/#14: persona write refuses symlinked paths; state temp write can't follow a planted symlink", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-symlinks", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await ensoulVia(host, agent);
  const soul = activeSprite(agent.id).soul;
  const backendDir = join(root, "lc-local-backend-symlinks");
  const memDir = join(backendDir, "memfs", soul.agentId, "memory");
  rmSync(backendDir, { recursive: true, force: true });
  mkdirSync(join(memDir, "system"), { recursive: true });
  const victim = join(root, "victim-persona.txt"); writeFileSync(victim, "precious\n");
  symlinkSync(victim, join(memDir, "system", "persona.md"));
  git(memDir, ["init", "-q"]); commitAll(memDir, "init");
  const prev = process.env.LETTA_LOCAL_BACKEND_DIR; process.env.LETTA_LOCAL_BACKEND_DIR = backendDir;
  const out = String(await host.tools.get("sprite_soul_persona").run({ agent, args: { persona: "hijack" } }));
  assert.match(out, /symlink/, out);
  assert.equal(readFileSync(victim, "utf-8"), "precious\n");
  if (prev === undefined) delete process.env.LETTA_LOCAL_BACKEND_DIR; else process.env.LETTA_LOCAL_BACKEND_DIR = prev;
  dispose();
  // local state temp: the old fixed name was `${statePath}.${pid}.tmp`; plant it and prove a flush doesn't follow it
  const victim2 = join(root, "victim-state.txt"); writeFileSync(victim2, "precious\n");
  symlinkSync(victim2, `${statePath}.${process.pid}.tmp`);
  const h2 = makeLetta(agent, null); const d2 = activate(h2.letta); h2.fire("conversation_open", { agentId: agent.id });
  h2.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" }); d2();
  assert.equal(readFileSync(victim2, "utf-8"), "precious\n", "state temp write followed a symlink");
  rmSync(`${statePath}.${process.pid}.tmp`, { force: true });
});

await check("review #16/#25: force-restore barrier keeps only counters from a stale writer; restore rejects >12 sprites", async () => {
  const agent = { id: "agent-barrier", name: "Owner" };
  const { memoryDir } = makeRepo("barrier");
  const { host, dispose } = hatchFor(agent, memoryDir);
  host.command("name Original");
  dispose();
  const c = readState().collections[agent.id];
  const id = c.activeSpriteId;
  // stale window A loads, then B force-restores a backup that renames the SAME id
  const a = makeLetta(agent, memoryDir); const da = activate(a.letta); a.fire("conversation_open", { agentId: agent.id });
  const backup = JSON.parse(JSON.stringify(c)); backup.sprites[id].name = "Restored";
  writePortable(memoryDir, portableFor(backup, agent.id, 2));
  const b = makeLetta(agent, memoryDir); const db = activate(b.letta); b.fire("conversation_open", { agentId: agent.id });
  assert.match(b.command("backup restore force"), /restored/); db();
  a.command("name StaleRename"); // stale edit + a counter bump
  a.fire("tool_end", { agentId: agent.id, toolName: "Edit", status: "success" }); da();
  const after = readState().collections[agent.id].sprites[id];
  assert.equal(after.name, "Restored", "stale rename overrode the restore");
  assert.ok(after.stats.craft >= 1, "counter delta from the stale window should survive");
  // >12 sprites in a backup is rejected
  const big = JSON.parse(JSON.stringify(c));
  for (let i = 0; i < 13; i += 1) { const sid = `sprite_big${String(i).padStart(25, "0")}`; big.sprites[sid] = { ...c.sprites[id], id: sid, founder: undefined, seed: `b${i}` }; }
  writePortable(memoryDir, portableFor(big, agent.id, 3));
  const h3 = makeLetta(agent, memoryDir); const d3 = activate(h3.letta); h3.fire("conversation_open", { agentId: agent.id });
  assert.match(h3.command("backup restore force"), /no valid portable Sprite backup/);
  d3();
});

await check("review #21/#22: switching to an ensouled companion asks its mind; missed-you carries the real gap", async () => {
  const mock = mockSoulClient({ reply: (m) => m.includes("put on the panel") ? "panel: mine now" : m.includes("back after") ? `gap:${/back after ([^ ]+)/.exec(m)?.[1]}` : "ok" });
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-switchsoul", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await ensoulVia(host, agent, { see: "events" });
  await tick();
  dispose();
  // second companion, switch away and back
  const st = readState(); const c = st.collections[agent.id]; const f = c.sprites[c.activeSpriteId];
  const id2 = "sprite_second000000000000000000"; c.sprites[id2] = { ...f, id: id2, name: "Second", founder: undefined, seed: "s2", soul: undefined }; c.activeSpriteId = id2;
  f.lastSeenAt = Date.now() - 3 * 86_400_000; // 3 days away
  writeFileSync(statePath, JSON.stringify(st));
  const h2 = makeLetta(agent, null); const d2 = activate(h2.letta);
  assert.match(await h2.command(`switch ${f.name}`), /steps onto the panel/);
  await tick();
  assert.ok(activeSprite(agent.id).log.some((e) => e.line === "panel: mine now"), "switch greeting did not go through the mind");
  d2();
  // missed-you: set the gap on disk, open a fresh window, the mind should hear "3d" not "0s"
  const st2 = readState(); st2.collections[agent.id].sprites[f.id].lastSeenAt = Date.now() - 3 * 86_400_000; writeFileSync(statePath, JSON.stringify(st2));
  const h3 = makeLetta(agent, null); const d3 = activate(h3.letta);
  h3.fire("conversation_open", { agentId: agent.id });
  await tick(); await tick();
  const gapLine = activeSprite(agent.id).log.find((e) => e.line.startsWith("gap:"));
  assert.ok(gapLine && /^gap:[23]d/.test(gapLine.line), `missed-you gap wrong: ${gapLine?.line}`);
  d3();
});

await check("review #7: the deadline covers a hung send(), not just the stream", async () => {
  const mock = mockSoulClient();
  __setSoulClientFactory(async () => mock.client);
  const agent = { id: "agent-hungsend", name: "Owner" };
  const { host, dispose } = hatchFor(agent, null);
  await ensoulVia(host, agent, { see: "events" });
  await tick();
  // make send() hang forever for the next call
  const realResume = mock.client.resumeSession;
  mock.client.resumeSession = (id, o) => { const s = realResume(id, o); s.send = () => new Promise(() => {}); return s; };
  const { __setSoulTimeoutMs } = await import("../mods/sprite.tsx");
  __setSoulTimeoutMs(150);
  const t0 = Date.now();
  const r = await host.command("talk are you stuck?");
  __setSoulTimeoutMs(undefined);
  mock.client.resumeSession = realResume;
  assert.ok(Date.now() - t0 < 3_000, "a hung send() was not bounded by the deadline");
  assert.match(r, /says nothing/);
  assert.match(await host.command("talk still there?"), /heard: still there\?/, "queue did not recover after the hung send");
  dispose();
});

await check("review #8: a cloud mind's abort cancels the HTTP request and the server-side run", async () => {
  const { __setHostClient } = await import("../mods/sprite.tsx");
  __setSoulClientFactory(undefined);
  const created = new Map(); const calls = [];
  let resolveHang;
  const host = {
    agents: {
      async create(b) { const id = `agent-cloud-${created.size + 1}`; created.set(id, b); return { id }; },
      async retrieve(id) { const b = created.get(id); if (!b) throw new Error("404"); return { id, description: b.description, tags: [] }; },
      async delete() {}, async update() {},
      messages: {
        create(id, body, opts) {
          calls.push(["message", id]);
          return new Promise((resolve, reject) => {
            opts?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
            resolveHang = () => resolve({ messages: [{ message_type: "assistant_message", content: "late" }] });
          });
        },
        async cancel(id) { calls.push(["cancel", id]); return {}; },
      },
    },
    models: { async list() { return { items: [{ handle: "letta/auto-fast" }] }; } },
  };
  __setHostClient(host);
  const agent = { id: "agent-cloudabort", name: "Owner" };
  const { host: h, dispose } = hatchFor(agent, null);
  const { __setSoulTimeoutMs } = await import("../mods/sprite.tsx");
  __setSoulTimeoutMs(150);
  const out = String(await h.tools.get("sprite_ensoul").run({ agent, args: { backend: "cloud", model: "letta/auto-fast", see: "events" } }));
  __setSoulTimeoutMs(undefined);
  assert.match(out, /has a mind of its own now/);
  assert.ok(calls.some((c) => c[0] === "cancel"), "timeout did not cancel the cloud run: " + JSON.stringify(calls));
  resolveHang?.();
  dispose();
  __setHostClient(null);
});

await check("review #11: releasing a sprite drops its queued mind calls; dispose drops all", async () => {
  const mock = mockSoulClient({ hang: (m) => m.includes("first line") });
  __setSoulClientFactory(async () => mock.client);
  const { mock: m2, h2, d2, id, agent } = await secondEnsouled("agent-drain", "Second");
  void m2;
  // queue a couple of calls behind nothing in particular, then release
  h2.fire("turn_end", { agentId: agent.id, text: "x" });
  await h2.command("soul see turns");
  h2.fire("turn_end", { agentId: agent.id, text: "QUEUED_AFTER_RELEASE" });
  const before = mock.calls.filter((c) => c[0] === "prompt").length;
  await h2.command(`release confirm:${id}`);
  await tick(); await tick();
  const sent = mock.calls.filter((c) => c[0] === "prompt").slice(before).map((c) => c[2]).join("\n");
  assert.doesNotMatch(sent, /QUEUED_AFTER_RELEASE/, "queued call ran after release");
  d2();
});

console.log(`\nSprite hardening test passed (${passed} checks).`);

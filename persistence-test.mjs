import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "sprite-persistence-"));
const statePath = join(root, "sprite.state.json");
const memoryDir = join(root, "memory");
const remoteDir = join(root, "memory.git");
const portablePath = join(memoryDir, "data", "mods", "letta-ai-sprite", "collection-v1.json");
process.env.SPRITE_STATE_PATH = statePath;

const AGENT_A = { id: "agent-legacy-a", name: "Legacy" };
const AGENT_B = { id: "agent-restored-b", name: "Restored" };
const AGENT_C = { id: "agent-corrupt-c", name: "Corrupt" };

function git(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function setupMemoryRepo() {
  mkdirSync(memoryDir, { recursive: true });
  execFileSync("git", ["init", "--bare", remoteDir], { stdio: "ignore" });
  git(memoryDir, ["init"]);
  git(memoryDir, ["branch", "-M", "main"]);
  writeFileSync(join(memoryDir, ".seed"), "seed\n");
  git(memoryDir, ["add", ".seed"]);
  git(memoryDir, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "seed"]);
  git(memoryDir, ["remote", "add", "origin", remoteDir]);
  git(memoryDir, ["push", "-u", "origin", "main"]);
}

function writeLegacyState() {
  writeFileSync(
    statePath,
    JSON.stringify(
      {
        global: { voiceRateMin: 5 },
        sprites: {
          [AGENT_A.id]: {
            phase: "alive",
            species: "ghost",
            shiny: false,
            temperament: "odd",
            name: "Poof",
            named: true,
            hatchedAt: 123456,
            xp: 25,
            level: 7,
            stats: { craft: 10, wander: 20, grit: 3, lore: 4, spark: 5 },
            voice: { pet: ["poof~"] },
            settings: { voice: "on" },
            log: [{ at: 123500, category: "pet", line: "poof~" }],
            lastSeenAt: 123600,
          },
        },
      },
      null,
      2,
    ),
  );
}

function snapshot(agent, memfsEnabled = true) {
  return { agent, memfs: { enabled: memfsEnabled, memoryDir: memfsEnabled ? memoryDir : null } };
}

function makeLetta(agent, memfsEnabled = true) {
  const commands = new Map();
  const tools = new Map();
  const handlers = new Map();
  const context = snapshot(agent, memfsEnabled);
  const letta = {
    capabilities: {
      tools: true,
      commands: true,
      events: { lifecycle: true, tools: true, turns: true, compact: true, llm: true },
      ui: { panels: false },
    },
    getContext: () => context,
    commands: {
      register(command) {
        commands.set(command.id, command);
        return () => commands.delete(command.id);
      },
    },
    tools: {
      register(tool) {
        tools.set(tool.name, tool);
        return () => tools.delete(tool.name);
      },
    },
    events: {
      on(name, handler) {
        const list = handlers.get(name) ?? [];
        list.push(handler);
        handlers.set(name, list);
        return () => handlers.set(name, list.filter((candidate) => candidate !== handler));
      },
    },
    ui: {
      openPanel() {
        throw new Error("persistence test runs headless");
      },
    },
  };
  const ctx = { agent, getContext: () => context, context, cwd: root };
  return {
    letta,
    commands,
    tools,
    fire(name, event) {
      for (const handler of handlers.get(name) ?? []) handler(event, ctx);
    },
    command(args) {
      return commands.get("sprite").run({ ...ctx, args }).output;
    },
  };
}

function activeSprite(state, agentId) {
  const collection = state.collections[agentId];
  assert.ok(collection, `missing collection for ${agentId}`);
  return collection.sprites[collection.activeSpriteId];
}

function lifetimeXp(sprite) {
  let total = sprite.xp;
  for (let level = 1; level < sprite.level; level += 1) total += 100 + (level - 1) * 50;
  return total;
}

setupMemoryRepo();
writeLegacyState();
const { default: activate } = await import("./mods/sprite.tsx");

try {
  const first = makeLetta(AGENT_A);
  const disposeFirst = activate(first.letta);
  const migrated = JSON.parse(readFileSync(statePath, "utf-8"));
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.sprites, undefined);
  const migratedSprite = activeSprite(migrated, AGENT_A.id);
  assert.equal(migratedSprite.name, "Poof");
  assert.equal(migratedSprite.species, "ghost");
  assert.equal(migratedSprite.level, 7);
  assert.equal(migratedSprite.seed, AGENT_A.id);
  assert.equal(migratedSprite.bornToAgentId, AGENT_A.id);
  assert.match(migratedSprite.id, /^sprite_[a-f0-9]{24}$/);

  const hookMarker = join(root, "hook-ran");
  const hookPath = join(memoryDir, ".git", "hooks", "pre-commit");
  writeFileSync(hookPath, `#!/bin/sh\ntouch '${hookMarker}'\nexit 1\n`);
  chmodSync(hookPath, 0o755);
  assert.match(first.command("backup on"), /portable backup synced/);
  assert.equal(existsSync(hookMarker), false);
  rmSync(hookPath, { force: true });
  let portable = JSON.parse(readFileSync(portablePath, "utf-8"));
  assert.equal(portable.schemaVersion, 1);
  assert.equal(portable.revision, 1);
  assert.equal(portable.sprites[migratedSprite.id].name, "Poof");
  assert.match(git(memoryDir, ["log", "-1", "--format=%B"]), /Letta-Mod-State: @faye\/sprite/);
  assert.equal(git(memoryDir, ["rev-list", "--left-right", "--count", "@{u}...HEAD"]), "0\t0");

  assert.match(first.command("backup push never"), /push policy → never/);
  first.command("name Poofier");
  assert.match(first.command("backup now"), /push disabled/);
  portable = JSON.parse(readFileSync(portablePath, "utf-8"));
  assert.equal(portable.revision, 2);
  assert.equal(portable.sprites[migratedSprite.id].name, "Poofier");
  assert.equal(git(memoryDir, ["rev-list", "--left-right", "--count", "@{u}...HEAD"]), "0\t1");
  assert.match(first.command("backup push safe"), /push policy → safe/);
  assert.match(first.command("backup now"), /portable backup synced/);
  assert.equal(git(memoryDir, ["rev-list", "--left-right", "--count", "@{u}...HEAD"]), "0\t0");
  disposeFirst();

  const beforeConcurrency = JSON.parse(readFileSync(statePath, "utf-8"));
  const beforeSprite = activeSprite(beforeConcurrency, AGENT_A.id);
  const beforeCraft = beforeSprite.stats.craft;
  const beforeXp = lifetimeXp(beforeSprite);
  const one = makeLetta(AGENT_A);
  const two = makeLetta(AGENT_A);
  const disposeOne = activate(one.letta);
  const disposeTwo = activate(two.letta);
  one.fire("tool_end", { agentId: AGENT_A.id, toolName: "Edit", status: "success" });
  two.fire("tool_end", { agentId: AGENT_A.id, toolName: "Edit", status: "success" });
  disposeOne();
  disposeTwo();
  const afterConcurrency = JSON.parse(readFileSync(statePath, "utf-8"));
  const afterSprite = activeSprite(afterConcurrency, AGENT_A.id);
  assert.equal(afterSprite.stats.craft, beforeCraft + 2);
  assert.equal(lifetimeXp(afterSprite), beforeXp + 4);

  const hatcherOne = makeLetta(AGENT_C, false);
  const hatcherTwo = makeLetta(AGENT_C, false);
  const disposeHatcherOne = activate(hatcherOne.letta);
  const disposeHatcherTwo = activate(hatcherTwo.letta);
  assert.match(hatcherOne.command("hatch cat"), /egg/);
  assert.match(hatcherTwo.command("hatch fox"), /egg/);
  disposeHatcherOne();
  disposeHatcherTwo();
  const afterConcurrentHatch = JSON.parse(readFileSync(statePath, "utf-8"));
  assert.equal(Object.keys(afterConcurrentHatch.collections[AGENT_C.id].sprites).length, 1);

  const beforeBlockedBackup = JSON.parse(readFileSync(portablePath, "utf-8"));
  writeFileSync(join(memoryDir, "unrelated.txt"), "ordinary agent memory work\n");
  git(memoryDir, ["add", "unrelated.txt"]);
  git(memoryDir, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "ordinary memory commit"]);
  const blocked = makeLetta(AGENT_A);
  const disposeBlocked = activate(blocked.letta);
  blocked.command("name BlockedName");
  assert.match(blocked.command("backup now"), /unrelated MemFS commits are waiting to push/);
  portable = JSON.parse(readFileSync(portablePath, "utf-8"));
  assert.equal(portable.revision, beforeBlockedBackup.revision);
  assert.equal(portable.sprites[migratedSprite.id].name, "Poofier");
  disposeBlocked();

  const beforeForce = JSON.parse(readFileSync(statePath, "utf-8"));
  const forceCollection = beforeForce.collections[AGENT_A.id];
  forceCollection.sprites.sprite_extra = {
    ...structuredClone(forceCollection.sprites[forceCollection.activeSpriteId]),
    id: "sprite_extra",
    seed: "extra-seed",
    name: "Extra",
  };
  writeFileSync(statePath, JSON.stringify(beforeForce, null, 2));
  const forced = makeLetta(AGENT_A);
  const disposeForced = activate(forced.letta);
  assert.match(forced.command("backup restore force"), /Poofier restored/);
  disposeForced();
  const afterForce = JSON.parse(readFileSync(statePath, "utf-8"));
  assert.deepEqual(Object.keys(afterForce.collections[AGENT_A.id].sprites), [migratedSprite.id]);

  writeFileSync(statePath, JSON.stringify({ schemaVersion: 2, global: {}, collections: {} }, null, 2));
  const restored = makeLetta(AGENT_B);
  const disposeRestored = activate(restored.letta);
  assert.match(restored.command("status"), /Poofier/);
  disposeRestored();
  const restoredState = JSON.parse(readFileSync(statePath, "utf-8"));
  const restoredSprite = activeSprite(restoredState, AGENT_B.id);
  assert.equal(restoredSprite.id, migratedSprite.id);
  assert.equal(restoredSprite.bornToAgentId, AGENT_A.id);
  assert.equal(restoredState.collections[AGENT_B.id].ownerAgentId, AGENT_B.id);

  const corrupt = JSON.parse(readFileSync(portablePath, "utf-8"));
  corrupt.checksum = "0".repeat(64);
  writeFileSync(portablePath, JSON.stringify(corrupt, null, 2));
  writeFileSync(statePath, JSON.stringify({ schemaVersion: 2, global: {}, collections: {} }, null, 2));
  const rejected = makeLetta(AGENT_C);
  const disposeRejected = activate(rejected.letta);
  assert.match(rejected.command("status"), /no companion yet/);
  disposeRejected();

  console.log("Sprite portable persistence test passed.");
} finally {
  rmSync(root, { recursive: true, force: true });
}

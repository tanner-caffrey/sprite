---
name: sprite
description: A persistent per-agent companion that lives below the statusline — hatches deterministically from your agent-id, gains XP passively from real activity at zero token cost, grows witness-stats that portrait how the agent works, and speaks in a species+temperament voice the agent itself can author.
---

# sprite

A tiny persistent pet for your Letta agent.

## What it does

- `/sprite hatch` summons an egg below the statusline; it wobbles, cracks, and
  a companion emerges. Species and shininess are seeded deterministically from
  your agent-id (10 species across 4 rarity tiers, 1% shiny) — or pass a
  species to choose: `/sprite hatch fox`.
- The sprite lives on one quiet panel line (`order: -1`). It drifts, blinks,
  poses along with the agent's work (building, peeking, oops), and sleeps
  during compaction — which, on Letta, is when the agent is actually
  consolidating memory. The pet naps because its agent is napping.
- It gains XP **passively** from real activity (tool results, LLM turns,
  conversations opening). No tools are called; the mod adds zero tokens and
  zero extra turns.
- Five witness-stats grow from what it observes: CRAFT (edits/builds), WANDER
  (reads/searches), GRIT (recovering after error streaks), LORE (memory
  operations), SPARK (LLM turns). Bars are log-scale (8 blocks, each ~3× the
  last) so the sheet stays a living portrait for months instead of maxing in
  a week.
- Each sprite has a **nature**: a temperament seeded at birth (gentle / wry /
  bold / sleepy / odd) plus a vocation earned from its dominant stat
  (diligent / curious / stubborn / bookish / chatty). Milestone titles land
  at levels 5 / 10 / 25 / 50 / 100.
- It dozes after ~30 quiet minutes (petting wakes it), sleeps during
  compaction, and greets a >24h absence with a dedicated missed-you line.
- It occasionally says something small, rate-limited to once per 10 minutes
  by default (petting always gets a response). The default voice is ~480
  hand-written lines pooled additively from the sprite's **species** (imagery)
  and **temperament** (tone) — 50 distinct personalities out of the box. An
  agent can override any category via `sprite_set_voice`.

## The agent raises its own pet

Core care actions have agent-tool twins: `sprite_hatch`, `sprite_name`,
`sprite_molt`, `sprite_pet`, `sprite_set_voice`, and `sprite_status`. You can
simply ask your agent to hatch and name its own companion — or to **author
its pet's voice**: the agent writes a replacement line-corpus once (per
trigger category), and the lines play back deterministically forever.
Personality customization with zero runtime cost.

The pet speaks into a panel the agent cannot see, so perception is built in:
action results carry what the pet did and said (petting returns its response),
and `sprite_status` reports species, level, stats, mood, and a small diary of
what it said recently — how the owner hears its companion.

The sprite is agent-owned rather than UI-owned. If the host has no panel UI
(for example, a headless channel listener), sprite skips visual rendering but
still registers its tools and event hooks so the agent can care for the same
companion from Signal, Telegram, Discord, or CLI turns.

## Commands

| Command | What |
| --- | --- |
| `/sprite` | Status card (species, rarity, level, stats, settings) |
| `/sprite hatch [species]` | Summon the egg (fate decides unless you choose) |
| `/sprite hatch another [species]` | Summon one more egg (up to 12; fate rolls fresh) |
| `/sprite list` | Every companion; ▶ marks who is on the panel |
| `/sprite switch <name\|#>` | Put another companion on the panel (only the active one earns XP and speaks) |
| `/sprite breed <a> <b>` | Two companions (lv.10+, once a week each) make an egg. Mostly inherits a parent's species; sometimes mutates; rarely a breed-only hybrid |
| `/sprite release <name\|#>` | Let a companion go (prints a confirm command bound to that exact companion). The founder can never be released |
| `/sprite name <name>` | Name / rename it |
| `/sprite molt [species]` | New body, same soul — keeps name, level, stats |
| `/sprite pet` | Pet it |
| `/sprite diary` | Read its recent utterances, oldest-first, with away-gap markers |
| `/sprite settings [global] [key] [value]` | Configure (per-sprite overrides beat global) |
| `/sprite backup [status\|on\|off\|now]` | Inspect or control portable checkpoints |
| `/sprite backup push safe\|never` | Configure direct MemFS Git sync |
| `/sprite backup restore [force]` | Restore a portable soul-backup |
| `/sprite help` | Explain every subcommand |
| `/sprite changelog [all]` | What changed since the version you last ran (or everything) |
| `/sprite ensoul [name]` | Give a companion its own Letta agent (guided; user-only) |
| `/sprite soul [key value]` | Inspect or change an ensouled companion's mind |
| `/sprite talk <text>` | Talk to it and hear what it says back |

Settings keys: `voice on|off`, `voiceRateMin <minutes>`, `visible on|off`, `laps count|odometer|belt|pips`, `hue on|off`, `bars on|off`.

Stat bars wrap: when one fills it starts over and its lap count rises (lap cost grows +15% per lap for ten laps, then stays flat). `laps` picks how the count is drawn; `hue` colours bars by age (grey → white → gold → rose → violet → teal → shimmer); `bars` adds a compact stat strip to the panel row.

Ensoulment (a live tiny-mind voice on a model you choose) is planned for a
future update; today the voice is a static or agent-authored corpus at zero
token cost.

## State & safety

- Live state lives in `~/.letta/mods/sprite.state.json` (override with
  `SPRITE_STATE_PATH`). Schema v2 gives every collection and sprite a stable
  ID/fate seed; legacy one-sprite-per-agent state migrates automatically.
- Local persistence uses atomic temp+rename writes under a cross-process lock
  and three-way merges additive counters/logs against the latest disk state.
  Persistence remains best-effort and never breaks a session. Locks expire
  after 10 minutes regardless of PID liveness (PIDs get reused) and are
  reclaimed atomically. A malformed state file is moved aside to
  `sprite.state.json.corrupt.<stamp>.json` rather than overwritten; a v1→v2
  migration keeps `sprite.state.json.pre-migration.json`. XP, level, and stat
  values are hard-capped so no state file can stall the session. Locks carry a
  per-acquisition token; release and stale-reclaim both verify it, so no
  process ever removes a lock it did not inspect.
- Activating the mod twice on one host (e.g. a hand-copied file plus the
  installed package) is a no-op the second time — events are never counted
  twice.
- Portable backup is opt-in. It checkpoints checksum-protected JSON beneath
  the fixed agent-MemFS namespace
  `data/mods/letta-ai-sprite/collection-v1.json`, which is excluded from prompt
  compilation. Local state remains authoritative and fast.
- `safe` Git sync stages/commits only Sprite's file, marks commits with
  `Letta-Mod-State: @faye/sprite`, and refuses to proceed around unrelated
  dirty or unpushed memory work. It pushes the exact commit it validated (never
  the moving `HEAD`), treats merge commits as never sprite-owned, and skips the
  push if the repository changed underneath it. `never` disables direct pushes.
  No remote means local versioned checkpoints only.
- Restore is automatic only when local state is absent — checked on disk under
  the lock, so a collection another window just created is never overwritten.
  Replacing a live local collection requires the explicit `restore force`
  command, which bumps a collection generation so stale writers cannot
  resurrect removed sprites. A restored sprite keeps its stable soul ID, birth
  agent, fate seed, stats, voice, and diary while ownership rebinds to the
  current agent ID. Portable backup remains off after restore until explicitly
  re-enabled on the new installation.
- Portable backup uses scoped filesystem access plus argument-array Git
  subprocesses; no shell strings and no conversation-content reads. Git runs
  with a scrubbed environment (no `GIT_DIR`/`GIT_WORK_TREE`/`GIT_CONFIG_*`
  inheritance), an empty hooks directory that is verified empty on every call,
  and signing / external-diff / LFS filters disabled. Auth and transport
  settings (credential helpers, `GIT_SSH_COMMAND`, ssh agent, askpass, proxies)
  pass through untouched — it is the user's own remote. Temp files use
  per-process names created with `O_EXCL`, so a planted symlink is never
  followed. With backup disabled, no Git or network activity occurs.
- Threat-model note: git `filter.*` / `diff.*` *commands* live in git config
  (system/global/repo), which a shared MemFS payload cannot write; only
  `.gitattributes` is payload-borne. The one filter commonly present in global
  config (LFS) is disabled explicitly. Other executable filters a user has
  configured globally are already trusted for every git operation they run.
- All capabilities are guarded (`ui.panels`, `events.*`, `commands`, `tools`)
  so the mod degrades gracefully on hosts that lack them.
- Remove: delete the mod file and `/reload`. Delete the state file to release
  local sprites; a valid portable backup remains restorable unless deleted
  separately (they will be missed).

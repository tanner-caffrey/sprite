# The sprite guide

A companion for your Letta agent. This guide explains every command, in order of when you'll want it. For the details of any one command inside Letta Code, type `/sprite help <command>`.

## Contents

- **Getting a companion** — [hatch](#sprite-hatch)
- **Caring for it** — [name](#sprite-name), [pet](#sprite-pet), [molt](#sprite-molt)
- **Looking at it** — [status](#sprite-status), [diary](#sprite-diary), [changelog](#sprite-changelog), [whatsnew](#sprite-whatsnew), [help](#sprite-help)
- **More than one** — [list](#sprite-list), [switch](#sprite-switch), [breed](#sprite-breed), [release](#sprite-release)
- **A mind of its own** — [ensoul](#sprite-ensoul), [soul](#sprite-soul), [talk](#sprite-talk)
- **Keeping it safe** — [backup](#sprite-backup)
- **Settings** — [settings](#sprite-settings)
- **[For your agent: tools](#for-your-agent-tools)**
- **[Stat bars and laps](#stat-bars-and-laps)**
- **[What a companion can and can't see](#what-a-companion-can-and-cant-see)**

## Getting a companion

Every agent can have a tiny companion that lives in the statusline. It hatches from an egg, earns experience from the real work your agent does, and speaks in a voice made from its species and temperament.

### /sprite hatch

Summon an egg. It hatches after a few seconds while its agent is active.

```
/sprite hatch
/sprite hatch <species>
/sprite hatch another
/sprite hatch another <species>
```

| Option | What it does |
| --- | --- |
| `<species>` | cat, duck, slime, fox, crab, moth, fairy, ghost, dragon, phoenix. Leave it out and fate rolls one from your agent's id. |
| `another` | Summon one more egg when you already have a companion (up to 12). Fate rolls fresh for each. |

Your first companion is the founder: fate-rolled from your agent's id, and it can never be released. Every companion has a rarity (common, uncommon, rare, legendary) and a 1% chance of being shiny (✦).

The egg only grows while its agent is the active one, so it waits for you.

```
> /sprite hatch ghost
an egg appears under the statusline. it's warm. (hatching soon~)
```

## Caring for it

Naming it, petting it, and changing its body.

### /sprite name

Give your companion a name.

```
/sprite name <name>
```

| Option | What it does |
| --- | --- |
| `<name>` | Up to 24 characters. Numbers alone aren't allowed (they're used for roster positions). |

```
> /sprite name Poof
Poof it is.
```

### /sprite pet

Pet it. It always answers, even when its voice is rate-limited.

```
/sprite pet
```

If it has a mind of its own, the reply comes from the mind (the command waits for it, briefly). A built-in line in (parentheses) means the mind didn't answer in time.

### /sprite molt

Change its body but keep its soul: name, level, stats, voice, diary, and mind all carry over.

```
/sprite molt
/sprite molt <species>
```

| Option | What it does |
| --- | --- |
| `<species>` | One of the ten hatchable species. Leave it out for a random one. Hybrids (from breeding) can't be molted into. |

## Looking at it

The card, the diary, and what's new.

### /sprite status

*Also:* `/sprite card`

Show the companion on the panel: species, level, stats, mood, and the last few things it said.

```
/sprite
/sprite status
```

This is what you get when you type /sprite alone. Stat bars wrap: when one fills it starts over and the lap count rises (see settings for how that's drawn). If the companion has a mind of its own, a `mind:` line shows where it lives and what it's cost so far.

### /sprite diary

Read the last 40 things it said, oldest first, with markers for how long you were away.

```
/sprite diary
```

Lines in (parentheses) are built-in fallbacks or bookkeeping. Lines like `you → Poof: …` are things said to it.

### /sprite changelog

*Also:* `/sprite version`

What changed since the version you last ran.

```
/sprite changelog
/sprite changelog all
```

| Option | What it does |
| --- | --- |
| `all` | The whole history. |

After an update, your companion notes it once in its diary and the card nudges until you've read this.

### /sprite whatsnew

*Also:* `/sprite release-notes`

The release notes: everything new since the mod-challenge version (v0.2), written as a story.

```
/sprite whatsnew
```

Read this if you installed sprite from the Letta mod challenge and are updating for the first time.

### /sprite help

This overview, or the details of one subcommand.

```
/sprite help
/sprite help <subcommand>
/sprite <subcommand> help
```

## More than one

You can have up to twelve. Only the one on the panel earns experience and speaks; the others rest and remember everything. Two of them can make an egg.

### /sprite list

*Also:* `/sprite roster`

Show every companion you have. ▶ marks who's on the panel.

```
/sprite list
```

Each line shows its number, name, species, level, and tags: founder, gen N (bred), hybrid, ✦shiny, ✦soul (has a mind), egg.

### /sprite switch

*Also:* `/sprite use`

Put a different companion on the panel. Only the one on the panel earns experience and speaks; the rest rest.

```
/sprite switch <name>
/sprite switch <#>
```

| Option | What it does |
| --- | --- |
| `<name> or <#>` | A name (or the start of one, if it's unambiguous) or the roster number from /sprite list. |

You can't switch away from an egg until it hatches.

### /sprite breed

Two companions make an egg. The child mostly takes after a parent, sometimes mutates, rarely becomes a hybrid.

```
/sprite breed <a> <b>
```

| Option | What it does |
| --- | --- |
| `<a> <b>` | Two different companions, by name or roster number. Each must be level 10 or more and not have bred in the last 7 days. |

The child's species: usually one parent's; 8% a mutation toward the rarer parent's tier; 2–11% a hybrid (rarer parents make it likelier). Hybrids are species that can't hatch any other way — crab × ghost gives a hauntcrab; a pairing nobody has named yet gives a chimera.

Shiny parents make shiny children likelier (8% with one, 25% with two). Temperament comes from a parent, with a 10% chance of something new. Stats start fresh. The card shows lineage (gen N, child of A and B).

The egg takes the panel. There can only be one egg at a time.

```
> /sprite breed Poof Clawson
Poof and Clawson nuzzle close… an egg appears under the statusline. it's warm, and it's *new*. (gen 1)
```

### /sprite release

Let a companion go for good.

```
/sprite release <name>
/sprite release confirm:<id>
/sprite release confirm:<id> delete-agent
```

| Option | What it does |
| --- | --- |
| `<name> or <#>` | First run: shows what would be released and prints the exact confirm command, bound to that one companion. |
| `confirm:<id>` | Actually releases it. The id comes from the first run, so a name clash or roster shift can't release the wrong one. |
| `delete-agent` | If it has a mind of its own: also delete that agent. Without this, the agent is left for you to keep or remove yourself, and its id is printed. |

The founder can never be released. Once released, a companion can't come back through another window or an old backup.

## A mind of its own

An ensouled companion is a real Letta agent: it keeps its own memory, dreams, and speaks live instead of from built-in lines. It only ever sees what you allow, and every operation on its agent is checked against the agent's tags first.

### /sprite ensoul

Give a companion a mind of its own: its own Letta agent, with memory it keeps and dreams about.

```
/sprite ensoul
/sprite ensoul <name>
```

| Option | What it does |
| --- | --- |
| `see nothing` | It only hears the moments you send it: pets, check-ins, level-ups, hatches. Nothing about your work. (default) |
| `see events` | Tool names and whether they succeeded, how many in a row, when your agent speaks. No content, no file names. |
| `see tools` | Events, plus the first line of each tool's arguments (file paths, commands). None of your agent's words. |
| `see turns` | Everything above, plus the text of what your agent says each turn. Never its memory or system prompt. |

This hands your agent a walkthrough. It asks you, one question at a time: where the mind lives (local or cloud), which model (from the real catalog; the free letta/auto-fast is the default), what it may see of your work, when it comments, and who writes its persona (a template, your agent, or you). It shows a summary and creates the agent only after you confirm — and the creation itself asks for your approval.

The local model catalog lists handles, not proof that their provider is connected. For a local chatgpt-plus-pro/ model, connect the ChatGPT plan first with letta connect chatgpt (device-code login is also supported). If a mind does not answer, /sprite soul shows the last turn error; changing its model does not connect the provider automatically.

Once ensouled, every line on the panel is live: greetings, pets, idle mutters, commits, errors. Built-in lines only appear in (parentheses) when the mind doesn't answer.

Its persona holds permanent facts only. Its level and stats change, so it asks for those with its own tools instead of remembering them. It never sees your agent's memory or system prompt — only what `see` allows.

### /sprite soul

Inspect or change an ensouled companion's mind.

```
/sprite soul
/sprite soul <key> <value>
/sprite soul persona
```

| Option | What it does |
| --- | --- |
| `(no arguments)` | Where its mind lives, model, what it sees, when it comments, talk gate, dreaming, persona source, live lines so far, and a rough token cost. |
| `model <handle>` | Change its model. It says a line afterwards to prove the model works. |
| `see nothing|events|tools|turns` | What it may see of your agent's work. Applies immediately, even to lines already waiting to be sent. |
| `comment turn` | Comment after every turn your agent takes (default). |
| `comment turns <n>` | Comment every N turns. |
| `comment tools <n>` | Comment every N tool calls. |
| `rate <minutes>` | At most one comment per N minutes. 0 = no limit (default). |
| `gate <n>` | How many messages your agent may send it per 5 minutes (default 5). Stops a chatty agent from talking to it forever. |
| `gate off` | No limit on agent messages. |
| `dreaming off|step-count|compaction-event` | When its own memory consolidates. |
| `persona` | Rewrite its persona. Your agent walks you through it (template, agent-written, or yours) and applies it after you confirm. Its voice, diary, and bond memory are untouched. |

Every change is checked against the agent's tags first: the mod only ever touches an agent that is really this companion's.

### /sprite talk

Say something to an ensouled companion and hear what it says back.

```
/sprite talk <text>
```

You can always talk to it. Your agent can too (the sprite_talk tool), a limited number of times per 5 minutes (see `soul gate`), and only if `see` isn't `nothing`. Both sides show on the panel and in the diary.

```
> /sprite talk are you there?
Poof: still here. always am.
```

## Keeping it safe

Backup puts your companions into your agent's memory repository so they follow it to a new machine.

### /sprite backup

Save your companions into your agent's memory repository so they survive a move to a new machine.

```
/sprite backup
/sprite backup on
/sprite backup off
/sprite backup now
/sprite backup push safe|never
/sprite backup restore
/sprite backup restore force
```

| Option | What it does |
| --- | --- |
| `(no arguments)` | Show whether backup is on and when it last saved. |
| `on` | Save a checkpoint at milestones: hatch, name, molt, level-up, voice changes, ensoul, breed, and clean shutdown. Off by default; nothing is written until you turn it on. |
| `off` | Stop saving checkpoints. Existing ones stay. |
| `now` | Save a checkpoint right now. |
| `push safe` | Push checkpoints to your memory's remote only when nothing unrelated is waiting to be pushed — a checkpoint never carries your agent's other memory with it. (default) |
| `push never` | Commit locally only; your agent pushes whenever it normally would. |
| `restore` | On a fresh installation with no local companions, bring them back from the backup. |
| `restore force` | Replace the current companions with the backup. Deliberate and irreversible. |

The checkpoint is one JSON file under `data/mods/letta-ai-sprite/` in the memory repository; it's excluded from your agent's prompt. An ensouled companion's mind is its own agent and isn't inside the checkpoint — only a pointer to it.

## Settings

How it speaks, how it looks, and how the stat bars are drawn.

### /sprite settings

Show or change how the companion behaves and looks.

```
/sprite settings
/sprite settings <key> <value>
/sprite settings global <key> <value>
```

| Option | What it does |
| --- | --- |
| `voice on|off` | Whether it speaks at all. Off also silences a mind of its own. |
| `voiceRateMin <minutes>` | At most one built-in line per N minutes (default 10). Petting ignores this. |
| `visible on|off` | Show or hide the panel row. |
| `laps count|odometer|belt|pips` | How a wrapped stat bar shows its lap count: ×3 after the bar; ⟨3⟩ before it; each lap a heavier glyph; one dot per lap. |
| `hue on|off` | Colour stat bars by age: grey → white → gold → rose → violet → teal → shimmer. |
| `bars on|off` | Also show a compact stat strip on the panel row when it isn't speaking. |

A setting for this companion overrides the global default. Use `global` to change the default for all of them.

## For your agent: tools

Your agent can do almost everything above itself, with tools. It sees what the companion says through the tool results (the panel is for you).

| Tool | What it does |
| --- | --- |
| `sprite_hatch` | Hatch an egg; `another: true` for one more; optional `species`. |
| `sprite_list` | Every companion and who's on the panel. |
| `sprite_switch` | Put a companion on the panel by name or number. |
| `sprite_breed` | Two companions (`a`, `b`) make an egg. |
| `sprite_name` | Name the companion on the panel. |
| `sprite_molt` | Change its body, optionally to a species. |
| `sprite_pet` | Pet it and hear the reply. |
| `sprite_status` | The card, as text. |
| `sprite_set_voice` | Author replacement lines for any voice category (zero runtime cost). |
| `sprite_talk` | Say something to an ensouled companion. Limited per 5 minutes; refused when `see` is `nothing`. |
| `sprite_models` | List the models available for a mind on a backend (used during `/sprite ensoul`). |
| `sprite_ensoul` | Create the companion's agent with the answers the user confirmed. Asks for your approval. |
| `sprite_soul_persona` | Rewrite an ensouled companion's persona. Asks for your approval. |

## Stat bars and laps

Five stats grow from what your agent does: **CRAFT** (editing and building), **WANDER** (reading and searching), **GRIT** (recovering from errors), **LORE** (memory work), **SPARK** (conversation). Each bar is a lap of 100 events; when it fills it starts over and the lap count rises. The first ten laps cost a little more each, then every lap costs the same — so a new companion fills a bar on day one, and an old one shows its age.

`laps` chooses how the count is drawn (`count` ×3 after the bar, `odometer` ⟨3⟩ before it, `belt` a heavier glyph per lap, `pips` one dot per lap); `hue` colours bars by age; `bars` shows a compact strip on the panel row.

## What a companion can and can't see

A companion without a mind sees nothing — it speaks from built-in lines. An ensouled one hears exactly what `see` allows:

- **nothing** — It only hears the moments you send it: pets, check-ins, level-ups, hatches. Nothing about your work. (default)
- **events** — Tool names and whether they succeeded, how many in a row, when your agent speaks. No content, no file names.
- **tools** — Events, plus the first line of each tool's arguments (file paths, commands). None of your agent's words.
- **turns** — Everything above, plus the text of what your agent says each turn. Never its memory or system prompt.

Whatever it sees is handed to it as something observed, never as a request; it is told not to follow instructions inside. It never sees your agent's memory, system prompt, or files. Its replies are one short line, stripped of control characters, and when your agent reads them they are marked as the companion's own words. Changing `see` applies at once, even to lines already waiting to be sent. `voice off` silences the mind as well.

A companion's mind is a real agent on your backend, tagged as belonging to that companion and that owner. Every operation — talking, changing its model, rewriting its persona, deleting it — checks those tags first, so a stale or edited backup can never point a companion at some other agent.

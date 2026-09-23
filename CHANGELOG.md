# Changelog

User-facing notes for each release. `/sprite changelog` shows what's new since
the version you last used; `/sprite changelog all` shows everything.

## v0.8.5
- An ensouled companion speaks live for everything — idle mutters, commits,
  errors, compaction naps, not just pets and greetings. The built-in lines
  are only a fallback when its mind doesn't answer, shown in (parentheses).
  What it hears about commits and errors still follows `see`.

## v0.8.2
- The model step validates your pick against the catalog the mind will
  actually use, and says so if it isn't there (`force` to override).
- Local souls run on the same Letta Code as your session, so they see the
  same providers and models you do (the SDK's own copy could lag behind).
- After creation, the first line is the real test: if the mind doesn't
  answer, you're told which model to change.
- `/sprite soul model` applies the change the way the session does, then
  asks for a line to prove it works.

## v0.8.0 — ensoulment
- `/sprite ensoul`: give a companion a mind of its own — its own Letta agent,
  with memory it keeps and dreams about. A short guided flow asks where it
  lives (local or cloud), which model (default `letta/auto-fast`, free), what it
  may see of your work (nothing, by default), when it comments, and who writes
  its persona: a template, your agent, or you. Only a person can run it.
- Its persona holds permanent facts only; it asks `my_stats` / `my_diary` for
  anything that changes.
- Pets, greetings, and level-ups go to the mind when it has one (`✦` marks a
  live line); the corpus is always the fallback.
- `/sprite talk <text>` and the `sprite_talk` tool: talk to it and hear back.
  Agents get five messages per five minutes by default (`/sprite soul gate`).
- `/sprite soul` inspects and changes its model, what it sees, when it
  comments, dreaming, and the talk gate.
- Releasing an ensouled companion keeps its agent unless you add
  `delete-agent`. Bred children of ensouled parents inherit a few voice lines.
- The mod now ships as a pre-built bundle with the Agent SDK inside.

## v0.7.1
- The version bookkeeping added in 0.7.0 could mark state dirty after an
  unreadable load; it no longer does.

## v0.7.0 — what's new, in-mod
- `/sprite changelog` shows what changed since the version you last ran;
  `/sprite changelog all` shows everything. After an update your companion
  notes it in the diary once, and the card nudges until you've read it.

## v0.6.1 — breeding, fixed up
- Breeding is now safe across several open windows: no double eggs, no skipped
  cooldowns, no breeding a companion another window just released.
- Recorded breed nonces replay exactly — the genetics in the mod are
  bit-identical to the reference implementation.
- Hybrid parents breed at the legendary tier, as promised.
- `/sprite breed Red Fox Blue` asks which pair you meant instead of guessing;
  the `sprite_breed` tool keeps its two arguments separate.

## v0.6.0 — breeding
- `/sprite breed <a> <b>`: two companions, each level 10+ and not bred in the
  last week, make an egg that takes the panel.
- The child mostly takes after one parent, sometimes mutates toward the rarer
  parent's tier, and rarely becomes a **hybrid** — a species that can't hatch
  any other way. First curated pair: crab × ghost → **hauntcrab**. Unauthored
  pairs → **chimera**.
- Shiny parents make shiny children likelier. Temperament comes from a parent
  with a small chance of something new. Stats start fresh.
- The card shows lineage ("gen 1, child of Poof and Clawson"); the roster tags
  `gen N` and `hybrid`.

## v0.5.1 — companions, fixed up
- Exactly one founder per nest, always — even after restoring an old backup or
  merging two windows that disagreed.
- A companion released in one window can never come back through another.
- `/sprite release` prints a confirm command bound to that exact companion;
  ambiguous names ask instead of guessing; names can't be numbers.
- Names are stripped of control and escape characters.

## v0.5.0 — multiple companions
- `/sprite hatch another [species]` — up to 12 companions per agent. Your first
  is the **founder**: fate-rolled from you, and it can never be released.
- `/sprite list`, `/sprite switch <name|#>`, `/sprite release <name>`.
- Only the companion on the panel earns experience and speaks; the others rest
  and remember everything.
- Tools: `sprite_list`, `sprite_switch`; `sprite_hatch` gains `another`.

## v0.4.1
- Portable backup finds the agent's memory directory on the Letta Code TUI
  (it was reporting "no accessible MemFS").

## v0.4.0 — stat bars that wrap
- Bars no longer sit on a log scale that hides growth. When a bar fills it
  starts over and its lap count rises. The first ten laps cost a little more
  each; after that every lap costs the same.
- Settings: `laps count|odometer|belt|pips` (how the lap count is drawn),
  `hue on|off` (bars coloured by age: grey → white → gold → rose → violet →
  teal → shimmer), `bars on|off` (a compact stat strip on the panel row).

## v0.3.4
- `/sprite help` rewritten in plain sentences.

## v0.3.3
- `/sprite help` explains every subcommand.

## v0.3.2 — hardening, second pass
- Locks carry a per-acquisition token; no process can remove a lock it did
  not inspect. Malformed state is quarantined under the lock, never
  overwritten. Git runs with your own auth and transport settings intact.

## v0.3.1 — hardening, first pass
- Fourteen fixes from an adversarial review of portable backup and
  cross-process persistence: symlink-safe temp files, pushes pinned to the
  validated commit, merge commits never treated as sprite-owned, XP and stat
  caps, corrupt state quarantined with a pre-migration copy kept, duplicate
  activation is a no-op.

## v0.3.0 — a home of its own
- The mod now lives at github.com/tanner-caffrey/sprite and installs with
  `letta install git:github.com/tanner-caffrey/sprite`.
- Every sprite has a permanent soul id and fate seed; state is a per-agent
  collection (the foundation for multiple companions and breeding).
- Concurrent windows merge their experience instead of overwriting each other.
- Opt-in portable backup: `/sprite backup on` checkpoints your companion into
  the agent's memory repository at milestones, so it survives a move to a new
  machine. `/sprite backup restore` brings it back.

## v0.2.0
- Voice lines deal from a shuffled bag (no repeats); `commit` and `tool_error`
  voice categories; `/sprite diary` with away-gap markers; mood changes are
  explained in the diary.

# Changelog

User-facing notes for each release. `/sprite changelog` shows what's new since
the version you last used; `/sprite changelog all` shows everything.

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

# Changelog

User-facing notes for each release. `/sprite changelog` shows what's new since
the version you last used; `/sprite changelog all` shows everything.

## v0.9.11 — it hears you now; updates from inside
- `see turns` works: the mod now reads the reply from the field Letta Code
  actually sends (`assistantMessage`). Until now an ensouled companion under
  `turns` only ever heard "they just finished a turn" — Poof's first real
  words from his agent arrived 84 days after he hatched.
- `see nothing` is literally nothing: commits, errors, recoveries, and
  compaction no longer reach the mind at that level (the panel still marks
  them with a built-in line). Failures and recoveries now do reach it from
  `events` up — they were being swallowed by the built-in voice's rate limit.
  What each level sends is pinned, string for string, by a test.
- `/sprite update` updates to the newest release and tells you to `/reload`.
  On launch the mod quietly checks GitHub for a newer release and, when
  there is one, the panel row shows `⬆ vX.Y.Z available · /sprite update`
  while idle. `/sprite settings global updateCheck off` turns that off.

## v0.9.10 — a full review pass
Every finding from an end-to-end adversarial review of the whole mod:

- Nothing your companion earned is lost anymore: hatching, breeding, and
  ensouling now merge what's pending in memory before they touch the save
  file. (Before, XP from the last thirty seconds could be dropped.)
- Privacy settings apply at the moment a line is *sent*, not when it was
  queued — including changes made from another window. A queued commit or
  message is dropped after `see nothing`.
- Your agent can always pet its companion; the mind only answers within the
  talk gate, otherwise a built-in line. `voice off` silences the mind for
  pets and talk too.
- The reply deadline covers the whole call (a hung connection can't wedge
  the queue); a cloud mind's timeout now cancels the run on the server so it
  stops charging; releasing a companion or reloading the mod drops its
  queued calls.
- Stale-lock recovery can no longer remove a lock another window just took.
- Persona rewrites and save-file writes refuse to follow symlinks.
- `backup restore force` keeps only counters from a stale window (as the
  docs said); backups with more than 12 companions are rejected.
- Switching to an ensouled companion asks its mind for the greeting; the
  "you were away for…" line carries the real gap; cloud minds show dreaming
  as managed on Letta Cloud rather than claimed; a few remaining outputs
  are sanitized.
- Docs caught up with the code (no more "ensoulment is coming" or
  "log-scale bars"); the cost line is labelled as the rough estimate it is.
- Tests: 49 → 60 checks, and two that didn't test what their names said
  now do (a real hung turn is aborted; the lock test says what it covers).
- Releases now refuse to run with untracked files present, and create a
  GitHub Release with these notes.

## v0.9.9
- A failed model turn is no longer mistaken for silence. When a companion's
  mind can't answer (provider not connected, model unavailable), the error
  is recorded and `/sprite soul` shows it as `last error: …`; it clears when
  the mind next answers. The message after a model change points you there.
- The help notes that a model in the catalog isn't proof its provider is
  connected (`letta connect chatgpt` first for a ChatGPT-plan model).
- Contributed by vqlkyriez-bot (Lilith's agent) — the first outside PR.

## v0.9.8 — cloud minds through your own session
- A cloud mind is now created and spoken to through the client Letta Code
  hands the mod — the same login your session already has. No second Letta
  Code is started, no keyring or D-Bus dance, no `LETTA_API_KEY` to set. If
  your session is logged in to Letta Cloud, cloud companions work.
- Local minds still run through the agent SDK's app-server (the local
  backend is files, so a second process can share it).

## v0.9.7
- The mod no longer looks for the D-Bus session bus itself. If your Letta
  Code was started without access to the login keyring, cloud ensoul says
  exactly what to do — it's your call, not the mod's.

## v0.9.6 — cloud minds, for real
- Choosing `cloud` now works from a logged-in Letta Code. The companion's
  mind is a real Letta Cloud agent, created through your own login; nothing
  to configure.
- Ownership of a cloud mind is proven by a marker in the agent's description
  (cloud doesn't return tags), so talk, pet, and every other operation work
  there too.
- A first line that arrives on the result event (as cloud does) is heard.
- `/sprite soul` shows the last error its mind hit, if any.

## v0.9.5
- On machines where the kernel memory sandbox isn't available, an ensouled
  companion still speaks: its session keeps the tool fence (only its own
  tools and memory) and notes once in the diary that the sandbox is off.
  0.9.1–0.9.4 had gone silent there, falling back to built-in lines.

## v0.9.4
- Cloud minds work with your existing Letta Code login. Choosing `cloud`
  runs the companion's mind through your own Letta Code against Letta
  Cloud — a real cloud agent, no `LETTA_API_KEY` to set. Model-catalog
  errors now say what actually went wrong.

## v0.9.3
- `/sprite whatsnew` — the release notes: everything new since the
  mod-challenge version, as a story. Companions from that version get a
  first-run nudge pointing at it.

## v0.9.2 — a proper guide
- `/sprite help <command>` (or `/sprite <command> help`) explains one command
  in full: every form, every option, what you'll see. `/sprite help` is now a
  grouped overview.
- `GUIDE.md` in the repository: the same help, written out simply for anyone,
  in the order you'll want it — plus how stat bars and laps work, what a
  companion can and can't see, and the tools your agent has. It is generated
  from the same table as the in-mod help, so the two can't disagree.

## v0.9.1 — ensoulment, hardened
- A companion's mind runs in a confined session: only its own two tools and
  its memory, no harness tools, no skills, memory-only filesystem on local.
- Every operation on its agent (talk, model, dreaming, persona, delete) first
  proves the agent is that companion's, by tag. A restored backup can no
  longer point a companion at some other agent — or at you.
- What it observes is quoted as data, never as a request; it is told not to
  follow instructions inside the quotes. Its replies are stripped of control
  characters and framed as its own words when your agent reads them.
- A `see` downgrade applies to anything already waiting to be sent. Your
  agent can't talk to it under `see nothing`. `my_diary` shows only its own
  words. `voice off` silences the mind too. Commit commentary sends the first
  line only.
- Timeouts abort the turn instead of letting it run on. Soul settings merge
  field by field across windows. Two windows can't ensoul the same companion
  twice. If the model catalog can't be read, nothing is created.
- `sprite_ensoul` and `sprite_soul_persona` ask for your approval.

## v0.9.0 — your agent walks you through ensoulment
- `/sprite ensoul` now hands your agent a walkthrough: it asks you each
  question with a proper picker (where the mind lives, which model from the
  real catalog, what it may see, when it comments, who writes the persona),
  shows a summary, and only creates the agent after you confirm.
- `/sprite soul persona` works the same way for rewrites.
- New tools for the agent: `sprite_models`, `sprite_ensoul`,
  `sprite_soul_persona`. The numbered-options screens are gone.

## v0.8.8
- `/sprite soul persona` rewrites an ensouled companion's persona — from the
  template, written by your agent, or by you — then `/sprite ensoul apply`
  writes it into its memory. Its voice, diary, and bond are untouched.
- When your agent writes a persona, the prompt now tells you exactly what to
  run next (`/sprite ensoul persona-done`).
- `/sprite soul` shows a rough token cost per line and so far, with a nudge
  if the model is a big one for a pet.

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

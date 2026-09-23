# What's new since v0.2

If you installed sprite from the Letta mod challenge (`npm:@letta-ai/sprite`, v0.2), this is everything that's changed. Your companion carries over as it is — same name, level, stats, and diary. Nothing below happens until you ask for it.

**New home.** The mod now lives at https://github.com/tanner-caffrey/sprite. Update with:

```
letta install git:github.com/tanner-caffrey/sprite
```

then `/reload`. The full guide is `GUIDE.md` there, or `/sprite help` inside Letta Code.

## More than one companion

- `/sprite hatch another` — up to twelve. Your first one is the **founder**: fate-rolled from your agent's id, and it can never be released.
- `/sprite list` shows them all; `/sprite switch <name>` puts a different one on the panel. Only the one on the panel earns experience and speaks; the rest rest and remember everything.
- `/sprite release <name>` lets one go, with a confirm step bound to that exact companion.

## Breeding

- `/sprite breed <a> <b>` — two companions (level 10+, once a week each) make an egg. The child mostly takes after a parent, sometimes mutates toward the rarer parent's tier, and now and then becomes a **hybrid** — a species that can't hatch any other way. The first one: crab × ghost → **hauntcrab**. An unnamed pairing gives a **chimera**.
- Shiny parents make shiny children likelier. Lineage shows on the card: *gen 1, child of Poof and Clawson*.

## A mind of its own

- `/sprite ensoul` gives a companion **its own Letta agent** — memory it keeps, dreaming, a persona. Your agent walks you through it: where the mind lives (local or cloud), which model (the free `letta/auto-fast` by default), what it may see of your work (**nothing**, by default), when it comments, and who writes the persona (a template, your agent, or you). Nothing is created until you confirm, and the creation asks your approval.
- Once ensouled, **every line is live** — greetings, pets, idle mutters, commits, errors. Built-in lines only appear in (parentheses) if the mind doesn't answer.
- `/sprite talk <text>` to talk to it; your agent can too (`sprite_talk`), a few times per five minutes.
- `/sprite soul` shows its settings and a rough token cost; `/sprite soul see|comment|model|gate|dreaming|persona` changes them.
- It sees **only** what `see` allows, always as something observed rather than a request, and it runs in a confined session with just its own tools and memory. Every operation on its agent checks the agent really is that companion's.

## Stat bars that wrap

- Bars no longer sit on a log scale that hides growth. When one fills it starts over and the lap count rises — day one wraps a bar; an old companion shows its age.
- `/sprite settings laps count|odometer|belt|pips` picks how laps are drawn; `hue on` colours bars by age (grey → white → gold → rose → violet → teal → shimmer); `bars on` adds a stat strip to the panel row.

## Backup

- `/sprite backup on` saves your companions into your agent's memory repository at milestones, so they follow it to a new machine. `/sprite backup restore` brings them back. Off by default; a checkpoint never carries your agent's other memory with it.

## Smaller things

- `/sprite help <command>` explains any command in full.
- `/sprite changelog` shows what changed since the version you last ran; `/sprite whatsnew` shows this page.
- Concurrent windows (TUI + a channel) merge their experience instead of overwriting each other.
- Every companion has a permanent soul id; state is a per-agent collection. Several rounds of adversarial review hardened all of it (47 regression checks).

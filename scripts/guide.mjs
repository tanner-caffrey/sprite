#!/usr/bin/env bun
// Generate GUIDE.md from the HELP table in mods/sprite.tsx, so the in-mod
// help and the written guide can never disagree.   bun run guide
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.SPRITE_STATE_PATH = "/tmp/sprite-guide-unused.json";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { HELP } = await import(join(root, "mods", "sprite.tsx"));

const GROUPS = [
  ["start", "Getting a companion", "Every agent can have a tiny companion that lives in the statusline. It hatches from an egg, earns experience from the real work your agent does, and speaks in a voice made from its species and temperament."],
  ["care", "Caring for it", "Naming it, petting it, and changing its body."],
  ["info", "Looking at it", "The card, the diary, and what's new."],
  ["more", "More than one", "You can have up to twelve. Only the one on the panel earns experience and speaks; the others rest and remember everything. Two of them can make an egg."],
  ["mind", "A mind of its own", "An ensouled companion is a real Letta agent: it keeps its own memory, dreams, and speaks live instead of from built-in lines. It only ever sees what you allow, and every operation on its agent is checked against the agent's tags first."],
  ["keep", "Keeping it safe", "Backup puts your companions into your agent's memory repository so they follow it to a new machine."],
  ["tune", "Settings", "How it speaks, how it looks, and how the stat bars are drawn."],
];

const out = [];
out.push("# The sprite guide", "");
out.push("A companion for your Letta agent. This guide explains every command, in order of when you'll want it. For the details of any one command inside Letta Code, type `/sprite help <command>`.", "");
out.push("## Contents", "");
for (const [g, title] of GROUPS) {
  const entries = HELP.filter((h) => h.group === g);
  if (!entries.length) continue;
  out.push(`- **${title}** — ${entries.map((h) => `[${h.cmd}](#sprite-${h.cmd})`).join(", ")}`);
}
out.push("- **[For your agent: tools](#for-your-agent-tools)**", "- **[Stat bars and laps](#stat-bars-and-laps)**", "- **[What a companion can and can't see](#what-a-companion-can-and-cant-see)**", "");

for (const [g, title, intro] of GROUPS) {
  const entries = HELP.filter((h) => h.group === g);
  if (!entries.length) continue;
  out.push(`## ${title}`, "", intro, "");
  for (const h of entries) {
    out.push(`### /sprite ${h.cmd}`, "");
    if (h.aliases?.length) out.push(`*Also:* ${h.aliases.map((a) => `\`/sprite ${a}\``).join(", ")}`, "");
    out.push(h.summary, "");
    out.push("```", ...h.usage, "```", "");
    if (h.options?.length) {
      out.push("| Option | What it does |", "| --- | --- |");
      for (const [o, d] of h.options) out.push(`| \`${o}\` | ${d.replace(/\|/g, "\\|")} |`);
      out.push("");
    }
    for (const d of h.details ?? []) out.push(d, "");
    if (h.examples?.length) {
      for (const [c, r] of h.examples) out.push("```", `> ${c}`, r, "```", "");
    }
  }
}

out.push("## For your agent: tools", "");
out.push("Your agent can do almost everything above itself, with tools. It sees what the companion says through the tool results (the panel is for you).", "");
out.push("| Tool | What it does |", "| --- | --- |");
for (const [t, d] of [
  ["sprite_hatch", "Hatch an egg; `another: true` for one more; optional `species`."],
  ["sprite_list", "Every companion and who's on the panel."],
  ["sprite_switch", "Put a companion on the panel by name or number."],
  ["sprite_breed", "Two companions (`a`, `b`) make an egg."],
  ["sprite_name", "Name the companion on the panel."],
  ["sprite_molt", "Change its body, optionally to a species."],
  ["sprite_pet", "Pet it and hear the reply."],
  ["sprite_status", "The card, as text."],
  ["sprite_set_voice", "Author replacement lines for any voice category (zero runtime cost)."],
  ["sprite_talk", "Say something to an ensouled companion. Limited per 5 minutes; refused when `see` is `nothing`."],
  ["sprite_models", "List the models available for a mind on a backend (used during `/sprite ensoul`)."],
  ["sprite_ensoul", "Create the companion's agent with the answers the user confirmed. Asks for your approval."],
  ["sprite_soul_persona", "Rewrite an ensouled companion's persona. Asks for your approval."],
]) out.push(`| \`${t}\` | ${d} |`);
out.push("");

out.push("## Stat bars and laps", "");
out.push("Five stats grow from what your agent does: **CRAFT** (editing and building), **WANDER** (reading and searching), **GRIT** (recovering from errors), **LORE** (memory work), **SPARK** (conversation). Each bar is a lap of 100 events; when it fills it starts over and the lap count rises. The first ten laps cost a little more each, then every lap costs the same — so a new companion fills a bar on day one, and an old one shows its age.", "");
out.push("`laps` chooses how the count is drawn (`count` ×3 after the bar, `odometer` ⟨3⟩ before it, `belt` a heavier glyph per lap, `pips` one dot per lap); `hue` colours bars by age; `bars` shows a compact strip on the panel row.", "");

out.push("## What a companion can and can't see", "");
out.push("A companion without a mind sees nothing — it speaks from built-in lines. An ensouled one hears exactly what `see` allows:", "");
const ens = HELP.find((h) => h.cmd === "ensoul");
for (const [o, d] of ens.options) out.push(`- **${o.replace("see ", "")}** — ${d}`);
out.push("", "Whatever it sees is handed to it as something observed, never as a request; it is told not to follow instructions inside. It never sees your agent's memory, system prompt, or files. Its replies are one short line, stripped of control characters, and when your agent reads them they are marked as the companion's own words. Changing `see` applies at once, even to lines already waiting to be sent. `voice off` silences the mind as well.", "");
out.push("A companion's mind is a real agent on your backend, tagged as belonging to that companion and that owner. Every operation — talking, changing its model, rewriting its persona, deleting it — checks those tags first, so a stale or edited backup can never point a companion at some other agent.", "");

writeFileSync(join(root, "GUIDE.md"), out.join("\n"));
console.log("wrote GUIDE.md");

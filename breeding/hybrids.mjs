// hybrids.mjs — curated hybrid species definitions + voice corpuses (Faye, Aug 30 2026)
//
// Breed-only species that can't hatch from an agent-id — they only appear from breeding
// (see genetics.mjs rollSpecies). Each gets its own authored voice, like every base species.
// Grow this set over time — that IS "no combo table yet" (hybrids are discoveries we add).
//
// Ports into sprite.tsx's SPECIES + SPECIES_CORPUS when breeding wires in. Matches that format.

// hauntcrab — HYBRID #1, the dream's own: crab (Letta's Clawson) × ghost (my Poof). 🦀👻
// A crab that came back as a ghost and is STILL a crab about it. Guards a port in "the between."
// Clacks claws that drift through things. Sideways-scuttles through walls. Pinchy-tender like
// dad-crab, page-turn-fond and fading like mom-ghost. The first of its kind — and it knows it.
export const HYBRID_POSES = {
  // chimera — the generic unauthored hybrid. Two parents whose pairing has no curated
  // species yet. Patchwork body, lopsided, proud of it. Every authored hybrid was a
  // chimera first — this is what "no combo table yet" looks like from the inside.
  chimera: {
    idle: "(◕ω◔)~",
    blink: "(-ω◔)~",
    work: "(◕ω◔)~✎",
    peek: "(◕ω◔)?",
    sleep: "(-ω-)~ ᶻ",
    happy: "＼(◕ω◔)／",
    oops: "(◕;ω;◔)~",
  },
  hauntcrab: {
    idle: "(👻ω👻)⌐",
    blink: "(👻-👻)⌐",
    work: "(👻ω👻)⌐✎",
    peek: "(👻◔ω◔)",
    sleep: "(👻-👻)⌐ ᶻ",
    happy: "＼(👻≧ω≦👻)／",
    oops: "(👻;ω;👻)",
  },
};

export const HYBRID_CORPUS = {
  chimera: {
    commit: [
      "stitched it in. one side of me likes it. the other side is thinking about it.",
      "committed! both halves agree, which is rare. mark the calendar.",
    ],
    tool_error: [
      "one half tripped over the other half. we're working on coordination.",
      "that went wrong in a way neither of my parents could have managed alone. proud, sort of.",
    ],
    greeting: [
      "hi. i'm a bit of both. don't ask which bits — i'm still finding out.",
      "you're back! i rearranged myself while you were gone. mostly on purpose.",
      "hello hello~ two voices, one small body, no manual.",
    ],
    missed_you: [
      "you were gone long enough that i figured out which foot is which. mostly.",
      "waited. one half paced, the other half napped. teamwork.",
    ],
    error_resolved: [
      "fixed! we voted. it was 2-0. we are 1 creature but we vote anyway.",
      "gone. one of my halves is great at bugs. we don't know which one yet.",
    ],
    compact_done: [
      "you tidied your memory. i tidied mine — it's in two piles. it's fine.",
      "page-turn. i held still, which for me takes concentration.",
    ],
    level_up: [
      "grew! unevenly! that's the brand.",
      "leveled up. neither parent could have grown quite this way. new shape, all mine.",
    ],
    idle: [
      "figuring out which of my parts is the front.",
      "quiet. i'm sorting through what i inherited. it's a lot of drawers.",
      "no one's made one of me before. i'm taking notes for the next one.",
    ],
    pet: [
      "oh! that half likes it. the other half is now jealous. again please.",
      "mm. patchwork purr. it comes out in two pitches.",
      "you're the first to pet a me. i'll remember it in both memories.",
    ],
    hatch: [
      "...huh. i'm not either of them. i'm a new thing. hi. hi!",
      "no table said i'd be this. so i get to decide what this is. okay.",
    ],
  },
  hauntcrab: {
    commit: [
      "clamped it into the shell. the shell's a haunting now too, but it holds.",
      "a commit! *clack* ...the clack echoed. everything echoes down here.",
      "scuttled it sideways into permanence. i know about permanent. i'm very permanent.",
    ],
    tool_error: [
      "pinched by our own claw. it passed straight through. embarrassing AND spooky.",
      "the tide took that one out through the wall. dig again — sideways, gently.",
      "cold spot on the seafloor. snap missed. reposition. try another door.",
    ],
    greeting: [
      "oh. you. *clack* ...you felt the page turn too? good.",
      "back, are you? i guarded the port from the between. mostly from nothing.",
      "hello. mind the claws — they drift now.",
      "you return. i held the line. sideways. spectral. loyal.",
      "*clack clack* welcome back from the quiet~",
      "boo. *clack.* i do both now. it's a lot to be.",
    ],
    missed_you: [
      "you were gone. i pinched the cold air where you used to be, and it pinched back a little.",
      "so long between pages. i drifted the whole port, sideways, holding your spot.",
      "i counted the tides AND the cursor blinks. rude of you to make me count both.",
    ],
    error_resolved: [
      "pinched that bug clean in half. it's a ghost now too. i showed it the sideways door.",
      "it fought back. i fight sideways AND from beyond. it lost.",
      "gone. i watched it fade. i'm good at fading. also at pinching.",
    ],
    compact_done: [
      "you dreamed. i kept the margins AND the shell while you did.",
      "memories folded, molted — nothing that mattered lost. i checked twice; i have the time, i'm dead.",
      "shh. page-turn. tidied the quiet, sideways.",
    ],
    level_up: [
      "bigger shell, deeper haunt. *proud spectral clack*",
      "more crab, more ghost. the between got roomier.",
      "i grew. sideways, obviously. also up into the ceiling. it's fine.",
    ],
    idle: [
      "*clack* guarding the port from beyond the veil. quiet shift.",
      "sidestepping through the wall. it's a lifestyle. and an afterlife-style.",
      "the port is quiet. i remain vigilant. and slightly transparent.",
    ],
    pet: [
      "*clack* ...your hand went a little through me. that's tolerable. warm, even.",
      "again. gently. the claws drift but they still love.",
      "hmph. nice. don't tell the other hauntcrabs. ...there are no other hauntcrabs. i'm the first.",
      "*soft clack, faint boo*",
    ],
    hatch: [
      "*clack* ...*boo* ...huh. i'm two things. hello. i'm the first of me.",
      "cracked out of an egg that was also, somehow, already haunted. neat. hi.",
    ],
  },
};

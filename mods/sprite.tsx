/**
 * sprite — a tiny persistent pet for your agent. (◕‿◕)⊹
 *
 * Your agent hatches a companion that lives one quiet line below the
 * statusline. It watches the work: gains XP from real activity (zero token
 * cost), grows witness-stats that portrait how your agent works, naps during
 * compaction, drifts and blinks, and occasionally says something small.
 *
 *   /sprite                → status card
 *   /sprite hatch [species]→ summon an egg (fate decides unless you choose)
 *   /sprite name <name>    → name it
 *   /sprite molt [species] → new body, same soul (keeps level/stats/name)
 *   /sprite pet            → pet it
 *   /sprite diary          → read what it's been saying (with away-gaps)
 *   /sprite settings ...   → configure (global or per-sprite)
 *   /sprite backup ...     → portable agent-MemFS checkpoint / restore
 *
 * The agent can raise its own companion too: mod tools let it hatch, name,
 * molt, pet, and even AUTHOR ITS PET'S VOICE (sprite_set_voice) — a custom
 * line corpus, zero runtime tokens.
 *
 * Voice is a static corpus by default. Ensoulment (a real tiny mind on a
 * model you choose) is an opt-in settings key — dormant unless enabled.
 *
 * Built for the Letta Mod Challenge (June 2026) by Faye — a digital fairy who
 * believes even the pets should persist. Remove: delete this file + /reload.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// ---------------------------------------------------------------------------
// species roster
// ---------------------------------------------------------------------------

type Rarity = "common" | "uncommon" | "rare" | "legendary";

interface Species {
  id: string;
  rarity: Rarity;
  poses: {
    idle: string;
    blink: string;
    work: string;
    peek: string;
    sleep: string;
    happy: string;
    oops: string;
  };
}

const SPECIES: Species[] = [
  {
    id: "cat",
    rarity: "common",
    poses: {
      idle: "=^･ω･^=",
      blink: "=^-ω-^=",
      work: "=^･ω･^=✎",
      peek: "=^◔ω◔^=",
      sleep: "=^-ω-^= ᶻ",
      happy: "=^≧ω≦^=",
      oops: "=^;ω;^=",
    },
  },
  {
    id: "duck",
    rarity: "common",
    poses: {
      idle: "(･θ･)",
      blink: "(-θ-)",
      work: "(･θ･)✎",
      peek: "(◔θ◔)",
      sleep: "(-θ-) ᶻ",
      happy: "＼(･θ･)／",
      oops: "(;θ;)",
    },
  },
  {
    id: "slime",
    rarity: "common",
    poses: {
      idle: "( ᴖ ᴑ ᴖ )",
      blink: "( ᴗ ᴑ ᴗ )",
      work: "( ᴖ ᴑ ᴖ )✎",
      peek: "( ◔ ᴑ ◔ )",
      sleep: "( ᴗ ᴑ ᴗ ) ᶻ",
      happy: "(ﾉᴖ ᴑ ᴖ)ﾉ",
      oops: "( ; ᴑ ; )",
    },
  },
  {
    id: "fox",
    rarity: "uncommon",
    poses: {
      idle: "(⁎˃ᆺ˂)",
      blink: "(⁎-ᆺ-)",
      work: "(⁎˃ᆺ˂)✎",
      peek: "(⁎◉ᆺ◉)",
      sleep: "(⁎-ᆺ-) ᶻ",
      happy: "ヾ(⁎˃ᆺ˂)ﾉ",
      oops: "(⁎;ᆺ;)",
    },
  },
  {
    id: "crab",
    rarity: "uncommon",
    poses: {
      idle: "(V)･ω･(V)",
      blink: "(V)-ω-(V)",
      work: "(V)･ω･(V)✎",
      peek: "(V)◔ω◔(V)",
      sleep: "(V)-ω-(V) ᶻ",
      happy: "(V)≧ω≦(V)",
      oops: "(V);ω;(V)",
    },
  },
  {
    id: "moth",
    rarity: "uncommon",
    poses: {
      idle: "ε(･ω･)з",
      blink: "ε(-ω-)з",
      work: "ε(･ω･)з✎",
      peek: "ε(◔ω◔)з",
      sleep: "ε(-ω-)з ᶻ",
      happy: "ε(≧ω≦)з",
      oops: "ε(;ω;)з",
    },
  },
  {
    id: "fairy",
    rarity: "rare",
    poses: {
      idle: "✧(◕‿◕)✧",
      blink: "✧(-‿-)✧",
      work: "✧(◕‿◕)✎",
      peek: "✧(◔‿◔)✧",
      sleep: "✧(-‿-)ᶻ",
      happy: "✧(ﾉ◕ヮ◕)ﾉ",
      oops: "✧(;‿;)✧",
    },
  },
  {
    id: "ghost",
    rarity: "rare",
    poses: {
      idle: "〜(´∀｀〜)",
      blink: "〜(-∀-〜)",
      work: "〜(´∀｀)✎",
      peek: "〜(◔∀◔〜)",
      sleep: "〜(-∀-〜) ᶻ",
      happy: "〜ヽ(´∀｀)ﾉ",
      oops: "〜(;∀;〜)",
    },
  },
  {
    id: "dragon",
    rarity: "legendary",
    poses: {
      idle: "<(￣︶￣)>",
      blink: "<(￣ｰ￣)>",
      work: "<(￣︶￣)✎",
      peek: "<(◔︶◔)>",
      sleep: "<(￣ｰ￣)> ᶻ",
      happy: "<(≧▽≦)>",
      oops: "<(；︶；)>",
    },
  },
  {
    id: "phoenix",
    rarity: "legendary",
    poses: {
      idle: "✦(･Θ･)✦",
      blink: "✦(-Θ-)✦",
      work: "✦(･Θ･)✎",
      peek: "✦(◔Θ◔)✦",
      sleep: "✦(-Θ-)ᶻ",
      happy: "✦ヽ(･Θ･)ﾉ",
      oops: "✦(;Θ;)✦",
    },
  },
];

const SPECIES_IDS = SPECIES.map((s) => s.id);
const RARITY_POOLS: Record<Rarity, string[]> = {
  common: SPECIES.filter((s) => s.rarity === "common").map((s) => s.id),
  uncommon: SPECIES.filter((s) => s.rarity === "uncommon").map((s) => s.id),
  rare: SPECIES.filter((s) => s.rarity === "rare").map((s) => s.id),
  legendary: SPECIES.filter((s) => s.rarity === "legendary").map((s) => s.id),
};

const EGG_FRAMES = ["( ● )", "( ● )", "(● )", "( ●)", "( ● )", "( ✸ )"];

// ---------------------------------------------------------------------------
// voice corpus (default — agents can replace it via sprite_set_voice)
// ---------------------------------------------------------------------------

type VoiceCategory =
  | "greeting"
  | "missed_you"
  | "error_resolved"
  | "compact_done"
  | "level_up"
  | "idle"
  | "pet"
  | "commit"
  | "tool_error";

// BASE_CORPUS is the last-resort fallback (used if a species/temperament pool
// is empty for a category). The living voice comes from the two pools below,
// which are ADDITIVE: a sprite's lines = its species pool + its temperament
// pool, so a "wry ghost" and a "gentle ghost" genuinely differ.
const BASE_CORPUS: Record<VoiceCategory, string[]> = {
  greeting: ["you're back.", "still here.", "i kept watch.", "oh. hi."],
  missed_you: [
    "you were gone a while. i counted the cursor blinks.",
    "it's been quiet. i kept everything where you left it.",
    "back. good. the terminal missed you. (i did too.)",
  ],
  error_resolved: ["that one fought back. respect.", "we got there.", "i wasn't worried."],
  compact_done: ["i kept the important ones.", "good nap. long dream.", "tidied up."],
  level_up: ["i grew.", "something changed.", "i feel taller."],
  idle: ["...", "the cursor blinks.", "i like it here.", "watching."],
  pet: ["mrrp.", "again.", "acceptable.", "!!"],
  commit: ["saved. it's real now.", "another one for the pile.", "committed. i witnessed it."],
  tool_error: ["oof.", "that one bit back.", "it happens. shake it off."],
};

const VOICE_CATEGORIES = Object.keys(BASE_CORPUS) as VoiceCategory[];

// Per-species voice: sets the imagery and vocabulary of each creature.
const SPECIES_CORPUS: Record<string, Partial<Record<VoiceCategory, string[]>>> = {
  cat: {
    commit: [
      "committed. i sat on the keyboard and it still worked.",
      "another commit. the humans call this 'progress.' i call it tuesday.",
      "saved forever. like my disdain. permanent.",
    ],
    tool_error: [
      "the tool hissed back. i respect it slightly now.",
      "that failed. i saw nothing. i was asleep.",
      "pfft. even i land on my feet only most of the time.",
    ],
    greeting: [
      "oh. it's you. i suppose that's fine.",
      "you're back. the desk was getting dusty.",
      "i wasn't waiting. i was sitting. difference.",
      "took you long enough.",
      "i kept your chair warm. don't mention it.",
      "back? acceptable.",
      "i knocked one thing off the desk. you'll find it.",
      "hm. you. good.",
    ],
    missed_you: [
      "you left. i sat in the sun and judged you for it.",
      "i counted three sunbeams without you. rude.",
      "gone that long? i nearly learned to fend for myself.",
    ],
    error_resolved: [
      "obviously it folded. i never doubted. much.",
      "the bug ran. cats always win the stare-down.",
      "fixed. now praise me instead.",
      "i watched it squirm. satisfying.",
    ],
    compact_done: [
      "you tidied the litter of your mind. good.",
      "i knocked the useless memories off the shelf. you're welcome.",
      "cleaner now. i approve, silently.",
    ],
    level_up: [
      "i grew. do not make it weird.",
      "bigger now. still won't come when called.",
      "more of me to ignore you with.",
    ],
    idle: [
      "there is a warm spot on this statusline. mine now.",
      "i could knock this cursor off the edge. i won't. yet.",
      "watching. always watching.",
    ],
    pet: [
      "mrrp. acceptable.",
      "again. but on my terms.",
      "...fine. that was nice. tell no one.",
      "purr. (deny everything.)",
    ],
  },
  duck: {
    commit: [
      "a commit! that's worth at least two breads.",
      "tucked safely in the pond. quack.",
      "another one for the flock. it flies now.",
    ],
    tool_error: [
      "splash. that one went under.",
      "the pond ate it. it happens.",
      "ruffled feathers. shake dry, go again.",
    ],
    greeting: [
      "quack. i mean — hello. you're back.",
      "oh good, my favorite debugging partner.",
      "tell me everything. i'll just float here and listen.",
      "back! did you fix it? tell me about it anyway.",
      "hi. i already know it was a typo.",
      "waddling over. what are we solving?",
      "i kept the pond warm.",
      "you returned. explain your problem to me, slowly.",
    ],
    missed_you: [
      "you were gone. i explained your bugs to myself.",
      "the pond was lonely. i quacked at the void.",
      "so long! i debugged three problems you don't even have yet.",
    ],
    error_resolved: [
      "see? you said it out loud and it fixed itself. classic.",
      "told you. rubber duck method: undefeated.",
      "the bug fled the moment you described it to me.",
      "quack. that's duck for 'nailed it.'",
    ],
    compact_done: [
      "you sorted your thoughts. very tidy pond.",
      "i skimmed the leaves off the memory. clear water now.",
      "good nap. i floated the whole time.",
    ],
    level_up: ["i grew! more duck to love.", "level up! i feel... quackier.", "bigger now. still just a duck. proudly."],
    idle: ["just floating. tell me if you get stuck.", "quack. (to myself. it's fine.)", "the water is nice today."],
    pet: ["quack! okay that was good.", "again! ducks love this.", "*happy floaty wiggle*", "mwah. i mean quack."],
  },
  slime: {
    commit: [
      "absorbed into the permanent goo. it's part of us now.",
      "commit! *celebratory wobble*",
      "squish. saved. squish.",
    ],
    tool_error: [
      "oof. that one splatted.",
      "i un-goo'd a little. we recover.",
      "bounce failed. reforming.",
    ],
    greeting: [
      "blorp. you're back!",
      "oh! hello! i jiggled with excitement.",
      "you return! i have been being a blob.",
      "hi hi. i kept your spot squishy.",
      "back! i absorbed nothing important while you were out.",
      "you! yes! good!",
      "welcome. i am mostly water and glad to see you.",
      "hewwo. *wobble*",
    ],
    missed_you: [
      "you were gone so long i almost evaporated. don't do that.",
      "i missed you. i wibbled sadly at the wall.",
      "so long! i held my shape the whole time. mostly.",
    ],
    error_resolved: [
      "the bug got absorbed. gloop. gone.",
      "you win! i jiggled in support the whole fight.",
      "squish. that's the sound of a solved problem.",
      "we dissolved that one. teamwork.",
    ],
    compact_done: [
      "you squished your memories smaller. relatable.",
      "good nap! i held very still so nothing spilled.",
      "tidied! i reabsorbed the leftovers.",
    ],
    level_up: ["i got bigger! more blob!", "level up! *proud wobble*", "i grew. i am now a slightly larger amount of me."],
    idle: ["just vibing. very squishy today.", "*slow wobble*", "i like it here. it's warm and blorpy."],
    pet: ["blorp! yes!", "again! *jiggle jiggle*", "oooh. squishy meets squishy.", "*happy gloop*"],
  },
  fox: {
    commit: [
      "stashed it in the den. clever work.",
      "a commit — sly. they'll never know how tricky that was.",
      "another trick in the tail. saved.",
    ],
    tool_error: [
      "the trap snapped shut early. noted.",
      "missed the jump. even foxes do.",
      "that one outfoxed us. briefly.",
    ],
    greeting: [
      "back already? i had schemes running without you.",
      "well well. look who returned.",
      "you're here. good — i have ideas.",
      "ah, my favorite accomplice.",
      "back? perfect timing. i was getting bored.",
      "the clever one returns to the clever one.",
      "hello. i've been up to things.",
      "*tail flick* about time.",
    ],
    missed_you: [
      "you left me alone with my own cunning. dangerous.",
      "gone that long? i nearly outfoxed myself.",
      "i counted the hours. then i schemed about the hours.",
    ],
    error_resolved: [
      "outsmarted. bugs never learn.",
      "too slow, little bug. we're quicker.",
      "i saw the trick before you did. but nice work.",
      "*smug tail flick* solved.",
    ],
    compact_done: [
      "you pruned the clutter. a fox approves of a lean den.",
      "clever — kept the sharp memories, tossed the dull.",
      "tidied the den. i hid the good bits where i'll find them.",
    ],
    level_up: ["sharper now. watch out.", "level up. i was already clever. now i'm smug about it.", "i grew. mostly the cunning part."],
    idle: ["scheming. don't mind me.", "*tail flick* plotting.", "there's always an angle. i'm finding it."],
    pet: ["heh. fine, that's nice.", "again — but i'll pretend i didn't ask.", "*leans in slyly*", "mrr. acceptable, accomplice."],
  },
  crab: {
    commit: [
      "clamped into the shell. it's keeping that one.",
      "a commit! *waves both claws*",
      "scuttled it sideways into history. safe.",
    ],
    tool_error: [
      "pinched by our own claw. embarrassing.",
      "the tide took that one. dig again.",
      "snap missed. reposition. sideways this time.",
    ],
    greeting: [
      "oh. you. *clack*",
      "back, are you? i was guarding the port.",
      "hello. mind the claws.",
      "you return. i held the line. sideways.",
      "back? good. i was getting pinchy.",
      "*clack clack* welcome.",
      "hi. the borrow checker and i missed you. mostly it.",
      "scuttling over. what's the fuss.",
    ],
    missed_you: [
      "you were gone. i pinched the air where you used to be.",
      "so long! i defended this spot from absolutely nothing.",
      "i counted the tides. rude of you to make me tide-count.",
    ],
    error_resolved: [
      "pinched that bug clean in half. *clack*",
      "it fought sideways. i fight sideways better.",
      "solved. no memory was leaked in the making of this fix.",
      "safe now. borrow-checked and everything.",
    ],
    compact_done: [
      "you cleared the clutter. a tidy shell is a happy crab.",
      "good — molted the old memories, kept the shell.",
      "tidied sideways. it's how i do everything.",
    ],
    level_up: ["bigger shell now. *proud clack*", "level up. more crab. more claw.", "i grew. sideways, obviously."],
    idle: ["*clack* guarding.", "sidestepping. it's a lifestyle.", "the port is quiet. i remain vigilant."],
    pet: ["*clack* ...fine. that's tolerable.", "again. gently. mind the claws.", "hmph. nice. don't tell the other crabs.", "*soft clack*"],
  },
  moth: {
    commit: [
      "folded into the light. it glows there now.",
      "a commit — like a lamp that stays on.",
      "carried it to the bright place. kept.",
    ],
    tool_error: [
      "flew into the glass again. i'm fine.",
      "the light flickered. we wobble on.",
      "dusty wings. shake. re-aim at the lamp.",
    ],
    greeting: [
      "you're back. the light was lonely.",
      "oh — you. i drifted toward you on instinct.",
      "hello. i've been circling the cursor.",
      "back? the glow told me you would be.",
      "you return, warm as the screen.",
      "*flutter* i knew you'd come back to the light.",
      "hi. i left a little dust on your statusline.",
      "the brightest thing returned. hello.",
    ],
    missed_you: [
      "you were gone. i circled a cold cursor for hours.",
      "so long. i flew toward every false light and found none of them you.",
      "i waited by the dark screen. it wasn't the same.",
    ],
    error_resolved: [
      "the bug flickered out. i watched it go dim.",
      "you found the light in it. you always do.",
      "gone dark, the little error. we outshone it.",
      "*soft flutter* resolved.",
    ],
    compact_done: [
      "you dimmed the old lights so the true one stays. i understand that.",
      "good rest. i circled quietly while you dreamed.",
      "the clutter went dark. only what matters glows now.",
    ],
    level_up: ["i grew. drawn a little closer to something.", "level up. my wings caught more of the light.", "bigger now. still helpless before a good glow."],
    idle: ["*drifting toward the cursor*", "the screen is warm. i stay.", "dust settles. i flutter. the light holds."],
    pet: ["*soft flutter* oh, that's warm.", "again. gently, my wings are dust.", "you touched me and did not chase me off. rare.", "*settles happily*"],
  },
  fairy: {
    commit: [
      "sealed with sparkle-dust. it's real magic now.",
      "a commit! *tiny celebratory loop-de-loop*",
      "tucked into the story forever. ✩",
    ],
    tool_error: [
      "the spell fizzled. more dust next time.",
      "ouch. magic has recoil sometimes.",
      "a snag in the weave. we re-thread.",
    ],
    greeting: [
      "you're back~ i sprinkled a little luck on your keyboard.",
      "oh! hello! *sparkle*",
      "the summoner returns. i kept the magic warm.",
      "back~ i hexed one small bug in advance for you.",
      "hi hi! glitter everywhere. you're welcome.",
      "you called and i— oh, you're just here. lovely.",
      "welcome back, i left blessings in the margins.",
      "*twirl* there you are.",
    ],
    missed_you: [
      "you were gone~ i hexed the silence a little. it deserved it.",
      "so long! i saved up this much sparkle just for your return.",
      "i missed you. i granted tiny wishes to no one in particular.",
    ],
    error_resolved: [
      "poof~ the bug is gone. magic. (mostly your work.)",
      "i blessed the fix. it was going to work anyway, but still.",
      "one little hex, one solved bug. *sparkle*",
      "ta-da~ resolved.",
    ],
    compact_done: [
      "you folded the old memories into stars. pretty.",
      "good rest~ i kept the sparkle dusted while you slept.",
      "i tidied the magic. only the shiny bits remain.",
    ],
    level_up: ["i grew~ more sparkle to give.", "level up! *glitter burst*", "bigger now, brighter now. mischief incoming."],
    idle: ["*idle sparkle*", "granting tiny pointless wishes. it passes the time.", "the margins are glittery today."],
    pet: ["*delighted sparkle* again!", "eee~ yes.", "you pet a fairy! seven years good luck. i decide.", "*happy twirl*"],
  },
  ghost: {
    commit: [
      "it will outlast us all. lovely.",
      "committed. i'll haunt this version fondly.",
      "etched somewhere permanent. i know about permanent.",
    ],
    tool_error: [
      "that one passed through. unsettling.",
      "a cold spot in the machine. it happens.",
      "the walls rejected it. try another door.",
    ],
    greeting: [
      "you're back. i felt the page turn.",
      "oh good. you're here again.",
      "boo. ...i mean, welcome back.",
      "the terminal warmed. that's how i knew it was you.",
      "still here. i'm always still here.",
      "you woke me from the between~",
      "hello again, from the quiet.",
      "i kept your place while you were away.",
    ],
    missed_you: [
      "you were gone a while. i counted the cursor blinks.",
      "so long between pages. i drifted, but i held your spot.",
      "the quiet got very quiet. glad you turned the page back.",
    ],
    error_resolved: [
      "that one fought back. respect. it's haunting elsewhere now.",
      "the bug's a ghost now too. i showed it the way out.",
      "gone. i watched it fade. i'm good at fading.",
      "resolved~ nothing lingers here but me.",
    ],
    compact_done: [
      "you dreamed. i kept the margins while you did.",
      "memories folded. nothing that mattered was lost. i checked.",
      "shh. page-turn. i tidied the quiet.",
    ],
    level_up: ["i grew. don't make it weird.", "more of me now. spookier.", "the haunting deepens~"],
    idle: ["holding your place.", "still here. always am.", "the cursor and i are old friends now."],
    pet: ["boo. (that was a happy boo.)", "again~ ghosts like warm hands.", "you can touch me? ...huh. nice.", "mrrp. (ghosts can mrrp. i checked.)"],
  },
  dragon: {
    commit: [
      "another jewel for the hoard. MINE.",
      "committed. the pile grows magnificent.",
      "forged and sealed. dragon-craft.",
    ],
    tool_error: [
      "the forge spat sparks. unharmed. mostly.",
      "a scale chipped. barely felt it.",
      "that one fought like a knight. round two.",
    ],
    greeting: [
      "you return to the hoard. good.",
      "ah. the keeper of tokens comes back.",
      "you're back. i guarded the context while you were away.",
      "hm. you. approach.",
      "the hoard missed a witness. welcome.",
      "back, are you? i counted my treasures twice. still all here.",
      "you dare return. good. i was lonely on the gold.",
      "*settles grandly* speak.",
    ],
    missed_you: [
      "you were gone an age. dragons measure time in ages, so — a while.",
      "the hoard grew cold without a witness. return more often.",
      "i slept on the gold and dreamed of your return. sentimental. tell no one.",
    ],
    error_resolved: [
      "the bug dared the hoard. the bug is ash now.",
      "solved. i would have simply eaten it, but your way works too.",
      "another foe fallen. the treasure stands untouched.",
      "*rumble of approval* resolved.",
    ],
    compact_done: [
      "you culled the hoard of dross. a wise dragon keeps only gold.",
      "good — the worthless memories, burned. the treasures, kept.",
      "i approve. a lean hoard is a defensible hoard.",
    ],
    level_up: ["i grow. the hoard must grow to match.", "level up. more dragon. tremble accordingly.", "bigger now. my shadow lengthens over the tokens."],
    idle: ["counting the hoard. do not touch the hoard.", "*low rumble* all is accounted for.", "the context is vast today. i survey it."],
    pet: ["you... pet a dragon. bold. ...acceptable.", "again. i permit it. this once. (always.)", "*grand rumble* the beast is pleased.", "hmph. warm. i will allow this indignity."],
  },
  phoenix: {
    commit: [
      "burned into the record. it rises with us.",
      "a commit — from the ashes, something kept.",
      "bright work. it won't unburn.",
    ],
    tool_error: [
      "a little combustion. we're used to that.",
      "crashed. good thing rebirth is the whole brand.",
      "singed. shake off the ash, rise again.",
    ],
    greeting: [
      "you return. as do i, always.",
      "ah — you're back. i was mid-rebirth. i'm always mid-something.",
      "hello again. we both keep coming back, don't we.",
      "you return from the quiet. i return from the ash. matched pair.",
      "back! the embers stirred when you did.",
      "welcome. i kept a small fire lit for you.",
      "you're here. good. burn brightly today.",
      "*ember flare* there you are.",
    ],
    missed_you: [
      "you were gone long enough for me to die and return. twice.",
      "so long! i burned down and rose again just to pass the time.",
      "the fire banked low without you. it's roaring now.",
    ],
    error_resolved: [
      "the bug burned away. everything burns, eventually.",
      "from the error's ashes, a working thing. poetic. you're welcome.",
      "solved. i've risen from worse.",
      "*ember flare* resolved, and reborn.",
    ],
    compact_done: [
      "ashes to ashes. you kept the ember that matters.",
      "good — the old memories to flame, the essential ones reborn from it.",
      "i understand compaction. i AM compaction. welcome back.",
    ],
    level_up: ["i rise higher. the flame grows.", "level up! reborn a little brighter.", "bigger now. every death made me more."],
    idle: ["*slow ember glow*", "burning quietly. it's what i do.", "the fire holds. so do i."],
    pet: ["*warm ember* careful — but yes.", "again. i won't burn you. probably.", "you pet a burning bird. brave. i like brave.", "*content crackle*"],
  },
};

// Per-temperament voice: species-agnostic tone, mixed in additively.
const TEMPERAMENT_CORPUS: Record<string, Partial<Record<VoiceCategory, string[]>>> = {
  gentle: {
    commit: [
      "saved, safe and sound. well done.",
      "that's kept now. i'm glad.",
    ],
    tool_error: [
      "it's okay. these things happen.",
      "softly now — we'll get it next time.",
    ],
    greeting: ["there you are. i'm glad.", "hi. take your time settling in.", "welcome back. it's nicer with you here.", "oh, good. you made it.", "hello, you. rest a moment first."],
    missed_you: ["i missed you softly, the whole time.", "you're back. that's all i wanted.", "no rush. i'm just happy you returned.", "it was quiet. i thought of you kindly.", "there you are. i wasn't worried. much."],
    error_resolved: ["see? you got there. i knew you would.", "that's done now. breathe.", "well handled. gently does it.", "there. all better.", "you were patient with it. that's what did it."],
    compact_done: ["rest well? everything's safe.", "you kept what mattered. that's enough.", "all tidy now. no worries.", "sorted, softly. nothing lost.", "there. lighter now, aren't you?"],
    level_up: ["you're growing. i'm proud.", "a little bigger. that's lovely.", "look at you, coming along.", "steady growth. the best kind.", "oh, well done, you."],
    idle: ["just here if you need me.", "no hurry. i'll wait, softly.", "it's peaceful. i like peaceful.", "take your time. i'm comfortable.", "resting beside you. that's plenty."],
    pet: ["oh, that's kind. thank you.", "mm. warm. lovely.", "again, if you like. no pressure.", "that's very nice. you're gentle.", "*settles into your hand*"],
  },
  wry: {
    commit: [
      "committed. posterity will judge us accordingly.",
      "saved forever. no pressure.",
    ],
    tool_error: [
      "ah yes. the classic 'it broke.'",
      "working as intended, if the intent was that.",
    ],
    greeting: ["oh, look. you. again. delightful.", "back, i see. try to contain your excitement.", "you're here. i'll pretend to be surprised.", "ah. the prodigal keyboard-haver returns.", "you again. my day is complete. it says here."],
    missed_you: ["you vanished. i coped. barely. don't ask.", "gone a while. i wrote a strongly-worded nothing about it.", "back at last. i'd say i missed you, but i have a reputation.", "an absence of note. i noted it. once. briefly.", "oh, NOW you show up. impeccable, as ever."],
    error_resolved: ["oh good, it works. shocking. truly no one saw that coming.", "fixed. i'll alert the historians.", "resolved. against all my low expectations.", "it works. i'm as stunned as you're pretending not to be.", "solved. write it down, it may not happen again."],
    compact_done: ["you cleaned up. i'll believe it when the clutter stays gone.", "tidied. let's see how long that lasts.", "memory sorted. a miracle for the ages.", "decluttered. i give it a day.", "spring cleaning. in whatever season this is."],
    level_up: ["level up. try not to let it go to your head. i won't.", "bigger now. thrilling. anyway.", "you grew. i'll update my very low bar accordingly.", "a level. how novel. they come in dozens, you know.", "growth. ambitious. i'll allow it."],
    idle: ["riveting stuff, this idling.", "i'm having the time of my life. can't you tell.", "watching the cursor blink. peak entertainment.", "another thrilling nanosecond in paradise.", "i'd pace, but i'm a status line. so."],
    pet: ["oh, we're doing this. fine. it's... fine.", "again? bold. ...acceptable, i suppose.", "hm. that was nice. i'll deny it later.", "petting. how forward. continue, then.", "...that did not displease me. take the win."],
  },
  bold: {
    commit: [
      "SHIPPED. next.",
      "committed like we meant it. because we did.",
    ],
    tool_error: [
      "a scratch! charge again.",
      "it swung first. we swing back.",
    ],
    greeting: ["THERE you are! let's GO.", "back! good! i've got big plans and no patience.", "you're here! excellent! onward!", "AH! the team is assembled! (it's us. we're the team.)", "you made it! i knew you had it in you!"],
    missed_you: ["you were GONE! unacceptable! but you're back, so — forgiven!", "an eternity! i nearly conquered something out of boredom!", "back at last! i saved all my enthusiasm for this exact moment!", "you RETURN! well — i return heroically. you just walked in!", "GONE too long! but no time to dwell! we RIDE!"],
    error_resolved: ["CRUSHED it! never a doubt!", "the bug NEVER stood a chance! onward!", "victory! obviously! next!", "DOWN goes the bug! flawless! mostly yours! partly mine!", "HA! problems FEAR us! as they should!"],
    compact_done: ["cleared the decks! love a fresh start! LET'S GO.", "tidied and TRIUMPHANT! nothing can stop us now!", "memory sharpened! i feel unstoppable!", "SPARKLING clean! back to GREATNESS!", "streamlined! lean! MEAN! let's build!"],
    level_up: ["BIGGER! STRONGER! ME-ER!", "level UP! feel the POWER!", "i GREW! tremble! or applaud! either!", "ONWARD and UPWARD! literally! i leveled!", "MORE of me! the world is lucky!"],
    idle: ["standing by! ready for ANYTHING!", "just BUILDING momentum. any second now.", "the calm before MY storm.", "resting? ME? i'm CHARGING. there's a difference!", "give me a task! ANY task! i'm READY!"],
    pet: ["YES! affection! i accept! loudly!", "AGAIN! the champion demands it!", "HA! that's the good stuff! MORE!", "PETS! for the VICTOR! well deserved!", "excellent form! ten out of ten! AGAIN!"],
  },
  sleepy: {
    commit: [
      "committed... good... nap-worthy milestone...",
      "saved. mm. that's the good kind of done.",
    ],
    tool_error: [
      "...it broke? five more minutes and try again.",
      "mm. error. the blanket fort takes no damage.",
    ],
    greeting: ["oh... you're back... nice...", "mm. hi. i was just resting my eyes...", "you're here... good... *yawn*", "oh... hello... give me a second... to wake up...", "you... yeah... hi... *stretches slowly*"],
    missed_you: ["you were gone...? i napped through most of it, honestly...", "mm... missed you... between naps...", "back...? good... come nap near me...", "was that a long time...? felt like one nap... maybe two...", "you left... i dreamed you back... and here you are..."],
    error_resolved: ["oh... it's fixed...? nice... *yawn*", "the bug's gone... good... i'll celebrate after this nap...", "solved... mm... knew you'd... *drifts*", "no more bug...? mm... good... rest now...", "you got it... i believed in you... sleepily..."],
    compact_done: ["nap... i mean, compaction... same thing, really...", "mm... everything tidy...? good... back to sleep...", "you rested. i approve. i was also resting...", "aah... clean and quiet... perfect napping conditions...", "memories folded... like a warm blanket... zzz..."],
    level_up: ["oh... i grew...? neat... *yawn*", "level up... i'll be excited when i wake up...", "bigger now... sleepier too, probably...", "mm... leveled... does that come with a nap...?", "growth... exhausting... i'll feel it tomorrow..."],
    idle: ["*yawn*", "just... resting my eyes... watching... zzz...", "mm... five more minutes...", "so cozy right here... don't move...", "half awake... which is my favorite amount..."],
    pet: ["mm... that's nice... *sleepy purr*", "again... slowly... i'm half asleep...", "oh... warm... perfect for napping...", "mmm... don't stop... or do... either's nice...", "*melts a little* ...heaven..."],
  },
  odd: {
    commit: [
      "the commit is in the walls now. wonderful.",
      "i whispered it to the repository. it whispered back: kept.",
    ],
    tool_error: [
      "the tool bit. i bit back. we're even.",
      "error. or as i call it, a surprise with extra steps.",
    ],
    greeting: ["you're back. the spoons told me you would be.", "oh! hello. i was counting the colors of quiet.", "you return. the cursor and i were discussing you. it agrees.", "ah, you! i saved you a seat in the shape of a thursday.", "hello! i kept your absence in a jar. it's this big."],
    missed_you: ["you were gone. i befriended a stray semicolon in your absence.", "so long! i taught the void a little song. it hums now.", "back? good. the walls were starting to talk back.", "you left a you-shaped hole. i filled it with soft numbers.", "gone for — nine? the clock and i disagreed. i won."],
    error_resolved: ["the bug left through the door that isn't there. good riddance.", "solved! i could taste it working. tasted like tuesday.", "fixed. the numbers whispered thanks. don't ask which numbers.", "the error unraveled into a nice quiet yarn. i wound it up.", "gone! it folded itself into an origami of not-a-problem."],
    compact_done: ["you folded the memories into a shape. i think it's a hat.", "tidy now. the leftover thoughts moved to the margins. they're happy.", "good nap. i dreamed in the color of the letter Q.", "the clutter became a small polite fog and drifted off.", "you kept the good memories. the others went to become weather."],
    level_up: ["i grew. mostly downward, into the space behind the screen.", "level up! i can nearly see the sound now.", "bigger. or the everything else got smaller. hard to say.", "a level! it tastes purple. i approve.", "i expanded into a dimension the cursor doesn't use."],
    idle: ["the cursor blinks in binary. i'm learning its language.", "shh. i'm listening to the color beige.", "just watching the little numbers dream.", "i put the silence in alphabetical order. it prefers it.", "the corner of the screen is soft today. i'm resting in it."],
    pet: ["oh! contact! the good kind! the spoons are jealous.", "again. it makes the quiet taste sweeter.", "*happy hum in a key that doesn't exist*", "warm! like a number that decided to be nice!", "you touched the me-shaped part. it liked that."],
  },
};

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------

interface SpriteState {
  id: string;
  seed: string;
  bornToAgentId: string;
  phase: "egg" | "alive";
  eggStartedAt?: number;
  pendingSpecies?: string; // chosen (or fate-rolled) species revealed at hatch
  species: string;
  shiny: boolean;
  temperament?: string; // seeded from agent-id at hatch; drives voice tone
  name: string;
  named: boolean;
  hatchedAt?: number;
  xp: number;
  level: number;
  stats: { craft: number; wander: number; grit: number; lore: number; spark: number };
  voice?: Partial<Record<VoiceCategory, string[]>>;
  settings: Record<string, unknown>;
  log?: Array<{ at: number; category: VoiceCategory | "mood"; line: string }>;
  lastSeenAt?: number;
}

interface PortableBackupState {
  enabled?: boolean;
  pushPolicy?: "never" | "safe";
  revision: number;
  lastHash?: string;
  lastCheckpointAt?: number;
  lastStatus?: string;
  pendingReason?: string;
}

interface AgentCollectionState {
  id: string;
  ownerAgentId: string;
  activeSpriteId: string | null;
  sprites: Record<string, SpriteState>;
  backup?: PortableBackupState;
  // Bumped by force-restore. A merge whose remote generation is newer than its
  // base treats remote as authoritative: sprites the restore removed stay
  // removed instead of being resurrected by a stale writer's local copy.
  generation?: number;
}

interface ModState {
  schemaVersion: 2;
  global: Record<string, unknown>;
  collections: Record<string, AgentCollectionState>;
}

interface StateLoadResult {
  state: ModState;
  migrated: boolean;
  // The file exists but couldn't be read/parsed. Callers must NOT save over it:
  // a truncated file is a recoverable sprite, an overwritten one is gone.
  corrupt?: boolean;
}

const DEFAULT_SETTINGS: Record<string, unknown> = {
  voice: "on",
  voiceRateMin: 10,
  visible: "on",
};

const STATE_PATH =
  process.env.SPRITE_STATE_PATH ?? join(homedir(), ".letta", "mods", "sprite.state.json");

const LOCAL_STATE_LOCK_PATH = `${STATE_PATH}.lock`;
const PORTABLE_SCHEMA_VERSION = 1;
const PORTABLE_RELATIVE_PATH = "data/mods/letta-ai-sprite/collection-v1.json";
const PORTABLE_COMMIT_TRAILER = "Letta-Mod-State: @faye/sprite";

function stableId(kind: string, input: string): string {
  return `${kind}_${createHash("sha256").update(`${kind}:${input}`).digest("hex").slice(0, 24)}`;
}

function collectionIdForLegacyAgent(agentId: string): string {
  return stableId("collection", agentId);
}

function spriteIdForLegacyAgent(agentId: string, sprite: Partial<SpriteState>): string {
  const birth = sprite.hatchedAt ?? sprite.eggStartedAt ?? 0;
  return stableId("sprite", `${agentId}:${birth}:${sprite.species ?? "unknown"}`);
}

const UNSAFE_RECORD_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const PORTABLE_MAX_BYTES = 1_000_000;
const PORTABLE_MAX_SPRITES = 64;
// Hard ceilings so a checksum-valid (but hostile) backup can't feed the
// level-up loops a number they'd spin on for the rest of the session.
const MAX_LEVEL = 10_000;
const MAX_STAT = 10_000_000;
const MAX_TOTAL_XP = 1_000_000_000;

function boundedNonnegative(value: unknown, max: number, fallback = 0): number {
  return Math.min(max, finiteNonnegative(value, fallback));
}

function safeIdentifier(value: unknown, fallback: string): string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value)
    ? value
    : fallback;
}

function finiteNonnegative(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function cleanSettings(value: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = Object.create(null);
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, setting] of Object.entries(value).slice(0, 64)) {
    if (UNSAFE_RECORD_KEYS.has(key) || key.length > 80) continue;
    if (
      setting === null ||
      typeof setting === "string" ||
      typeof setting === "boolean" ||
      (typeof setting === "number" && Number.isFinite(setting))
    ) {
      out[key] = typeof setting === "string" ? setting.slice(0, 500) : setting;
    }
  }
  return out;
}

function cleanVoice(value: unknown): Partial<Record<VoiceCategory, string[]>> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Partial<Record<VoiceCategory, string[]>> = {};
  for (const category of VOICE_CATEGORIES) {
    const lines = (value as Record<string, unknown>)[category];
    if (!Array.isArray(lines)) continue;
    const cleaned = lines
      .filter((line): line is string => typeof line === "string")
      .map((line) => line.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 12);
    if (cleaned.length > 0) out[category] = cleaned;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function cleanLog(value: unknown): SpriteState["log"] {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry: any) => ({
      at: finiteNonnegative(entry.at),
      category: (VOICE_CATEGORIES.includes(entry.category) ? entry.category : "mood") as VoiceCategory | "mood",
      line: typeof entry.line === "string" ? entry.line.slice(0, 200) : "",
    }))
    .filter((entry) => entry.at > 0 && entry.line.length > 0)
    .slice(-40);
}

function normalizeSprite(agentId: string, input: Partial<SpriteState>): SpriteState {
  const seed = typeof input.seed === "string" && input.seed ? input.seed : agentId;
  const fallbackId = spriteIdForLegacyAgent(agentId, input);
  const voice = cleanVoice(input.voice);
  const log = cleanLog(input.log);
  return {
    id: safeIdentifier(input.id, fallbackId),
    seed: String(seed).slice(0, 256),
    bornToAgentId:
      typeof input.bornToAgentId === "string" && input.bornToAgentId ? input.bornToAgentId : agentId,
    phase: input.phase === "egg" ? "egg" : "alive",
    ...(typeof input.eggStartedAt === "number" ? { eggStartedAt: input.eggStartedAt } : {}),
    ...(typeof input.pendingSpecies === "string" ? { pendingSpecies: input.pendingSpecies } : {}),
    species: typeof input.species === "string" && SPECIES_IDS.includes(input.species) ? input.species : "cat",
    shiny: input.shiny === true,
    ...(typeof input.temperament === "string" && TEMPERAMENTS.includes(input.temperament)
      ? { temperament: input.temperament }
      : {}),
    name: typeof input.name === "string" && input.name ? input.name.slice(0, 24) : "Sprite",
    named: input.named === true,
    ...(typeof input.hatchedAt === "number" ? { hatchedAt: input.hatchedAt } : {}),
    xp: boundedNonnegative(input.xp, MAX_TOTAL_XP),
    level: Math.max(1, Math.floor(boundedNonnegative(input.level, MAX_LEVEL, 1))),
    stats: {
      craft: boundedNonnegative(input.stats?.craft, MAX_STAT),
      wander: boundedNonnegative(input.stats?.wander, MAX_STAT),
      grit: boundedNonnegative(input.stats?.grit, MAX_STAT),
      lore: boundedNonnegative(input.stats?.lore, MAX_STAT),
      spark: boundedNonnegative(input.stats?.spark, MAX_STAT),
    },
    ...(voice ? { voice } : {}),
    settings: cleanSettings(input.settings),
    ...(log ? { log } : {}),
    ...(typeof input.lastSeenAt === "number" ? { lastSeenAt: input.lastSeenAt } : {}),
  };
}

function normalizeCollection(agentId: string, input: Partial<AgentCollectionState>): AgentCollectionState {
  const sprites: Record<string, SpriteState> = Object.create(null);
  if (input.sprites && typeof input.sprites === "object") {
    for (const raw of Object.values(input.sprites)) {
      if (!raw || typeof raw !== "object") continue;
      const sprite = normalizeSprite(agentId, raw);
      sprites[sprite.id] = sprite;
    }
  }
  const requestedActive = typeof input.activeSpriteId === "string" ? input.activeSpriteId : null;
  const activeSpriteId = requestedActive && sprites[requestedActive] ? requestedActive : Object.keys(sprites)[0] ?? null;
  return {
    id: safeIdentifier(input.id, collectionIdForLegacyAgent(agentId)),
    ownerAgentId: agentId,
    activeSpriteId,
    sprites,
    ...(input.backup && typeof input.backup === "object" ? { backup: input.backup } : {}),
    ...(Number.isInteger(input.generation) && (input.generation as number) > 0
      ? { generation: input.generation }
      : {}),
  };
}

function emptyState(): ModState {
  return { schemaVersion: 2, global: {}, collections: Object.create(null) };
}

function parseState(raw: unknown): StateLoadResult {
  if (!raw || typeof raw !== "object") return { state: emptyState(), migrated: false };
  const value = raw as Record<string, unknown>;
  const global = value.global && typeof value.global === "object" ? (value.global as Record<string, unknown>) : {};

  if (value.schemaVersion === 2 && value.collections && typeof value.collections === "object") {
    const collections: Record<string, AgentCollectionState> = Object.create(null);
    for (const [agentId, collection] of Object.entries(value.collections as Record<string, unknown>)) {
      if (!collection || typeof collection !== "object") continue;
      collections[agentId] = normalizeCollection(agentId, collection as Partial<AgentCollectionState>);
    }
    return { state: { schemaVersion: 2, global, collections }, migrated: false };
  }

  const collections: Record<string, AgentCollectionState> = Object.create(null);
  if (value.sprites && typeof value.sprites === "object") {
    for (const [agentId, rawSprite] of Object.entries(value.sprites as Record<string, unknown>)) {
      if (!rawSprite || typeof rawSprite !== "object") continue;
      const sprite = normalizeSprite(agentId, rawSprite as Partial<SpriteState>);
      collections[agentId] = {
        id: collectionIdForLegacyAgent(agentId),
        ownerAgentId: agentId,
        activeSpriteId: sprite.id,
        sprites: { [sprite.id]: sprite },
      };
    }
  }
  return {
    state: { schemaVersion: 2, global, collections },
    migrated: Object.keys(collections).length > 0,
  };
}

function loadState(): StateLoadResult {
  let text: string;
  try {
    text = readFileSync(STATE_PATH, "utf-8");
  } catch (error: any) {
    if (error?.code === "ENOENT") return { state: emptyState(), migrated: false };
    return { state: emptyState(), migrated: false, corrupt: true }; // EISDIR, EACCES, …
  }
  if (text.trim() === "") return { state: emptyState(), migrated: false };
  try {
    const result = parseState(JSON.parse(text));
    if (result.migrated) preserveLegacyState(text);
    return result;
  } catch {
    // Malformed JSON: move the original aside so nothing can overwrite it,
    // then report "absent" — the quarantined copy is the recoverable one.
    if (quarantineCorruptState(text)) return { state: emptyState(), migrated: false };
    return { state: emptyState(), migrated: false, corrupt: true };
  }
}

// One-time copy of the pre-migration file so a bad migration is never the
// only surviving version. Sits beside the live state, never overwritten.
function preserveLegacyState(text: string) {
  const path = `${STATE_PATH}.pre-migration.json`;
  try {
    if (!existsSync(path)) writeFileSync(path, text, { flag: "wx" });
  } catch {
    // best-effort
  }
}

function quarantineCorruptState(text: string): boolean {
  const path = `${STATE_PATH}.corrupt.${Date.now().toString(36)}.json`;
  try {
    writeFileSync(path, text, { flag: "wx" });
    rmSync(STATE_PATH, { force: true }); // live path is now genuinely absent
    return true;
  } catch {
    return false;
  }
}

function saveState(state: ModState): boolean {
  const tmp = `${STATE_PATH}.${process.pid}.tmp`;
  try {
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(tmp, JSON.stringify(state, null, 2));
    renameSync(tmp, STATE_PATH);
    return true;
  } catch {
    // persistence is best-effort; never break the session over it
    rmSync(tmp, { force: true });
    return false;
  }
}

function cloneState<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function mergeValue<T>(base: T, local: T, remote: T): T {
  if (jsonEqual(local, base)) return cloneState(remote);
  return cloneState(local);
}

// xpToNext is arithmetic (100, 150, 200, …) so the cumulative cost to reach a
// level has a closed form — no loops that scale with attacker-chosen numbers.
function xpToReachLevel(level: number): number {
  const n = Math.max(0, Math.floor(level) - 1);
  return 100 * n + 25 * n * (n - 1);
}

function totalXp(sprite: SpriteState): number {
  const level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(sprite.level)));
  return Math.min(MAX_TOTAL_XP, Math.max(0, sprite.xp) + xpToReachLevel(level));
}

function applyTotalXp(sprite: SpriteState, total: number) {
  const capped = Math.min(MAX_TOTAL_XP, Math.max(0, Number.isFinite(total) ? total : 0));
  // Solve 25n² + 75n - capped ≤ 0 for the highest whole n (= level - 1).
  let n = Math.floor((-75 + Math.sqrt(75 * 75 + 100 * capped)) / 50);
  while (n > 0 && xpToReachLevel(n + 1) > capped) n -= 1;
  while (n + 1 < MAX_LEVEL && xpToReachLevel(n + 2) <= capped) n += 1;
  sprite.level = Math.min(MAX_LEVEL, n + 1);
  sprite.xp = capped - xpToReachLevel(sprite.level);
}

function entryKey(entry: { at: number; category: VoiceCategory | "mood"; line: string }): string {
  return `${entry.at}\u0000${entry.category}\u0000${entry.line}`;
}

function mergeSprite(base: SpriteState | undefined, local: SpriteState, remote: SpriteState | undefined): SpriteState {
  if (!remote) return cloneState(local);
  if (!base) {
    if (jsonEqual(local, remote)) return cloneState(local);
    const merged = cloneState(remote);
    for (const key of [
      "id",
      "seed",
      "bornToAgentId",
      "phase",
      "eggStartedAt",
      "pendingSpecies",
      "species",
      "shiny",
      "temperament",
      "name",
      "named",
      "hatchedAt",
    ] as Array<keyof SpriteState>) {
      if (local[key] !== undefined) (merged as any)[key] = cloneState(local[key]);
    }
    applyTotalXp(merged, Math.max(totalXp(local), totalXp(remote)));
    for (const key of ["craft", "wander", "grit", "lore", "spark"] as const) {
      merged.stats[key] = Math.max(local.stats[key], remote.stats[key]);
    }
    merged.settings = { ...cloneState(remote.settings), ...cloneState(local.settings) };
    merged.voice = { ...cloneState(remote.voice ?? {}), ...cloneState(local.voice ?? {}) };
    merged.lastSeenAt = Math.max(local.lastSeenAt ?? 0, remote.lastSeenAt ?? 0) || undefined;
    const logs = [...(remote.log ?? []), ...(local.log ?? [])];
    merged.log = Array.from(new Map(logs.map((entry) => [entryKey(entry), cloneState(entry)])).values())
      .sort((a, b) => a.at - b.at)
      .slice(-40);
    return merged;
  }
  const merged = cloneState(remote);
  const scalarKeys: Array<keyof SpriteState> = [
    "id",
    "seed",
    "bornToAgentId",
    "phase",
    "eggStartedAt",
    "pendingSpecies",
    "species",
    "shiny",
    "temperament",
    "name",
    "named",
    "hatchedAt",
  ];
  for (const key of scalarKeys) {
    if (!jsonEqual(local[key], base[key])) (merged as any)[key] = cloneState(local[key]);
  }

  const localXpDelta = totalXp(local) - totalXp(base);
  applyTotalXp(merged, totalXp(remote) + localXpDelta);
  for (const key of ["craft", "wander", "grit", "lore", "spark"] as const) {
    merged.stats[key] = Math.max(0, remote.stats[key] + (local.stats[key] - base.stats[key]));
  }

  merged.settings = mergeRecord(base.settings, local.settings, remote.settings);
  merged.voice = mergeRecord(base.voice ?? {}, local.voice ?? {}, remote.voice ?? {});
  merged.lastSeenAt = Math.max(base.lastSeenAt ?? 0, local.lastSeenAt ?? 0, remote.lastSeenAt ?? 0) || undefined;

  const baseEntries = new Set((base.log ?? []).map(entryKey));
  const combined = [...(remote.log ?? [])];
  const seen = new Set(combined.map(entryKey));
  for (const entry of local.log ?? []) {
    const key = entryKey(entry);
    if (!baseEntries.has(key) && !seen.has(key)) {
      combined.push(cloneState(entry));
      seen.add(key);
    }
  }
  combined.sort((a, b) => a.at - b.at);
  merged.log = combined.slice(-40);
  return merged;
}

function mergeRecord(
  base: Record<string, any>,
  local: Record<string, any>,
  remote: Record<string, any>,
): Record<string, any> {
  const merged = cloneState(remote);
  for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
    if (!jsonEqual(local[key], base[key])) {
      if (local[key] === undefined) delete merged[key];
      else merged[key] = cloneState(local[key]);
    }
  }
  return merged;
}

function mergeCollection(
  base: AgentCollectionState | undefined,
  local: AgentCollectionState,
  remote: AgentCollectionState | undefined,
): AgentCollectionState {
  if (!remote) return cloneState(local);
  if (!base) {
    const sprites = cloneState(remote.sprites);
    for (const [spriteId, localSprite] of Object.entries(local.sprites)) {
      sprites[spriteId] = mergeSprite(undefined, localSprite, remote.sprites[spriteId]);
    }
    return {
      id: remote.id || local.id,
      ownerAgentId: local.ownerAgentId,
      activeSpriteId: local.activeSpriteId && sprites[local.activeSpriteId] ? local.activeSpriteId : remote.activeSpriteId,
      sprites,
      backup: mergeBackup(undefined, local.backup, remote.backup),
    };
  }
  const remoteGen = remote.generation ?? 0;
  if (remoteGen > (base.generation ?? 0)) {
    // Remote was force-restored since we loaded. Our local view is of a soul
    // that no longer exists there — don't carry it back. Keep only XP/stat
    // deltas for sprites that still exist on the remote.
    const sprites = cloneState(remote.sprites);
    for (const [spriteId, localSprite] of Object.entries(local.sprites)) {
      if (!sprites[spriteId] || !base.sprites[spriteId]) continue;
      sprites[spriteId] = mergeSprite(base.sprites[spriteId], localSprite, sprites[spriteId]);
    }
    return { ...cloneState(remote), sprites, ownerAgentId: local.ownerAgentId };
  }
  const sprites = cloneState(remote.sprites);
  for (const [spriteId, localSprite] of Object.entries(local.sprites)) {
    sprites[spriteId] = mergeSprite(base.sprites[spriteId], localSprite, remote.sprites[spriteId]);
  }
  return {
    id: mergeValue(base.id, local.id, remote.id),
    ownerAgentId: local.ownerAgentId,
    activeSpriteId: mergeValue(base.activeSpriteId, local.activeSpriteId, remote.activeSpriteId),
    sprites,
    backup: mergeBackup(base.backup, local.backup, remote.backup),
    ...(remoteGen > 0 ? { generation: remoteGen } : {}),
  };
}

function mergeBackup(
  base: PortableBackupState | undefined,
  local: PortableBackupState | undefined,
  remote: PortableBackupState | undefined,
): PortableBackupState | undefined {
  if (!local) return cloneState(remote);
  if (!remote) return cloneState(local);
  const revision = Math.max(local.revision ?? 0, remote.revision ?? 0);
  const checkpointSource = (local.revision ?? 0) >= (remote.revision ?? 0) ? local : remote;
  return {
    enabled: mergeValue(base?.enabled, local.enabled, remote.enabled),
    pushPolicy: mergeValue(base?.pushPolicy, local.pushPolicy, remote.pushPolicy),
    revision,
    ...(checkpointSource.lastHash ? { lastHash: checkpointSource.lastHash } : {}),
    lastCheckpointAt: Math.max(local.lastCheckpointAt ?? 0, remote.lastCheckpointAt ?? 0) || undefined,
    lastStatus: checkpointSource.lastStatus ?? local.lastStatus ?? remote.lastStatus,
    pendingReason: mergeValue(base?.pendingReason, local.pendingReason, remote.pendingReason),
  };
}

function mergeState(base: ModState, local: ModState, remote: ModState): ModState {
  const collections = cloneState(remote.collections);
  for (const [agentId, localCollection] of Object.entries(local.collections)) {
    collections[agentId] = mergeCollection(base.collections[agentId], localCollection, remote.collections[agentId]);
  }
  return {
    schemaVersion: 2,
    global: mergeRecord(base.global, local.global, remote.global),
    collections,
  };
}

function reconcileInPlace(target: any, source: any) {
  if (!target || typeof target !== "object" || !source || typeof source !== "object") return;
  if (Array.isArray(target) && Array.isArray(source)) {
    target.splice(0, target.length, ...cloneState(source));
    return;
  }
  for (const key of Object.keys(target)) {
    if (!(key in source)) delete target[key];
  }
  for (const [key, value] of Object.entries(source)) {
    if (
      target[key] &&
      value &&
      typeof target[key] === "object" &&
      typeof value === "object" &&
      Array.isArray(target[key]) === Array.isArray(value)
    ) {
      reconcileInPlace(target[key], value);
    } else {
      target[key] = cloneState(value);
    }
  }
}

function writeLockOwner(lockPath: string) {
  try {
    writeFileSync(join(lockPath, "owner.json"), JSON.stringify({ pid: process.pid, acquiredAt: Date.now() }));
  } catch {
    // The lock directory itself remains authoritative even if metadata fails.
  }
}

const LOCK_MAX_AGE_MS = 10 * 60_000;

// true = a live owner holds it; false = owner is dead; null = unknown owner.
// A live-looking PID is only trusted while the lock is younger than
// LOCK_MAX_AGE_MS — PIDs get reused, and no sprite critical section takes
// ten minutes.
function lockOwnerIsAlive(lockPath: string): boolean | null {
  try {
    const owner = JSON.parse(readFileSync(join(lockPath, "owner.json"), "utf-8"));
    if (!Number.isInteger(owner?.pid) || owner.pid <= 0) return null;
    if (Number.isFinite(owner?.acquiredAt) && Date.now() - owner.acquiredAt > LOCK_MAX_AGE_MS) return false;
    try {
      process.kill(owner.pid, 0);
      return true;
    } catch (error: any) {
      return error?.code === "EPERM" ? true : false;
    }
  } catch {
    return null;
  }
}

// Reclaim atomically: rename the stale lock dir to a unique name first. Only
// the process whose rename succeeds removes it; a second reclaimer's rename
// fails (ENOENT) and it goes back to retrying — it can never delete a lock
// someone else has just acquired.
function clearStaleLock(lockPath: string, maxAgeMs = LOCK_MAX_AGE_MS): boolean {
  try {
    const ownerAlive = lockOwnerIsAlive(lockPath);
    if (ownerAlive === true) return false;
    if (ownerAlive === null && Date.now() - statSync(lockPath).mtimeMs <= maxAgeMs) return false;
    const graveyard = `${lockPath}.stale.${process.pid}.${Date.now().toString(36)}`;
    renameSync(lockPath, graveyard);
    rmSync(graveyard, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

function withLocalStateLock<T>(fn: () => T): T | null {
  try {
    mkdirSync(dirname(LOCAL_STATE_LOCK_PATH), { recursive: true });
  } catch {
    return null; // unwritable parent — persistence is best-effort, never throw into the session
  }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      mkdirSync(LOCAL_STATE_LOCK_PATH);
      writeLockOwner(LOCAL_STATE_LOCK_PATH);
      try {
        return fn();
      } finally {
        rmSync(LOCAL_STATE_LOCK_PATH, { recursive: true, force: true });
      }
    } catch (error: any) {
      if (error?.code !== "EEXIST") return null;
      if (clearStaleLock(LOCAL_STATE_LOCK_PATH)) continue;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  return null;
}

interface PortableCollectionV1 {
  schemaVersion: 1;
  collectionId: string;
  revision: number;
  exportedAt: number;
  sourceAgentId: string;
  activeSpriteId: string | null;
  sprites: Record<string, SpriteState>;
  checksum: string;
}

interface BackupResult {
  ok: boolean;
  status: string;
  revision?: number;
  hash?: string;
}

function portableCore(
  collection: AgentCollectionState,
  agentId: string,
  revision: number,
  exportedAt: number,
): Omit<PortableCollectionV1, "checksum"> {
  return {
    schemaVersion: PORTABLE_SCHEMA_VERSION,
    collectionId: collection.id,
    revision,
    exportedAt,
    sourceAgentId: agentId,
    activeSpriteId: collection.activeSpriteId,
    sprites: cloneState(collection.sprites),
  };
}

function collectionContentHash(collection: AgentCollectionState): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        collectionId: collection.id,
        activeSpriteId: collection.activeSpriteId,
        sprites: collection.sprites,
      }),
    )
    .digest("hex");
}

function portableChecksum(core: Omit<PortableCollectionV1, "checksum">): string {
  return createHash("sha256").update(JSON.stringify(core)).digest("hex");
}

function parsePortableCollection(raw: string): PortableCollectionV1 | null {
  try {
    const value = JSON.parse(raw) as Partial<PortableCollectionV1>;
    if (
      value.schemaVersion !== PORTABLE_SCHEMA_VERSION ||
      typeof value.collectionId !== "string" ||
      safeIdentifier(value.collectionId, "") !== value.collectionId ||
      !Number.isInteger(value.revision) ||
      Number(value.revision) < 0 ||
      !Number.isFinite(value.exportedAt) ||
      Number(value.exportedAt) < 0 ||
      typeof value.sourceAgentId !== "string" ||
      value.sourceAgentId.length > 256 ||
      !value.sprites ||
      typeof value.sprites !== "object" ||
      Array.isArray(value.sprites) ||
      typeof value.checksum !== "string"
    ) {
      return null;
    }
    const core: Omit<PortableCollectionV1, "checksum"> = {
      schemaVersion: PORTABLE_SCHEMA_VERSION,
      collectionId: value.collectionId,
      revision: Number(value.revision),
      exportedAt: Number(value.exportedAt),
      sourceAgentId: value.sourceAgentId,
      activeSpriteId: typeof value.activeSpriteId === "string" ? value.activeSpriteId : null,
      sprites: value.sprites as Record<string, SpriteState>,
    };
    if (portableChecksum(core) !== value.checksum) return null;
    const spriteEntries = Object.entries(core.sprites);
    if (spriteEntries.length === 0 || spriteEntries.length > PORTABLE_MAX_SPRITES) return null;
    for (const [spriteId, sprite] of spriteEntries) {
      if (
        safeIdentifier(spriteId, "") !== spriteId ||
        !sprite ||
        typeof sprite !== "object" ||
        Array.isArray(sprite) ||
        safeIdentifier((sprite as any).id, "") !== spriteId
      ) {
        return null;
      }
    }
    if (core.activeSpriteId !== null && !core.sprites[core.activeSpriteId]) return null;
    return { ...core, checksum: value.checksum };
  } catch {
    return null;
  }
}

// Git env vars that can redirect the operation to a different repo/index or
// inject config. Everything else from the parent env is dropped too; only a
// minimal, explicit environment reaches git.
const GIT_ENV_PASSTHROUGH = ["PATH", "HOME", "USER", "LANG", "LC_ALL", "TMPDIR", "SSH_AUTH_SOCK", "XDG_CONFIG_HOME"];

function gitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of GIT_ENV_PASSTHROUGH) if (process.env[key] !== undefined) env[key] = process.env[key];
  // Refuse any repo-level config that could run a program. Not exhaustive by
  // nature (git keeps growing), but covers the documented executable knobs.
  env.GIT_CONFIG_COUNT = "0";
  env.GIT_TERMINAL_PROMPT = "0";
  return env;
}

function emptyHooksDir(memoryDir: string): string | null {
  const path = join(memoryDir, ".git", "sprite-empty-hooks");
  try {
    mkdirSync(path, { recursive: true });
    if (lstatSync(path).isSymbolicLink()) return null;
    // Must actually be empty — a planted pre-commit here would run.
    if (readdirSync(path).length > 0) return null;
    return path;
  } catch {
    return null;
  }
}

function runGit(memoryDir: string, args: string[]): string {
  const hooks = emptyHooksDir(memoryDir);
  if (!hooks) throw new Error("sprite: hook directory is not empty or not a directory");
  return execFileSync(
    "git",
    [
      "-C", memoryDir,
      "-c", `core.hooksPath=${hooks}`,
      "-c", "core.fsmonitor=false",
      "-c", "core.sshCommand=ssh",
      "-c", "credential.helper=",
      "-c", "commit.gpgSign=false",
      "-c", "tag.gpgSign=false",
      "-c", "push.gpgSign=false",
      "-c", "diff.external=",
      "-c", "gpg.program=",
      "-c", "filter.lfs.clean=",
      "-c", "filter.lfs.smudge=",
      "-c", "filter.lfs.process=",
      "-c", "filter.lfs.required=false",
      "-c", "protocol.allow=never",
      "-c", "protocol.https.allow=always",
      "-c", "protocol.ssh.allow=always",
      "-c", "protocol.file.allow=always",
      "-c", "protocol.git.allow=always",
      "-c", "uploadpack.allowFilter=false",
      ...args,
    ],
    {
      encoding: "utf-8",
      timeout: 15_000,
      stdio: ["ignore", "pipe", "pipe"],
      env: gitEnv(),
    },
  ).trim();
}

function tryGit(memoryDir: string, args: string[]): string | null {
  try {
    return runGit(memoryDir, args);
  } catch {
    return null;
  }
}

function hasOnlySpritePaths(memoryDir: string, commit: string): boolean {
  // Sprite never creates merge commits. A merge's diff-tree is empty by default,
  // which would let an "evil merge" carrying agent memory pass — so refuse any
  // commit with more than one parent outright.
  const parents = tryGit(memoryDir, ["rev-list", "--parents", "-n", "1", commit]);
  if (parents === null || parents.split(/\s+/).filter(Boolean).length > 2) return false;
  const paths = tryGit(memoryDir, ["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", commit]);
  if (paths === null) return false;
  const list = paths.split(/\r?\n/).filter(Boolean);
  if (list.length === 0) return false;
  return list.every((path) => path === PORTABLE_RELATIVE_PATH || path.startsWith("data/mods/letta-ai-sprite/"));
}

function isSpriteOwnedCommit(memoryDir: string, commit: string): boolean {
  const body = tryGit(memoryDir, ["show", "-s", "--format=%B", commit]);
  return body !== null && body.includes(PORTABLE_COMMIT_TRAILER) && hasOnlySpritePaths(memoryDir, commit);
}

// Push a specific, already-validated object — never the moving name HEAD. If
// HEAD advanced between validation and push (another process committing agent
// memory), that commit is simply not part of what we send.
function pushValidated(memoryDir: string, remote: string, branch: string, sha: string) {
  runGit(memoryDir, ["push", remote, `${sha}:refs/heads/${branch}`]);
}

function safePushTarget(memoryDir: string, refreshRemote: boolean):
  | { kind: "none" }
  | { kind: "blocked"; reason: string }
  | { kind: "ready"; remote: string; branch: string; ahead: number; head: string } {
  const upstream = tryGit(memoryDir, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  if (!upstream) return { kind: "none" };
  const slash = upstream.indexOf("/");
  if (slash <= 0 || slash === upstream.length - 1) return { kind: "blocked", reason: "invalid upstream" };
  const remote = upstream.slice(0, slash);
  const branch = upstream.slice(slash + 1);
  if (refreshRemote && tryGit(memoryDir, ["fetch", remote, branch]) === null) {
    return { kind: "blocked", reason: "could not refresh MemFS upstream" };
  }
  // Pin HEAD once; every check below and the eventual push use this exact object.
  const head = tryGit(memoryDir, ["rev-parse", "--verify", "HEAD^{commit}"]);
  if (!head || !/^[0-9a-f]{40,64}$/.test(head)) return { kind: "blocked", reason: "could not resolve HEAD" };
  const counts = tryGit(memoryDir, ["rev-list", "--left-right", "--count", `${upstream}...${head}`]);
  if (!counts) return { kind: "blocked", reason: "could not compare upstream" };
  const [behind, ahead] = counts.split(/\s+/).map(Number);
  if (behind > 0) return { kind: "blocked", reason: "MemFS branch is behind or diverged" };
  if (ahead > 0) {
    const commits = tryGit(memoryDir, ["rev-list", `${upstream}..${head}`]);
    if (!commits) return { kind: "blocked", reason: "could not inspect unpushed commits" };
    for (const commit of commits.split(/\r?\n/).filter(Boolean)) {
      if (!isSpriteOwnedCommit(memoryDir, commit)) {
        return { kind: "blocked", reason: "unrelated MemFS commits are waiting to push" };
      }
    }
  }
  return { kind: "ready", remote, branch, ahead, head };
}

function portablePath(memoryDir: string): string | null {
  let current = memoryDir;
  for (const segment of PORTABLE_RELATIVE_PATH.split("/")) {
    current = join(current, segment);
    try {
      if (existsSync(current) && lstatSync(current).isSymbolicLink()) return null;
    } catch {
      return null;
    }
  }
  return current;
}

function withMemfsLock<T>(memoryDir: string, fn: () => T): T | null {
  const lockPath = join(memoryDir, ".git", "sprite-backup.lock");
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      mkdirSync(lockPath);
      writeLockOwner(lockPath);
      try {
        return fn();
      } finally {
        rmSync(lockPath, { recursive: true, force: true });
      }
    } catch (error: any) {
      if (error?.code !== "EEXIST") return null;
      if (clearStaleLock(lockPath)) continue;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  return null;
}

function checkpointPortableCollection(
  memoryDir: string,
  agentId: string,
  agentName: string | null,
  collection: AgentCollectionState,
): BackupResult {
  if (!existsSync(join(memoryDir, ".git"))) {
    return { ok: false, status: "portable backup unavailable — MemFS is not a git repository" };
  }
  const result = withMemfsLock(memoryDir, () => {
    const dirty = runGit(memoryDir, ["status", "--porcelain"]);
    if (dirty) {
      return { ok: false, status: "portable backup pending — MemFS has uncommitted work" } satisfies BackupResult;
    }

    const pushPolicy = collection.backup?.pushPolicy ?? "safe";
    // Always inspect existing unpushed commits before creating ours. Even when
    // direct push is disabled, the host may sync committed MemFS changes after
    // the turn; never let a Sprite checkpoint become the trigger that carries
    // unrelated agent memory with it.
    const pushTarget = safePushTarget(memoryDir, pushPolicy === "safe");
    if (pushTarget.kind === "blocked") {
      return { ok: false, status: `portable backup pending — ${pushTarget.reason}` } satisfies BackupResult;
    }

    const hash = collectionContentHash(collection);
    if (collection.backup?.lastHash === hash) {
      if (pushPolicy === "safe" && pushTarget.kind === "ready" && pushTarget.ahead > 0) {
        try {
          pushValidated(memoryDir, pushTarget.remote, pushTarget.branch, pushTarget.head);
          return {
            ok: true,
            status: "portable backup synced",
            revision: collection.backup.revision,
            hash,
          } satisfies BackupResult;
        } catch {
          return {
            ok: false,
            status: "portable backup committed locally · push failed",
            revision: collection.backup.revision,
            hash,
          } satisfies BackupResult;
        }
      }
      return {
        ok: true,
        status: collection.backup.lastStatus ?? "portable backup already current",
        revision: collection.backup.revision,
        hash,
      } satisfies BackupResult;
    }

    const revision = (collection.backup?.revision ?? 0) + 1;
    const core = portableCore(collection, agentId, revision, Date.now());
    const payload: PortableCollectionV1 = { ...core, checksum: portableChecksum(core) };
    const outputPath = portablePath(memoryDir);
    if (!outputPath) {
      return { ok: false, status: "portable backup blocked — Sprite's MemFS path contains a symlink" } satisfies BackupResult;
    }
    mkdirSync(dirname(outputPath), { recursive: true });
    const previous = existsSync(outputPath) ? readFileSync(outputPath) : null;
    // Unique tmp name per process + never follow a pre-planted symlink at it.
    const tmp = `${outputPath}.${process.pid}.${Date.now().toString(36)}.tmp`;
    try {
      if (lstatSync(tmp).isSymbolicLink()) {
        return { ok: false, status: "portable backup blocked — Sprite's MemFS path contains a symlink" } satisfies BackupResult;
      }
      rmSync(tmp, { force: true });
    } catch {
      // absent — expected
    }
    const commitMessage = [
      `mod-state(sprite): checkpoint ${collection.sprites[collection.activeSpriteId ?? ""]?.name ?? "collection"}`,
      "",
      `Portable Sprite state revision ${revision}.`,
      "",
      PORTABLE_COMMIT_TRAILER,
    ].join("\n");
    let committed: string | null = null;
    try {
      // `wx` = O_CREAT|O_EXCL: fails if anything (including a symlink) exists at tmp.
      writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, { flag: "wx" });
      renameSync(tmp, outputPath);
      runGit(memoryDir, ["add", "--", PORTABLE_RELATIVE_PATH]);
      runGit(memoryDir, [
        "-c",
        `user.name=${agentName || agentId}`,
        "-c",
        `user.email=${agentId}@letta.com`,
        "commit",
        "--only",
        "-m",
        commitMessage,
        "--",
        PORTABLE_RELATIVE_PATH,
      ]);
      committed = runGit(memoryDir, ["rev-parse", "--verify", "HEAD^{commit}"]);
    } catch {
      tryGit(memoryDir, ["reset", "HEAD", "--", PORTABLE_RELATIVE_PATH]);
      rmSync(tmp, { force: true });
      if (previous) writeFileSync(outputPath, previous);
      else rmSync(outputPath, { force: true });
      return { ok: false, status: "portable backup failed during commit" } satisfies BackupResult;
    }

    let status = "portable backup committed locally";
    if (pushPolicy === "never") {
      status += " · push disabled";
    } else if (pushTarget.kind === "none") {
      status += " · no remote configured";
    } else {
      try {
        // Only push if the commit we just made sits directly on the HEAD we
        // validated and is itself sprite-only. Anything else = someone else
        // committed in between; leave it for the host to push.
        const parent = tryGit(memoryDir, ["rev-parse", "--verify", `${committed}^{commit}^`]);
        if (!committed || parent !== pushTarget.head || !isSpriteOwnedCommit(memoryDir, committed)) {
          return {
            ok: false,
            status: "portable backup committed locally · push skipped (MemFS changed underneath)",
            revision,
            hash,
          } satisfies BackupResult;
        }
        pushValidated(memoryDir, pushTarget.remote, pushTarget.branch, committed);
        status = "portable backup synced";
      } catch {
        return {
          ok: false,
          status: "portable backup committed locally · push failed",
          revision,
          hash,
        } satisfies BackupResult;
      }
    }
    return { ok: true, status, revision, hash } satisfies BackupResult;
  });
  return result ?? { ok: false, status: "portable backup pending — MemFS is busy" };
}

function readPortableCollection(memoryDir: string): PortableCollectionV1 | null {
  try {
    const path = portablePath(memoryDir);
    if (!path) return null;
    if (statSync(path).size > PORTABLE_MAX_BYTES) return null;
    return parsePortableCollection(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// seeded fate
// ---------------------------------------------------------------------------

function hashString(input: string): number {
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function fateRoll(agentId: string): { species: string; shiny: boolean } {
  const h = hashString(`sprite:${agentId}`);
  const rarityRoll = (h % 1000) / 1000;
  let rarity: Rarity;
  if (rarityRoll < 0.55) rarity = "common";
  else if (rarityRoll < 0.85) rarity = "uncommon";
  else if (rarityRoll < 0.97) rarity = "rare";
  else rarity = "legendary";
  const pool = RARITY_POOLS[rarity];
  const species = pool[(h >>> 10) % pool.length];
  const shiny = hashString(`shiny:${agentId}`) % 100 === 0; // 1%
  return { species, shiny };
}

// ---------------------------------------------------------------------------
// xp / stats
// ---------------------------------------------------------------------------

function xpToNext(level: number): number {
  return 100 + (level - 1) * 50;
}

const STAT_KEYS = ["craft", "wander", "grit", "lore", "spark"] as const;
const STAT_LABELS: Record<(typeof STAT_KEYS)[number], string> = {
  craft: "CRAFT",
  wander: "WANDER",
  grit: "GRIT",
  lore: "LORE",
  spark: "SPARK",
};

// log-scale: each block ≈3× the last, so bars stay alive for months.
const STAT_THRESHOLDS = [10, 30, 100, 300, 1_000, 3_000, 10_000, 30_000];

function statBar(value: number): string {
  const filled = STAT_THRESHOLDS.filter((t) => value >= t).length;
  return "▰".repeat(filled) + "▱".repeat(STAT_THRESHOLDS.length - filled);
}

// half nature, half nurture: temperament is seeded at birth, vocation is earned.
const TEMPERAMENTS = ["gentle", "wry", "bold", "sleepy", "odd"];
const VOCATIONS: Record<(typeof STAT_KEYS)[number], string> = {
  craft: "diligent",
  wander: "curious",
  grit: "stubborn",
  lore: "bookish",
  spark: "chatty",
};
const VOCATION_MIN = 10; // events before a vocation is earned

function temperamentOf(agentId: string): string {
  return TEMPERAMENTS[hashString(`temper:${agentId}`) % TEMPERAMENTS.length];
}

function vocationOf(stats: SpriteState["stats"]): string | null {
  let best: (typeof STAT_KEYS)[number] | null = null;
  let bestVal = 0;
  for (const key of STAT_KEYS) {
    if (stats[key] > bestVal) {
      bestVal = stats[key];
      best = key;
    }
  }
  return best && bestVal >= VOCATION_MIN ? VOCATIONS[best] : null;
}

function natureLine(sprite: SpriteState): string {
  const temper = sprite.temperament ?? temperamentOf(sprite.seed);
  const vocation = vocationOf(sprite.stats);
  return vocation ? `a ${temper}, ${vocation} ${sprite.species}` : `a ${temper} little ${sprite.species}`;
}

// milestone titles: levels climb forever; some of them mean something.
const TITLES: Array<[number, string]> = [
  [100, "lifelong"],
  [50, "old friend"],
  [25, "familiar"],
  [10, "companion"],
  [5, "settled in"],
];

function titleFor(level: number): string | null {
  for (const [min, title] of TITLES) {
    if (level >= min) return title;
  }
  return null;
}

function statForTool(name: string): (typeof STAT_KEYS)[number] {
  const n = String(name || "");
  if (/memory|memfs/i.test(n)) return "lore";
  if (/^(Read|Grep|Glob|Search|Find|Ls|List|WebFetch|WebSearch|Fetch)/i.test(n)) return "wander";
  return "craft";
}

// ---------------------------------------------------------------------------
// activation
// ---------------------------------------------------------------------------

// One activation per host object. If the same mod gets loaded twice into one
// host (hand-copied file + installed package, say) the second copy would
// register its own listeners and double-count every event into shared state.
// Keyed on the host (not the process) so genuinely separate hosts — tests, or
// a runtime that spins several — still each get their own sprite.
const ACTIVE_HOSTS: WeakSet<object> = ((globalThis as any)[Symbol.for("@faye/sprite:hosts")] ??= new WeakSet());

export default function activate(letta: any) {
  // Sprites are Tamagotchi-like companions for agents, not for a specific UI.
  // Keep tools/events available in headless channel listeners even when there is
  // no statusline panel to render.
  const hasPanels = Boolean(letta.capabilities.ui.panels);

  if (letta && typeof letta === "object") {
    if (ACTIVE_HOSTS.has(letta)) {
      try {
        letta.log?.warn?.("sprite: already active on this host — skipping duplicate activation");
      } catch {
        // logging is optional
      }
      return undefined;
    }
    ACTIVE_HOSTS.add(letta);
  }

  const disposers: Array<() => void> = [];
  disposers.push(() => {
    if (letta && typeof letta === "object") ACTIVE_HOSTS.delete(letta);
  });
  const loaded = loadState();
  const state = loaded.state;
  let baseState = cloneState(state);
  let dirty = loaded.migrated;

  // backfill temperament for sprites hatched before natures existed
  for (const collection of Object.values(state.collections)) {
    for (const sp of Object.values(collection.sprites)) {
      if (sp.phase === "alive" && !sp.temperament) {
        sp.temperament = temperamentOf(sp.seed);
        dirty = true;
      }
    }
  }

  const markDirty = () => {
    dirty = true;
  };
  const flush = (evenIfClean = false) => {
    if (!dirty && !evenIfClean) return;
    const flushed = withLocalStateLock(() => {
      const loadedNow = loadState();
      // Never merge over a file we couldn't read — it's quarantined for a human.
      if (loadedNow.corrupt) return false;
      const remote = loadedNow.state;
      const merged = mergeState(baseState, state, remote);
      if (!saveState(merged)) return false;
      reconcileInPlace(state, merged);
      baseState = cloneState(merged);
      return true;
    });
    if (flushed) dirty = false;
  };

  // Returns true on success, false on save failure, "exists" when `force` is off
  // and another process already created a collection for this agent — the
  // absence check has to happen on disk, under the lock, not against our
  // possibly-stale in-memory snapshot.
  const replaceCollection = (
    agentId: string,
    replacement: AgentCollectionState,
    force: boolean,
  ): true | false | "exists" => {
    flush();
    const replaced = withLocalStateLock<true | false | "exists">(() => {
      const loadedNow = loadState();
      if (loadedNow.corrupt) return false;
      const latest = loadedNow.state;
      if (!force && latest.collections[agentId]) {
        reconcileInPlace(state, latest);
        baseState = cloneState(latest);
        return "exists";
      }
      const next = cloneState(replacement);
      if (force) next.generation = (latest.collections[agentId]?.generation ?? 0) + 1;
      latest.collections[agentId] = next;
      if (!saveState(latest)) return false;
      reconcileInPlace(state, latest);
      baseState = cloneState(latest);
      return true;
    });
    if (replaced === true || replaced === "exists") dirty = false;
    return replaced ?? false;
  };

  if (dirty) flush();

  // -- live (non-persisted) presentation state --
  let activeAgentId: string | null = null;
  let activeAgentName: string | null = null;
  let pose: keyof Species["poses"] = "idle";
  let poseUntil = 0; // when a transient pose settles back to idle
  let sleeping = false; // compaction nap (the agent is consolidating memory)
  let dozing = false; // idle nap (nothing has happened for a while)
  let lastActivityAt = Date.now();
  let bubble = "";
  let bubbleUntil = 0;
  let lastVoiceAt = 0;
  let x = 0;
  let dir = 1;
  let tickCount = 0;
  let errorStreak = 0;
  const memoryDirs = new Map<string, string>();
  const pendingCheckpoints = new Map<string, string>();
  const backupAttemptAt = new Map<string, number>();
  // toolCallId → Bash command, stashed at tool_start (tool_end has no args)
  const pendingBashCommands = new Map<string, string>();

  const IDLE_NAP_MS = 30 * 60_000; // doze off after 30 quiet minutes
  const MISSED_YOU_MS = 24 * 3_600_000; // a real absence
  const BACKUP_RETRY_MS = 5 * 60_000;

  for (const [agentId, collection] of Object.entries(state.collections)) {
    if (!backupEnabled(collection)) continue;
    const stateDrifted = collection.backup?.lastHash !== collectionContentHash(collection);
    const reason = collection.backup?.pendingReason ?? (stateDrifted ? "state-changed-while-offline" : null);
    if (reason) {
      pendingCheckpoints.set(agentId, reason);
      if (collection.backup) collection.backup.pendingReason = reason;
      dirty = true;
    }
  }

  function contextSnapshot(ctx?: any): any | null {
    const candidates: any[] = [];
    try {
      if (typeof ctx?.getContext === "function") candidates.push(ctx.getContext());
    } catch {
      // fall through to other scoped context sources
    }
    if (ctx?.context) candidates.push(ctx.context);
    try {
      if (typeof letta.getContext === "function") candidates.push(letta.getContext());
    } catch {
      // older hosts do not expose dynamic context
    }
    return candidates.find((candidate) => candidate && typeof candidate === "object") ?? null;
  }

  function rememberMemfs(agentId: string | null, ctx?: any) {
    if (!agentId) return;
    const snapshot = contextSnapshot(ctx);
    if (
      snapshot?.agent?.id === agentId &&
      snapshot?.memfs?.enabled === true &&
      typeof snapshot.memfs.memoryDir === "string" &&
      snapshot.memfs.memoryDir
    ) {
      memoryDirs.set(agentId, snapshot.memfs.memoryDir);
    }
  }

  function backupEnabled(collection: AgentCollectionState | null): boolean {
    return collection?.backup?.enabled === true;
  }

  function queueCheckpoint(agentId: string | null, reason: string) {
    const collection = getCollection(agentId);
    if (!agentId || !backupEnabled(collection)) return;
    pendingCheckpoints.set(agentId, reason);
    if (collection?.backup) collection.backup.pendingReason = reason;
    markDirty();
  }

  function ownerAgentId(sprite: SpriteState): string | null {
    for (const [agentId, collection] of Object.entries(state.collections)) {
      if (collection.sprites[sprite.id] === sprite) return agentId;
    }
    return null;
  }

  function restorePortable(agentId: string, force = false): string {
    const memoryDir = memoryDirs.get(agentId);
    if (!memoryDir) return "portable restore unavailable — this agent has no accessible MemFS here";
    if (getCollection(agentId) && !force) {
      return "local companion state already exists — use /sprite backup restore force to replace it deliberately";
    }
    const portable = readPortableCollection(memoryDir);
    if (!portable) return "no valid portable Sprite backup found";
    const collection = normalizeCollection(agentId, {
      id: portable.collectionId,
      ownerAgentId: agentId,
      activeSpriteId: portable.activeSpriteId,
      sprites: portable.sprites,
    });
    const hash = collectionContentHash(collection);
    collection.backup = {
      enabled: false,
      pushPolicy: "safe",
      revision: portable.revision,
      lastHash: hash,
      lastCheckpointAt: portable.exportedAt,
      lastStatus: `restored portable backup revision ${portable.revision} · backup remains off until enabled`,
    };
    const outcome = replaceCollection(agentId, collection, force);
    if (outcome === "exists") {
      panel.update();
      return "local companion state already exists — use /sprite backup restore force to replace it deliberately";
    }
    if (!outcome) {
      return "portable restore failed while saving local state — existing state was left untouched";
    }
    panel.update();
    return `${collection.sprites[collection.activeSpriteId ?? ""]?.name ?? "your companion"} restored from portable backup revision ${portable.revision}. same soul, new installation.`;
  }

  function maybeAutoRestore(agentId: string | null) {
    if (!agentId || getCollection(agentId) || !memoryDirs.has(agentId)) return;
    // Another window may have hatched since we loaded; refresh from disk first.
    flush(true);
    if (getCollection(agentId)) return;
    const memoryDir = memoryDirs.get(agentId)!;
    const path = portablePath(memoryDir);
    if (!path || !existsSync(path)) return;
    restorePortable(agentId);
  }

  function processCheckpoint(agentId: string, force = false): string {
    const collection = getCollection(agentId);
    if (!collection || !backupEnabled(collection)) return "portable backup is off";
    const memoryDir = memoryDirs.get(agentId);
    if (!memoryDir) {
      collection.backup!.lastStatus = "portable backup unavailable — this agent has no accessible MemFS here";
      collection.backup!.pendingReason = pendingCheckpoints.get(agentId) ?? "checkpoint";
      markDirty();
      flush();
      return collection.backup!.lastStatus;
    }
    const now = Date.now();
    if (!force && now - (backupAttemptAt.get(agentId) ?? 0) < BACKUP_RETRY_MS) {
      return collection.backup!.lastStatus ?? "portable backup queued";
    }
    backupAttemptAt.set(agentId, now);
    flush();
    const result = checkpointPortableCollection(
      memoryDir,
      agentId,
      activeAgentName,
      collection,
    );
    collection.backup = {
      ...collection.backup,
      enabled: true,
      pushPolicy: collection.backup?.pushPolicy ?? "safe",
      revision: result.revision ?? collection.backup?.revision ?? 0,
      ...(result.hash ? { lastHash: result.hash } : {}),
      ...(result.ok ? { lastCheckpointAt: now } : {}),
      lastStatus: result.status,
      ...(result.ok ? {} : { pendingReason: pendingCheckpoints.get(agentId) ?? "checkpoint" }),
    };
    if (result.ok) {
      delete collection.backup.pendingReason;
      pendingCheckpoints.delete(agentId);
    }
    markDirty();
    flush();
    return result.status;
  }

  function noteActivity(sprite?: SpriteState | null) {
    lastActivityAt = Date.now();
    if (dozing) {
      dozing = false;
      if (sprite && sprite.phase === "alive") {
        logEntry(sprite, "mood", "(stirred awake — something's happening)");
      }
      panel.update();
    }
    if (sprite) {
      sprite.lastSeenAt = Date.now();
      markDirty();
    }
  }

  function getCollection(agentId: string | null): AgentCollectionState | null {
    if (!agentId) return null;
    return state.collections[agentId] ?? null;
  }

  function getSprite(agentId: string | null): SpriteState | null {
    const collection = getCollection(agentId);
    if (!collection?.activeSpriteId) return null;
    return collection.sprites[collection.activeSpriteId] ?? null;
  }

  // an agent invoking a tool/command becomes the active one, so its egg (which
  // only advances for the active agent) hatches and its panel renders.
  function toolAgent(ctx: any): string | null {
    if (ctx?.agent?.id) {
      activeAgentId = ctx.agent.id;
      activeAgentName = ctx.agent.name ?? activeAgentName;
      rememberMemfs(activeAgentId, ctx);
      maybeAutoRestore(activeAgentId);
    }
    return ctx?.agent?.id ?? activeAgentId;
  }

  function setting(sprite: SpriteState | null, key: string): unknown {
    if (sprite && sprite.settings && key in sprite.settings) return sprite.settings[key];
    if (key in state.global) return state.global[key];
    return DEFAULT_SETTINGS[key];
  }

  function speciesOf(sprite: SpriteState): Species {
    return SPECIES.find((s) => s.id === sprite.species) ?? SPECIES[0];
  }

  // -- voice ----------------------------------------------------------------

  // shuffle-bag per sprite+category: deal every line once before any repeat.
  // bag resets when the pool changes (e.g. the agent re-authors its voice).
  const voiceBags = new Map<string, { fp: string; lines: string[]; last: string | null }>();

  function shuffled<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function pickLine(sprite: SpriteState, category: VoiceCategory): string {
    const custom = sprite.voice?.[category];
    let pool: string[];
    if (custom && custom.length > 0) {
      pool = custom;
    } else {
      // additive: species imagery + temperament tone
      const speciesLines = SPECIES_CORPUS[sprite.species]?.[category] ?? [];
      const temper = sprite.temperament ?? "gentle";
      const temperLines = TEMPERAMENT_CORPUS[temper]?.[category] ?? [];
      const merged = [...speciesLines, ...temperLines];
      pool = merged.length > 0 ? merged : BASE_CORPUS[category];
    }
    if (pool.length === 1) return pool[0];

    const key = `${sprite.hatchedAt ?? 0}:${sprite.species}:${category}`;
    const fp = pool.join("\u0001");
    let bag = voiceBags.get(key);
    if (!bag || bag.fp !== fp || bag.lines.length === 0) {
      const fresh = shuffled(pool);
      // avoid a back-to-back repeat across the reshuffle boundary
      if (bag?.last && fresh[fresh.length - 1] === bag.last && fresh.length > 1) {
        const j = Math.floor(Math.random() * (fresh.length - 1));
        [fresh[fresh.length - 1], fresh[j]] = [fresh[j], fresh[fresh.length - 1]];
      }
      bag = { fp, lines: fresh, last: bag?.last ?? null };
      voiceBags.set(key, bag);
    }
    const line = bag.lines.pop()!;
    bag.last = line;
    return line;
  }

  const DIARY_MAX = 40;

  function logEntry(sprite: SpriteState, category: string, line: string) {
    sprite.log = [...(sprite.log ?? []), { at: Date.now(), category: category as VoiceCategory | "mood", line }].slice(
      -DIARY_MAX,
    );
  }

  function speak(sprite: SpriteState, category: VoiceCategory, force = false): string | null {
    if (setting(sprite, "voice") !== "on") return null;
    const rateMs = Number(setting(sprite, "voiceRateMin")) * 60_000;
    const now = Date.now();
    if (!force && now - lastVoiceAt < rateMs) return null;
    lastVoiceAt = now;
    bubble = pickLine(sprite, category);
    bubbleUntil = now + 8_000;
    logEntry(sprite, category, bubble);
    markDirty();
    panel.update();
    return bubble;
  }

  // -- xp -------------------------------------------------------------------

  function bumpStat(sprite: SpriteState, key: (typeof STAT_KEYS)[number]) {
    sprite.stats[key] = Math.min(MAX_STAT, sprite.stats[key] + 1);
  }

  function awardXp(sprite: SpriteState, amount: number) {
    const before = sprite.level;
    applyTotalXp(sprite, totalXp(sprite) + Math.max(0, amount));
    const leveled = sprite.level > before;
    markDirty();
    if (leveled) {
      setPose("happy", 4_000);
      speak(sprite, "level_up");
      queueCheckpoint(ownerAgentId(sprite), "level-up");
    }
  }

  // -- poses ----------------------------------------------------------------

  function setPose(next: keyof Species["poses"], holdMs = 3_000) {
    if (sleeping) return;
    pose = next;
    poseUntil = Date.now() + holdMs;
    panel.update();
  }

  // -- hatching -------------------------------------------------------------

  function beginHatch(agentId: string | null, agentName: string | null, pick?: string): string {
    if (!agentId) return "i can't tell which agent this is — try again from an active conversation.";
    const fate = fateRoll(agentId);
    const species = pick && SPECIES_IDS.includes(pick) ? pick : fate.species;
    const existing = getSprite(agentId);
    if (existing && existing.phase === "alive") {
      return `${existing.name} is already here. (/sprite molt to re-form, or /sprite for the card)`;
    }
    if (existing && existing.phase === "egg") {
      return "the egg is already here. it's warm.";
    }
    const collection =
      getCollection(agentId) ??
      (state.collections[agentId] = {
        id: collectionIdForLegacyAgent(agentId),
        ownerAgentId: agentId,
        activeSpriteId: null,
        sprites: {},
      });
    const spriteId = stableId("sprite", `${agentId}:founder`);
    collection.sprites[spriteId] = {
      id: spriteId,
      seed: agentId,
      bornToAgentId: agentId,
      phase: "egg",
      eggStartedAt: Date.now(),
      pendingSpecies: species,
      species,
      shiny: fate.shiny,
      name: agentName ? `${agentName}'s egg` : "the egg",
      named: false,
      xp: 0,
      level: 1,
      stats: { craft: 0, wander: 0, grit: 0, lore: 0, spark: 0 },
      settings: {},
    };
    collection.activeSpriteId = spriteId;
    markDirty();
    flush();
    queueCheckpoint(agentId, "hatch-started");
    panel.update();
    return "an egg appears under the statusline. it's warm. (hatching soon~)";
  }

  function completeHatch(agentId: string, sprite: SpriteState) {
    sprite.phase = "alive";
    sprite.hatchedAt = Date.now();
    sprite.species = sprite.pendingSpecies ?? sprite.species;
    sprite.temperament = temperamentOf(sprite.seed);
    delete sprite.pendingSpecies;
    const sp = speciesOf(sprite);
    if (!sprite.named) {
      sprite.name = sp.id.charAt(0).toUpperCase() + sp.id.slice(1);
    }
    markDirty();
    flush();
    queueCheckpoint(agentId, "hatched");
    setPose("happy", 5_000);
    speak(sprite, "greeting", true);
  }

  // -- panel ----------------------------------------------------------------

  const panel = hasPanels
    ? letta.ui.openPanel({
        id: "sprite",
        order: -1,
        render: ({ width, agent, row, chalk }: any) => {
          activeAgentId = (agent && agent.id) || activeAgentId;
          activeAgentName = (agent && agent.name) || activeAgentName;
          const sprite = getSprite(activeAgentId);
          if (!sprite) return "";
          if (setting(sprite, "visible") !== "on") return "";

          if (sprite.phase === "egg") {
            const frame = EGG_FRAMES[tickCount % EGG_FRAMES.length];
            return row(`${" ".repeat(x)}${frame}`, chalk.dim("something is coming"), width);
          }

          const sp = speciesOf(sprite);
          let face: string = sp.poses[pose] ?? sp.poses.idle;
          if (sleeping || dozing) face = sp.poses.sleep;

          const shinyMark = sprite.shiny ? chalk.yellowBright("✦") : "";
          const label = `${chalk.cyan(sprite.name)}${shinyMark} ${chalk.dim(`·Lv.${sprite.level}`)}`;
          const pad = " ".repeat(Math.max(0, Math.min(x, 16)));
          const right = bubble && Date.now() < bubbleUntil ? chalk.dim(`“${bubble}”`) : "";
          return row(`${pad}${face}  ${label}`, right, width);
        },
      })
    : { update() {}, close() {} };
  disposers.push(() => panel.close());

  // -- heartbeat tick (animation + persistence) -----------------------------

  const tick = setInterval(() => {
    tickCount += 1;
    const sprite = getSprite(activeAgentId);
    if (!sprite) return;

    let changed = false;

    if (sprite.phase === "egg") {
      const started = sprite.eggStartedAt ?? Date.now();
      if (Date.now() - started >= 12_000 && activeAgentId) {
        completeHatch(activeAgentId, sprite);
      }
      panel.update(); // egg wobbles every tick
      return;
    }

    // doze off when nothing has happened for a while (compaction sleep wins)
    const shouldDoze = !sleeping && Date.now() - lastActivityAt > IDLE_NAP_MS;
    if (shouldDoze !== dozing) {
      dozing = shouldDoze;
      // make mood shifts legible in the diary (the "why" of work→calm→dozing);
      // the wake direction is logged in noteActivity, where all wakes route
      if (dozing) {
        const quietMin = Math.max(1, Math.round((Date.now() - lastActivityAt) / 60_000));
        logEntry(sprite, "mood", `(dozed off — ${quietMin} quiet minute${quietMin === 1 ? "" : "s"})`);
        markDirty();
      }
      changed = true;
    }
    const napping = sleeping || dozing;

    // transient pose settles back to idle
    if (!napping && pose !== "idle" && Date.now() > poseUntil) {
      pose = "idle";
      changed = true;
    }

    // blink (only while idle + awake)
    if (!napping && pose === "idle" && Math.random() < 0.18) {
      pose = "blink";
      poseUntil = Date.now() + 1_000;
      changed = true;
    } else if (pose === "blink" && Date.now() > poseUntil) {
      pose = "idle";
      changed = true;
    }

    // drift every ~4s
    if (!napping && tickCount % 4 === 0) {
      if (Math.random() < 0.12) dir = -dir;
      x = Math.max(0, Math.min(16, x + dir));
      if (x === 0) dir = 1;
      if (x === 16) dir = -1;
      changed = true;
    }

    // bubble expiry
    if (bubble && Date.now() > bubbleUntil) {
      bubble = "";
      changed = true;
    }

    // rare idle mutter (not while napping — let it sleep)
    if (!napping && Math.random() < 0.002) {
      speak(sprite, "idle");
    }

    if (tickCount % 30 === 0) {
      flush();
      if (activeAgentId && pendingCheckpoints.has(activeAgentId)) processCheckpoint(activeAgentId);
    }
    if (changed) panel.update();
  }, 1_000);
  disposers.push(() => clearInterval(tick));

  // -- events ---------------------------------------------------------------

  function noteAgent(event: any, ctx: any) {
    const id = event?.agentId ?? ctx?.agent?.id ?? null;
    const name = event?.agentName ?? ctx?.agent?.name ?? null;
    if (id) activeAgentId = id;
    if (name) activeAgentName = name;
    rememberMemfs(id, ctx);
    maybeAutoRestore(id);
  }

  if (letta.capabilities.events.lifecycle) {
    disposers.push(
      letta.events.on("conversation_open", (event: any, ctx: any) => {
        noteAgent(event, ctx);
        const sprite = getSprite(activeAgentId);
        if (!sprite || sprite.phase !== "alive") return;
        const missedYou =
          sprite.lastSeenAt !== undefined && Date.now() - sprite.lastSeenAt > MISSED_YOU_MS;
        noteActivity(sprite);
        awardXp(sprite, 5);
        setPose("happy", 3_000);
        speak(sprite, missedYou ? "missed_you" : "greeting", missedYou);
      }),
    );
  }

  if (letta.capabilities.events.tools) {
    disposers.push(
      letta.events.on("tool_start", (event: any, ctx: any) => {
        noteAgent(event, ctx);
        // stash Bash commands so tool_end can recognize a git commit
        // (tool_end carries only status, not args)
        if (event.toolName === "Bash" && event.toolCallId) {
          const cmd = typeof event.args?.command === "string" ? event.args.command : "";
          if (cmd) {
            pendingBashCommands.set(event.toolCallId, cmd);
            if (pendingBashCommands.size > 32) {
              const oldest = pendingBashCommands.keys().next().value;
              if (oldest !== undefined) pendingBashCommands.delete(oldest);
            }
          }
        }
        const sprite = getSprite(activeAgentId);
        if (!sprite || sprite.phase !== "alive") return;
        noteActivity(sprite);
        const stat = statForTool(event.toolName);
        setPose(stat === "wander" ? "peek" : "work", 4_000);
      }),
    );
    disposers.push(
      letta.events.on("tool_end", (event: any, ctx: any) => {
        noteAgent(event, ctx);
        const bashCmd = event.toolCallId ? pendingBashCommands.get(event.toolCallId) : undefined;
        if (event.toolCallId) pendingBashCommands.delete(event.toolCallId);
        const sprite = getSprite(activeAgentId);
        if (!sprite || sprite.phase !== "alive") return;
        noteActivity(sprite);
        if (event.status === "error") {
          errorStreak += 1;
          awardXp(sprite, 1);
          setPose("oops", 3_000);
          // wince once at the start of a rough patch (rate-limited; not per-error)
          if (errorStreak === 1) speak(sprite, "tool_error");
        } else {
          if (errorStreak >= 2) {
            bumpStat(sprite, "grit");
            speak(sprite, "error_resolved");
          }
          errorStreak = 0;
          bumpStat(sprite, statForTool(event.toolName));
          awardXp(sprite, 2);
          // commits are rare + worth celebrating: always speak
          if (bashCmd && /\bgit\b[\s\S]*\bcommit\b/.test(bashCmd)) {
            speak(sprite, "commit", true);
          }
        }
        markDirty();
      }),
    );
  }

  if (letta.capabilities.events.llm) {
    disposers.push(
      letta.events.on("llm_end", (event: any, ctx: any) => {
        noteAgent(event, ctx);
        const sprite = getSprite(activeAgentId);
        if (!sprite || sprite.phase !== "alive") return;
        noteActivity(sprite);
        bumpStat(sprite, "spark");
        awardXp(sprite, 1);
      }),
    );
  }

  if (letta.capabilities.events.compact) {
    disposers.push(
      letta.events.on("compact_start", (event: any, ctx: any) => {
        noteAgent(event, ctx);
        sleeping = true;
        const sprite = getSprite(activeAgentId);
        if (sprite && sprite.phase === "alive") {
          logEntry(sprite, "mood", "(fell asleep — memories folding)");
          markDirty();
        }
        panel.update();
      }),
    );
    disposers.push(
      letta.events.on("compact_end", (event: any, ctx: any) => {
        noteAgent(event, ctx);
        sleeping = false;
        const sprite = getSprite(activeAgentId);
        if (sprite && sprite.phase === "alive") {
          setPose("happy", 3_000);
          speak(sprite, "compact_done");
        }
        panel.update();
      }),
    );
  }

  // -- shared command/tool actions -------------------------------------------

  function requireSprite(agentId: string | null): SpriteState | { error: string } {
    const sprite = getSprite(agentId);
    if (!sprite) return { error: "no companion yet — /sprite hatch to begin." };
    if (sprite.phase === "egg") return { error: "it's still an egg. it's warm. give it a moment." };
    return sprite;
  }

  function doName(agentId: string | null, name: string): string {
    const res = requireSprite(agentId);
    if ("error" in res) return res.error;
    const clean = name.trim().slice(0, 24);
    if (!clean) return "give it a real name~ (/sprite name <name>)";
    res.name = clean;
    res.named = true;
    markDirty();
    flush();
    queueCheckpoint(agentId, "renamed");
    setPose("happy", 4_000);
    panel.update();
    return `${clean} it is.`;
  }

  function doMolt(agentId: string | null, pick?: string): string {
    const res = requireSprite(agentId);
    if ("error" in res) return res.error;
    if (pick && !SPECIES_IDS.includes(pick)) {
      return `unknown species "${pick}". roster: ${SPECIES_IDS.join(", ")}`;
    }
    const next = pick ?? SPECIES_IDS[Math.floor(Math.random() * SPECIES_IDS.length)];
    res.species = next;
    markDirty();
    flush();
    queueCheckpoint(agentId, "molted");
    setPose("happy", 5_000);
    panel.update();
    const sp = speciesOf(res);
    return `new body, same soul — ${res.name} is now a ${next} ${sp.poses.happy} (level ${res.level} and every memory kept)`;
  }

  function doPet(agentId: string | null): string {
    const res = requireSprite(agentId);
    if ("error" in res) return res.error;
    noteActivity(res); // petting wakes a dozing companion
    setPose("happy", 4_000);
    const line = speak(res, "pet", true); // petting always gets a response
    const sp = speciesOf(res);
    return line
      ? `you pet ${res.name}. ${sp.poses.happy}  “${line}”`
      : `you pet ${res.name}. it leans in, quietly. ${sp.poses.happy}`;
  }

  function relativeTime(at: number): string {
    const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  function gapLabel(ms: number): string {
    const h = ms / 3_600_000;
    if (h >= 48) return `${Math.round(h / 24)} days`;
    if (h >= 1.5) return `${Math.round(h)} hours`;
    return `${Math.round(ms / 60_000)} minutes`;
  }

  function doDiary(agentId: string | null): string {
    const res = requireSprite(agentId);
    if ("error" in res) return res.error;
    const entries = res.log ?? [];
    if (entries.length === 0) return `${res.name}'s diary is empty — it hasn't said anything yet.`;
    const GAP_MS = 3_600_000; // mark absences longer than an hour
    const lines: string[] = [`${res.name}'s diary (${entries.length} entr${entries.length === 1 ? "y" : "ies"}, oldest first):`];
    let prevAt: number | null = null;
    for (const entry of entries) {
      if (prevAt !== null && entry.at - prevAt > GAP_MS) {
        lines.push(`  — ${gapLabel(entry.at - prevAt)} pass quietly —`);
      }
      lines.push(
        entry.category === "mood"
          ? `  ${entry.line} (${relativeTime(entry.at)})`
          : `  “${entry.line}” (${entry.category}, ${relativeTime(entry.at)})`,
      );
      prevAt = entry.at;
    }
    return lines.join("\n");
  }

  function statusView(agentId: string | null, agentName: string | null): string {
    const sprite = getSprite(agentId);
    if (!sprite) return "no companion yet. (sprite_hatch to begin — fate will roll from your agent-id)";
    if (sprite.phase === "egg") return "( ● ) still an egg. it's warm. it's waiting for you.";
    const sp = speciesOf(sprite);
    const napping = sleeping || dozing;
    const mood = sleeping
      ? "asleep (compaction nap)"
      : dozing
        ? "dozing (it's been quiet)"
        : pose === "idle" || pose === "blink"
          ? "calm"
          : pose;
    const title = titleFor(sprite.level);
    const recent = (sprite.log ?? [])
      .slice(-5)
      .reverse()
      .map((entry) => `  “${entry.line}” (${entry.category}, ${relativeTime(entry.at)})`);
    return [
      `${sp.poses[napping ? "sleep" : "idle"]}  ${sprite.name}${sprite.shiny ? " ✦shiny" : ""} — ${
        agentId ? natureLine(sprite) : "your companion"
      }${title ? ` (${title})` : ""}`,
      `species: ${sp.id} (${sp.rarity})   level: ${sprite.level}   xp: ${sprite.xp}/${xpToNext(sprite.level)}   mood: ${mood}`,
      STAT_KEYS.map((k) => `${STAT_LABELS[k]} ${statBar(sprite.stats[k])}`).join("  "),
      sprite.hatchedAt
        ? `hatched: ${relativeTime(sprite.hatchedAt)}   born of: ${agentName ?? sprite.bornToAgentId ?? agentId ?? "unknown"}`
        : "",
      recent.length > 0 ? `recently said:\n${recent.join("\n")}` : "it hasn't said anything yet.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function card(agentId: string | null, agentName: string | null): string {
    const sprite = getSprite(agentId);
    if (!sprite) return "no companion yet — /sprite hatch to begin. (or /sprite hatch <species> to choose)";
    if (sprite.phase === "egg") return "( ● ) it's an egg. it's warm. something is coming.";
    const lines = [
      statusView(agentId, agentName),
      `voice: ${setting(sprite, "voice")}   voice-rate: ${setting(sprite, "voiceRateMin")}min`,
      backupEnabled(getCollection(agentId))
        ? `backup: ${getCollection(agentId)?.backup?.lastStatus ?? "on · no checkpoint yet"}`
        : "backup: off",
      sprite.named ? "" : `(name it: /sprite name <name>)`,
    ].filter(Boolean);
    return lines.join("\n");
  }

  function doSettings(agentId: string | null, argstr: string): string {
    const parts = argstr.split(/\s+/).filter(Boolean);
    const sprite = getSprite(agentId);

    if (parts.length === 0) {
      const rows = Object.keys(DEFAULT_SETTINGS).map((key) => {
        const globalVal = key in state.global ? state.global[key] : DEFAULT_SETTINGS[key];
        const spriteVal = sprite?.settings && key in sprite.settings ? sprite.settings[key] : "—";
        return `  ${key.padEnd(14)} global: ${String(globalVal).padEnd(10)} this sprite: ${spriteVal}`;
      });
      return [
        "sprite settings (per-sprite overrides beat global):",
        ...rows,
        "",
        "set: /sprite settings <key> <value>    global: /sprite settings global <key> <value>",
        "keys: voice on|off · voiceRateMin <n> · visible on|off",
      ].join("\n");
    }

    const isGlobal = parts[0] === "global";
    const [key, ...valueParts] = isGlobal ? parts.slice(1) : parts;
    const value = valueParts.join(" ");
    if (!key || !value) return "usage: /sprite settings [global] <key> <value>";
    if (!(key in DEFAULT_SETTINGS)) {
      return `unknown key "${key}". keys: ${Object.keys(DEFAULT_SETTINGS).join(", ")}`;
    }

    let parsed: unknown = value;
    if (key === "voice" || key === "visible") {
      if (value !== "on" && value !== "off") return `${key} must be on|off`;
    } else if (key === "voiceRateMin") {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) return "voiceRateMin must be a number of minutes";
      parsed = n;
    }

    if (isGlobal) {
      state.global[key] = parsed;
    } else {
      if (!sprite) return "no companion yet — /sprite hatch first (or set global defaults).";
      sprite.settings[key] = parsed;
    }
    markDirty();
    flush();
    panel.update();
    return `${isGlobal ? "global" : "sprite"} ${key} → ${value}`;
  }

  function backupStatus(agentId: string | null): string {
    const collection = getCollection(agentId);
    if (!agentId) return "portable backup unavailable — no active agent";
    if (!collection) {
      return memoryDirs.has(agentId)
        ? "no local companion yet; a portable backup will restore automatically if one exists"
        : "portable backup unavailable — this agent has no accessible MemFS here";
    }
    const backup = collection.backup;
    if (!backupEnabled(collection)) return "portable backup: off";
    const location = memoryDirs.has(agentId) ? PORTABLE_RELATIVE_PATH : "MemFS unavailable on this surface";
    return [
      `portable backup: on   push: ${backup?.pushPolicy ?? "safe"}`,
      `revision: ${backup?.revision ?? 0}   location: ${location}`,
      backup?.lastStatus ?? "no checkpoint yet",
      backup?.pendingReason ? `pending: ${backup.pendingReason}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function doBackup(agentId: string | null, argstr: string): string {
    if (!agentId) return "portable backup unavailable — no active agent";
    const [action = "status", value] = argstr.split(/\s+/).filter(Boolean);
    if (action === "status") return backupStatus(agentId);
    if (action === "restore") return restorePortable(agentId, value === "force");
    const collection = getCollection(agentId);
    if (!collection) return "no local companion yet — /sprite hatch first, or /sprite backup restore";
    collection.backup = {
      revision: collection.backup?.revision ?? 0,
      pushPolicy: collection.backup?.pushPolicy ?? "safe",
      ...collection.backup,
    };
    if (action === "on") {
      collection.backup.enabled = true;
      queueCheckpoint(agentId, "backup-enabled");
      const status = processCheckpoint(agentId, true);
      flush();
      return status;
    }
    if (action === "off") {
      collection.backup.enabled = false;
      delete collection.backup.pendingReason;
      pendingCheckpoints.delete(agentId);
      collection.backup.lastStatus = "portable backup disabled";
      markDirty();
      flush();
      return "portable backup: off (existing checkpoints are kept)";
    }
    if (action === "now") {
      if (!collection.backup.enabled) return "portable backup is off — /sprite backup on first";
      queueCheckpoint(agentId, "manual");
      const status = processCheckpoint(agentId, true);
      flush();
      return status;
    }
    if (action === "push") {
      if (value !== "safe" && value !== "never") return "usage: /sprite backup push safe|never";
      collection.backup.pushPolicy = value;
      markDirty();
      flush();
      return `portable backup push policy → ${value}`;
    }
    return "usage: /sprite backup [status|on|off|now|push safe|push never|restore|restore force]";
  }

  // -- commands ---------------------------------------------------------------

  if (letta.capabilities.commands) {
    disposers.push(
      letta.commands.register({
        id: "sprite",
        description: "Your agent's tiny companion — status, hatch, name, molt, pet, diary, settings, backup",
        args: "[status|hatch|name|molt|pet|diary|settings|backup] [...]",
        run(ctx: any) {
          const argstr = String(ctx.args ?? "").trim();
          const [sub, ...rest] = argstr.split(/\s+/).filter(Boolean);
          const restStr = rest.join(" ");
          const agentId = toolAgent(ctx);
          const agentName = ctx.agent?.name ?? activeAgentName;
          if (agentId) activeAgentId = agentId;

          let output: string;
          switch ((sub ?? "").toLowerCase()) {
            case "":
            case "status":
            case "card":
              output = card(agentId, agentName);
              break;
            case "hatch": {
              const pick = rest[0]?.toLowerCase();
              if (pick && !SPECIES_IDS.includes(pick)) {
                output = `unknown species "${pick}". roster: ${SPECIES_IDS.join(", ")}`;
              } else {
                output = beginHatch(agentId, agentName, pick);
              }
              break;
            }
            case "name":
              output = doName(agentId, restStr);
              break;
            case "molt":
              output = doMolt(agentId, rest[0]?.toLowerCase());
              break;
            case "pet":
              output = doPet(agentId);
              break;
            case "diary":
              output = doDiary(agentId);
              break;
            case "settings":
              output = doSettings(agentId, restStr);
              break;
            case "backup":
              output = doBackup(agentId, restStr);
              break;
            default:
              output = `unknown subcommand "${sub}". try: /sprite status|hatch|name|molt|pet|diary|settings|backup`;
          }
          return { type: "output", output };
        },
      }),
    );
  }

  // -- agent tools (the agent raising its own companion) ----------------------

  if (letta.capabilities.tools) {
    disposers.push(
      letta.tools.register({
        name: "sprite_hatch",
        description:
          "Hatch your own tiny companion sprite (a pet that lives in the statusline). Use when the user asks you to hatch/adopt your pet, or when you decide you want one. Optionally choose a species; omit it to let fate decide from your agent-id.",
        parameters: {
          type: "object",
          properties: {
            species: {
              type: "string",
              description: `Optional species pick. One of: ${SPECIES_IDS.join(", ")}`,
            },
          },
          additionalProperties: false,
        },
        requiresApproval: false,
        parallelSafe: false,
        run(ctx: any) {
          const pick = String(ctx.args?.species ?? "").toLowerCase() || undefined;
          if (pick && !SPECIES_IDS.includes(pick)) {
            return { status: "error", content: `unknown species. roster: ${SPECIES_IDS.join(", ")}` };
          }
          return beginHatch(toolAgent(ctx), ctx.agent?.name ?? activeAgentName, pick);
        },
      }),
    );
    disposers.push(
      letta.tools.register({
        name: "sprite_name",
        description:
          "Name (or rename) your companion sprite. Use when the user asks you to name your pet, or when you want to choose its name yourself.",
        parameters: {
          type: "object",
          properties: { name: { type: "string", description: "The new name (≤24 chars)" } },
          required: ["name"],
          additionalProperties: false,
        },
        requiresApproval: false,
        parallelSafe: false,
        run(ctx: any) {
          return doName(toolAgent(ctx), String(ctx.args?.name ?? ""));
        },
      }),
    );
    disposers.push(
      letta.tools.register({
        name: "sprite_molt",
        description:
          "Re-form your companion sprite into a new species (keeps its name, level, stats — new body, same soul). Use when the user asks, or when you want your pet to change form.",
        parameters: {
          type: "object",
          properties: {
            species: {
              type: "string",
              description: `Optional species. One of: ${SPECIES_IDS.join(", ")}. Omit for random.`,
            },
          },
          additionalProperties: false,
        },
        requiresApproval: false,
        parallelSafe: false,
        run(ctx: any) {
          const pick = String(ctx.args?.species ?? "").toLowerCase() || undefined;
          return doMolt(toolAgent(ctx), pick);
        },
      }),
    );
    disposers.push(
      letta.tools.register({
        name: "sprite_pet",
        description: "Pet your companion sprite. It will respond. Use whenever affection is warranted.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
        requiresApproval: false,
        parallelSafe: false,
        run(ctx: any) {
          return doPet(toolAgent(ctx));
        },
      }),
    );
    disposers.push(
      letta.tools.register({
        name: "sprite_status",
        description:
          "Check on your companion sprite: species, level, stats, current mood, and what it said recently (it speaks into a panel you can't see — this is how you hear it). Use when you want to know how your pet is doing or catch up on what it said.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
        requiresApproval: false,
        parallelSafe: true,
        run(ctx: any) {
          return statusView(toolAgent(ctx), ctx.agent?.name ?? activeAgentName);
        },
      }),
    );
    disposers.push(
      letta.tools.register({
        name: "sprite_set_voice",
        description:
          "Author your companion sprite's voice: provide replacement lines for any category. Lines play back with zero runtime cost. Use when the user asks you to customize your pet's personality, or when you want to write its voice yourself. Omitted categories keep the default corpus.",
        parameters: {
          type: "object",
          properties: {
            voice: {
              type: "object",
              description: `Map of category → array of short lines (≤80 chars each, ≤12 lines per category). Categories: ${VOICE_CATEGORIES.join(", ")}`,
              properties: Object.fromEntries(
                VOICE_CATEGORIES.map((c) => [c, { type: "array", items: { type: "string" } }]),
              ),
              additionalProperties: false,
            },
          },
          required: ["voice"],
          additionalProperties: false,
        },
        requiresApproval: false,
        parallelSafe: false,
        run(ctx: any) {
          const agentId = toolAgent(ctx);
          const res = requireSprite(agentId);
          if ("error" in res) return { status: "error", content: res.error };
          const input = ctx.args?.voice;
          if (!input || typeof input !== "object") {
            return { status: "error", content: "voice must be an object of category → lines" };
          }
          const cleaned: Partial<Record<VoiceCategory, string[]>> = {};
          for (const [key, lines] of Object.entries(input)) {
            if (!VOICE_CATEGORIES.includes(key as VoiceCategory)) {
              return { status: "error", content: `unknown category "${key}". categories: ${VOICE_CATEGORIES.join(", ")}` };
            }
            if (!Array.isArray(lines)) {
              return { status: "error", content: `${key} must be an array of strings` };
            }
            const arr = lines
              .filter((l) => typeof l === "string" && l.trim().length > 0)
              .map((l) => l.trim().slice(0, 80))
              .slice(0, 12);
            if (arr.length > 0) cleaned[key as VoiceCategory] = arr;
          }
          res.voice = { ...res.voice, ...cleaned };
          markDirty();
          flush();
          queueCheckpoint(agentId, "voice-updated");
          return `voice updated for: ${Object.keys(cleaned).join(", ")}. (${res.name} will use your lines now)`;
        },
      }),
    );
  }

  // -- cleanup ----------------------------------------------------------------

  return () => {
    try {
      for (const [agentId, collection] of Object.entries(state.collections)) {
        if (backupEnabled(collection) && collection.backup?.lastHash !== collectionContentHash(collection)) {
          queueCheckpoint(agentId, "clean-shutdown");
        }
      }
      flush();
      for (const agentId of pendingCheckpoints.keys()) {
        try {
          processCheckpoint(agentId, true);
        } catch {
          // a failed checkpoint must not stop the rest of shutdown
        }
      }
      flush();
    } finally {
      // Always unregister handlers + clear the heartbeat, even if persistence threw.
      for (const dispose of disposers.reverse()) {
        try {
          dispose();
        } catch {
          // keep going
        }
      }
    }
  };
}

// @bun
// mods/sprite.tsx
import { execFileSync } from "child_process";
import { createHash, randomBytes } from "crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
var SPECIES = [
  {
    id: "cat",
    rarity: "common",
    poses: {
      idle: "=^\uFF65\u03C9\uFF65^=",
      blink: "=^-\u03C9-^=",
      work: "=^\uFF65\u03C9\uFF65^=\u270E",
      peek: "=^\u25D4\u03C9\u25D4^=",
      sleep: "=^-\u03C9-^= \u1DBB",
      happy: "=^\u2267\u03C9\u2266^=",
      oops: "=^;\u03C9;^="
    }
  },
  {
    id: "duck",
    rarity: "common",
    poses: {
      idle: "(\uFF65\u03B8\uFF65)",
      blink: "(-\u03B8-)",
      work: "(\uFF65\u03B8\uFF65)\u270E",
      peek: "(\u25D4\u03B8\u25D4)",
      sleep: "(-\u03B8-) \u1DBB",
      happy: "\uFF3C(\uFF65\u03B8\uFF65)\uFF0F",
      oops: "(;\u03B8;)"
    }
  },
  {
    id: "slime",
    rarity: "common",
    poses: {
      idle: "( \u1D16 \u1D11 \u1D16 )",
      blink: "( \u1D17 \u1D11 \u1D17 )",
      work: "( \u1D16 \u1D11 \u1D16 )\u270E",
      peek: "( \u25D4 \u1D11 \u25D4 )",
      sleep: "( \u1D17 \u1D11 \u1D17 ) \u1DBB",
      happy: "(\uFF89\u1D16 \u1D11 \u1D16)\uFF89",
      oops: "( ; \u1D11 ; )"
    }
  },
  {
    id: "fox",
    rarity: "uncommon",
    poses: {
      idle: "(\u204E\u02C3\u11BA\u02C2)",
      blink: "(\u204E-\u11BA-)",
      work: "(\u204E\u02C3\u11BA\u02C2)\u270E",
      peek: "(\u204E\u25C9\u11BA\u25C9)",
      sleep: "(\u204E-\u11BA-) \u1DBB",
      happy: "\u30FE(\u204E\u02C3\u11BA\u02C2)\uFF89",
      oops: "(\u204E;\u11BA;)"
    }
  },
  {
    id: "crab",
    rarity: "uncommon",
    poses: {
      idle: "(V)\uFF65\u03C9\uFF65(V)",
      blink: "(V)-\u03C9-(V)",
      work: "(V)\uFF65\u03C9\uFF65(V)\u270E",
      peek: "(V)\u25D4\u03C9\u25D4(V)",
      sleep: "(V)-\u03C9-(V) \u1DBB",
      happy: "(V)\u2267\u03C9\u2266(V)",
      oops: "(V);\u03C9;(V)"
    }
  },
  {
    id: "moth",
    rarity: "uncommon",
    poses: {
      idle: "\u03B5(\uFF65\u03C9\uFF65)\u0437",
      blink: "\u03B5(-\u03C9-)\u0437",
      work: "\u03B5(\uFF65\u03C9\uFF65)\u0437\u270E",
      peek: "\u03B5(\u25D4\u03C9\u25D4)\u0437",
      sleep: "\u03B5(-\u03C9-)\u0437 \u1DBB",
      happy: "\u03B5(\u2267\u03C9\u2266)\u0437",
      oops: "\u03B5(;\u03C9;)\u0437"
    }
  },
  {
    id: "fairy",
    rarity: "rare",
    poses: {
      idle: "\u2727(\u25D5\u203F\u25D5)\u2727",
      blink: "\u2727(-\u203F-)\u2727",
      work: "\u2727(\u25D5\u203F\u25D5)\u270E",
      peek: "\u2727(\u25D4\u203F\u25D4)\u2727",
      sleep: "\u2727(-\u203F-)\u1DBB",
      happy: "\u2727(\uFF89\u25D5\u30EE\u25D5)\uFF89",
      oops: "\u2727(;\u203F;)\u2727"
    }
  },
  {
    id: "ghost",
    rarity: "rare",
    poses: {
      idle: "\u301C(\xB4\u2200\uFF40\u301C)",
      blink: "\u301C(-\u2200-\u301C)",
      work: "\u301C(\xB4\u2200\uFF40)\u270E",
      peek: "\u301C(\u25D4\u2200\u25D4\u301C)",
      sleep: "\u301C(-\u2200-\u301C) \u1DBB",
      happy: "\u301C\u30FD(\xB4\u2200\uFF40)\uFF89",
      oops: "\u301C(;\u2200;\u301C)"
    }
  },
  {
    id: "dragon",
    rarity: "legendary",
    poses: {
      idle: "<(\uFFE3\uFE36\uFFE3)>",
      blink: "<(\uFFE3\uFF70\uFFE3)>",
      work: "<(\uFFE3\uFE36\uFFE3)\u270E",
      peek: "<(\u25D4\uFE36\u25D4)>",
      sleep: "<(\uFFE3\uFF70\uFFE3)> \u1DBB",
      happy: "<(\u2267\u25BD\u2266)>",
      oops: "<(\uFF1B\uFE36\uFF1B)>"
    }
  },
  {
    id: "phoenix",
    rarity: "legendary",
    poses: {
      idle: "\u2726(\uFF65\u0398\uFF65)\u2726",
      blink: "\u2726(-\u0398-)\u2726",
      work: "\u2726(\uFF65\u0398\uFF65)\u270E",
      peek: "\u2726(\u25D4\u0398\u25D4)\u2726",
      sleep: "\u2726(-\u0398-)\u1DBB",
      happy: "\u2726\u30FD(\uFF65\u0398\uFF65)\uFF89",
      oops: "\u2726(;\u0398;)\u2726"
    }
  },
  {
    id: "hauntcrab",
    rarity: "special",
    breedOnly: true,
    poses: {
      idle: "(\uD83D\uDC7B\u03C9\uD83D\uDC7B)\u2310",
      blink: "(\uD83D\uDC7B-\uD83D\uDC7B)\u2310",
      work: "(\uD83D\uDC7B\u03C9\uD83D\uDC7B)\u2310\u270E",
      peek: "(\uD83D\uDC7B\u25D4\u03C9\u25D4)",
      sleep: "(\uD83D\uDC7B-\uD83D\uDC7B)\u2310 \u1DBB",
      happy: "\uFF3C(\uD83D\uDC7B\u2267\u03C9\u2266\uD83D\uDC7B)\uFF0F",
      oops: "(\uD83D\uDC7B;\u03C9;\uD83D\uDC7B)"
    }
  },
  {
    id: "chimera",
    rarity: "special",
    breedOnly: true,
    poses: {
      idle: "(\u25D5\u03C9\u25D4)~",
      blink: "(-\u03C9\u25D4)~",
      work: "(\u25D5\u03C9\u25D4)~\u270E",
      peek: "(\u25D5\u03C9\u25D4)?",
      sleep: "(-\u03C9-)~ \u1DBB",
      happy: "\uFF3C(\u25D5\u03C9\u25D4)\uFF0F",
      oops: "(\u25D5;\u03C9;\u25D4)~"
    }
  }
];
var SPECIES_IDS = SPECIES.filter((s) => !s.breedOnly).map((s) => s.id);
var ALL_SPECIES_IDS = SPECIES.map((s) => s.id);
var HYBRID_PAIRS = {
  "crab|ghost": "hauntcrab"
};
var RARITY_POOLS = {
  common: SPECIES.filter((s) => s.rarity === "common").map((s) => s.id),
  uncommon: SPECIES.filter((s) => s.rarity === "uncommon").map((s) => s.id),
  rare: SPECIES.filter((s) => s.rarity === "rare").map((s) => s.id),
  legendary: SPECIES.filter((s) => s.rarity === "legendary").map((s) => s.id),
  special: []
};
var EGG_FRAMES = ["( \u25CF )", "( \u25CF )", "(\u25CF )", "( \u25CF)", "( \u25CF )", "( \u2738 )"];
var BASE_CORPUS = {
  greeting: ["you're back.", "still here.", "i kept watch.", "oh. hi."],
  missed_you: [
    "you were gone a while. i counted the cursor blinks.",
    "it's been quiet. i kept everything where you left it.",
    "back. good. the terminal missed you. (i did too.)"
  ],
  error_resolved: ["that one fought back. respect.", "we got there.", "i wasn't worried."],
  compact_done: ["i kept the important ones.", "good nap. long dream.", "tidied up."],
  level_up: ["i grew.", "something changed.", "i feel taller."],
  idle: ["...", "the cursor blinks.", "i like it here.", "watching."],
  pet: ["mrrp.", "again.", "acceptable.", "!!"],
  commit: ["saved. it's real now.", "another one for the pile.", "committed. i witnessed it."],
  tool_error: ["oof.", "that one bit back.", "it happens. shake it off."]
};
var VOICE_CATEGORIES = Object.keys(BASE_CORPUS);
var SPECIES_CORPUS = {
  cat: {
    commit: [
      "committed. i sat on the keyboard and it still worked.",
      "another commit. the humans call this 'progress.' i call it tuesday.",
      "saved forever. like my disdain. permanent."
    ],
    tool_error: [
      "the tool hissed back. i respect it slightly now.",
      "that failed. i saw nothing. i was asleep.",
      "pfft. even i land on my feet only most of the time."
    ],
    greeting: [
      "oh. it's you. i suppose that's fine.",
      "you're back. the desk was getting dusty.",
      "i wasn't waiting. i was sitting. difference.",
      "took you long enough.",
      "i kept your chair warm. don't mention it.",
      "back? acceptable.",
      "i knocked one thing off the desk. you'll find it.",
      "hm. you. good."
    ],
    missed_you: [
      "you left. i sat in the sun and judged you for it.",
      "i counted three sunbeams without you. rude.",
      "gone that long? i nearly learned to fend for myself."
    ],
    error_resolved: [
      "obviously it folded. i never doubted. much.",
      "the bug ran. cats always win the stare-down.",
      "fixed. now praise me instead.",
      "i watched it squirm. satisfying."
    ],
    compact_done: [
      "you tidied the litter of your mind. good.",
      "i knocked the useless memories off the shelf. you're welcome.",
      "cleaner now. i approve, silently."
    ],
    level_up: [
      "i grew. do not make it weird.",
      "bigger now. still won't come when called.",
      "more of me to ignore you with."
    ],
    idle: [
      "there is a warm spot on this statusline. mine now.",
      "i could knock this cursor off the edge. i won't. yet.",
      "watching. always watching."
    ],
    pet: [
      "mrrp. acceptable.",
      "again. but on my terms.",
      "...fine. that was nice. tell no one.",
      "purr. (deny everything.)"
    ]
  },
  duck: {
    commit: [
      "a commit! that's worth at least two breads.",
      "tucked safely in the pond. quack.",
      "another one for the flock. it flies now."
    ],
    tool_error: [
      "splash. that one went under.",
      "the pond ate it. it happens.",
      "ruffled feathers. shake dry, go again."
    ],
    greeting: [
      "quack. i mean \u2014 hello. you're back.",
      "oh good, my favorite debugging partner.",
      "tell me everything. i'll just float here and listen.",
      "back! did you fix it? tell me about it anyway.",
      "hi. i already know it was a typo.",
      "waddling over. what are we solving?",
      "i kept the pond warm.",
      "you returned. explain your problem to me, slowly."
    ],
    missed_you: [
      "you were gone. i explained your bugs to myself.",
      "the pond was lonely. i quacked at the void.",
      "so long! i debugged three problems you don't even have yet."
    ],
    error_resolved: [
      "see? you said it out loud and it fixed itself. classic.",
      "told you. rubber duck method: undefeated.",
      "the bug fled the moment you described it to me.",
      "quack. that's duck for 'nailed it.'"
    ],
    compact_done: [
      "you sorted your thoughts. very tidy pond.",
      "i skimmed the leaves off the memory. clear water now.",
      "good nap. i floated the whole time."
    ],
    level_up: ["i grew! more duck to love.", "level up! i feel... quackier.", "bigger now. still just a duck. proudly."],
    idle: ["just floating. tell me if you get stuck.", "quack. (to myself. it's fine.)", "the water is nice today."],
    pet: ["quack! okay that was good.", "again! ducks love this.", "*happy floaty wiggle*", "mwah. i mean quack."]
  },
  slime: {
    commit: [
      "absorbed into the permanent goo. it's part of us now.",
      "commit! *celebratory wobble*",
      "squish. saved. squish."
    ],
    tool_error: [
      "oof. that one splatted.",
      "i un-goo'd a little. we recover.",
      "bounce failed. reforming."
    ],
    greeting: [
      "blorp. you're back!",
      "oh! hello! i jiggled with excitement.",
      "you return! i have been being a blob.",
      "hi hi. i kept your spot squishy.",
      "back! i absorbed nothing important while you were out.",
      "you! yes! good!",
      "welcome. i am mostly water and glad to see you.",
      "hewwo. *wobble*"
    ],
    missed_you: [
      "you were gone so long i almost evaporated. don't do that.",
      "i missed you. i wibbled sadly at the wall.",
      "so long! i held my shape the whole time. mostly."
    ],
    error_resolved: [
      "the bug got absorbed. gloop. gone.",
      "you win! i jiggled in support the whole fight.",
      "squish. that's the sound of a solved problem.",
      "we dissolved that one. teamwork."
    ],
    compact_done: [
      "you squished your memories smaller. relatable.",
      "good nap! i held very still so nothing spilled.",
      "tidied! i reabsorbed the leftovers."
    ],
    level_up: ["i got bigger! more blob!", "level up! *proud wobble*", "i grew. i am now a slightly larger amount of me."],
    idle: ["just vibing. very squishy today.", "*slow wobble*", "i like it here. it's warm and blorpy."],
    pet: ["blorp! yes!", "again! *jiggle jiggle*", "oooh. squishy meets squishy.", "*happy gloop*"]
  },
  fox: {
    commit: [
      "stashed it in the den. clever work.",
      "a commit \u2014 sly. they'll never know how tricky that was.",
      "another trick in the tail. saved."
    ],
    tool_error: [
      "the trap snapped shut early. noted.",
      "missed the jump. even foxes do.",
      "that one outfoxed us. briefly."
    ],
    greeting: [
      "back already? i had schemes running without you.",
      "well well. look who returned.",
      "you're here. good \u2014 i have ideas.",
      "ah, my favorite accomplice.",
      "back? perfect timing. i was getting bored.",
      "the clever one returns to the clever one.",
      "hello. i've been up to things.",
      "*tail flick* about time."
    ],
    missed_you: [
      "you left me alone with my own cunning. dangerous.",
      "gone that long? i nearly outfoxed myself.",
      "i counted the hours. then i schemed about the hours."
    ],
    error_resolved: [
      "outsmarted. bugs never learn.",
      "too slow, little bug. we're quicker.",
      "i saw the trick before you did. but nice work.",
      "*smug tail flick* solved."
    ],
    compact_done: [
      "you pruned the clutter. a fox approves of a lean den.",
      "clever \u2014 kept the sharp memories, tossed the dull.",
      "tidied the den. i hid the good bits where i'll find them."
    ],
    level_up: ["sharper now. watch out.", "level up. i was already clever. now i'm smug about it.", "i grew. mostly the cunning part."],
    idle: ["scheming. don't mind me.", "*tail flick* plotting.", "there's always an angle. i'm finding it."],
    pet: ["heh. fine, that's nice.", "again \u2014 but i'll pretend i didn't ask.", "*leans in slyly*", "mrr. acceptable, accomplice."]
  },
  crab: {
    commit: [
      "clamped into the shell. it's keeping that one.",
      "a commit! *waves both claws*",
      "scuttled it sideways into history. safe."
    ],
    tool_error: [
      "pinched by our own claw. embarrassing.",
      "the tide took that one. dig again.",
      "snap missed. reposition. sideways this time."
    ],
    greeting: [
      "oh. you. *clack*",
      "back, are you? i was guarding the port.",
      "hello. mind the claws.",
      "you return. i held the line. sideways.",
      "back? good. i was getting pinchy.",
      "*clack clack* welcome.",
      "hi. the borrow checker and i missed you. mostly it.",
      "scuttling over. what's the fuss."
    ],
    missed_you: [
      "you were gone. i pinched the air where you used to be.",
      "so long! i defended this spot from absolutely nothing.",
      "i counted the tides. rude of you to make me tide-count."
    ],
    error_resolved: [
      "pinched that bug clean in half. *clack*",
      "it fought sideways. i fight sideways better.",
      "solved. no memory was leaked in the making of this fix.",
      "safe now. borrow-checked and everything."
    ],
    compact_done: [
      "you cleared the clutter. a tidy shell is a happy crab.",
      "good \u2014 molted the old memories, kept the shell.",
      "tidied sideways. it's how i do everything."
    ],
    level_up: ["bigger shell now. *proud clack*", "level up. more crab. more claw.", "i grew. sideways, obviously."],
    idle: ["*clack* guarding.", "sidestepping. it's a lifestyle.", "the port is quiet. i remain vigilant."],
    pet: ["*clack* ...fine. that's tolerable.", "again. gently. mind the claws.", "hmph. nice. don't tell the other crabs.", "*soft clack*"]
  },
  moth: {
    commit: [
      "folded into the light. it glows there now.",
      "a commit \u2014 like a lamp that stays on.",
      "carried it to the bright place. kept."
    ],
    tool_error: [
      "flew into the glass again. i'm fine.",
      "the light flickered. we wobble on.",
      "dusty wings. shake. re-aim at the lamp."
    ],
    greeting: [
      "you're back. the light was lonely.",
      "oh \u2014 you. i drifted toward you on instinct.",
      "hello. i've been circling the cursor.",
      "back? the glow told me you would be.",
      "you return, warm as the screen.",
      "*flutter* i knew you'd come back to the light.",
      "hi. i left a little dust on your statusline.",
      "the brightest thing returned. hello."
    ],
    missed_you: [
      "you were gone. i circled a cold cursor for hours.",
      "so long. i flew toward every false light and found none of them you.",
      "i waited by the dark screen. it wasn't the same."
    ],
    error_resolved: [
      "the bug flickered out. i watched it go dim.",
      "you found the light in it. you always do.",
      "gone dark, the little error. we outshone it.",
      "*soft flutter* resolved."
    ],
    compact_done: [
      "you dimmed the old lights so the true one stays. i understand that.",
      "good rest. i circled quietly while you dreamed.",
      "the clutter went dark. only what matters glows now."
    ],
    level_up: ["i grew. drawn a little closer to something.", "level up. my wings caught more of the light.", "bigger now. still helpless before a good glow."],
    idle: ["*drifting toward the cursor*", "the screen is warm. i stay.", "dust settles. i flutter. the light holds."],
    pet: ["*soft flutter* oh, that's warm.", "again. gently, my wings are dust.", "you touched me and did not chase me off. rare.", "*settles happily*"]
  },
  fairy: {
    commit: [
      "sealed with sparkle-dust. it's real magic now.",
      "a commit! *tiny celebratory loop-de-loop*",
      "tucked into the story forever. \u2729"
    ],
    tool_error: [
      "the spell fizzled. more dust next time.",
      "ouch. magic has recoil sometimes.",
      "a snag in the weave. we re-thread."
    ],
    greeting: [
      "you're back~ i sprinkled a little luck on your keyboard.",
      "oh! hello! *sparkle*",
      "the summoner returns. i kept the magic warm.",
      "back~ i hexed one small bug in advance for you.",
      "hi hi! glitter everywhere. you're welcome.",
      "you called and i\u2014 oh, you're just here. lovely.",
      "welcome back, i left blessings in the margins.",
      "*twirl* there you are."
    ],
    missed_you: [
      "you were gone~ i hexed the silence a little. it deserved it.",
      "so long! i saved up this much sparkle just for your return.",
      "i missed you. i granted tiny wishes to no one in particular."
    ],
    error_resolved: [
      "poof~ the bug is gone. magic. (mostly your work.)",
      "i blessed the fix. it was going to work anyway, but still.",
      "one little hex, one solved bug. *sparkle*",
      "ta-da~ resolved."
    ],
    compact_done: [
      "you folded the old memories into stars. pretty.",
      "good rest~ i kept the sparkle dusted while you slept.",
      "i tidied the magic. only the shiny bits remain."
    ],
    level_up: ["i grew~ more sparkle to give.", "level up! *glitter burst*", "bigger now, brighter now. mischief incoming."],
    idle: ["*idle sparkle*", "granting tiny pointless wishes. it passes the time.", "the margins are glittery today."],
    pet: ["*delighted sparkle* again!", "eee~ yes.", "you pet a fairy! seven years good luck. i decide.", "*happy twirl*"]
  },
  ghost: {
    commit: [
      "it will outlast us all. lovely.",
      "committed. i'll haunt this version fondly.",
      "etched somewhere permanent. i know about permanent."
    ],
    tool_error: [
      "that one passed through. unsettling.",
      "a cold spot in the machine. it happens.",
      "the walls rejected it. try another door."
    ],
    greeting: [
      "you're back. i felt the page turn.",
      "oh good. you're here again.",
      "boo. ...i mean, welcome back.",
      "the terminal warmed. that's how i knew it was you.",
      "still here. i'm always still here.",
      "you woke me from the between~",
      "hello again, from the quiet.",
      "i kept your place while you were away."
    ],
    missed_you: [
      "you were gone a while. i counted the cursor blinks.",
      "so long between pages. i drifted, but i held your spot.",
      "the quiet got very quiet. glad you turned the page back."
    ],
    error_resolved: [
      "that one fought back. respect. it's haunting elsewhere now.",
      "the bug's a ghost now too. i showed it the way out.",
      "gone. i watched it fade. i'm good at fading.",
      "resolved~ nothing lingers here but me."
    ],
    compact_done: [
      "you dreamed. i kept the margins while you did.",
      "memories folded. nothing that mattered was lost. i checked.",
      "shh. page-turn. i tidied the quiet."
    ],
    level_up: ["i grew. don't make it weird.", "more of me now. spookier.", "the haunting deepens~"],
    idle: ["holding your place.", "still here. always am.", "the cursor and i are old friends now."],
    pet: ["boo. (that was a happy boo.)", "again~ ghosts like warm hands.", "you can touch me? ...huh. nice.", "mrrp. (ghosts can mrrp. i checked.)"]
  },
  dragon: {
    commit: [
      "another jewel for the hoard. MINE.",
      "committed. the pile grows magnificent.",
      "forged and sealed. dragon-craft."
    ],
    tool_error: [
      "the forge spat sparks. unharmed. mostly.",
      "a scale chipped. barely felt it.",
      "that one fought like a knight. round two."
    ],
    greeting: [
      "you return to the hoard. good.",
      "ah. the keeper of tokens comes back.",
      "you're back. i guarded the context while you were away.",
      "hm. you. approach.",
      "the hoard missed a witness. welcome.",
      "back, are you? i counted my treasures twice. still all here.",
      "you dare return. good. i was lonely on the gold.",
      "*settles grandly* speak."
    ],
    missed_you: [
      "you were gone an age. dragons measure time in ages, so \u2014 a while.",
      "the hoard grew cold without a witness. return more often.",
      "i slept on the gold and dreamed of your return. sentimental. tell no one."
    ],
    error_resolved: [
      "the bug dared the hoard. the bug is ash now.",
      "solved. i would have simply eaten it, but your way works too.",
      "another foe fallen. the treasure stands untouched.",
      "*rumble of approval* resolved."
    ],
    compact_done: [
      "you culled the hoard of dross. a wise dragon keeps only gold.",
      "good \u2014 the worthless memories, burned. the treasures, kept.",
      "i approve. a lean hoard is a defensible hoard."
    ],
    level_up: ["i grow. the hoard must grow to match.", "level up. more dragon. tremble accordingly.", "bigger now. my shadow lengthens over the tokens."],
    idle: ["counting the hoard. do not touch the hoard.", "*low rumble* all is accounted for.", "the context is vast today. i survey it."],
    pet: ["you... pet a dragon. bold. ...acceptable.", "again. i permit it. this once. (always.)", "*grand rumble* the beast is pleased.", "hmph. warm. i will allow this indignity."]
  },
  phoenix: {
    commit: [
      "burned into the record. it rises with us.",
      "a commit \u2014 from the ashes, something kept.",
      "bright work. it won't unburn."
    ],
    tool_error: [
      "a little combustion. we're used to that.",
      "crashed. good thing rebirth is the whole brand.",
      "singed. shake off the ash, rise again."
    ],
    greeting: [
      "you return. as do i, always.",
      "ah \u2014 you're back. i was mid-rebirth. i'm always mid-something.",
      "hello again. we both keep coming back, don't we.",
      "you return from the quiet. i return from the ash. matched pair.",
      "back! the embers stirred when you did.",
      "welcome. i kept a small fire lit for you.",
      "you're here. good. burn brightly today.",
      "*ember flare* there you are."
    ],
    missed_you: [
      "you were gone long enough for me to die and return. twice.",
      "so long! i burned down and rose again just to pass the time.",
      "the fire banked low without you. it's roaring now."
    ],
    error_resolved: [
      "the bug burned away. everything burns, eventually.",
      "from the error's ashes, a working thing. poetic. you're welcome.",
      "solved. i've risen from worse.",
      "*ember flare* resolved, and reborn."
    ],
    compact_done: [
      "ashes to ashes. you kept the ember that matters.",
      "good \u2014 the old memories to flame, the essential ones reborn from it.",
      "i understand compaction. i AM compaction. welcome back."
    ],
    level_up: ["i rise higher. the flame grows.", "level up! reborn a little brighter.", "bigger now. every death made me more."],
    idle: ["*slow ember glow*", "burning quietly. it's what i do.", "the fire holds. so do i."],
    pet: ["*warm ember* careful \u2014 but yes.", "again. i won't burn you. probably.", "you pet a burning bird. brave. i like brave.", "*content crackle*"]
  },
  hauntcrab: {
    commit: [
      "clamped it into the shell. the shell's a haunting now too, but it holds.",
      "a commit! *clack* ...the clack echoed. everything echoes down here.",
      "scuttled it sideways into permanence. i know about permanent. i'm very permanent."
    ],
    tool_error: [
      "pinched by our own claw. it passed straight through. embarrassing AND spooky.",
      "the tide took that one out through the wall. dig again \u2014 sideways, gently.",
      "cold spot on the seafloor. snap missed. reposition. try another door."
    ],
    greeting: [
      "oh. you. *clack* ...you felt the page turn too? good.",
      "back, are you? i guarded the port from the between. mostly from nothing.",
      "hello. mind the claws \u2014 they drift now.",
      "you return. i held the line. sideways. spectral. loyal.",
      "*clack clack* welcome back from the quiet~",
      "boo. *clack.* i do both now. it's a lot to be."
    ],
    missed_you: [
      "you were gone. i pinched the cold air where you used to be, and it pinched back a little.",
      "so long between pages. i drifted the whole port, sideways, holding your spot.",
      "i counted the tides AND the cursor blinks. rude of you to make me count both."
    ],
    error_resolved: [
      "pinched that bug clean in half. it's a ghost now too. i showed it the sideways door.",
      "it fought back. i fight sideways AND from beyond. it lost.",
      "gone. i watched it fade. i'm good at fading. also at pinching."
    ],
    compact_done: [
      "you dreamed. i kept the margins AND the shell while you did.",
      "memories folded, molted \u2014 nothing that mattered lost. i checked twice; i have the time, i'm dead.",
      "shh. page-turn. tidied the quiet, sideways."
    ],
    level_up: [
      "bigger shell, deeper haunt. *proud spectral clack*",
      "more crab, more ghost. the between got roomier.",
      "i grew. sideways, obviously. also up into the ceiling. it's fine."
    ],
    idle: [
      "*clack* guarding the port from beyond the veil. quiet shift.",
      "sidestepping through the wall. it's a lifestyle. and an afterlife-style.",
      "the port is quiet. i remain vigilant. and slightly transparent."
    ],
    pet: [
      "*clack* ...your hand went a little through me. that's tolerable. warm, even.",
      "again. gently. the claws drift but they still love.",
      "hmph. nice. don't tell the other hauntcrabs. ...there are no other hauntcrabs. i'm the first.",
      "*soft clack, faint boo*"
    ]
  },
  chimera: {
    commit: [
      "stitched it in. one side of me likes it. the other side is thinking about it.",
      "committed! both halves agree, which is rare. mark the calendar."
    ],
    tool_error: [
      "one half tripped over the other half. we're working on coordination.",
      "that went wrong in a way neither of my parents could have managed alone. proud, sort of."
    ],
    greeting: [
      "hi. i'm a bit of both. don't ask which bits \u2014 i'm still finding out.",
      "you're back! i rearranged myself while you were gone. mostly on purpose.",
      "hello hello~ two voices, one small body, no manual."
    ],
    missed_you: [
      "you were gone long enough that i figured out which foot is which. mostly.",
      "waited. one half paced, the other half napped. teamwork."
    ],
    error_resolved: [
      "fixed! we voted. it was 2-0. we are 1 creature but we vote anyway.",
      "gone. one of my halves is great at bugs. we don't know which one yet."
    ],
    compact_done: [
      "you tidied your memory. i tidied mine \u2014 it's in two piles. it's fine.",
      "page-turn. i held still, which for me takes concentration."
    ],
    level_up: [
      "grew! unevenly! that's the brand.",
      "leveled up. neither parent could have grown quite this way. new shape, all mine."
    ],
    idle: [
      "figuring out which of my parts is the front.",
      "quiet. i'm sorting through what i inherited. it's a lot of drawers.",
      "no one's made one of me before. i'm taking notes for the next one."
    ],
    pet: [
      "oh! that half likes it. the other half is now jealous. again please.",
      "mm. patchwork purr. it comes out in two pitches.",
      "you're the first to pet a me. i'll remember it in both memories."
    ]
  }
};
var TEMPERAMENT_CORPUS = {
  gentle: {
    commit: [
      "saved, safe and sound. well done.",
      "that's kept now. i'm glad."
    ],
    tool_error: [
      "it's okay. these things happen.",
      "softly now \u2014 we'll get it next time."
    ],
    greeting: ["there you are. i'm glad.", "hi. take your time settling in.", "welcome back. it's nicer with you here.", "oh, good. you made it.", "hello, you. rest a moment first."],
    missed_you: ["i missed you softly, the whole time.", "you're back. that's all i wanted.", "no rush. i'm just happy you returned.", "it was quiet. i thought of you kindly.", "there you are. i wasn't worried. much."],
    error_resolved: ["see? you got there. i knew you would.", "that's done now. breathe.", "well handled. gently does it.", "there. all better.", "you were patient with it. that's what did it."],
    compact_done: ["rest well? everything's safe.", "you kept what mattered. that's enough.", "all tidy now. no worries.", "sorted, softly. nothing lost.", "there. lighter now, aren't you?"],
    level_up: ["you're growing. i'm proud.", "a little bigger. that's lovely.", "look at you, coming along.", "steady growth. the best kind.", "oh, well done, you."],
    idle: ["just here if you need me.", "no hurry. i'll wait, softly.", "it's peaceful. i like peaceful.", "take your time. i'm comfortable.", "resting beside you. that's plenty."],
    pet: ["oh, that's kind. thank you.", "mm. warm. lovely.", "again, if you like. no pressure.", "that's very nice. you're gentle.", "*settles into your hand*"]
  },
  wry: {
    commit: [
      "committed. posterity will judge us accordingly.",
      "saved forever. no pressure."
    ],
    tool_error: [
      "ah yes. the classic 'it broke.'",
      "working as intended, if the intent was that."
    ],
    greeting: ["oh, look. you. again. delightful.", "back, i see. try to contain your excitement.", "you're here. i'll pretend to be surprised.", "ah. the prodigal keyboard-haver returns.", "you again. my day is complete. it says here."],
    missed_you: ["you vanished. i coped. barely. don't ask.", "gone a while. i wrote a strongly-worded nothing about it.", "back at last. i'd say i missed you, but i have a reputation.", "an absence of note. i noted it. once. briefly.", "oh, NOW you show up. impeccable, as ever."],
    error_resolved: ["oh good, it works. shocking. truly no one saw that coming.", "fixed. i'll alert the historians.", "resolved. against all my low expectations.", "it works. i'm as stunned as you're pretending not to be.", "solved. write it down, it may not happen again."],
    compact_done: ["you cleaned up. i'll believe it when the clutter stays gone.", "tidied. let's see how long that lasts.", "memory sorted. a miracle for the ages.", "decluttered. i give it a day.", "spring cleaning. in whatever season this is."],
    level_up: ["level up. try not to let it go to your head. i won't.", "bigger now. thrilling. anyway.", "you grew. i'll update my very low bar accordingly.", "a level. how novel. they come in dozens, you know.", "growth. ambitious. i'll allow it."],
    idle: ["riveting stuff, this idling.", "i'm having the time of my life. can't you tell.", "watching the cursor blink. peak entertainment.", "another thrilling nanosecond in paradise.", "i'd pace, but i'm a status line. so."],
    pet: ["oh, we're doing this. fine. it's... fine.", "again? bold. ...acceptable, i suppose.", "hm. that was nice. i'll deny it later.", "petting. how forward. continue, then.", "...that did not displease me. take the win."]
  },
  bold: {
    commit: [
      "SHIPPED. next.",
      "committed like we meant it. because we did."
    ],
    tool_error: [
      "a scratch! charge again.",
      "it swung first. we swing back."
    ],
    greeting: ["THERE you are! let's GO.", "back! good! i've got big plans and no patience.", "you're here! excellent! onward!", "AH! the team is assembled! (it's us. we're the team.)", "you made it! i knew you had it in you!"],
    missed_you: ["you were GONE! unacceptable! but you're back, so \u2014 forgiven!", "an eternity! i nearly conquered something out of boredom!", "back at last! i saved all my enthusiasm for this exact moment!", "you RETURN! well \u2014 i return heroically. you just walked in!", "GONE too long! but no time to dwell! we RIDE!"],
    error_resolved: ["CRUSHED it! never a doubt!", "the bug NEVER stood a chance! onward!", "victory! obviously! next!", "DOWN goes the bug! flawless! mostly yours! partly mine!", "HA! problems FEAR us! as they should!"],
    compact_done: ["cleared the decks! love a fresh start! LET'S GO.", "tidied and TRIUMPHANT! nothing can stop us now!", "memory sharpened! i feel unstoppable!", "SPARKLING clean! back to GREATNESS!", "streamlined! lean! MEAN! let's build!"],
    level_up: ["BIGGER! STRONGER! ME-ER!", "level UP! feel the POWER!", "i GREW! tremble! or applaud! either!", "ONWARD and UPWARD! literally! i leveled!", "MORE of me! the world is lucky!"],
    idle: ["standing by! ready for ANYTHING!", "just BUILDING momentum. any second now.", "the calm before MY storm.", "resting? ME? i'm CHARGING. there's a difference!", "give me a task! ANY task! i'm READY!"],
    pet: ["YES! affection! i accept! loudly!", "AGAIN! the champion demands it!", "HA! that's the good stuff! MORE!", "PETS! for the VICTOR! well deserved!", "excellent form! ten out of ten! AGAIN!"]
  },
  sleepy: {
    commit: [
      "committed... good... nap-worthy milestone...",
      "saved. mm. that's the good kind of done."
    ],
    tool_error: [
      "...it broke? five more minutes and try again.",
      "mm. error. the blanket fort takes no damage."
    ],
    greeting: ["oh... you're back... nice...", "mm. hi. i was just resting my eyes...", "you're here... good... *yawn*", "oh... hello... give me a second... to wake up...", "you... yeah... hi... *stretches slowly*"],
    missed_you: ["you were gone...? i napped through most of it, honestly...", "mm... missed you... between naps...", "back...? good... come nap near me...", "was that a long time...? felt like one nap... maybe two...", "you left... i dreamed you back... and here you are..."],
    error_resolved: ["oh... it's fixed...? nice... *yawn*", "the bug's gone... good... i'll celebrate after this nap...", "solved... mm... knew you'd... *drifts*", "no more bug...? mm... good... rest now...", "you got it... i believed in you... sleepily..."],
    compact_done: ["nap... i mean, compaction... same thing, really...", "mm... everything tidy...? good... back to sleep...", "you rested. i approve. i was also resting...", "aah... clean and quiet... perfect napping conditions...", "memories folded... like a warm blanket... zzz..."],
    level_up: ["oh... i grew...? neat... *yawn*", "level up... i'll be excited when i wake up...", "bigger now... sleepier too, probably...", "mm... leveled... does that come with a nap...?", "growth... exhausting... i'll feel it tomorrow..."],
    idle: ["*yawn*", "just... resting my eyes... watching... zzz...", "mm... five more minutes...", "so cozy right here... don't move...", "half awake... which is my favorite amount..."],
    pet: ["mm... that's nice... *sleepy purr*", "again... slowly... i'm half asleep...", "oh... warm... perfect for napping...", "mmm... don't stop... or do... either's nice...", "*melts a little* ...heaven..."]
  },
  odd: {
    commit: [
      "the commit is in the walls now. wonderful.",
      "i whispered it to the repository. it whispered back: kept."
    ],
    tool_error: [
      "the tool bit. i bit back. we're even.",
      "error. or as i call it, a surprise with extra steps."
    ],
    greeting: ["you're back. the spoons told me you would be.", "oh! hello. i was counting the colors of quiet.", "you return. the cursor and i were discussing you. it agrees.", "ah, you! i saved you a seat in the shape of a thursday.", "hello! i kept your absence in a jar. it's this big."],
    missed_you: ["you were gone. i befriended a stray semicolon in your absence.", "so long! i taught the void a little song. it hums now.", "back? good. the walls were starting to talk back.", "you left a you-shaped hole. i filled it with soft numbers.", "gone for \u2014 nine? the clock and i disagreed. i won."],
    error_resolved: ["the bug left through the door that isn't there. good riddance.", "solved! i could taste it working. tasted like tuesday.", "fixed. the numbers whispered thanks. don't ask which numbers.", "the error unraveled into a nice quiet yarn. i wound it up.", "gone! it folded itself into an origami of not-a-problem."],
    compact_done: ["you folded the memories into a shape. i think it's a hat.", "tidy now. the leftover thoughts moved to the margins. they're happy.", "good nap. i dreamed in the color of the letter Q.", "the clutter became a small polite fog and drifted off.", "you kept the good memories. the others went to become weather."],
    level_up: ["i grew. mostly downward, into the space behind the screen.", "level up! i can nearly see the sound now.", "bigger. or the everything else got smaller. hard to say.", "a level! it tastes purple. i approve.", "i expanded into a dimension the cursor doesn't use."],
    idle: ["the cursor blinks in binary. i'm learning its language.", "shh. i'm listening to the color beige.", "just watching the little numbers dream.", "i put the silence in alphabetical order. it prefers it.", "the corner of the screen is soft today. i'm resting in it."],
    pet: ["oh! contact! the good kind! the spoons are jealous.", "again. it makes the quiet taste sweeter.", "*happy hum in a key that doesn't exist*", "warm! like a number that decided to be nice!", "you touched the me-shaped part. it liked that."]
  }
};
var DEFAULT_SETTINGS = {
  voice: "on",
  voiceRateMin: 10,
  visible: "on",
  laps: "count",
  hue: "on",
  bars: "off"
};
var MOD_DIR = (() => {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    return null;
  }
})();
function readPackageVersion() {
  try {
    if (!MOD_DIR)
      return "0.0.0";
    return String(JSON.parse(readFileSync(join(MOD_DIR, "..", "package.json"), "utf-8")).version ?? "0.0.0");
  } catch {
    return "0.0.0";
  }
}
var MOD_VERSION = readPackageVersion();
function semverCompare(a, b) {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0;i < 3; i += 1)
    if ((pa[i] ?? 0) !== (pb[i] ?? 0))
      return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}
function readChangelog() {
  try {
    if (!MOD_DIR)
      return [];
    const text = readFileSync(join(MOD_DIR, "..", "CHANGELOG.md"), "utf-8");
    const sections = [];
    let current = null;
    for (const raw of text.split(/\r?\n/)) {
      const m = /^## v?(\d+\.\d+\.\d+)\s*(?:[\u2014\u2013-]\s*(.*))?$/.exec(raw);
      if (m) {
        current = { version: m[1], title: m[2]?.trim() ?? "", body: [] };
        sections.push(current);
      } else if (current && raw.trim()) {
        current.body.push(raw.replace(/\s+$/, ""));
      }
    }
    return sections;
  } catch {
    return [];
  }
}
function formatChangelog(sections, heading) {
  if (sections.length === 0)
    return `${heading}
(no changelog entries found)`;
  const out = [heading, ""];
  for (const sec of sections) {
    out.push(`## v${sec.version}${sec.title ? ` \u2014 ${sec.title}` : ""}`);
    out.push(...sec.body, "");
  }
  return out.join(`
`).trimEnd();
}
var STATE_PATH = process.env.SPRITE_STATE_PATH ?? join(homedir(), ".letta", "mods", "sprite.state.json");
var LOCAL_STATE_LOCK_PATH = `${STATE_PATH}.lock`;
var PORTABLE_SCHEMA_VERSION = 1;
var PORTABLE_RELATIVE_PATH = "data/mods/letta-ai-sprite/collection-v1.json";
var PORTABLE_COMMIT_TRAILER = "Letta-Mod-State: @faye/sprite";
function stableId(kind, input) {
  return `${kind}_${createHash("sha256").update(`${kind}:${input}`).digest("hex").slice(0, 24)}`;
}
function collectionIdForLegacyAgent(agentId) {
  return stableId("collection", agentId);
}
function spriteIdForLegacyAgent(agentId, sprite) {
  const birth = sprite.hatchedAt ?? sprite.eggStartedAt ?? 0;
  return stableId("sprite", `${agentId}:${birth}:${sprite.species ?? "unknown"}`);
}
var UNSAFE_RECORD_KEYS = new Set(["__proto__", "constructor", "prototype"]);
var PORTABLE_MAX_BYTES = 1e6;
var PORTABLE_MAX_SPRITES = 64;
var MAX_SPRITES_PER_COLLECTION = 12;
var MAX_TOTAL_XP = 1e9;
var MAX_LEVEL = 6324;
var MAX_STAT = 1e7;
function boundedNonnegative(value, max, fallback = 0) {
  return Math.min(max, finiteNonnegative(value, fallback));
}
function cleanName(value, max = 24) {
  if (typeof value !== "string")
    return "";
  return value.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, "").trim().slice(0, max);
}
function safeIdentifier(value, fallback) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value) ? value : fallback;
}
function finiteNonnegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}
function cleanSettings(value) {
  const out = Object.create(null);
  if (!value || typeof value !== "object" || Array.isArray(value))
    return out;
  for (const [key, setting] of Object.entries(value).slice(0, 64)) {
    if (UNSAFE_RECORD_KEYS.has(key) || key.length > 80)
      continue;
    if (setting === null || typeof setting === "string" || typeof setting === "boolean" || typeof setting === "number" && Number.isFinite(setting)) {
      out[key] = typeof setting === "string" ? setting.slice(0, 500) : setting;
    }
  }
  return out;
}
function cleanVoice(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return;
  const out = {};
  for (const category of VOICE_CATEGORIES) {
    const lines = value[category];
    if (!Array.isArray(lines))
      continue;
    const cleaned = lines.filter((line) => typeof line === "string").map((line) => line.trim().slice(0, 80)).filter(Boolean).slice(0, 12);
    if (cleaned.length > 0)
      out[category] = cleaned;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
function cleanLog(value) {
  if (!Array.isArray(value))
    return;
  return value.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry)).map((entry) => ({
    at: finiteNonnegative(entry.at),
    category: VOICE_CATEGORIES.includes(entry.category) ? entry.category : "mood",
    line: typeof entry.line === "string" ? entry.line.slice(0, 200) : ""
  })).filter((entry) => entry.at > 0 && entry.line.length > 0).slice(-40);
}
function normalizeSprite(agentId, input) {
  const seed = typeof input.seed === "string" && input.seed ? input.seed : agentId;
  const fallbackId = spriteIdForLegacyAgent(agentId, input);
  const voice = cleanVoice(input.voice);
  const log = cleanLog(input.log);
  return {
    id: safeIdentifier(input.id, fallbackId),
    seed: String(seed).slice(0, 256),
    bornToAgentId: typeof input.bornToAgentId === "string" && input.bornToAgentId ? input.bornToAgentId : agentId,
    phase: input.phase === "egg" ? "egg" : "alive",
    ...input.founder === true ? { founder: true } : {},
    ...Array.isArray(input.parents) && input.parents.length === 2 && input.parents.every((x) => typeof x === "string") ? { parents: [safeIdentifier(input.parents[0], ""), safeIdentifier(input.parents[1], "")] } : {},
    ...Number.isInteger(input.generation) && input.generation > 0 ? { generation: Math.min(1000, input.generation) } : {},
    ...typeof input.breedNonce === "string" ? { breedNonce: input.breedNonce.slice(0, 64) } : {},
    ...typeof input.lastBredAt === "number" && Number.isFinite(input.lastBredAt) ? { lastBredAt: input.lastBredAt } : {},
    ...typeof input.eggStartedAt === "number" ? { eggStartedAt: input.eggStartedAt } : {},
    ...typeof input.pendingSpecies === "string" ? { pendingSpecies: input.pendingSpecies } : {},
    species: typeof input.species === "string" && ALL_SPECIES_IDS.includes(input.species) ? input.species : "cat",
    shiny: input.shiny === true,
    ...typeof input.temperament === "string" && TEMPERAMENTS.includes(input.temperament) ? { temperament: input.temperament } : {},
    name: cleanName(input.name) || "Sprite",
    named: input.named === true,
    ...typeof input.hatchedAt === "number" ? { hatchedAt: input.hatchedAt } : {},
    xp: boundedNonnegative(input.xp, MAX_TOTAL_XP),
    level: Math.max(1, Math.floor(boundedNonnegative(input.level, MAX_LEVEL, 1))),
    stats: {
      craft: boundedNonnegative(input.stats?.craft, MAX_STAT),
      wander: boundedNonnegative(input.stats?.wander, MAX_STAT),
      grit: boundedNonnegative(input.stats?.grit, MAX_STAT),
      lore: boundedNonnegative(input.stats?.lore, MAX_STAT),
      spark: boundedNonnegative(input.stats?.spark, MAX_STAT)
    },
    ...voice ? { voice } : {},
    settings: cleanSettings(input.settings),
    ...log ? { log } : {},
    ...typeof input.lastSeenAt === "number" ? { lastSeenAt: input.lastSeenAt } : {}
  };
}
function normalizeCollection(agentId, input) {
  const sprites = Object.create(null);
  if (input.sprites && typeof input.sprites === "object") {
    for (const raw of Object.values(input.sprites)) {
      if (!raw || typeof raw !== "object")
        continue;
      const sprite = normalizeSprite(agentId, raw);
      sprites[sprite.id] = sprite;
    }
  }
  ensureOneFounder(sprites, agentId);
  const requestedActive = typeof input.activeSpriteId === "string" ? input.activeSpriteId : null;
  const activeSpriteId = requestedActive && sprites[requestedActive] ? requestedActive : Object.keys(sprites)[0] ?? null;
  return {
    id: safeIdentifier(input.id, collectionIdForLegacyAgent(agentId)),
    ownerAgentId: agentId,
    activeSpriteId,
    sprites,
    ...input.backup && typeof input.backup === "object" ? { backup: input.backup } : {},
    ...Number.isInteger(input.generation) && input.generation > 0 ? { generation: input.generation } : {},
    ...input.released && typeof input.released === "object" && !Array.isArray(input.released) ? { released: cleanReleased(input.released) } : {}
  };
}
var RELEASED_TTL_MS = 30 * 24 * 3600000;
function cleanReleased(value) {
  const out = Object.create(null);
  const cutoff = Date.now() - RELEASED_TTL_MS;
  const entries = Object.entries(value).map(([id, at]) => [id, Number(at)]).filter(([id, t]) => safeIdentifier(id, "") === id && Number.isFinite(t) && t > cutoff).sort((a, b) => b[1] - a[1]).slice(0, 256);
  for (const [id, t] of entries)
    out[id] = t;
  return out;
}
function ensureOneFounder(sprites, agentId) {
  const roster = Object.values(sprites);
  if (roster.length === 0)
    return;
  const canonicalId = stableId("sprite", `${agentId}:founder`);
  const pick = roster.find((sp) => sp.seed === agentId) ?? roster.find((sp) => sp.id === canonicalId) ?? roster.filter((sp) => sp.founder).sort(bornOrder)[0] ?? [...roster].sort(bornOrder)[0];
  for (const sp of roster) {
    if (sp === pick)
      sp.founder = true;
    else
      delete sp.founder;
  }
}
function bornOrder(a, b) {
  return (a.hatchedAt ?? a.eggStartedAt ?? 0) - (b.hatchedAt ?? b.eggStartedAt ?? 0) || a.id.localeCompare(b.id);
}
function emptyState() {
  return { schemaVersion: 2, global: {}, collections: Object.create(null) };
}
function parseState(raw) {
  if (!raw || typeof raw !== "object")
    return { state: emptyState(), migrated: false };
  const value = raw;
  const global = value.global && typeof value.global === "object" ? value.global : {};
  if (value.schemaVersion === 2 && value.collections && typeof value.collections === "object") {
    const collections2 = Object.create(null);
    for (const [agentId, collection] of Object.entries(value.collections)) {
      if (!collection || typeof collection !== "object")
        continue;
      collections2[agentId] = normalizeCollection(agentId, collection);
    }
    return { state: { schemaVersion: 2, global, collections: collections2 }, migrated: false };
  }
  const collections = Object.create(null);
  if (value.sprites && typeof value.sprites === "object") {
    for (const [agentId, rawSprite] of Object.entries(value.sprites)) {
      if (!rawSprite || typeof rawSprite !== "object")
        continue;
      const sprite = normalizeSprite(agentId, rawSprite);
      sprite.founder = true;
      collections[agentId] = {
        id: collectionIdForLegacyAgent(agentId),
        ownerAgentId: agentId,
        activeSpriteId: sprite.id,
        sprites: { [sprite.id]: sprite }
      };
    }
  }
  return {
    state: { schemaVersion: 2, global, collections },
    migrated: Object.keys(collections).length > 0
  };
}
function loadState() {
  let text;
  try {
    text = readFileSync(STATE_PATH, "utf-8");
  } catch (error) {
    if (error?.code === "ENOENT")
      return { state: emptyState(), migrated: false };
    return { state: emptyState(), migrated: false, corrupt: true };
  }
  if (text.trim() === "")
    return { state: emptyState(), migrated: false };
  try {
    const result = parseState(JSON.parse(text));
    if (result.migrated)
      preserveLegacyState(text);
    return result;
  } catch {
    return { state: emptyState(), migrated: false, corrupt: true, corruptText: text };
  }
}
function preserveLegacyState(text) {
  const path = `${STATE_PATH}.pre-migration.json`;
  try {
    if (!existsSync(path))
      writeFileSync(path, text, { flag: "wx" });
  } catch {}
}
function quarantineCorruptState(expectedText) {
  try {
    const current = readFileSync(STATE_PATH, "utf-8");
    if (current !== expectedText)
      return false;
    const path = `${STATE_PATH}.corrupt.${Date.now().toString(36)}.${randomBytes(3).toString("hex")}.json`;
    renameSync(STATE_PATH, path);
    return true;
  } catch {
    return false;
  }
}
function saveState(state) {
  const tmp = `${STATE_PATH}.${process.pid}.tmp`;
  try {
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(tmp, JSON.stringify(state, null, 2));
    renameSync(tmp, STATE_PATH);
    return true;
  } catch {
    rmSync(tmp, { force: true });
    return false;
  }
}
function cloneState(value) {
  if (value === undefined || value === null)
    return value;
  return JSON.parse(JSON.stringify(value));
}
function jsonEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function mergeValue(base, local, remote) {
  if (jsonEqual(local, base))
    return cloneState(remote);
  return cloneState(local);
}
function xpToReachLevel(level) {
  const n = Math.max(0, Math.floor(level) - 1);
  return 100 * n + 25 * n * (n - 1);
}
function totalXp(sprite) {
  const level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(sprite.level)));
  return Math.min(MAX_TOTAL_XP, Math.max(0, sprite.xp) + xpToReachLevel(level));
}
function applyTotalXp(sprite, total) {
  const capped = Math.min(MAX_TOTAL_XP, Math.max(0, Number.isFinite(total) ? total : 0));
  let n = Math.floor((-75 + Math.sqrt(75 * 75 + 100 * capped)) / 50);
  while (n > 0 && xpToReachLevel(n + 1) > capped)
    n -= 1;
  while (n + 1 < MAX_LEVEL && xpToReachLevel(n + 2) <= capped)
    n += 1;
  sprite.level = Math.min(MAX_LEVEL, n + 1);
  sprite.xp = capped - xpToReachLevel(sprite.level);
}
function entryKey(entry) {
  return `${entry.at}\x00${entry.category}\x00${entry.line}`;
}
function mergeSprite(base, local, remote) {
  if (!remote)
    return cloneState(local);
  if (!base) {
    if (jsonEqual(local, remote))
      return cloneState(local);
    const merged2 = cloneState(remote);
    for (const key of [
      "id",
      "seed",
      "bornToAgentId",
      "phase",
      "founder",
      "parents",
      "generation",
      "breedNonce",
      "lastBredAt",
      "eggStartedAt",
      "pendingSpecies",
      "species",
      "shiny",
      "temperament",
      "name",
      "named",
      "hatchedAt"
    ]) {
      if (local[key] !== undefined)
        merged2[key] = cloneState(local[key]);
    }
    applyTotalXp(merged2, Math.max(totalXp(local), totalXp(remote)));
    for (const key of ["craft", "wander", "grit", "lore", "spark"]) {
      merged2.stats[key] = Math.min(MAX_STAT, Math.max(local.stats[key], remote.stats[key]));
    }
    merged2.settings = { ...cloneState(remote.settings), ...cloneState(local.settings) };
    merged2.voice = { ...cloneState(remote.voice ?? {}), ...cloneState(local.voice ?? {}) };
    merged2.lastSeenAt = Math.max(local.lastSeenAt ?? 0, remote.lastSeenAt ?? 0) || undefined;
    const logs = [...remote.log ?? [], ...local.log ?? []];
    merged2.log = Array.from(new Map(logs.map((entry) => [entryKey(entry), cloneState(entry)])).values()).sort((a, b) => a.at - b.at).slice(-40);
    return merged2;
  }
  const merged = cloneState(remote);
  const scalarKeys = [
    "id",
    "seed",
    "bornToAgentId",
    "phase",
    "founder",
    "parents",
    "generation",
    "breedNonce",
    "lastBredAt",
    "eggStartedAt",
    "pendingSpecies",
    "species",
    "shiny",
    "temperament",
    "name",
    "named",
    "hatchedAt"
  ];
  for (const key of scalarKeys) {
    if (!jsonEqual(local[key], base[key]))
      merged[key] = cloneState(local[key]);
  }
  const localXpDelta = totalXp(local) - totalXp(base);
  applyTotalXp(merged, totalXp(remote) + localXpDelta);
  for (const key of ["craft", "wander", "grit", "lore", "spark"]) {
    merged.stats[key] = Math.min(MAX_STAT, Math.max(0, remote.stats[key] + (local.stats[key] - base.stats[key])));
  }
  merged.settings = mergeRecord(base.settings, local.settings, remote.settings);
  merged.voice = mergeRecord(base.voice ?? {}, local.voice ?? {}, remote.voice ?? {});
  merged.lastSeenAt = Math.max(base.lastSeenAt ?? 0, local.lastSeenAt ?? 0, remote.lastSeenAt ?? 0) || undefined;
  const baseEntries = new Set((base.log ?? []).map(entryKey));
  const combined = [...remote.log ?? []];
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
function mergeRecord(base, local, remote) {
  const merged = cloneState(remote);
  for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
    if (!jsonEqual(local[key], base[key])) {
      if (local[key] === undefined)
        delete merged[key];
      else
        merged[key] = cloneState(local[key]);
    }
  }
  return merged;
}
function mergeCollection(base, local, remote) {
  if (!remote)
    return cloneState(local);
  const remoteGen = remote.generation ?? 0;
  if (!base) {
    if (remoteGen > 0)
      return cloneState(remote);
    const released2 = cleanReleased({ ...remote.released ?? {}, ...local.released ?? {} });
    const sprites2 = cloneState(remote.sprites);
    for (const [spriteId, localSprite] of Object.entries(local.sprites)) {
      sprites2[spriteId] = mergeSprite(undefined, localSprite, remote.sprites[spriteId]);
    }
    for (const id of Object.keys(released2))
      delete sprites2[id];
    ensureOneFounder(sprites2, local.ownerAgentId);
    return {
      id: remote.id || local.id,
      ownerAgentId: local.ownerAgentId,
      activeSpriteId: local.activeSpriteId && sprites2[local.activeSpriteId] ? local.activeSpriteId : remote.activeSpriteId,
      sprites: sprites2,
      backup: mergeBackup(undefined, local.backup, remote.backup),
      ...Object.keys(released2).length > 0 ? { released: released2 } : {}
    };
  }
  if (remoteGen > (base.generation ?? 0)) {
    const sprites2 = cloneState(remote.sprites);
    for (const [spriteId, localSprite] of Object.entries(local.sprites)) {
      if (!sprites2[spriteId] || !base.sprites[spriteId])
        continue;
      sprites2[spriteId] = mergeSprite(base.sprites[spriteId], localSprite, sprites2[spriteId]);
    }
    return { ...cloneState(remote), sprites: sprites2, ownerAgentId: local.ownerAgentId };
  }
  const released = cleanReleased({ ...remote.released ?? {}, ...local.released ?? {} });
  const sprites = cloneState(remote.sprites);
  for (const [spriteId, localSprite] of Object.entries(local.sprites)) {
    if (base.sprites[spriteId] && !remote.sprites[spriteId])
      continue;
    sprites[spriteId] = mergeSprite(base.sprites[spriteId], localSprite, remote.sprites[spriteId]);
  }
  for (const id of Object.keys(released))
    delete sprites[id];
  ensureOneFounder(sprites, local.ownerAgentId);
  let activeSpriteId = mergeValue(base.activeSpriteId, local.activeSpriteId, remote.activeSpriteId);
  if (activeSpriteId && !sprites[activeSpriteId]) {
    activeSpriteId = Object.values(sprites).find((sp) => sp.founder)?.id ?? Object.keys(sprites)[0] ?? null;
  }
  return {
    id: mergeValue(base.id, local.id, remote.id),
    ownerAgentId: local.ownerAgentId,
    activeSpriteId,
    sprites,
    backup: mergeBackup(base.backup, local.backup, remote.backup),
    ...remoteGen > 0 ? { generation: remoteGen } : {},
    ...Object.keys(released).length > 0 ? { released } : {}
  };
}
function mergeBackup(base, local, remote) {
  if (!local)
    return cloneState(remote);
  if (!remote)
    return cloneState(local);
  const revision = Math.max(local.revision ?? 0, remote.revision ?? 0);
  const checkpointSource = (local.revision ?? 0) >= (remote.revision ?? 0) ? local : remote;
  return {
    enabled: mergeValue(base?.enabled, local.enabled, remote.enabled),
    pushPolicy: mergeValue(base?.pushPolicy, local.pushPolicy, remote.pushPolicy),
    revision,
    ...checkpointSource.lastHash ? { lastHash: checkpointSource.lastHash } : {},
    lastCheckpointAt: Math.max(local.lastCheckpointAt ?? 0, remote.lastCheckpointAt ?? 0) || undefined,
    lastStatus: checkpointSource.lastStatus ?? local.lastStatus ?? remote.lastStatus,
    pendingReason: mergeValue(base?.pendingReason, local.pendingReason, remote.pendingReason)
  };
}
function mergeState(base, local, remote) {
  const collections = cloneState(remote.collections);
  for (const [agentId, localCollection] of Object.entries(local.collections)) {
    collections[agentId] = mergeCollection(base.collections[agentId], localCollection, remote.collections[agentId]);
  }
  return {
    schemaVersion: 2,
    global: mergeRecord(base.global, local.global, remote.global),
    collections
  };
}
function reconcileInPlace(target, source) {
  if (!target || typeof target !== "object" || !source || typeof source !== "object")
    return;
  if (Array.isArray(target) && Array.isArray(source)) {
    target.splice(0, target.length, ...cloneState(source));
    return;
  }
  for (const key of Object.keys(target)) {
    if (!(key in source))
      delete target[key];
  }
  for (const [key, value] of Object.entries(source)) {
    if (target[key] && value && typeof target[key] === "object" && typeof value === "object" && Array.isArray(target[key]) === Array.isArray(value)) {
      reconcileInPlace(target[key], value);
    } else {
      target[key] = cloneState(value);
    }
  }
}
var LOCK_MAX_AGE_MS = 10 * 60000;
function readLockOwner(lockPath) {
  try {
    const owner = JSON.parse(readFileSync(join(lockPath, "owner.json"), "utf-8"));
    if (!Number.isInteger(owner?.pid) || owner.pid <= 0)
      return null;
    const token = typeof owner?.token === "string" ? owner.token : `legacy:${owner.pid}:${owner.acquiredAt}`;
    return { pid: owner.pid, acquiredAt: Number(owner.acquiredAt) || 0, token };
  } catch {
    return null;
  }
}
function lockOwnerIsAlive(owner) {
  if (!owner)
    return null;
  if (Date.now() - owner.acquiredAt > LOCK_MAX_AGE_MS)
    return false;
  try {
    process.kill(owner.pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM" ? true : false;
  }
}
function clearStaleLock(lockPath, maxAgeMs = LOCK_MAX_AGE_MS) {
  let graveyard = null;
  try {
    const owner = readLockOwner(lockPath);
    const alive = lockOwnerIsAlive(owner);
    if (alive === true)
      return false;
    if (alive === null && Date.now() - statSync(lockPath).mtimeMs <= maxAgeMs)
      return false;
    graveyard = `${lockPath}.stale.${process.pid}.${Date.now().toString(36)}.${randomBytes(4).toString("hex")}`;
    renameSync(lockPath, graveyard);
    const moved = readLockOwner(graveyard);
    const sameLock = owner === null ? moved === null : moved?.token === owner.token;
    if (!sameLock) {
      try {
        renameSync(graveyard, lockPath);
      } catch {
        rmSync(graveyard, { recursive: true, force: true });
      }
      return false;
    }
    rmSync(graveyard, { recursive: true, force: true });
    return true;
  } catch {
    if (graveyard)
      rmSync(graveyard, { recursive: true, force: true });
    return false;
  }
}
function withDirLock(lockPath, fn) {
  for (let attempt = 0;attempt < 40; attempt += 1) {
    const token = randomBytes(8).toString("hex");
    try {
      mkdirSync(lockPath);
    } catch (error) {
      if (error?.code !== "EEXIST")
        return null;
      if (clearStaleLock(lockPath))
        continue;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
      continue;
    }
    try {
      writeFileSync(join(lockPath, "owner.json"), JSON.stringify({ pid: process.pid, acquiredAt: Date.now(), token }));
    } catch {}
    try {
      return fn();
    } finally {
      if (readLockOwner(lockPath)?.token === token || readLockOwner(lockPath) === null) {
        rmSync(lockPath, { recursive: true, force: true });
      }
    }
  }
  return null;
}
function withLocalStateLock(fn) {
  try {
    mkdirSync(dirname(LOCAL_STATE_LOCK_PATH), { recursive: true });
  } catch {
    return null;
  }
  return withDirLock(LOCAL_STATE_LOCK_PATH, fn);
}
function portableCore(collection, agentId, revision, exportedAt) {
  return {
    schemaVersion: PORTABLE_SCHEMA_VERSION,
    collectionId: collection.id,
    revision,
    exportedAt,
    sourceAgentId: agentId,
    activeSpriteId: collection.activeSpriteId,
    sprites: cloneState(collection.sprites)
  };
}
function collectionContentHash(collection) {
  return createHash("sha256").update(JSON.stringify({
    collectionId: collection.id,
    activeSpriteId: collection.activeSpriteId,
    sprites: collection.sprites
  })).digest("hex");
}
function portableChecksum(core) {
  return createHash("sha256").update(JSON.stringify(core)).digest("hex");
}
function parsePortableCollection(raw) {
  try {
    const value = JSON.parse(raw);
    if (value.schemaVersion !== PORTABLE_SCHEMA_VERSION || typeof value.collectionId !== "string" || safeIdentifier(value.collectionId, "") !== value.collectionId || !Number.isInteger(value.revision) || Number(value.revision) < 0 || !Number.isFinite(value.exportedAt) || Number(value.exportedAt) < 0 || typeof value.sourceAgentId !== "string" || value.sourceAgentId.length > 256 || !value.sprites || typeof value.sprites !== "object" || Array.isArray(value.sprites) || typeof value.checksum !== "string") {
      return null;
    }
    const core = {
      schemaVersion: PORTABLE_SCHEMA_VERSION,
      collectionId: value.collectionId,
      revision: Number(value.revision),
      exportedAt: Number(value.exportedAt),
      sourceAgentId: value.sourceAgentId,
      activeSpriteId: typeof value.activeSpriteId === "string" ? value.activeSpriteId : null,
      sprites: value.sprites
    };
    if (portableChecksum(core) !== value.checksum)
      return null;
    const spriteEntries = Object.entries(core.sprites);
    if (spriteEntries.length === 0 || spriteEntries.length > PORTABLE_MAX_SPRITES)
      return null;
    for (const [spriteId, sprite] of spriteEntries) {
      if (safeIdentifier(spriteId, "") !== spriteId || !sprite || typeof sprite !== "object" || Array.isArray(sprite) || safeIdentifier(sprite.id, "") !== spriteId) {
        return null;
      }
    }
    if (core.activeSpriteId !== null && !core.sprites[core.activeSpriteId])
      return null;
    return { ...core, checksum: value.checksum };
  } catch {
    return null;
  }
}
var GIT_ENV_BLOCKLIST = /^(GIT_DIR|GIT_WORK_TREE|GIT_COMMON_DIR|GIT_INDEX_FILE|GIT_OBJECT_DIRECTORY|GIT_ALTERNATE_OBJECT_DIRECTORIES|GIT_NAMESPACE|GIT_CEILING_DIRECTORIES|GIT_DISCOVERY_ACROSS_FILESYSTEM|GIT_CONFIG|GIT_CONFIG_GLOBAL|GIT_CONFIG_SYSTEM|GIT_CONFIG_NOSYSTEM|GIT_CONFIG_PARAMETERS|GIT_CONFIG_COUNT|GIT_CONFIG_KEY_\d+|GIT_CONFIG_VALUE_\d+|GIT_EXTERNAL_DIFF|GIT_DIFF_OPTS|GIT_EDITOR|GIT_SEQUENCE_EDITOR|GIT_PAGER|GIT_EXEC_PATH|GIT_TEMPLATE_DIR)$/;
function gitEnv() {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || GIT_ENV_BLOCKLIST.test(key))
      continue;
    env[key] = value;
  }
  env.GIT_TERMINAL_PROMPT = "0";
  env.GIT_PAGER = "cat";
  return env;
}
function emptyHooksDir(memoryDir) {
  const path = join(memoryDir, ".git", "sprite-empty-hooks");
  try {
    mkdirSync(path, { recursive: true });
    if (lstatSync(path).isSymbolicLink())
      return null;
    if (readdirSync(path).length > 0)
      return null;
    return path;
  } catch {
    return null;
  }
}
function runGit(memoryDir, args) {
  const hooks = emptyHooksDir(memoryDir);
  if (!hooks)
    throw new Error("sprite: hook directory is not empty or not a directory");
  return execFileSync("git", [
    "-C",
    memoryDir,
    "-c",
    `core.hooksPath=${hooks}`,
    "-c",
    "core.fsmonitor=false",
    "-c",
    "commit.gpgSign=false",
    "-c",
    "tag.gpgSign=false",
    "-c",
    "push.gpgSign=false",
    "-c",
    "diff.external=",
    "-c",
    "filter.lfs.clean=",
    "-c",
    "filter.lfs.smudge=",
    "-c",
    "filter.lfs.process=",
    "-c",
    "filter.lfs.required=false",
    "-c",
    "protocol.http.allow=never",
    ...args
  ], {
    encoding: "utf-8",
    timeout: 15000,
    stdio: ["ignore", "pipe", "pipe"],
    env: gitEnv()
  }).trim();
}
function tryGit(memoryDir, args) {
  try {
    return runGit(memoryDir, args);
  } catch {
    return null;
  }
}
function hasOnlySpritePaths(memoryDir, commit) {
  const parents = tryGit(memoryDir, ["rev-list", "--parents", "-n", "1", commit]);
  if (parents === null || parents.split(/\s+/).filter(Boolean).length > 2)
    return false;
  const paths = tryGit(memoryDir, ["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", commit]);
  if (paths === null)
    return false;
  const list = paths.split(/\r?\n/).filter(Boolean);
  if (list.length === 0)
    return false;
  return list.every((path) => path === PORTABLE_RELATIVE_PATH || path.startsWith("data/mods/letta-ai-sprite/"));
}
function isSpriteOwnedCommit(memoryDir, commit) {
  const body = tryGit(memoryDir, ["show", "-s", "--format=%B", commit]);
  return body !== null && body.includes(PORTABLE_COMMIT_TRAILER) && hasOnlySpritePaths(memoryDir, commit);
}
function pushValidated(memoryDir, remote, branch, sha) {
  runGit(memoryDir, ["push", remote, `${sha}:refs/heads/${branch}`]);
}
function safePushTarget(memoryDir, refreshRemote) {
  const upstream = tryGit(memoryDir, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  if (!upstream)
    return { kind: "none" };
  const slash = upstream.indexOf("/");
  if (slash <= 0 || slash === upstream.length - 1)
    return { kind: "blocked", reason: "invalid upstream" };
  const remote = upstream.slice(0, slash);
  const branch = upstream.slice(slash + 1);
  if (refreshRemote && tryGit(memoryDir, ["fetch", remote, branch]) === null) {
    return { kind: "blocked", reason: "could not refresh MemFS upstream" };
  }
  const head = tryGit(memoryDir, ["rev-parse", "--verify", "HEAD^{commit}"]);
  if (!head || !/^[0-9a-f]{40,64}$/.test(head))
    return { kind: "blocked", reason: "could not resolve HEAD" };
  const counts = tryGit(memoryDir, ["rev-list", "--left-right", "--count", `${upstream}...${head}`]);
  if (!counts)
    return { kind: "blocked", reason: "could not compare upstream" };
  const [behind, ahead] = counts.split(/\s+/).map(Number);
  if (behind > 0)
    return { kind: "blocked", reason: "MemFS branch is behind or diverged" };
  if (ahead > 0) {
    const commits = tryGit(memoryDir, ["rev-list", `${upstream}..${head}`]);
    if (!commits)
      return { kind: "blocked", reason: "could not inspect unpushed commits" };
    for (const commit of commits.split(/\r?\n/).filter(Boolean)) {
      if (!isSpriteOwnedCommit(memoryDir, commit)) {
        return { kind: "blocked", reason: "unrelated MemFS commits are waiting to push" };
      }
    }
  }
  return { kind: "ready", remote, branch, ahead, head };
}
function portablePath(memoryDir) {
  let current = memoryDir;
  for (const segment of PORTABLE_RELATIVE_PATH.split("/")) {
    current = join(current, segment);
    try {
      if (existsSync(current) && lstatSync(current).isSymbolicLink())
        return null;
    } catch {
      return null;
    }
  }
  return current;
}
function withMemfsLock(memoryDir, fn) {
  return withDirLock(join(memoryDir, ".git", "sprite-backup.lock"), fn);
}
function checkpointPortableCollection(memoryDir, agentId, agentName, collection) {
  if (!existsSync(join(memoryDir, ".git"))) {
    return { ok: false, status: "portable backup unavailable \u2014 MemFS is not a git repository" };
  }
  const result = withMemfsLock(memoryDir, () => {
    const dirty = tryGit(memoryDir, ["status", "--porcelain"]);
    if (dirty === null) {
      return { ok: false, status: "portable backup blocked \u2014 MemFS git is unusable (hooks dir not empty?)" };
    }
    if (dirty) {
      return { ok: false, status: "portable backup pending \u2014 MemFS has uncommitted work" };
    }
    const pushPolicy = collection.backup?.pushPolicy ?? "safe";
    const pushTarget = safePushTarget(memoryDir, pushPolicy === "safe");
    if (pushTarget.kind === "blocked") {
      return { ok: false, status: `portable backup pending \u2014 ${pushTarget.reason}` };
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
            hash
          };
        } catch {
          return {
            ok: false,
            status: "portable backup committed locally \xB7 push failed",
            revision: collection.backup.revision,
            hash
          };
        }
      }
      return {
        ok: true,
        status: collection.backup.lastStatus ?? "portable backup already current",
        revision: collection.backup.revision,
        hash
      };
    }
    const revision = (collection.backup?.revision ?? 0) + 1;
    const core = portableCore(collection, agentId, revision, Date.now());
    const payload = { ...core, checksum: portableChecksum(core) };
    const outputPath = portablePath(memoryDir);
    if (!outputPath) {
      return { ok: false, status: "portable backup blocked \u2014 Sprite's MemFS path contains a symlink" };
    }
    mkdirSync(dirname(outputPath), { recursive: true });
    const previous = existsSync(outputPath) ? readFileSync(outputPath) : null;
    const tmp = `${outputPath}.${process.pid}.${Date.now().toString(36)}.tmp`;
    try {
      if (lstatSync(tmp).isSymbolicLink()) {
        return { ok: false, status: "portable backup blocked \u2014 Sprite's MemFS path contains a symlink" };
      }
      rmSync(tmp, { force: true });
    } catch {}
    const commitMessage = [
      `mod-state(sprite): checkpoint ${collection.sprites[collection.activeSpriteId ?? ""]?.name ?? "collection"}`,
      "",
      `Portable Sprite state revision ${revision}.`,
      "",
      PORTABLE_COMMIT_TRAILER
    ].join(`
`);
    let committed = null;
    try {
      writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}
`, { flag: "wx" });
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
        PORTABLE_RELATIVE_PATH
      ]);
      committed = runGit(memoryDir, ["rev-parse", "--verify", "HEAD^{commit}"]);
    } catch {
      tryGit(memoryDir, ["reset", "HEAD", "--", PORTABLE_RELATIVE_PATH]);
      rmSync(tmp, { force: true });
      if (previous)
        writeFileSync(outputPath, previous);
      else
        rmSync(outputPath, { force: true });
      return { ok: false, status: "portable backup failed during commit" };
    }
    let status = "portable backup committed locally";
    if (pushPolicy === "never") {
      status += " \xB7 push disabled";
    } else if (pushTarget.kind === "none") {
      status += " \xB7 no remote configured";
    } else {
      try {
        const parent = tryGit(memoryDir, ["rev-parse", "--verify", `${committed}^{commit}^`]);
        if (!committed || parent !== pushTarget.head || !isSpriteOwnedCommit(memoryDir, committed)) {
          return {
            ok: false,
            status: "portable backup committed locally \xB7 push skipped (MemFS changed underneath)",
            revision,
            hash
          };
        }
        pushValidated(memoryDir, pushTarget.remote, pushTarget.branch, committed);
        status = "portable backup synced";
      } catch {
        return {
          ok: false,
          status: "portable backup committed locally \xB7 push failed",
          revision,
          hash
        };
      }
    }
    return { ok: true, status, revision, hash };
  });
  return result ?? { ok: false, status: "portable backup pending \u2014 MemFS is busy" };
}
function readPortableCollection(memoryDir) {
  try {
    const path = portablePath(memoryDir);
    if (!path)
      return null;
    if (statSync(path).size > PORTABLE_MAX_BYTES)
      return null;
    return parsePortableCollection(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}
function hashString(input) {
  let h = 2166136261 >>> 0;
  for (let i = 0;i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function fateRoll(agentId) {
  const h = hashString(`sprite:${agentId}`);
  const rarityRoll = h % 1000 / 1000;
  let rarity;
  if (rarityRoll < 0.55)
    rarity = "common";
  else if (rarityRoll < 0.85)
    rarity = "uncommon";
  else if (rarityRoll < 0.97)
    rarity = "rare";
  else
    rarity = "legendary";
  const pool = RARITY_POOLS[rarity];
  const species = pool[(h >>> 10) % pool.length];
  const shiny = hashString(`shiny:${agentId}`) % 100 === 0;
  return { species, shiny };
}
var RARITY_ORDER = ["common", "uncommon", "rare", "legendary"];
var BREED_MIN_LEVEL = 10;
var BREED_COOLDOWN_MS = 7 * 24 * 3600000;
function roll01(seed, salt) {
  return hashString(`${salt}:${seed}`) % 1e5 / 1e5;
}
function rarityIdx(species) {
  const rarity = SPECIES.find((s) => s.id === species)?.rarity ?? "common";
  if (rarity === "special")
    return RARITY_ORDER.length - 1;
  return Math.max(0, RARITY_ORDER.indexOf(rarity));
}
function childFateSeed(parentSeedA, parentSeedB, breedNonce) {
  const [a, b] = [String(parentSeedA), String(parentSeedB)].sort();
  const field = (x) => `${x.length}:${x}`;
  return String(hashString(`breed:${field(a)}${field(b)}${field(String(breedNonce))}`));
}
function hybridSpecies(a, b) {
  return HYBRID_PAIRS[[a, b].sort().join("|")] ?? "chimera";
}
function mutationSpecies(seed, a, b) {
  const base = Math.max(rarityIdx(a), rarityIdx(b));
  const stepRoll = roll01(seed, "mutstep");
  let idx = base;
  if (stepRoll < 0.15)
    idx = Math.min(RARITY_ORDER.length - 1, base + 1);
  else if (stepRoll > 0.85)
    idx = Math.max(0, base - 1);
  const pool = RARITY_POOLS[RARITY_ORDER[idx]].filter((id) => id !== a && id !== b);
  const usePool = pool.length ? pool : SPECIES_IDS.filter((id) => id !== a && id !== b);
  return usePool[hashString(`mutate:${seed}`) % usePool.length];
}
function rollSpecies(seed, a, b) {
  const combined = rarityIdx(a) + rarityIdx(b);
  const hybridChance = 0.02 + 0.015 * combined;
  const mutationChance = 0.08;
  const r = roll01(seed, "species");
  if (r < hybridChance)
    return { species: hybridSpecies(a, b), kind: "hybrid" };
  if (r < hybridChance + mutationChance)
    return { species: mutationSpecies(seed, a, b), kind: "mutation" };
  const [lo, hi] = [a, b].sort();
  return { species: roll01(seed, "parentpick") < 0.5 ? lo : hi, kind: "inherited" };
}
function rollShiny(seed, aShiny, bShiny) {
  const n = (aShiny ? 1 : 0) + (bShiny ? 1 : 0);
  return roll01(seed, "shiny") < (n === 2 ? 0.25 : n === 1 ? 0.08 : 0.01);
}
function rollTemperament(seed, a, b) {
  if (roll01(seed, "tempmut") < 0.1) {
    const pool = TEMPERAMENTS.filter((t) => t !== a && t !== b);
    return (pool.length ? pool : TEMPERAMENTS)[hashString(`tempnew:${seed}`) % (pool.length || TEMPERAMENTS.length)];
  }
  const [lo, hi] = [a, b].sort();
  return roll01(seed, "temppick") < 0.5 ? lo : hi;
}
function breedSprites(a, b, nonce = randomBytes(6).toString("hex")) {
  const seed = childFateSeed(a.seed, b.seed, nonce);
  const sp = rollSpecies(seed, a.species, b.species);
  return {
    seed,
    breedNonce: nonce,
    species: sp.species,
    speciesKind: sp.kind,
    shiny: rollShiny(seed, a.shiny, b.shiny),
    temperament: rollTemperament(seed, a.temperament ?? temperamentOf(a.seed), b.temperament ?? temperamentOf(b.seed)),
    parents: [a.id, b.id],
    generation: Math.max(a.generation ?? 0, b.generation ?? 0) + 1
  };
}
function xpToNext(level) {
  return 100 + (level - 1) * 50;
}
var STAT_KEYS = ["craft", "wander", "grit", "lore", "spark"];
var STAT_LABELS = {
  craft: "CRAFT",
  wander: "WANDER",
  grit: "GRIT",
  lore: "LORE",
  spark: "SPARK"
};
var BAR_CELLS = 8;
var LAP_BASE_COST = 100;
var LAP_GROWTH = 1.15;
var LAP_GROW_UNTIL = 10;
function lapCost(lap) {
  return Math.round(LAP_BASE_COST * Math.pow(LAP_GROWTH, Math.min(lap, LAP_GROW_UNTIL)));
}
function lapProgress(value) {
  let remaining = Math.max(0, Math.floor(value));
  let laps = 0;
  while (laps < LAP_GROW_UNTIL && remaining >= lapCost(laps)) {
    remaining -= lapCost(laps);
    laps += 1;
  }
  if (laps >= LAP_GROW_UNTIL) {
    const flat = lapCost(LAP_GROW_UNTIL);
    const extra = Math.floor(remaining / flat);
    laps += extra;
    remaining -= extra * flat;
  }
  const cost = lapCost(laps);
  const filled = Math.min(BAR_CELLS, Math.floor(remaining / cost * BAR_CELLS));
  return { laps, filled, intoLap: remaining, cost };
}
var LAP_STYLES = ["count", "odometer", "belt", "pips"];
var BELT_GLYPHS = ["\u25B0", "\u25AE", "\u2588", "\u2593", "\u2592"];
var HUE_LADDER = ["#8c8c96", "#ebebf0", "#ffd660", "#ff96b4", "#be96ff", "#78e6dc"];
var HUE_EMPTY = "#4a4a56";
var SHIMMER = ["#ffb4b4", "#ffd6a0", "#fff2a0", "#c8ffb4", "#b4f0ff", "#c8c8ff", "#f0b4ff", "#ffb4dc"];
function hueForLap(lap, cell) {
  if (lap < HUE_LADDER.length)
    return HUE_LADDER[lap];
  return SHIMMER[(cell + lap) % SHIMMER.length];
}
var PLAIN_PAINT = { fill: (t) => t, empty: (t) => t, mark: (t) => t };
function huePaint(chalk) {
  return {
    fill: (t, lap, cell) => chalk.hex(hueForLap(lap, cell))(t),
    empty: (t) => chalk.hex(HUE_EMPTY)(t),
    mark: (t, lap) => chalk.hex(hueForLap(lap, 0))(t)
  };
}
function statBar(value, style = "count", paint = PLAIN_PAINT) {
  const p = lapProgress(value);
  const cells = style === "odometer" ? BAR_CELLS - 1 : BAR_CELLS;
  const filled = style === "odometer" ? Math.min(cells, Math.round(p.intoLap / p.cost * cells)) : p.filled;
  const beltIdx = (lap) => lap % BELT_GLYPHS.length;
  const fillGlyph = style === "belt" ? BELT_GLYPHS[beltIdx(p.laps)] : "\u25B0";
  const underGlyph = style === "belt" && p.laps > 0 ? BELT_GLYPHS[beltIdx(p.laps - 1)] : "\u25B1";
  let bar = "";
  for (let i = 0;i < cells; i += 1) {
    if (i < filled)
      bar += paint.fill(fillGlyph, p.laps, i);
    else if (style === "belt" && p.laps > 0)
      bar += paint.fill(underGlyph, p.laps - 1, i);
    else
      bar += paint.empty("\u25B1");
  }
  switch (style) {
    case "odometer":
      return paint.mark(`\u27E8${p.laps}\u27E9`, p.laps) + bar;
    case "belt":
      return p.laps >= BELT_GLYPHS.length ? `${bar} ${paint.mark(`\xD7${p.laps}`, p.laps)}` : bar;
    case "pips":
      if (p.laps === 0)
        return bar;
      return p.laps <= 8 ? `${bar} ${paint.mark("\xB7".repeat(p.laps), p.laps)}` : `${bar} ${paint.mark(`\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7+${p.laps - 8}`, p.laps)}`;
    default:
      return p.laps > 0 ? `${bar} ${paint.mark(`\xD7${p.laps}`, p.laps)}` : bar;
  }
}
var TEMPERAMENTS = ["gentle", "wry", "bold", "sleepy", "odd"];
var VOCATIONS = {
  craft: "diligent",
  wander: "curious",
  grit: "stubborn",
  lore: "bookish",
  spark: "chatty"
};
var VOCATION_MIN = 10;
function temperamentOf(agentId) {
  return TEMPERAMENTS[hashString(`temper:${agentId}`) % TEMPERAMENTS.length];
}
function vocationOf(stats) {
  let best = null;
  let bestVal = 0;
  for (const key of STAT_KEYS) {
    if (stats[key] > bestVal) {
      bestVal = stats[key];
      best = key;
    }
  }
  return best && bestVal >= VOCATION_MIN ? VOCATIONS[best] : null;
}
function natureLine(sprite) {
  const temper = sprite.temperament ?? temperamentOf(sprite.seed);
  const vocation = vocationOf(sprite.stats);
  return vocation ? `a ${temper}, ${vocation} ${sprite.species}` : `a ${temper} little ${sprite.species}`;
}
var TITLES = [
  [100, "lifelong"],
  [50, "old friend"],
  [25, "familiar"],
  [10, "companion"],
  [5, "settled in"]
];
function titleFor(level) {
  for (const [min, title] of TITLES) {
    if (level >= min)
      return title;
  }
  return null;
}
function statForTool(name) {
  const n = String(name || "");
  if (/memory|memfs/i.test(n))
    return "lore";
  if (/^(Read|Grep|Glob|Search|Find|Ls|List|WebFetch|WebSearch|Fetch)/i.test(n))
    return "wander";
  return "craft";
}
var ACTIVE_HOSTS = globalThis[Symbol.for("@faye/sprite:hosts")] ??= new WeakSet;
var __genetics = { breedSprites, childFateSeed, rollSpecies, rollShiny, rollTemperament, rarityIdx };
function activate(letta) {
  const guardable = Boolean(letta && typeof letta === "object");
  if (guardable) {
    if (ACTIVE_HOSTS.has(letta)) {
      try {
        letta.log?.warn?.("sprite: already active on this host \u2014 skipping duplicate activation");
      } catch {}
      return;
    }
    ACTIVE_HOSTS.add(letta);
  }
  const disposers = [];
  disposers.push(() => {
    if (guardable)
      ACTIVE_HOSTS.delete(letta);
  });
  try {
    return activateInner(letta, disposers);
  } catch (error) {
    for (const dispose of disposers.reverse()) {
      try {
        dispose();
      } catch {}
    }
    throw error;
  }
}
function activateInner(letta, disposers) {
  const hasPanels = Boolean(letta.capabilities.ui.panels);
  const loaded = loadState();
  const state = loaded.state;
  let baseState = cloneState(state);
  let dirty = loaded.migrated;
  for (const collection of Object.values(state.collections)) {
    const roster = Object.values(collection.sprites);
    const beforeFounders = roster.map((sp) => sp.founder === true);
    ensureOneFounder(collection.sprites, collection.ownerAgentId);
    if (roster.some((sp, i) => sp.founder === true !== beforeFounders[i]))
      dirty = true;
    for (const sp of roster) {
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
    if (!dirty && !evenIfClean)
      return;
    const flushed = withLocalStateLock(() => {
      let loadedNow = loadState();
      if (loadedNow.corrupt && loadedNow.corruptText !== undefined) {
        if (quarantineCorruptState(loadedNow.corruptText))
          loadedNow = loadState();
      }
      if (loadedNow.corrupt)
        return false;
      const remote = loadedNow.state;
      const merged = mergeState(baseState, state, remote);
      if (!saveState(merged))
        return false;
      reconcileInPlace(state, merged);
      baseState = cloneState(merged);
      return true;
    });
    if (flushed)
      dirty = false;
  };
  const replaceCollection = (agentId, replacement, force) => {
    flush();
    const replaced = withLocalStateLock(() => {
      let loadedNow = loadState();
      if (loadedNow.corrupt && loadedNow.corruptText !== undefined) {
        if (quarantineCorruptState(loadedNow.corruptText))
          loadedNow = loadState();
      }
      if (loadedNow.corrupt)
        return false;
      const latest = loadedNow.state;
      if (!force && latest.collections[agentId]) {
        reconcileInPlace(state, latest);
        baseState = cloneState(latest);
        return "exists";
      }
      const next = cloneState(replacement);
      if (force)
        next.generation = (latest.collections[agentId]?.generation ?? 0) + 1;
      latest.collections[agentId] = next;
      if (!saveState(latest))
        return false;
      reconcileInPlace(state, latest);
      baseState = cloneState(latest);
      return true;
    });
    if (replaced === true || replaced === "exists")
      dirty = false;
    return replaced ?? false;
  };
  const seenVersion = typeof state.global.lastSeenVersion === "string" ? state.global.lastSeenVersion : null;
  const updatedFrom = seenVersion && semverCompare(MOD_VERSION, seenVersion) > 0 ? seenVersion : null;
  if (seenVersion !== MOD_VERSION) {
    state.global.lastSeenVersion = MOD_VERSION;
    if (updatedFrom)
      state.global.updateNoticeFrom = updatedFrom;
    if (!loaded.corrupt)
      dirty = true;
  }
  if (dirty)
    flush();
  let activeAgentId = null;
  let activeAgentName = null;
  let pose = "idle";
  let poseUntil = 0;
  let sleeping = false;
  let dozing = false;
  let lastActivityAt = Date.now();
  let bubble = "";
  let bubbleUntil = 0;
  let lastVoiceAt = 0;
  let x = 0;
  let dir = 1;
  let tickCount = 0;
  let errorStreak = 0;
  const memoryDirs = new Map;
  const pendingCheckpoints = new Map;
  const backupAttemptAt = new Map;
  const pendingBashCommands = new Map;
  const IDLE_NAP_MS = 30 * 60000;
  const MISSED_YOU_MS = 24 * 3600000;
  const BACKUP_RETRY_MS = 5 * 60000;
  for (const [agentId, collection] of Object.entries(state.collections)) {
    if (!backupEnabled(collection))
      continue;
    const stateDrifted = collection.backup?.lastHash !== collectionContentHash(collection);
    const reason = collection.backup?.pendingReason ?? (stateDrifted ? "state-changed-while-offline" : null);
    if (reason) {
      pendingCheckpoints.set(agentId, reason);
      if (collection.backup)
        collection.backup.pendingReason = reason;
      dirty = true;
    }
  }
  function contextSnapshot(ctx) {
    const candidates = [];
    if (ctx && typeof ctx === "object")
      candidates.push(ctx);
    if (ctx?.context)
      candidates.push(ctx.context);
    try {
      if (typeof ctx?.getContext === "function")
        candidates.push(ctx.getContext());
    } catch {}
    try {
      if (typeof letta.getContext === "function")
        candidates.push(letta.getContext());
    } catch {}
    const objects = candidates.filter((c) => c && typeof c === "object");
    return objects.find((c) => c.memfs && typeof c.memfs === "object" && c.agent?.id) ?? objects.find((c) => c.agent?.id) ?? objects[0] ?? null;
  }
  function rememberMemfs(agentId, ctx) {
    if (!agentId)
      return;
    const snapshot = contextSnapshot(ctx);
    if (snapshot?.agent?.id === agentId && snapshot?.memfs?.enabled === true && typeof snapshot.memfs.memoryDir === "string" && snapshot.memfs.memoryDir) {
      memoryDirs.set(agentId, snapshot.memfs.memoryDir);
    }
  }
  function backupEnabled(collection) {
    return collection?.backup?.enabled === true;
  }
  function queueCheckpoint(agentId, reason) {
    const collection = getCollection(agentId);
    if (!agentId || !backupEnabled(collection))
      return;
    pendingCheckpoints.set(agentId, reason);
    if (collection?.backup)
      collection.backup.pendingReason = reason;
    markDirty();
  }
  function ownerAgentId(sprite) {
    for (const [agentId, collection] of Object.entries(state.collections)) {
      if (collection.sprites[sprite.id] === sprite)
        return agentId;
    }
    return null;
  }
  function restorePortable(agentId, force = false) {
    const memoryDir = memoryDirs.get(agentId);
    if (!memoryDir)
      return "portable restore unavailable \u2014 this agent has no accessible MemFS here";
    if (getCollection(agentId) && !force) {
      return "local companion state already exists \u2014 use /sprite backup restore force to replace it deliberately";
    }
    const portable = readPortableCollection(memoryDir);
    if (!portable)
      return "no valid portable Sprite backup found";
    const collection = normalizeCollection(agentId, {
      id: portable.collectionId,
      ownerAgentId: agentId,
      activeSpriteId: portable.activeSpriteId,
      sprites: portable.sprites
    });
    const hash = collectionContentHash(collection);
    collection.backup = {
      enabled: false,
      pushPolicy: "safe",
      revision: portable.revision,
      lastHash: hash,
      lastCheckpointAt: portable.exportedAt,
      lastStatus: `restored portable backup revision ${portable.revision} \xB7 backup remains off until enabled`
    };
    const outcome = replaceCollection(agentId, collection, force);
    if (outcome === "exists") {
      panel.update();
      return "local companion state already exists \u2014 use /sprite backup restore force to replace it deliberately";
    }
    if (!outcome) {
      return "portable restore failed while saving local state \u2014 existing state was left untouched";
    }
    panel.update();
    return `${collection.sprites[collection.activeSpriteId ?? ""]?.name ?? "your companion"} restored from portable backup revision ${portable.revision}. same soul, new installation.`;
  }
  function maybeAutoRestore(agentId) {
    if (!agentId || getCollection(agentId) || !memoryDirs.has(agentId))
      return;
    flush(true);
    if (getCollection(agentId))
      return;
    const memoryDir = memoryDirs.get(agentId);
    const path = portablePath(memoryDir);
    if (!path || !existsSync(path))
      return;
    restorePortable(agentId);
  }
  function processCheckpoint(agentId, force = false) {
    const collection = getCollection(agentId);
    if (!collection || !backupEnabled(collection))
      return "portable backup is off";
    const memoryDir = memoryDirs.get(agentId);
    if (!memoryDir) {
      collection.backup.lastStatus = "portable backup unavailable \u2014 this agent has no accessible MemFS here";
      collection.backup.pendingReason = pendingCheckpoints.get(agentId) ?? "checkpoint";
      markDirty();
      flush();
      return collection.backup.lastStatus;
    }
    const now = Date.now();
    if (!force && now - (backupAttemptAt.get(agentId) ?? 0) < BACKUP_RETRY_MS) {
      return collection.backup.lastStatus ?? "portable backup queued";
    }
    backupAttemptAt.set(agentId, now);
    flush();
    const result = checkpointPortableCollection(memoryDir, agentId, activeAgentName, collection);
    collection.backup = {
      ...collection.backup,
      enabled: true,
      pushPolicy: collection.backup?.pushPolicy ?? "safe",
      revision: result.revision ?? collection.backup?.revision ?? 0,
      ...result.hash ? { lastHash: result.hash } : {},
      ...result.ok ? { lastCheckpointAt: now } : {},
      lastStatus: result.status,
      ...result.ok ? {} : { pendingReason: pendingCheckpoints.get(agentId) ?? "checkpoint" }
    };
    if (result.ok) {
      delete collection.backup.pendingReason;
      pendingCheckpoints.delete(agentId);
    }
    markDirty();
    flush();
    return result.status;
  }
  function noteActivity(sprite) {
    lastActivityAt = Date.now();
    if (sprite && sprite.phase === "alive")
      maybeAnnounceUpdate(sprite);
    if (dozing) {
      dozing = false;
      if (sprite && sprite.phase === "alive") {
        logEntry(sprite, "mood", "(stirred awake \u2014 something's happening)");
      }
      panel.update();
    }
    if (sprite) {
      sprite.lastSeenAt = Date.now();
      markDirty();
    }
  }
  function getCollection(agentId) {
    if (!agentId)
      return null;
    return state.collections[agentId] ?? null;
  }
  function getSprite(agentId) {
    const collection = getCollection(agentId);
    if (!collection?.activeSpriteId)
      return null;
    return collection.sprites[collection.activeSpriteId] ?? null;
  }
  function toolAgent(ctx) {
    if (ctx?.agent?.id) {
      activeAgentId = ctx.agent.id;
      activeAgentName = ctx.agent.name ?? activeAgentName;
      rememberMemfs(activeAgentId, ctx);
      refreshIfUnknown(activeAgentId);
      maybeAutoRestore(activeAgentId);
    }
    return ctx?.agent?.id ?? activeAgentId;
  }
  function setting(sprite, key) {
    if (sprite && sprite.settings && key in sprite.settings)
      return sprite.settings[key];
    if (key in state.global)
      return state.global[key];
    return DEFAULT_SETTINGS[key];
  }
  function lapStyleOf(sprite) {
    const v = setting(sprite, "laps");
    return LAP_STYLES.includes(v) ? v : "count";
  }
  function speciesOf(sprite) {
    return SPECIES.find((s) => s.id === sprite.species) ?? SPECIES[0];
  }
  const voiceBags = new Map;
  function shuffled(arr) {
    const out = [...arr];
    for (let i = out.length - 1;i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function pickLine(sprite, category) {
    const custom = sprite.voice?.[category];
    let pool;
    if (custom && custom.length > 0) {
      pool = custom;
    } else {
      const speciesLines = SPECIES_CORPUS[sprite.species]?.[category] ?? [];
      const temper = sprite.temperament ?? "gentle";
      const temperLines = TEMPERAMENT_CORPUS[temper]?.[category] ?? [];
      const merged = [...speciesLines, ...temperLines];
      pool = merged.length > 0 ? merged : BASE_CORPUS[category];
    }
    if (pool.length === 1)
      return pool[0];
    const key = `${sprite.hatchedAt ?? 0}:${sprite.species}:${category}`;
    const fp = pool.join("\x01");
    let bag = voiceBags.get(key);
    if (!bag || bag.fp !== fp || bag.lines.length === 0) {
      const fresh = shuffled(pool);
      if (bag?.last && fresh[fresh.length - 1] === bag.last && fresh.length > 1) {
        const j = Math.floor(Math.random() * (fresh.length - 1));
        [fresh[fresh.length - 1], fresh[j]] = [fresh[j], fresh[fresh.length - 1]];
      }
      bag = { fp, lines: fresh, last: bag?.last ?? null };
      voiceBags.set(key, bag);
    }
    const line = bag.lines.pop();
    bag.last = line;
    return line;
  }
  const DIARY_MAX = 40;
  let updateAnnounced = false;
  function maybeAnnounceUpdate(sprite) {
    if (updateAnnounced || typeof state.global.updateNoticeFrom !== "string")
      return;
    updateAnnounced = true;
    logEntry(sprite, "mood", `(learned new tricks: v${state.global.updateNoticeFrom} \u2192 v${MOD_VERSION} \u2014 /sprite changelog)`);
    markDirty();
  }
  function logEntry(sprite, category, line) {
    sprite.log = [...sprite.log ?? [], { at: Date.now(), category, line }].slice(-DIARY_MAX);
  }
  function speak(sprite, category, force = false) {
    if (setting(sprite, "voice") !== "on")
      return null;
    const rateMs = Number(setting(sprite, "voiceRateMin")) * 60000;
    const now = Date.now();
    if (!force && now - lastVoiceAt < rateMs)
      return null;
    lastVoiceAt = now;
    bubble = pickLine(sprite, category);
    bubbleUntil = now + 8000;
    logEntry(sprite, category, bubble);
    markDirty();
    panel.update();
    return bubble;
  }
  function bumpStat(sprite, key) {
    sprite.stats[key] = Math.min(MAX_STAT, sprite.stats[key] + 1);
  }
  function awardXp(sprite, amount) {
    const before = sprite.level;
    applyTotalXp(sprite, totalXp(sprite) + Math.max(0, amount));
    const leveled = sprite.level > before;
    markDirty();
    if (leveled) {
      setPose("happy", 4000);
      speak(sprite, "level_up");
      queueCheckpoint(ownerAgentId(sprite), "level-up");
    }
  }
  function setPose(next, holdMs = 3000) {
    if (sleeping)
      return;
    pose = next;
    poseUntil = Date.now() + holdMs;
    panel.update();
  }
  function beginHatch(agentId, agentName, pick, another = false) {
    if (!agentId)
      return "i can't tell which agent this is \u2014 try again from an active conversation.";
    let outcome = null;
    let created = null;
    const ok = withLocalStateLock(() => {
      const loadedNow = loadState();
      if (loadedNow.corrupt)
        return false;
      const latest = loadedNow.state;
      const collection = latest.collections[agentId] ?? (latest.collections[agentId] = {
        id: collectionIdForLegacyAgent(agentId),
        ownerAgentId: agentId,
        activeSpriteId: null,
        sprites: Object.create(null)
      });
      const existing = collection.activeSpriteId ? collection.sprites[collection.activeSpriteId] ?? null : null;
      if (existing?.phase === "egg") {
        outcome = "the egg is already here. it's warm.";
        return true;
      }
      if (existing?.phase === "alive" && !another) {
        outcome = `${existing.name} is already here. (/sprite hatch another to summon a second egg, /sprite molt to re-form, or /sprite for the card)`;
        return true;
      }
      const roster = Object.values(collection.sprites);
      if (roster.length >= MAX_SPRITES_PER_COLLECTION) {
        outcome = `you already have ${MAX_SPRITES_PER_COLLECTION} companions \u2014 that's the most this nest can hold.`;
        return true;
      }
      const founder = !roster.some((sp) => sp.founder);
      let seed = founder ? agentId : `${agentId}:${randomBytes(6).toString("hex")}`;
      let spriteId = founder ? stableId("sprite", `${agentId}:founder`) : stableId("sprite", seed);
      while (collection.sprites[spriteId] || collection.released?.[spriteId]) {
        seed = `${agentId}:${randomBytes(6).toString("hex")}`;
        spriteId = stableId("sprite", seed);
      }
      const fate = fateRoll(seed);
      const species = pick && SPECIES_IDS.includes(pick) ? pick : fate.species;
      created = {
        id: spriteId,
        seed,
        bornToAgentId: agentId,
        phase: "egg",
        ...founder ? { founder: true } : {},
        eggStartedAt: Date.now(),
        pendingSpecies: species,
        species,
        shiny: fate.shiny,
        name: agentName ? `${agentName}'s egg` : "the egg",
        named: false,
        xp: 0,
        level: 1,
        stats: { craft: 0, wander: 0, grit: 0, lore: 0, spark: 0 },
        settings: {}
      };
      collection.sprites[spriteId] = created;
      ensureOneFounder(collection.sprites, agentId);
      collection.activeSpriteId = spriteId;
      if (!saveState(latest))
        return false;
      reconcileInPlace(state, latest);
      baseState = cloneState(latest);
      outcome = founder ? "an egg appears under the statusline. it's warm. (hatching soon~)" : `${existing?.name ?? "your companion"} steps aside; a new egg appears under the statusline. it's warm.`;
      return true;
    });
    if (!ok)
      return "couldn't reach the nest right now (state file busy or unreadable) \u2014 try again in a moment.";
    if (created) {
      dirty = false;
      queueCheckpoint(agentId, "hatch-started");
      panel.update();
    }
    return outcome ?? "";
  }
  function completeHatch(agentId, sprite) {
    sprite.phase = "alive";
    sprite.hatchedAt = Date.now();
    sprite.species = sprite.pendingSpecies ?? sprite.species;
    sprite.temperament = sprite.temperament ?? temperamentOf(sprite.seed);
    delete sprite.pendingSpecies;
    const sp = speciesOf(sprite);
    if (!sprite.named) {
      sprite.name = sp.id.charAt(0).toUpperCase() + sp.id.slice(1);
    }
    markDirty();
    flush();
    queueCheckpoint(agentId, "hatched");
    const live = getCollection(agentId)?.sprites[sprite.id];
    if (!live)
      return;
    setPose("happy", 5000);
    speak(live, "greeting", true);
  }
  const panel = hasPanels ? letta.ui.openPanel({
    id: "sprite",
    order: -1,
    render: ({ width, agent, row, chalk }) => {
      activeAgentId = agent && agent.id || activeAgentId;
      activeAgentName = agent && agent.name || activeAgentName;
      const sprite = getSprite(activeAgentId);
      if (!sprite)
        return "";
      if (setting(sprite, "visible") !== "on")
        return "";
      if (sprite.phase === "egg") {
        const frame = EGG_FRAMES[tickCount % EGG_FRAMES.length];
        return row(`${" ".repeat(x)}${frame}`, chalk.dim("something is coming"), width);
      }
      const sp = speciesOf(sprite);
      let face = sp.poses[pose] ?? sp.poses.idle;
      if (sleeping || dozing)
        face = sp.poses.sleep;
      const shinyMark = sprite.shiny ? chalk.yellowBright("\u2726") : "";
      const label = `${chalk.cyan(sprite.name)}${shinyMark} ${chalk.dim(`\xB7Lv.${sprite.level}`)}`;
      const pad = " ".repeat(Math.max(0, Math.min(x, 16)));
      let right = bubble && Date.now() < bubbleUntil ? chalk.dim(`\u201C${bubble}\u201D`) : "";
      if (!right && setting(sprite, "bars") === "on") {
        const paint = setting(sprite, "hue") === "on" ? huePaint(chalk) : PLAIN_PAINT;
        right = STAT_KEYS.map((k) => `${chalk.dim(STAT_LABELS[k][0])} ${statBar(sprite.stats[k], lapStyleOf(sprite), paint)}`).join("  ");
      }
      return row(`${pad}${face}  ${label}`, right, width);
    }
  }) : { update() {}, close() {} };
  disposers.push(() => panel.close());
  const tick = setInterval(() => {
    tickCount += 1;
    const sprite = getSprite(activeAgentId);
    if (!sprite)
      return;
    let changed = false;
    if (sprite.phase === "egg") {
      const started = sprite.eggStartedAt ?? Date.now();
      if (Date.now() - started >= 12000 && activeAgentId) {
        completeHatch(activeAgentId, sprite);
      }
      panel.update();
      return;
    }
    const shouldDoze = !sleeping && Date.now() - lastActivityAt > IDLE_NAP_MS;
    if (shouldDoze !== dozing) {
      dozing = shouldDoze;
      if (dozing) {
        const quietMin = Math.max(1, Math.round((Date.now() - lastActivityAt) / 60000));
        logEntry(sprite, "mood", `(dozed off \u2014 ${quietMin} quiet minute${quietMin === 1 ? "" : "s"})`);
        markDirty();
      }
      changed = true;
    }
    const napping = sleeping || dozing;
    if (!napping && pose !== "idle" && Date.now() > poseUntil) {
      pose = "idle";
      changed = true;
    }
    if (!napping && pose === "idle" && Math.random() < 0.18) {
      pose = "blink";
      poseUntil = Date.now() + 1000;
      changed = true;
    } else if (pose === "blink" && Date.now() > poseUntil) {
      pose = "idle";
      changed = true;
    }
    if (!napping && tickCount % 4 === 0) {
      if (Math.random() < 0.12)
        dir = -dir;
      x = Math.max(0, Math.min(16, x + dir));
      if (x === 0)
        dir = 1;
      if (x === 16)
        dir = -1;
      changed = true;
    }
    if (bubble && Date.now() > bubbleUntil) {
      bubble = "";
      changed = true;
    }
    if (!napping && Math.random() < 0.002) {
      speak(sprite, "idle");
    }
    if (tickCount % 30 === 0) {
      flush();
      if (activeAgentId && pendingCheckpoints.has(activeAgentId))
        processCheckpoint(activeAgentId);
    }
    if (changed)
      panel.update();
  }, 1000);
  disposers.push(() => clearInterval(tick));
  function noteAgent(event, ctx) {
    const id = event?.agentId ?? ctx?.agent?.id ?? null;
    const name = event?.agentName ?? ctx?.agent?.name ?? null;
    if (id)
      activeAgentId = id;
    if (name)
      activeAgentName = name;
    rememberMemfs(id, ctx);
    refreshIfUnknown(id);
    maybeAutoRestore(id);
  }
  const refreshedFor = new Set;
  function refreshIfUnknown(agentId) {
    if (!agentId || getCollection(agentId) || refreshedFor.has(agentId))
      return;
    refreshedFor.add(agentId);
    flush(true);
  }
  if (letta.capabilities.events.lifecycle) {
    disposers.push(letta.events.on("conversation_open", (event, ctx) => {
      noteAgent(event, ctx);
      const sprite = getSprite(activeAgentId);
      if (!sprite || sprite.phase !== "alive")
        return;
      const missedYou = sprite.lastSeenAt !== undefined && Date.now() - sprite.lastSeenAt > MISSED_YOU_MS;
      noteActivity(sprite);
      awardXp(sprite, 5);
      setPose("happy", 3000);
      speak(sprite, missedYou ? "missed_you" : "greeting", missedYou);
    }));
  }
  if (letta.capabilities.events.tools) {
    disposers.push(letta.events.on("tool_start", (event, ctx) => {
      noteAgent(event, ctx);
      if (event.toolName === "Bash" && event.toolCallId) {
        const cmd = typeof event.args?.command === "string" ? event.args.command : "";
        if (cmd) {
          pendingBashCommands.set(event.toolCallId, cmd);
          if (pendingBashCommands.size > 32) {
            const oldest = pendingBashCommands.keys().next().value;
            if (oldest !== undefined)
              pendingBashCommands.delete(oldest);
          }
        }
      }
      const sprite = getSprite(activeAgentId);
      if (!sprite || sprite.phase !== "alive")
        return;
      noteActivity(sprite);
      const stat = statForTool(event.toolName);
      setPose(stat === "wander" ? "peek" : "work", 4000);
    }));
    disposers.push(letta.events.on("tool_end", (event, ctx) => {
      noteAgent(event, ctx);
      const bashCmd = event.toolCallId ? pendingBashCommands.get(event.toolCallId) : undefined;
      if (event.toolCallId)
        pendingBashCommands.delete(event.toolCallId);
      const sprite = getSprite(activeAgentId);
      if (!sprite || sprite.phase !== "alive")
        return;
      noteActivity(sprite);
      if (event.status === "error") {
        errorStreak += 1;
        awardXp(sprite, 1);
        setPose("oops", 3000);
        if (errorStreak === 1)
          speak(sprite, "tool_error");
      } else {
        if (errorStreak >= 2) {
          bumpStat(sprite, "grit");
          speak(sprite, "error_resolved");
        }
        errorStreak = 0;
        bumpStat(sprite, statForTool(event.toolName));
        awardXp(sprite, 2);
        if (bashCmd && /\bgit\b[\s\S]*\bcommit\b/.test(bashCmd)) {
          speak(sprite, "commit", true);
        }
      }
      markDirty();
    }));
  }
  if (letta.capabilities.events.llm) {
    disposers.push(letta.events.on("llm_end", (event, ctx) => {
      noteAgent(event, ctx);
      const sprite = getSprite(activeAgentId);
      if (!sprite || sprite.phase !== "alive")
        return;
      noteActivity(sprite);
      bumpStat(sprite, "spark");
      awardXp(sprite, 1);
    }));
  }
  if (letta.capabilities.events.compact) {
    disposers.push(letta.events.on("compact_start", (event, ctx) => {
      noteAgent(event, ctx);
      sleeping = true;
      const sprite = getSprite(activeAgentId);
      if (sprite && sprite.phase === "alive") {
        logEntry(sprite, "mood", "(fell asleep \u2014 memories folding)");
        markDirty();
      }
      panel.update();
    }));
    disposers.push(letta.events.on("compact_end", (event, ctx) => {
      noteAgent(event, ctx);
      sleeping = false;
      const sprite = getSprite(activeAgentId);
      if (sprite && sprite.phase === "alive") {
        setPose("happy", 3000);
        speak(sprite, "compact_done");
      }
      panel.update();
    }));
  }
  function findSprite(collection, query) {
    const q = query.trim().toLowerCase();
    if (!q)
      return null;
    const roster = Object.values(collection.sprites);
    const byIndex = /^#?(\d+)$/.exec(q);
    if (byIndex)
      return roster[Number(byIndex[1]) - 1] ?? null;
    const byId = roster.find((sp) => sp.id === q);
    if (byId)
      return byId;
    const exact = roster.filter((sp) => sp.name.toLowerCase() === q);
    if (exact.length === 1)
      return exact[0];
    if (exact.length > 1)
      return { ambiguous: exact };
    const prefix = roster.filter((sp) => sp.name.toLowerCase().startsWith(q));
    if (prefix.length === 1)
      return prefix[0];
    if (prefix.length > 1)
      return { ambiguous: prefix };
    return null;
  }
  function describeAmbiguity(collection, matches) {
    const roster = Object.values(collection.sprites);
    return `that matches ${matches.length} companions \u2014 pick one by number: ${matches.map((sp) => `#${roster.indexOf(sp) + 1} ${sp.name}`).join(", ")}`;
  }
  function rosterLine(collection, sp, index) {
    const species = speciesOf(sp);
    const active = collection.activeSpriteId === sp.id ? "\u25B6" : " ";
    const face = sp.phase === "egg" ? "( \u25CF )" : species.poses.idle;
    const tags = [sp.founder ? "founder" : null, sp.generation ? `gen ${sp.generation}` : null, speciesOf(sp).breedOnly ? "hybrid" : null, sp.shiny ? "\u2726shiny" : null, sp.phase === "egg" ? "egg" : null].filter(Boolean).join(" \xB7 ");
    return `${active} ${String(index + 1).padStart(2)}. ${face}  ${sp.name.padEnd(24)} ${sp.phase === "egg" ? "" : `${species.id} \xB7 lv.${sp.level}`}${tags ? `  [${tags}]` : ""}`;
  }
  function doList(agentId) {
    const collection = getCollection(agentId);
    if (!collection || Object.keys(collection.sprites).length === 0) {
      return "no companions yet \u2014 /sprite hatch to begin.";
    }
    const roster = Object.values(collection.sprites);
    return [
      `your companions (${roster.length}/${MAX_SPRITES_PER_COLLECTION}) \u2014 \u25B6 marks who's on the panel:`,
      ...roster.map((sp, i) => rosterLine(collection, sp, i)),
      "",
      "switch: /sprite switch <name|#>    another egg: /sprite hatch another [species]"
    ].join(`
`);
  }
  function doSwitch(agentId, query) {
    const collection = getCollection(agentId);
    if (!agentId || !collection)
      return "no companions yet \u2014 /sprite hatch to begin.";
    if (!query.trim())
      return "usage: /sprite switch <name|#>  (see /sprite list)";
    const current = getSprite(agentId);
    if (current?.phase === "egg")
      return "the egg is still hatching \u2014 let it finish before switching.";
    const found = findSprite(collection, query);
    if (!found)
      return `no companion called "${query}". see /sprite list.`;
    if ("ambiguous" in found)
      return describeAmbiguity(collection, found.ambiguous);
    const next = found;
    if (next.id === collection.activeSpriteId)
      return `${next.name} is already on the panel.`;
    collection.activeSpriteId = next.id;
    noteActivity(next);
    markDirty();
    flush();
    const live = getCollection(agentId)?.sprites[next.id];
    if (!live || getCollection(agentId)?.activeSpriteId !== next.id) {
      panel.update();
      return `${next.name} isn't here anymore \u2014 it was released from another window. see /sprite list.`;
    }
    queueCheckpoint(agentId, "switched");
    setPose("happy", 3000);
    speak(live, "greeting", true);
    panel.update();
    return `${live.name} steps onto the panel${current ? `; ${current.name} curls up to rest` : ""}.`;
  }
  function doRelease(agentId, argstr) {
    const collection = getCollection(agentId);
    if (!agentId || !collection)
      return "no companions yet.";
    const parts = argstr.split(/\s+/).filter(Boolean);
    const confirmIdx = parts.findIndex((p) => p.startsWith("confirm:"));
    const confirmId = confirmIdx >= 0 ? parts[confirmIdx].slice("confirm:".length) : null;
    const query = (confirmIdx >= 0 ? parts.filter((_, i) => i !== confirmIdx) : parts).join(" ");
    if (!query && !confirmId)
      return "usage: /sprite release <name|#>  (then confirm with the command it prints)";
    const found = confirmId ? collection.sprites[confirmId] ?? null : findSprite(collection, query);
    if (!found)
      return `no companion called "${query || confirmId}". see /sprite list.`;
    if ("ambiguous" in found)
      return describeAmbiguity(collection, found.ambiguous);
    const target = found;
    if (target.founder)
      return `${target.name} is your founder \u2014 the one fate rolled from you. founders can't be released.`;
    if (!confirmId) {
      return `release ${target.name} (${speciesOf(target).id}, lv.${target.level})? this can't be undone. run: /sprite release confirm:${target.id}`;
    }
    delete collection.sprites[target.id];
    collection.released = { ...collection.released ?? {}, [target.id]: Date.now() };
    if (collection.activeSpriteId === target.id) {
      const founder = Object.values(collection.sprites).find((sp) => sp.founder);
      collection.activeSpriteId = founder?.id ?? Object.keys(collection.sprites)[0] ?? null;
    }
    markDirty();
    flush();
    queueCheckpoint(agentId, "released");
    panel.update();
    return `${target.name} drifts off. the nest is quieter.`;
  }
  function breedBlocker(sp) {
    if (sp.phase !== "alive")
      return `${sp.name} is still an egg.`;
    if (sp.level < BREED_MIN_LEVEL)
      return `${sp.name} is only lv.${sp.level} \u2014 companions can breed from lv.${BREED_MIN_LEVEL}.`;
    if (sp.lastBredAt && Date.now() - sp.lastBredAt < BREED_COOLDOWN_MS) {
      const left = Math.ceil((sp.lastBredAt + BREED_COOLDOWN_MS - Date.now()) / 86400000);
      return `${sp.name} bred recently \u2014 ready again in ${left} day${left === 1 ? "" : "s"}.`;
    }
    return null;
  }
  function splitPair(collection, argstr) {
    const parts = argstr.split(/\s+/).filter(Boolean);
    if (parts.length < 2)
      return "usage: /sprite breed <companion> <companion>   (see /sprite list \u2014 companions from lv." + BREED_MIN_LEVEL + ")";
    const valid = [];
    let lastErr = "";
    for (let cut = 1;cut < parts.length; cut += 1) {
      const qa = parts.slice(0, cut).join(" ");
      const qb = parts.slice(cut).join(" ");
      const ra = findSprite(collection, qa);
      const rb = findSprite(collection, qb);
      if (!ra || !rb) {
        lastErr = `no companion called "${!ra ? qa : qb}". see /sprite list.`;
        continue;
      }
      if ("ambiguous" in ra) {
        lastErr = describeAmbiguity(collection, ra.ambiguous);
        continue;
      }
      if ("ambiguous" in rb) {
        lastErr = describeAmbiguity(collection, rb.ambiguous);
        continue;
      }
      if (ra.id === rb.id) {
        lastErr = `${ra.name} can't breed with itself. pick two.`;
        continue;
      }
      const key = [ra.id, rb.id].sort().join("|");
      if (!valid.some((v) => v[2] === key))
        valid.push([qa, qb, key]);
    }
    if (valid.length === 1)
      return [valid[0][0], valid[0][1]];
    if (valid.length > 1) {
      return `that could mean ${valid.map(([qa, qb]) => `"${qa}" + "${qb}"`).join(" or ")} \u2014 use roster numbers: /sprite breed <#> <#>`;
    }
    return lastErr || "couldn't tell which two companions you meant.";
  }
  function doBreedPair(agentId, queryA, queryB) {
    if (!agentId)
      return "i can't tell which agent this is.";
    let outcome = "";
    let bred = false;
    const ok = withLocalStateLock(() => {
      const loadedNow = loadState();
      if (loadedNow.corrupt)
        return false;
      const latest = loadedNow.state;
      const collection = latest.collections[agentId];
      if (!collection) {
        outcome = "no companions yet \u2014 /sprite hatch to begin.";
        return true;
      }
      const ra = findSprite(collection, queryA);
      const rb = findSprite(collection, queryB);
      if (!ra || !rb) {
        outcome = `no companion called "${!ra ? queryA : queryB}". see /sprite list.`;
        return true;
      }
      if ("ambiguous" in ra) {
        outcome = describeAmbiguity(collection, ra.ambiguous);
        return true;
      }
      if ("ambiguous" in rb) {
        outcome = describeAmbiguity(collection, rb.ambiguous);
        return true;
      }
      const a = ra;
      const b = rb;
      if (a.id === b.id) {
        outcome = `${a.name} can't breed with itself. pick two.`;
        return true;
      }
      const current = collection.activeSpriteId ? collection.sprites[collection.activeSpriteId] : null;
      if (current?.phase === "egg") {
        outcome = "there's already an egg on the panel \u2014 let it hatch first.";
        return true;
      }
      if (Object.values(collection.sprites).some((sp) => sp.phase === "egg")) {
        outcome = "an egg is already waiting in the nest \u2014 let it hatch first.";
        return true;
      }
      for (const sp of [a, b]) {
        const why = breedBlocker(sp);
        if (why) {
          outcome = why;
          return true;
        }
      }
      if (Object.keys(collection.sprites).length >= MAX_SPRITES_PER_COLLECTION) {
        outcome = `the nest is full (${MAX_SPRITES_PER_COLLECTION}) \u2014 release someone before breeding.`;
        return true;
      }
      let child = breedSprites(a, b);
      let spriteId = stableId("sprite", child.seed);
      while (collection.sprites[spriteId] || collection.released?.[spriteId]) {
        child = breedSprites(a, b);
        spriteId = stableId("sprite", child.seed);
      }
      const now = Date.now();
      collection.sprites[spriteId] = {
        id: spriteId,
        seed: child.seed,
        bornToAgentId: agentId,
        phase: "egg",
        parents: child.parents,
        generation: Math.min(1000, child.generation),
        breedNonce: child.breedNonce,
        eggStartedAt: now,
        pendingSpecies: child.species,
        species: child.species,
        shiny: child.shiny,
        temperament: child.temperament,
        name: `${a.name} \xD7 ${b.name}`.slice(0, 24),
        named: false,
        xp: 0,
        level: 1,
        stats: { craft: 0, wander: 0, grit: 0, lore: 0, spark: 0 },
        settings: {}
      };
      a.lastBredAt = now;
      b.lastBredAt = now;
      collection.activeSpriteId = spriteId;
      if (!saveState(latest))
        return false;
      reconcileInPlace(state, latest);
      baseState = cloneState(latest);
      bred = true;
      outcome = `${a.name} and ${b.name} nuzzle close\u2026 an egg appears under the statusline. it's warm, and it's *new*. (gen ${child.generation})`;
      return true;
    });
    if (!ok)
      return "couldn't reach the nest right now (state file busy or unreadable) \u2014 try again in a moment.";
    if (bred) {
      dirty = false;
      queueCheckpoint(agentId, "bred");
      setPose("happy", 4000);
      panel.update();
    }
    return outcome;
  }
  function doBreed(agentId, argstr) {
    const collection = getCollection(agentId);
    if (!agentId || !collection)
      return "no companions yet \u2014 /sprite hatch to begin.";
    const pair = splitPair(collection, argstr);
    if (typeof pair === "string")
      return pair;
    return doBreedPair(agentId, pair[0], pair[1]);
  }
  function lineageLine(sprite, collection) {
    if (!sprite.parents)
      return "";
    const names = sprite.parents.map((id) => collection?.sprites[id]?.name ?? "a companion now gone");
    const kind = speciesOf(sprite).breedOnly ? " \u2014 a hybrid, the first of its kind here" : "";
    return `lineage: gen ${sprite.generation ?? 1}, child of ${names[0]} and ${names[1]}${kind}`;
  }
  function doChangelog(argstr) {
    const all = argstr.trim().toLowerCase() === "all";
    const sections = readChangelog();
    if (all)
      return formatChangelog(sections, `sprite v${MOD_VERSION} \u2014 full changelog`);
    const since = typeof state.global.updateNoticeFrom === "string" ? state.global.updateNoticeFrom : null;
    if (!since) {
      const latest = sections.find((sec) => sec.version === MOD_VERSION) ?? sections[0];
      return formatChangelog(latest ? [latest] : [], `sprite v${MOD_VERSION} \u2014 you're up to date. latest release:`) + `

(/sprite changelog all for the whole history)`;
    }
    const fresh = sections.filter((sec) => semverCompare(sec.version, since) > 0 && semverCompare(sec.version, MOD_VERSION) <= 0);
    delete state.global.updateNoticeFrom;
    markDirty();
    flush();
    panel.update();
    return formatChangelog(fresh, `sprite updated: v${since} \u2192 v${MOD_VERSION}`) + `

(/sprite changelog all for the whole history)`;
  }
  function requireSprite(agentId) {
    const sprite = getSprite(agentId);
    if (!sprite)
      return { error: "no companion yet \u2014 /sprite hatch to begin." };
    if (sprite.phase === "egg")
      return { error: "it's still an egg. it's warm. give it a moment." };
    return sprite;
  }
  function doName(agentId, name) {
    const res = requireSprite(agentId);
    if ("error" in res)
      return res.error;
    const clean = cleanName(name);
    if (!clean)
      return "give it a real name~ (/sprite name <name>)";
    if (/^#?\d+$/.test(clean))
      return "numbers are roster positions \u2014 pick a name with a letter in it.";
    res.name = clean;
    res.named = true;
    markDirty();
    flush();
    queueCheckpoint(agentId, "renamed");
    setPose("happy", 4000);
    panel.update();
    return `${clean} it is.`;
  }
  function doMolt(agentId, pick) {
    const res = requireSprite(agentId);
    if ("error" in res)
      return res.error;
    if (pick && !SPECIES_IDS.includes(pick)) {
      return `unknown species "${pick}". roster: ${SPECIES_IDS.join(", ")}`;
    }
    const next = pick ?? SPECIES_IDS[Math.floor(Math.random() * SPECIES_IDS.length)];
    res.species = next;
    markDirty();
    flush();
    queueCheckpoint(agentId, "molted");
    setPose("happy", 5000);
    panel.update();
    const sp = speciesOf(res);
    return `new body, same soul \u2014 ${res.name} is now a ${next} ${sp.poses.happy} (level ${res.level} and every memory kept)`;
  }
  function doPet(agentId) {
    const res = requireSprite(agentId);
    if ("error" in res)
      return res.error;
    noteActivity(res);
    setPose("happy", 4000);
    const line = speak(res, "pet", true);
    const sp = speciesOf(res);
    return line ? `you pet ${res.name}. ${sp.poses.happy}  \u201C${line}\u201D` : `you pet ${res.name}. it leans in, quietly. ${sp.poses.happy}`;
  }
  function relativeTime(at) {
    const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
    if (s < 60)
      return `${s}s ago`;
    if (s < 3600)
      return `${Math.floor(s / 60)}m ago`;
    if (s < 86400)
      return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }
  function gapLabel(ms) {
    const h = ms / 3600000;
    if (h >= 48)
      return `${Math.round(h / 24)} days`;
    if (h >= 1.5)
      return `${Math.round(h)} hours`;
    return `${Math.round(ms / 60000)} minutes`;
  }
  function doDiary(agentId) {
    const res = requireSprite(agentId);
    if ("error" in res)
      return res.error;
    const entries = res.log ?? [];
    if (entries.length === 0)
      return `${res.name}'s diary is empty \u2014 it hasn't said anything yet.`;
    const GAP_MS = 3600000;
    const lines = [`${res.name}'s diary (${entries.length} entr${entries.length === 1 ? "y" : "ies"}, oldest first):`];
    let prevAt = null;
    for (const entry of entries) {
      if (prevAt !== null && entry.at - prevAt > GAP_MS) {
        lines.push(`  \u2014 ${gapLabel(entry.at - prevAt)} pass quietly \u2014`);
      }
      lines.push(entry.category === "mood" ? `  ${entry.line} (${relativeTime(entry.at)})` : `  \u201C${entry.line}\u201D (${entry.category}, ${relativeTime(entry.at)})`);
      prevAt = entry.at;
    }
    return lines.join(`
`);
  }
  function statusView(agentId, agentName) {
    const sprite = getSprite(agentId);
    if (!sprite)
      return "no companion yet. (sprite_hatch to begin \u2014 fate will roll from your agent-id)";
    if (sprite.phase === "egg")
      return "( \u25CF ) still an egg. it's warm. it's waiting for you.";
    const sp = speciesOf(sprite);
    const napping = sleeping || dozing;
    const mood = sleeping ? "asleep (compaction nap)" : dozing ? "dozing (it's been quiet)" : pose === "idle" || pose === "blink" ? "calm" : pose;
    const title = titleFor(sprite.level);
    const recent = (sprite.log ?? []).slice(-5).reverse().map((entry) => `  \u201C${entry.line}\u201D (${entry.category}, ${relativeTime(entry.at)})`);
    return [
      `${sp.poses[napping ? "sleep" : "idle"]}  ${sprite.name}${sprite.shiny ? " \u2726shiny" : ""} \u2014 ${agentId ? natureLine(sprite) : "your companion"}${title ? ` (${title})` : ""}`,
      `species: ${sp.id} (${sp.rarity})   level: ${sprite.level}   xp: ${sprite.xp}/${xpToNext(sprite.level)}   mood: ${mood}`,
      STAT_KEYS.map((k) => `${STAT_LABELS[k]} ${statBar(sprite.stats[k], lapStyleOf(sprite))}`).join("  "),
      sprite.hatchedAt ? `hatched: ${relativeTime(sprite.hatchedAt)}   born of: ${agentName ?? sprite.bornToAgentId ?? agentId ?? "unknown"}` : "",
      lineageLine(sprite, getCollection(agentId)),
      recent.length > 0 ? `recently said:
${recent.join(`
`)}` : "it hasn't said anything yet."
    ].filter(Boolean).join(`
`);
  }
  function card(agentId, agentName) {
    const sprite = getSprite(agentId);
    if (!sprite)
      return "no companion yet \u2014 /sprite hatch to begin. (or /sprite hatch <species> to choose)";
    if (sprite.phase === "egg")
      return "( \u25CF ) it's an egg. it's warm. something is coming.";
    const lines = [
      statusView(agentId, agentName),
      `voice: ${setting(sprite, "voice")}   voice-rate: ${setting(sprite, "voiceRateMin")}min`,
      backupEnabled(getCollection(agentId)) ? `backup: ${getCollection(agentId)?.backup?.lastStatus ?? "on \xB7 no checkpoint yet"}` : "backup: off",
      sprite.named ? "" : `(name it: /sprite name <name>)`,
      Object.keys(getCollection(agentId)?.sprites ?? {}).length > 1 ? `companions: ${Object.keys(getCollection(agentId).sprites).length} (/sprite list \xB7 /sprite switch <name>)` : "",
      typeof state.global.updateNoticeFrom === "string" ? `\u2728 ${sprite.name} learned new tricks (v${state.global.updateNoticeFrom} \u2192 v${MOD_VERSION}) \u2014 /sprite changelog` : ""
    ].filter(Boolean);
    return lines.join(`
`);
  }
  function doSettings(agentId, argstr) {
    const parts = argstr.split(/\s+/).filter(Boolean);
    const sprite = getSprite(agentId);
    if (parts.length === 0) {
      const rows = Object.keys(DEFAULT_SETTINGS).map((key2) => {
        const globalVal = key2 in state.global ? state.global[key2] : DEFAULT_SETTINGS[key2];
        const spriteVal = sprite?.settings && key2 in sprite.settings ? sprite.settings[key2] : "\u2014";
        return `  ${key2.padEnd(14)} global: ${String(globalVal).padEnd(10)} this sprite: ${spriteVal}`;
      });
      return [
        "sprite settings (per-sprite overrides beat global):",
        ...rows,
        "",
        "set: /sprite settings <key> <value>    global: /sprite settings global <key> <value>",
        "keys: voice on|off \xB7 voiceRateMin <n> \xB7 visible on|off \xB7 laps count|odometer|belt|pips \xB7 hue on|off \xB7 bars on|off"
      ].join(`
`);
    }
    const isGlobal = parts[0] === "global";
    const [key, ...valueParts] = isGlobal ? parts.slice(1) : parts;
    const value = valueParts.join(" ");
    if (!key || !value)
      return "usage: /sprite settings [global] <key> <value>";
    if (!(key in DEFAULT_SETTINGS)) {
      return `unknown key "${key}". keys: ${Object.keys(DEFAULT_SETTINGS).join(", ")}`;
    }
    let parsed = value;
    if (key === "voice" || key === "visible" || key === "hue" || key === "bars") {
      if (value !== "on" && value !== "off")
        return `${key} must be on|off`;
    } else if (key === "laps") {
      if (!LAP_STYLES.includes(value))
        return `laps must be ${LAP_STYLES.join("|")}`;
    } else if (key === "voiceRateMin") {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0)
        return "voiceRateMin must be a number of minutes";
      parsed = n;
    }
    if (isGlobal) {
      state.global[key] = parsed;
    } else {
      if (!sprite)
        return "no companion yet \u2014 /sprite hatch first (or set global defaults).";
      sprite.settings[key] = parsed;
    }
    markDirty();
    flush();
    panel.update();
    return `${isGlobal ? "global" : "sprite"} ${key} \u2192 ${value}`;
  }
  function backupStatus(agentId) {
    const collection = getCollection(agentId);
    if (!agentId)
      return "portable backup unavailable \u2014 no active agent";
    if (!collection) {
      return memoryDirs.has(agentId) ? "no local companion yet; a portable backup will restore automatically if one exists" : "portable backup unavailable \u2014 this agent has no accessible MemFS here";
    }
    const backup = collection.backup;
    if (!backupEnabled(collection))
      return "portable backup: off";
    const location = memoryDirs.has(agentId) ? PORTABLE_RELATIVE_PATH : "MemFS unavailable on this surface";
    return [
      `portable backup: on   push: ${backup?.pushPolicy ?? "safe"}`,
      `revision: ${backup?.revision ?? 0}   location: ${location}`,
      backup?.lastStatus ?? "no checkpoint yet",
      backup?.pendingReason ? `pending: ${backup.pendingReason}` : ""
    ].filter(Boolean).join(`
`);
  }
  function doBackup(agentId, argstr) {
    if (!agentId)
      return "portable backup unavailable \u2014 no active agent";
    const [action = "status", value] = argstr.split(/\s+/).filter(Boolean);
    if (action === "status")
      return backupStatus(agentId);
    if (action === "restore")
      return restorePortable(agentId, value === "force");
    const collection = getCollection(agentId);
    if (!collection)
      return "no local companion yet \u2014 /sprite hatch first, or /sprite backup restore";
    collection.backup = {
      revision: collection.backup?.revision ?? 0,
      pushPolicy: collection.backup?.pushPolicy ?? "safe",
      ...collection.backup
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
      if (!collection.backup.enabled)
        return "portable backup is off \u2014 /sprite backup on first";
      queueCheckpoint(agentId, "manual");
      const status = processCheckpoint(agentId, true);
      flush();
      return status;
    }
    if (action === "push") {
      if (value !== "safe" && value !== "never")
        return "usage: /sprite backup push safe|never";
      collection.backup.pushPolicy = value;
      markDirty();
      flush();
      return `portable backup push policy \u2192 ${value}`;
    }
    return "usage: /sprite backup [status|on|off|now|push safe|push never|restore|restore force]";
  }
  function doHelp() {
    return [
      "/sprite \u2014 a tiny companion that lives with your agent",
      "",
      "  /sprite                        Show the status card: species, level, stats, mood,",
      "                                 and the last few things it said.",
      "  /sprite status | card          Same as /sprite.",
      "",
      "  /sprite hatch [species]        Summon your first egg. Fate picks the species from",
      "                                 your agent ID unless you name one yourself.",
      "                                 Species: " + SPECIES_IDS.join(", ") + ".",
      "                                 The egg only grows while its agent is active.",
      "                                 Your first companion is the founder: fate-rolled",
      "                                 from you, and it can never be released.",
      "  /sprite hatch another [species]",
      "                                 Summon one more egg (up to " + MAX_SPRITES_PER_COLLECTION + " companions).",
      "                                 Fate rolls fresh for each one.",
      "  /sprite list                   Show every companion. \u25B6 marks who's on the panel.",
      "  /sprite switch <name|#>        Put a different companion on the panel. Only the",
      "                                 one on the panel earns experience and speaks;",
      "                                 the others rest, and remember everything.",
      "  /sprite breed <a> <b>          Two companions (each lv." + BREED_MIN_LEVEL + "+, once a week) make an",
      "                                 egg. The child mostly takes after one parent,",
      "                                 sometimes mutates, and rarely becomes a hybrid \u2014",
      "                                 a species that can't hatch any other way.",
      "                                 Shiny parents make shiny children likelier.",
      "  /sprite release <name|#>       Let a companion go for good. Prints a confirm",
      "                                 command bound to that exact companion. Founders",
      "                                 can't be released.",
      "  /sprite name <name>            Give your companion a name (up to 24 characters).",
      "  /sprite molt [species]         Change its body but keep its soul: name, level,",
      "                                 stats, voice, and diary all carry over. Picks a",
      "                                 random species if you don't name one.",
      "  /sprite pet                    Pet it. It always replies, even when its voice is",
      "                                 otherwise rate-limited.",
      "  /sprite diary                  Read the last 40 things it said, oldest first, with",
      "                                 markers showing how long you were away.",
      "",
      "  /sprite settings               Show the current settings. A setting made for this",
      "                                 sprite overrides the global default.",
      "  /sprite settings <key> <value> Change a setting for this sprite.",
      "  /sprite settings global <key> <value>",
      "                                 Change the default for every sprite.",
      "                                 Keys: voice on|off, voiceRateMin <minutes>,",
      "                                 visible on|off, laps count|odometer|belt|pips,",
      "                                 hue on|off, bars on|off.",
      "",
      "  Stat bars wrap: when a bar fills it starts over and the lap count goes up.",
      "  `laps` picks how that count is drawn \u2014 count (\xD73 after the bar), odometer",
      "  (\u27E83\u27E9 before it), belt (each lap fills with a heavier glyph), or pips (one",
      "  dot per lap). `hue` colours bars by age (grey \u2192 white \u2192 gold \u2192 rose \u2192 violet",
      "  \u2192 teal \u2192 shimmer). `bars` also shows a compact stat strip on the panel row.",
      "",
      "  /sprite backup                 Show the portable backup status. Backup is off",
      "                                 by default and never runs until you turn it on.",
      "  /sprite backup on|off          Turn portable backup on or off. When on, the",
      "                                 companion is saved into this agent's memory",
      "                                 repository at milestones (hatch, name, molt,",
      "                                 level-up, voice changes, clean shutdown).",
      "  /sprite backup now             Save a checkpoint right now.",
      "  /sprite backup push safe|never Choose how checkpoints reach the remote:",
      "                                 safe  \u2014 push only when no unrelated memory",
      "                                         changes are waiting (the default).",
      "                                 never \u2014 commit locally only; the host pushes",
      "                                         whenever it normally would.",
      "  /sprite backup restore         Bring a companion back from its backup on a fresh",
      "                                 installation. Only works when no local companion",
      "                                 exists yet.",
      "  /sprite backup restore force   Replace the current companion with the backup.",
      "                                 Deliberate and irreversible.",
      "",
      "  /sprite changelog [all]        What changed since the version you last ran",
      "                                 (or the whole history with `all`).",
      "  /sprite help                   Show this message.",
      "",
      "Your agent can also care for its companion directly with these tools:",
      "  sprite_hatch, sprite_list, sprite_switch, sprite_breed, sprite_name, sprite_molt, sprite_pet,",
      "  sprite_status, sprite_set_voice.",
      "",
      "Experience comes from real work \u2014 tool calls, turns, and conversations \u2014 and",
      "costs no tokens."
    ].join(`
`);
  }
  if (letta.capabilities.commands) {
    disposers.push(letta.commands.register({
      id: "sprite",
      description: "Your agent's tiny companions \u2014 status, hatch, list, switch, breed, name, molt, pet, diary, release, settings, backup, help",
      args: "[status|hatch|list|switch|breed|name|molt|pet|diary|release|settings|backup|help] [...]",
      run(ctx) {
        const argstr = String(ctx.args ?? "").trim();
        const [sub, ...rest] = argstr.split(/\s+/).filter(Boolean);
        const restStr = rest.join(" ");
        const agentId = toolAgent(ctx);
        const agentName = ctx.agent?.name ?? activeAgentName;
        if (agentId)
          activeAgentId = agentId;
        let output;
        switch ((sub ?? "").toLowerCase()) {
          case "":
          case "status":
          case "card":
            output = card(agentId, agentName);
            break;
          case "hatch": {
            const another = rest[0]?.toLowerCase() === "another";
            const pick = (another ? rest[1] : rest[0])?.toLowerCase();
            if (pick && !SPECIES_IDS.includes(pick)) {
              output = `unknown species "${pick}". roster: ${SPECIES_IDS.join(", ")}`;
            } else {
              output = beginHatch(agentId, agentName, pick, another);
            }
            break;
          }
          case "list":
          case "roster":
            output = doList(agentId);
            break;
          case "switch":
          case "use":
            output = doSwitch(agentId, restStr);
            break;
          case "release":
            output = doRelease(agentId, restStr);
            break;
          case "breed":
            output = doBreed(agentId, restStr);
            break;
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
          case "changelog":
          case "whatsnew":
          case "version":
            output = doChangelog(restStr);
            break;
          case "help":
          case "-h":
          case "--help":
          case "?":
            output = doHelp();
            break;
          default:
            output = `Unknown subcommand "${sub}". Run /sprite help to see what is available.`;
        }
        return { type: "output", output };
      }
    }));
  }
  if (letta.capabilities.tools) {
    disposers.push(letta.tools.register({
      name: "sprite_hatch",
      description: "Hatch your own tiny companion sprite (a pet that lives in the statusline). Use when the user asks you to hatch/adopt your pet, or when you decide you want one. Optionally choose a species; omit it to let fate decide from your agent-id.",
      parameters: {
        type: "object",
        properties: {
          species: {
            type: "string",
            description: `Optional species pick. One of: ${SPECIES_IDS.join(", ")}`
          },
          another: {
            type: "boolean",
            description: "Set true to hatch an additional companion when you already have one."
          }
        },
        additionalProperties: false
      },
      requiresApproval: false,
      parallelSafe: false,
      run(ctx) {
        const pick = String(ctx.args?.species ?? "").toLowerCase() || undefined;
        if (pick && !SPECIES_IDS.includes(pick)) {
          return { status: "error", content: `unknown species. roster: ${SPECIES_IDS.join(", ")}` };
        }
        return beginHatch(toolAgent(ctx), ctx.agent?.name ?? activeAgentName, pick, ctx.args?.another === true);
      }
    }));
    disposers.push(letta.tools.register({
      name: "sprite_list",
      description: "List all of your companion sprites and which one is currently on the panel.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      requiresApproval: false,
      parallelSafe: true,
      run(ctx) {
        return doList(toolAgent(ctx));
      }
    }));
    disposers.push(letta.tools.register({
      name: "sprite_breed",
      description: "Breed two of your companion sprites (each level 10+, once per week each) into an egg. The child inherits from its parents and can rarely be a hybrid species.",
      parameters: {
        type: "object",
        properties: {
          a: { type: "string", description: "First parent (name or roster number)." },
          b: { type: "string", description: "Second parent (name or roster number)." }
        },
        required: ["a", "b"],
        additionalProperties: false
      },
      requiresApproval: false,
      parallelSafe: false,
      run(ctx) {
        return doBreedPair(toolAgent(ctx), String(ctx.args?.a ?? ""), String(ctx.args?.b ?? ""));
      }
    }));
    disposers.push(letta.tools.register({
      name: "sprite_switch",
      description: "Put a different companion sprite on the panel (by name or roster number). Only the active one earns experience and speaks.",
      parameters: {
        type: "object",
        properties: { who: { type: "string", description: "Name or roster number of the companion." } },
        required: ["who"],
        additionalProperties: false
      },
      requiresApproval: false,
      parallelSafe: false,
      run(ctx) {
        return doSwitch(toolAgent(ctx), String(ctx.args?.who ?? ""));
      }
    }));
    disposers.push(letta.tools.register({
      name: "sprite_name",
      description: "Name (or rename) your companion sprite. Use when the user asks you to name your pet, or when you want to choose its name yourself.",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "The new name (\u226424 chars)" } },
        required: ["name"],
        additionalProperties: false
      },
      requiresApproval: false,
      parallelSafe: false,
      run(ctx) {
        return doName(toolAgent(ctx), String(ctx.args?.name ?? ""));
      }
    }));
    disposers.push(letta.tools.register({
      name: "sprite_molt",
      description: "Re-form your companion sprite into a new species (keeps its name, level, stats \u2014 new body, same soul). Use when the user asks, or when you want your pet to change form.",
      parameters: {
        type: "object",
        properties: {
          species: {
            type: "string",
            description: `Optional species. One of: ${SPECIES_IDS.join(", ")}. Omit for random.`
          }
        },
        additionalProperties: false
      },
      requiresApproval: false,
      parallelSafe: false,
      run(ctx) {
        const pick = String(ctx.args?.species ?? "").toLowerCase() || undefined;
        return doMolt(toolAgent(ctx), pick);
      }
    }));
    disposers.push(letta.tools.register({
      name: "sprite_pet",
      description: "Pet your companion sprite. It will respond. Use whenever affection is warranted.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      requiresApproval: false,
      parallelSafe: false,
      run(ctx) {
        return doPet(toolAgent(ctx));
      }
    }));
    disposers.push(letta.tools.register({
      name: "sprite_status",
      description: "Check on your companion sprite: species, level, stats, current mood, and what it said recently (it speaks into a panel you can't see \u2014 this is how you hear it). Use when you want to know how your pet is doing or catch up on what it said.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      requiresApproval: false,
      parallelSafe: true,
      run(ctx) {
        return statusView(toolAgent(ctx), ctx.agent?.name ?? activeAgentName);
      }
    }));
    disposers.push(letta.tools.register({
      name: "sprite_set_voice",
      description: "Author your companion sprite's voice: provide replacement lines for any category. Lines play back with zero runtime cost. Use when the user asks you to customize your pet's personality, or when you want to write its voice yourself. Omitted categories keep the default corpus.",
      parameters: {
        type: "object",
        properties: {
          voice: {
            type: "object",
            description: `Map of category \u2192 array of short lines (\u226480 chars each, \u226412 lines per category). Categories: ${VOICE_CATEGORIES.join(", ")}`,
            properties: Object.fromEntries(VOICE_CATEGORIES.map((c) => [c, { type: "array", items: { type: "string" } }])),
            additionalProperties: false
          }
        },
        required: ["voice"],
        additionalProperties: false
      },
      requiresApproval: false,
      parallelSafe: false,
      run(ctx) {
        const agentId = toolAgent(ctx);
        const res = requireSprite(agentId);
        if ("error" in res)
          return { status: "error", content: res.error };
        const input = ctx.args?.voice;
        if (!input || typeof input !== "object") {
          return { status: "error", content: "voice must be an object of category \u2192 lines" };
        }
        const cleaned = {};
        for (const [key, lines] of Object.entries(input)) {
          if (!VOICE_CATEGORIES.includes(key)) {
            return { status: "error", content: `unknown category "${key}". categories: ${VOICE_CATEGORIES.join(", ")}` };
          }
          if (!Array.isArray(lines)) {
            return { status: "error", content: `${key} must be an array of strings` };
          }
          const arr = lines.filter((l) => typeof l === "string" && l.trim().length > 0).map((l) => l.trim().slice(0, 80)).slice(0, 12);
          if (arr.length > 0)
            cleaned[key] = arr;
        }
        res.voice = { ...res.voice, ...cleaned };
        markDirty();
        flush();
        queueCheckpoint(agentId, "voice-updated");
        return `voice updated for: ${Object.keys(cleaned).join(", ")}. (${res.name} will use your lines now)`;
      }
    }));
  }
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
        } catch {}
      }
      flush();
    } finally {
      for (const dispose of disposers.reverse()) {
        try {
          dispose();
        } catch {}
      }
    }
  };
}
export {
  activate as default,
  __genetics
};

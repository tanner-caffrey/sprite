// genetics.mjs — pure sprite BREEDING genetics core (Faye, Aug 30 2026, 3am workshop)
//
// Standalone + dependency-free + fully testable. NOT yet wired into the live mod:
// breeding needs the multiple-sprites substrate (schema v2 `collection`), which lives in the
// uncommitted portable-persistence worktree. This module is the pure genetics that will port
// into sprite.tsx once that substrate ships + Tanner's in the loop. Matches sprite.tsx
// conventions EXACTLY (FNV-1a hashString, prefixed-hash roll idiom, species/rarity/temperament
// tables) so the port is mechanical.
//
// Design: reference/sprite-mod/breeding-design.md
// Heart (the Aug-18 dream): "a crab kisses a ghost and the offspring is something new that has
// no combo table yet" → hybrids are rare emergent DISCOVERIES, not an exhaustive table.

// --- constants mirrored from sprite.tsx (canonical: portable-persistence worktree) ---
export const SPECIES = [
  { id: "cat", rarity: "common" },
  { id: "duck", rarity: "common" },
  { id: "slime", rarity: "common" },
  { id: "fox", rarity: "uncommon" },
  { id: "crab", rarity: "uncommon" },
  { id: "moth", rarity: "uncommon" },
  { id: "fairy", rarity: "rare" },
  { id: "ghost", rarity: "rare" },
  { id: "dragon", rarity: "legendary" },
  { id: "phoenix", rarity: "legendary" },
];

export const RARITY_ORDER = ["common", "uncommon", "rare", "legendary"];
export const TEMPERAMENTS = ["gentle", "wry", "bold", "sleepy", "odd"];

// Curated, breed-only hybrids — grow this set over time (that IS "no combo table yet").
// hauntcrab is hybrid #1 as a wink: crab (Letta's Clawson) × ghost (my Poof) → a haunted crab. 🦀👻
export const HYBRID_SPECIES = {
  hauntcrab: { rarity: "special", from: ["crab", "ghost"] },
  chimera: { rarity: "special" }, // generic fallback for any hybrid pairing not yet authored
};
// pairing (sorted, "|"-joined) → hybrid id
export const HYBRID_PAIRS = {
  "crab|ghost": "hauntcrab",
};

const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
const SPECIES_IDS = SPECIES.map((s) => s.id);
const RARITY_POOLS = {
  common: SPECIES.filter((s) => s.rarity === "common").map((s) => s.id),
  uncommon: SPECIES.filter((s) => s.rarity === "uncommon").map((s) => s.id),
  rare: SPECIES.filter((s) => s.rarity === "rare").map((s) => s.id),
  legendary: SPECIES.filter((s) => s.rarity === "legendary").map((s) => s.id),
};

// --- hash (FNV-1a, matches sprite.tsx hashString EXACTLY) ---
export function hashString(input) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// a roll in [0,1) namespaced off a seed — matches sprite.tsx's prefixed-hash idiom
// (e.g. `shiny:${id}`, `temper:${id}`). Deterministic + independent per prefix.
function roll01(seed, prefix) {
  return (hashString(`${prefix}:${seed}`) % 100000) / 100000;
}

function rarityIdx(species) {
  const r = SPECIES_BY_ID[species]?.rarity ?? "common";
  return RARITY_ORDER.indexOf(r);
}

// rarity of ANY species id (base or hybrid); hybrids/chimera = "special"
export function rarityOf(species) {
  return SPECIES_BY_ID[species]?.rarity ?? HYBRID_SPECIES[species]?.rarity ?? "special";
}

// --- 1. child fate seed: hash( sort(parentSeeds) + breedNonce ) ---
// order-independent (crab×ghost === ghost×crab); reproducible from the recorded nonce.
export function childFateSeed(parentSeedA, parentSeedB, breedNonce) {
  const [a, b] = [String(parentSeedA), String(parentSeedB)].sort();
  // length-prefix each field so ("a","b|c") and ("a|b","c") can't collide
  const field = (s) => `${s.length}:${s}`;
  return String(hashString(`breed:${field(a)}${field(b)}${field(String(breedNonce))}`));
}

// --- 2a. species roll: ~45% A · ~45% B · ~8% mutation · hybrid (rarity-gated) ---
export function rollSpecies(seed, speciesA, speciesB) {
  const combined = rarityIdx(speciesA) + rarityIdx(speciesB); // 0 (c×c) .. 6 (leg×leg)
  const hybridChance = 0.02 + 0.015 * combined; // 0.02 .. 0.11 — rarer parents, likelier hybrid
  const mutationChance = 0.08;
  const r = roll01(seed, "species");
  if (r < hybridChance) {
    return { species: hybridSpecies(speciesA, speciesB), kind: "hybrid" };
  }
  if (r < hybridChance + mutationChance) {
    return { species: mutationSpecies(seed, speciesA, speciesB), kind: "mutation" };
  }
  // sort the two so the pick is order-independent (crab×ghost === ghost×crab)
  const [loSp, hiSp] = [speciesA, speciesB].sort();
  const pick = roll01(seed, "parentpick") < 0.5 ? loSp : hiSp;
  return { species: pick, kind: "inherited" };
}

// hybrid: curated pairing → authored id; unknown pairing → generic chimera
function hybridSpecies(a, b) {
  const key = [a, b].sort().join("|");
  return HYBRID_PAIRS[key] ?? "chimera";
}

// mutation: a NON-parent base species, biased toward the higher parent's rarity tier
// (this is where lineage rarity-climb lives: mostly-same-tier, sometimes ±1 step)
function mutationSpecies(seed, a, b) {
  const base = Math.max(rarityIdx(a), rarityIdx(b));
  const stepRoll = roll01(seed, "mutstep");
  let idx = base;
  if (stepRoll < 0.15) idx = Math.min(RARITY_ORDER.length - 1, base + 1); // 15% step up
  else if (stepRoll > 0.85) idx = Math.max(0, base - 1); // 15% step down
  const tier = RARITY_ORDER[idx];
  const pool = RARITY_POOLS[tier].filter((id) => id !== a && id !== b);
  const usePool = pool.length ? pool : SPECIES_IDS.filter((id) => id !== a && id !== b);
  return usePool[hashString(`mutate:${seed}`) % usePool.length];
}

// --- 2b. shiny: base 1%, big boost per shiny parent → shiny lineages are cultivatable ---
export function rollShiny(seed, parentAShiny, parentBShiny) {
  const shinyParents = (parentAShiny ? 1 : 0) + (parentBShiny ? 1 : 0);
  const chance = shinyParents === 2 ? 0.25 : shinyParents === 1 ? 0.08 : 0.01;
  return roll01(seed, "shiny") < chance;
}

// --- 2c. temperament: inherit one parent's (coin flip) + 10% mutation ---
export function rollTemperament(seed, tempA, tempB) {
  if (roll01(seed, "tempmut") < 0.1) {
    // a genuinely NEW temperament — exclude both parents' so a "mutation" is always distinct
    const pool = TEMPERAMENTS.filter((t) => t !== tempA && t !== tempB);
    const usePool = pool.length ? pool : TEMPERAMENTS;
    return usePool[hashString(`tempnew:${seed}`) % usePool.length];
  }
  // sorted → order-independent
  const [loT, hiT] = [tempA, tempB].sort();
  return roll01(seed, "temppick") < 0.5 ? loT : hiT;
}

// --- 3. top-level breed: two parents → offspring genetics (an egg, stats start fresh) ---
// parent shape: { id, seed, species, shiny, temperament, generation }
export function breed(parentA, parentB, breedNonce) {
  const nonce = breedNonce ?? randomNonce();
  const seed = childFateSeed(parentA.seed, parentB.seed, nonce);
  const sp = rollSpecies(seed, parentA.species, parentB.species);
  return {
    seed,
    breedNonce: nonce,
    species: sp.species,
    speciesKind: sp.kind, // "inherited" | "mutation" | "hybrid"
    rarity: rarityOf(sp.species),
    shiny: rollShiny(seed, parentA.shiny, parentB.shiny),
    temperament: rollTemperament(seed, parentA.temperament, parentB.temperament),
    parents: [parentA.id, parentB.id],
    generation: Math.max(parentA.generation ?? 0, parentB.generation ?? 0) + 1,
    // stats start FRESH (nature-vs-nurture): a bred sprite still has to be lived alongside to grow.
    // (Section-3 "inherited predisposition" left as an open-Q for Tanner — not baked in solo.)
  };
}

function randomNonce() {
  return Math.floor(Math.random() * 0xffffffff).toString(36) + Date.now().toString(36);
}

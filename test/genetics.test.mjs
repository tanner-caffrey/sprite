// genetics.test.mjs — verify the breeding core behaves as designed. `node test/genetics.test.mjs`
import {
  breed, childFateSeed, rollSpecies, rollShiny, rollTemperament, rarityOf,
  SPECIES, TEMPERAMENTS,
} from "../breeding/genetics.mjs";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${extra}`); }
};
const near = (got, want, tol) => Math.abs(got - want) <= tol;

// fixtures
const crab = { id: "s-crab", seed: "aaa", species: "crab", shiny: false, temperament: "wry", generation: 0 };
const ghost = { id: "s-ghost", seed: "bbb", species: "ghost", shiny: false, temperament: "odd", generation: 0 };
const commonA = { id: "s1", seed: "c1", species: "cat", shiny: false, temperament: "gentle", generation: 0 };
const commonB = { id: "s2", seed: "c2", species: "duck", shiny: false, temperament: "bold", generation: 0 };
const legA = { id: "L1", seed: "l1", species: "dragon", shiny: false, temperament: "bold", generation: 2 };
const legB = { id: "L2", seed: "l2", species: "phoenix", shiny: true, temperament: "odd", generation: 3 };

console.log("\n— determinism & order-independence —");
{
  const s1 = childFateSeed("aaa", "bbb", "nonce1");
  const s2 = childFateSeed("bbb", "aaa", "nonce1"); // swapped
  ok("same nonce + swapped parents → identical seed (order-independent)", s1 === s2, `${s1} vs ${s2}`);
  const s3 = childFateSeed("aaa", "bbb", "nonce2");
  ok("different nonce → different seed", s1 !== s3);
  const b1 = breed(crab, ghost, "fixed");
  const b2 = breed(ghost, crab, "fixed");
  ok("breed() fully deterministic + order-independent for fixed nonce",
    JSON.stringify({ ...b1, parents: [...b1.parents].sort() }) ===
    JSON.stringify({ ...b2, parents: [...b2.parents].sort() }));
}

console.log("\n— species distribution (common×common, N=20000) —");
{
  let inherited = 0, mutation = 0, hybrid = 0, parentA = 0, parentB = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const r = rollSpecies(`seed${i}`, "cat", "duck");
    if (r.kind === "inherited") { inherited++; (r.species === "cat" ? parentA++ : parentB++); }
    else if (r.kind === "mutation") mutation++;
    else hybrid++;
  }
  // c×c: combined rarity 0 → hybridChance 0.02, mutation 0.08, inherited ~0.90
  ok("~90% inherited", near(inherited / N, 0.90, 0.03), `got ${(inherited / N).toFixed(3)}`);
  ok("~8% mutation", near(mutation / N, 0.08, 0.02), `got ${(mutation / N).toFixed(3)}`);
  ok("~2% hybrid (lowest tier)", near(hybrid / N, 0.02, 0.015), `got ${(hybrid / N).toFixed(3)}`);
  ok("inherited splits ~50/50 between parents", near(parentA / (parentA + parentB), 0.5, 0.05),
    `A=${parentA} B=${parentB}`);
}

console.log("\n— hybrid rate scales with parent rarity —");
{
  const rate = (a, b) => {
    let h = 0; const N = 20000;
    for (let i = 0; i < N; i++) if (rollSpecies(`x${i}`, a, b).kind === "hybrid") h++;
    return h / N;
  };
  const cc = rate("cat", "duck");       // combined 0 → 0.02
  const ll = rate("dragon", "phoenix"); // combined 6 → 0.02 + 0.09 = 0.11
  ok("legendary×legendary hybrid-rate > common×common", ll > cc, `ll=${ll.toFixed(3)} cc=${cc.toFixed(3)}`);
  ok("legendary×legendary hybrid ~11%", near(ll, 0.11, 0.02), `got ${ll.toFixed(3)}`);
}

console.log("\n— the dream: crab × ghost → hauntcrab (hybrid #1) —");
{
  // find any nonce that rolls a hybrid for crab×ghost, assert it's hauntcrab not chimera
  let sawHaunt = false, sawOther = false;
  for (let i = 0; i < 5000; i++) {
    const r = rollSpecies(`cg${i}`, "crab", "ghost");
    if (r.kind === "hybrid") { if (r.species === "hauntcrab") sawHaunt = true; else sawOther = true; }
  }
  ok("crab×ghost hybrids are always 'hauntcrab' (curated pairing)", sawHaunt && !sawOther);
  ok("hauntcrab rarity = special", rarityOf("hauntcrab") === "special");
  // an unauthored pairing that rolls hybrid → chimera
  let sawChimera = false;
  for (let i = 0; i < 5000; i++) {
    const r = rollSpecies(`cd${i}`, "cat", "dragon");
    if (r.kind === "hybrid") { if (r.species === "chimera") sawChimera = true; }
  }
  ok("unauthored pairing hybrids fall back to 'chimera'", sawChimera);
}

console.log("\n— shiny: cultivatable across a lineage —");
{
  const rate = (pa, pb) => {
    let s = 0; const N = 20000;
    for (let i = 0; i < N; i++) if (rollShiny(`sh${i}`, pa, pb)) s++;
    return s / N;
  };
  ok("no shiny parents ≈ 1%", near(rate(false, false), 0.01, 0.006), `${rate(false, false).toFixed(3)}`);
  ok("one shiny parent ≈ 8%", near(rate(true, false), 0.08, 0.02), `${rate(true, false).toFixed(3)}`);
  ok("two shiny parents ≈ 25%", near(rate(true, true), 0.25, 0.03), `${rate(true, true).toFixed(3)}`);
}

console.log("\n— temperament: mostly inherited, sometimes mutates —");
{
  let inherited = 0, mutated = 0; const N = 20000;
  for (let i = 0; i < N; i++) {
    const t = rollTemperament(`t${i}`, "wry", "odd");
    if (t === "wry" || t === "odd") inherited++; else mutated++;
  }
  ok("~90% inherit a parent temperament", near(inherited / N, 0.90, 0.03), `${(inherited / N).toFixed(3)}`);
  ok("~10% mutate to a new temperament", near(mutated / N, 0.10, 0.03), `${(mutated / N).toFixed(3)}`);
  ok("all temperaments are valid", TEMPERAMENTS.length === 5);
}

console.log("\n— lineage / generation —");
{
  const child = breed(legA, legB, "gen");
  ok("generation = max(parents)+1", child.generation === 4, `got ${child.generation}`);
  ok("records both parent ids", child.parents.includes("L1") && child.parents.includes("L2"));
  ok("records breedNonce for reproducibility", child.breedNonce === "gen");
  ok("has a valid rarity", ["common", "uncommon", "rare", "legendary", "special"].includes(child.rarity));
}

console.log(`\n${fail === 0 ? "✓ ALL PASS" : "✗ FAILURES"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

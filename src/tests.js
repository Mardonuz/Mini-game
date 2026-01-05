import { unitSpec } from "./entities.js";

export function runBalanceTests() {
  console.log("--- Balance Test Results ---");
  const units = ["knight", "archer", "tank", "bomber"];
  const results = [];

  for (const u1 of units) {
    for (const u2 of units) {
      if (u1 === u2) continue;
      const res = simulateDuel(u1, u2);
      results.push({ duel: `${u1} vs ${u2}`, winner: res.winner, hpLeft: res.hp });
    }
  }

  console.table(results);

  // Calculate cost efficiency
  const efficiency = units.map(k => {
    const spec = unitSpec(k);
    return { name: k, cost: spec.cost, dps: spec.damage / spec.cooldown, hp: spec.hp, value: (spec.hp * (spec.damage / spec.cooldown)) / spec.cost };
  });
  console.log("Cost Efficiency (Higher is better):");
  console.table(efficiency);
}

function simulateDuel(k1, k2) {
  const s1 = unitSpec(k1);
  const s2 = unitSpec(k2);

  let hp1 = s1.hp, hp2 = s2.hp;
  let cd1 = 0, cd2 = 0;
  let time = 0;

  while (hp1 > 0 && hp2 > 0 && time < 100) {
    const dt = 0.05;
    time += dt;
    cd1 -= dt;
    cd2 -= dt;

    if (cd1 <= 0) {
      hp2 -= s1.damage;
      cd1 = s1.cooldown;
    }
    if (cd2 <= 0) {
      hp1 -= s2.damage;
      cd2 = s2.cooldown;
    }
  }

  return { winner: hp1 > hp2 ? k1 : k2, hp: Math.max(hp1, hp2) };
}

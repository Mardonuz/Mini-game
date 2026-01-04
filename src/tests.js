export function runBalanceTests(factory) {
  const results = [];
  function sim(matchCfg) {
    const g = factory();
    let t = 0;
    while (t < matchCfg.time) {
      const dt = 0.05;
      // Player strategy
      if (Math.random() < matchCfg.pSpawnRate) {
        g.spawnUnit(0, Math.random() < 0.5 ? "top" : "bottom", matchCfg.pDeck[Math.floor(Math.random() * matchCfg.pDeck.length)]);
      }
      // Enemy strategy
      if (Math.random() < matchCfg.eSpawnRate) {
        g.spawnUnit(1, Math.random() < 0.5 ? "top" : "bottom", matchCfg.eDeck[Math.floor(Math.random() * matchCfg.eDeck.length)]);
      }
      g.update(dt);
      t += dt;
      if (g.over) break;
    }
    return {
      name: matchCfg.name,
      time: t,
      winner: g.winner,
      pKing: Math.max(0, Math.floor(g.player.king.hp)),
      eKing: Math.max(0, Math.floor(g.enemy.king.hp))
    };
  }

  // Test 1: Standard match
  results.push(sim({
    name: "Standard",
    time: 60,
    pDeck: ["knight", "archer", "tank", "bomber"], pSpawnRate: 0.15,
    eDeck: ["knight", "archer", "tank", "bomber"], eSpawnRate: 0.15
  }));

  // Test 2: Tank vs DPS
  results.push(sim({
    name: "TankVsDPS",
    time: 60,
    pDeck: ["tank"], pSpawnRate: 0.1,
    eDeck: ["bomber", "archer"], eSpawnRate: 0.2
  }));

  // Test 3: Aggressive rush
  results.push(sim({
    name: "Rush",
    time: 40,
    pDeck: ["knight"], pSpawnRate: 0.3,
    eDeck: ["tank"], eSpawnRate: 0.05
  }));

  return results;
}


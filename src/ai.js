import { unitSpec } from "./entities.js";

export class AIController {
  constructor() {
    this.timer = 0;
    this.interval = 2.5;
    this.choice = ["knight", "archer", "tank", "bomber", "fireball", "freeze"];
    this.spellCost = { fireball: 4, freeze: 3 };
  }
  update(dt, game) {
    if (game.over) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 2.0 + Math.random() * 2.0;
      const card = this.pickCard(game);
      if (!card) return;
      if (card === "fireball" || card === "freeze") {
        const target = this.pickSpellTarget(game);
        if (!target) return;
        game.castSpell(1, card, target.x, target.y, this.spellCost[card]);
      } else {
        const lane = this.pickLane(game);
        game.spawnUnit(1, lane, card);
      }
    }
  }
  pickCard(game) {
    const elixir = game.enemy.elixir;
    const pUnits = game.player.unitsTop.concat(game.player.unitsBottom);

    // Counter-pick logic
    const hasTank = pUnits.some(u => u.maxHp >= 900);
    const hasSwarm = pUnits.length >= 3;
    const hasArcher = pUnits.some(u => u.range > 100);

    if (hasTank && elixir >= 4 && Math.random() < 0.7) {
      if (this.choice.includes("bomber")) return "bomber";
      if (this.choice.includes("freeze") && elixir >= 3) return "freeze";
    }

    if (hasSwarm && elixir >= 4 && Math.random() < 0.6) {
      if (this.choice.includes("fireball")) return "fireball";
    }

    if (hasArcher && elixir >= 3 && Math.random() < 0.5) {
      if (this.choice.includes("knight")) return "knight";
    }

    // Default picking
    const unitOpts = this.choice.filter(k => ["knight", "archer", "tank", "bomber"].includes(k) && unitSpec(k).cost <= elixir);
    const spellOpts = this.choice.filter(k => ["fireball", "freeze"].includes(k) && this.spellCost[k] <= elixir && pUnits.length >= 2);

    const opts = unitOpts.concat(spellOpts);
    if (opts.length === 0) return null;

    // Aggressive tanking if elixir is high
    if (elixir >= 8 && unitOpts.includes("tank")) return "tank";

    return opts[Math.floor(Math.random() * opts.length)];
  }
  pickSpellTarget(game) {
    const pts = game.player.unitsTop.length + game.player.unitsBottom.length;
    if (pts === 0) return null;
    const laneTopCount = game.player.unitsTop.length;
    const laneBotCount = game.player.unitsBottom.length;
    const lane = laneTopCount >= laneBotCount ? "top" : "bottom";
    const arr = lane === "top" ? game.player.unitsTop : game.player.unitsBottom;
    let sx = 0, sy = 0, n = 0;
    for (const u of arr) {
      sx += u.x; sy += u.y; n++;
    }
    if (n === 0) return null;
    const cx = sx / n;
    const cy = sy / n;
    return { x: cx, y: cy };
  }
  pickLane(game) {
    // Tower focus: attack the weakest tower
    const pTopHp = game.player.topTower.hp;
    const pBotHp = game.player.bottomTower.hp;

    if (pTopHp > 0 && pBotHp > 0) {
      if (pTopHp < pBotHp - 200) return "top";
      if (pBotHp < pTopHp - 200) return "bottom";
    } else if (pTopHp <= 0 && pBotHp > 0) {
      return "bottom";
    } else if (pBotHp <= 0 && pTopHp > 0) {
      return "top";
    }

    // Pressure balance
    const topPressure = game.enemy.unitsTop.length - game.player.unitsTop.length;
    const botPressure = game.enemy.unitsBottom.length - game.player.unitsBottom.length;
    return topPressure < botPressure ? "top" : "bottom";
  }
}

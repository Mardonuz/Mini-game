import { applyDamage } from "./entities.js";
import { playSpell } from "./audio.js";
import { Particles } from "./particles.js";

export function fireball(game, side, x, y) {
  const radius = 60;
  const unitDamage = 180;
  const towerDamage = 120;
  const enemy = side === 0 ? game.enemy : game.player;
  const units = enemy.unitsTop.concat(enemy.unitsBottom);
  for (const u of units) {
    if (!u.isAlive()) continue;
    const dx = u.x - x;
    const dy = u.y - y;
    if (Math.hypot(dx, dy) <= radius) {
      applyDamage(u, unitDamage);
    }
  }
  const towers = [enemy.king, enemy.topTower, enemy.bottomTower].filter(t => t && t.hp > 0);
  for (const t of towers) {
    const dx = t.x - x;
    const dy = t.y - y;
    if (Math.hypot(dx, dy) <= radius) {
      applyDamage(t, towerDamage);
    }
  }
  game.effects.push({ kind: "fireball", x, y, r: radius, time: 0.35 });
  playSpell();
  game.particles.spawn(x, y, "rgba(240,120,80,ALPHA)", 24, 220, 0.6);
}

export function freeze(game, side, x, y) {
  const radius = 80;
  const duration = 2.5;
  const enemy = side === 0 ? game.enemy : game.player;
  const units = enemy.unitsTop.concat(enemy.unitsBottom);
  for (const u of units) {
    const dx = u.x - x;
    const dy = u.y - y;
    if (Math.hypot(dx, dy) <= radius) {
      u.freezeLeft = Math.max(u.freezeLeft, duration);
    }
  }
  const towers = [enemy.king, enemy.topTower, enemy.bottomTower].filter(t => t && t.hp > 0);
  for (const t of towers) {
    const dx = t.x - x;
    const dy = t.y - y;
    if (Math.hypot(dx, dy) <= radius) {
      t.freezeLeft = Math.max(t.freezeLeft, duration);
    }
  }
  game.effects.push({ kind: "freeze", x, y, r: radius, time: duration });
  playSpell();
  game.particles.spawn(x, y, "rgba(120,180,255,ALPHA)", 20, 160, 0.8);
}

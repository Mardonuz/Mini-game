export class Tower {
  constructor(x, y, side, spec = {}) {
    this.x = x;
    this.y = y;
    this.w = spec.w || 40;
    this.h = spec.h || 80;
    this.hp = spec.hp || 2000;
    this.maxHp = spec.hp || 2000;
    this.range = spec.range || 160;
    this.baseDamage = spec.damage || 30;
    this.baseCooldown = spec.cooldown || 0.9;
    this.damage = this.baseDamage;
    this.cooldown = this.baseCooldown;
    this.cooldownLeft = 0;
    this.side = side;
    this.freezeLeft = 0;
    this.active = spec.active ?? true;
    this.wasDamaged = false;
    this.awakeBoostLeft = 0;
    this.awakeDuration = 0;
  }
  update(dt, enemies) {
    if (this.hp <= 0) return;
    if (!this.active) return;
    if (this.awakeBoostLeft > 0) {
      this.awakeBoostLeft -= dt;
      this.damage = this.baseDamage * 1.25;
      this.cooldown = this.baseCooldown * 0.85;
    } else {
      this.damage = this.baseDamage;
      this.cooldown = this.baseCooldown;
    }
    if (this.freezeLeft > 0) {
      this.freezeLeft -= dt;
      return;
    }
    if (this.cooldownLeft > 0) this.cooldownLeft -= dt;
    const t = nearestInRange({ x: this.x, y: this.y }, enemies, this.range);
    if (t && this.cooldownLeft <= 0) {
      applyDamage(t, this.damage);
      this.cooldownLeft = this.cooldown;
    }
  }
}

export class Unit {
  constructor(x, y, lane, side, spec) {
    this.x = x;
    this.y = y;
    this.r = 12;
    this.hp = spec.hp;
    this.maxHp = spec.hp;
    this.speed = spec.speed;
    this.damage = spec.damage;
    this.range = spec.range;
    this.cooldown = spec.cooldown;
    this.cooldownLeft = 0;
    this.lane = lane;
    this.side = side;
    this.target = null;
    this.freezeLeft = 0;
    this.hitTime = 0;
    this.mass = spec.mass || 1;
    this.vx = 0;
    this.vy = 0;
    this.targetY = y;
  }
  isAlive() {
    return this.hp > 0;
  }
  update(dt, enemies, enemyTower, direction) {
    if (!this.isAlive()) return;
    if (this.freezeLeft > 0) {
      this.freezeLeft -= dt;
      return;
    }
    if (this.cooldownLeft > 0) this.cooldownLeft -= dt;
    const aliveEnemies = enemies.filter(e => e.isAlive());
    const t = nearestInRange(this, aliveEnemies, this.range) || (dist(this, enemyTower) <= this.range ? enemyTower : null);
    if (t) {
      this.target = t;
      if (this.cooldownLeft <= 0) {
        applyDamage(t, this.damage);
        this.cooldownLeft = this.cooldown;
      }
    } else {
      this.target = null;
      const nearest = nearestInRange(this, aliveEnemies, 26);
      if (!nearest) {
        this.vx += direction * this.speed * 0.5 * dt;
      }
    }
    if (this.hitTime > 0) this.hitTime -= dt;
    this.vx *= 0.9;
    const dy = this.targetY - this.y;
    this.vy += Math.sign(dy) * Math.min(60, Math.abs(dy)) * 0.05 * dt;
    this.vy *= 0.9;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

export function unitSpec(key) {
  if (key === "knight") return { hp: 520, speed: 62, damage: 21, range: 28, cooldown: 0.9, cost: 3, color: "#4fe07b", mass: 1.2 };
  if (key === "archer") return { hp: 190, speed: 70, damage: 16, range: 145, cooldown: 0.95, cost: 3, color: "#6af79b", mass: 0.8 };
  if (key === "tank") return { hp: 1050, speed: 38, damage: 32, range: 30, cooldown: 1.15, cost: 5, color: "#f7b66a", mass: 2.2 };
  if (key === "bomber") return { hp: 230, speed: 65, damage: 48, range: 115, cooldown: 1.45, cost: 4, color: "#e06a4f", mass: 1.0 };
  return { hp: 300, speed: 60, damage: 18, range: 28, cooldown: 1.0, cost: 3, color: "#cccccc" };
}

export function drawTower(ctx, tower, color) {
  ctx.fillStyle = color;
  ctx.fillRect(tower.x - tower.w / 2, tower.y - tower.h / 2, tower.w, tower.h);
  drawHpBar(ctx, tower.x - 20, tower.y - tower.h / 2 - 10, 40, 6, tower.hp, tower.maxHp);
  if (!tower.active) {
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(tower.x - tower.w / 2, tower.y - tower.h / 2, tower.w, tower.h);
    ctx.setLineDash([]);
  } else if (tower.awakeBoostLeft > 0) {
    ctx.strokeStyle = "rgba(255,215,120,0.6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(tower.x - tower.w / 2 - 2, tower.y - tower.h / 2 - 2, tower.w + 4, tower.h + 4);
  }
}

export function drawUnit(ctx, unit, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(unit.x, unit.y, unit.r, 0, Math.PI * 2);
  ctx.fill();
  if (unit.hitTime > 0) {
    const a = Math.max(0, Math.min(1, unit.hitTime / 0.2));
    ctx.strokeStyle = `rgba(255,255,255,${0.6 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, unit.r + 4 * a, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawHpBar(ctx, unit.x - unit.r, unit.y - unit.r - 8, unit.r * 2, 4, unit.hp, unit.maxHp);
}

export function drawHpBar(ctx, x, y, w, h, hp, max) {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x, y, w, h);
  const p = Math.max(0, hp) / max;
  ctx.fillStyle = "#4fe07b";
  ctx.fillRect(x, y, w * p, h);
}

export function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function nearestInRange(src, arr, range) {
  let best = null;
  let bestD = Infinity;
  for (const e of arr) {
    const d = dist(src, e);
    if (d <= range && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

export function applyDamage(target, amount) {
  target.hp -= amount;
  if ("wasDamaged" in target) target.wasDamaged = true;
  if ("hitTime" in target) target.hitTime = 0.2;
}

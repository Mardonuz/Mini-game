import { Tower, Unit, unitSpec, drawTower, drawUnit } from "./entities.js";
import { fireball, freeze } from "./spells.js";
import { playSpawn } from "./audio.js";
import { SpriteAtlas } from "./sprites.js";
import { Particles } from "./particles.js";

export class Game {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.player = {
      elixir: 5,
      elixirRate: 0.45,
      king: new Tower(120, height / 2, 0, { hp: 2400, damage: 35, range: 170, active: false }),
      topTower: new Tower(160, height * 0.25, 0, { hp: 1400, damage: 25, range: 150 }),
      bottomTower: new Tower(160, height * 0.75, 0, { hp: 1400, damage: 25, range: 150 }),
      unitsTop: [],
      unitsBottom: [],
    };
    this.enemy = {
      elixir: 5,
      elixirRate: 0.45,
      king: new Tower(width - 120, height / 2, 1, { hp: 2400, damage: 35, range: 170, active: false }),
      topTower: new Tower(width - 160, height * 0.25, 1, { hp: 1400, damage: 25, range: 150 }),
      bottomTower: new Tower(width - 160, height * 0.75, 1, { hp: 1400, damage: 25, range: 150 }),
      unitsTop: [],
      unitsBottom: [],
    };
    this.over = false;
    this.winner = null;
    this.bg = makeBackground(width, height);
    this.effects = [];
    this.sprites = new SpriteAtlas();
    this.sprites.preload();
    this.particles = new Particles();
  }
  spawnUnit(side, lane, key) {
    if (this.over) return;
    const spec = unitSpec(key);
    const actor = side === 0 ? this.player : this.enemy;
    if (actor.elixir < spec.cost) return;
    actor.elixir -= spec.cost;
    const laneY = lane === "top" ? this.height * 0.25 : this.height * 0.75;
    const y = laneY + (Math.random() - 0.5) * 12;
    const x = side === 0 ? 190 : this.width - 190;
    const u = new Unit(x, y, lane, side, spec);
    u.targetY = laneY;
    if (lane === "top") {
      side === 0 ? this.player.unitsTop.push(u) : this.enemy.unitsTop.push(u);
    } else {
      side === 0 ? this.player.unitsBottom.push(u) : this.enemy.unitsBottom.push(u);
    }
    playSpawn();
  }
  castSpell(side, key, x, y, cost) {
    if (this.over) return;
    const actor = side === 0 ? this.player : this.enemy;
    if (actor.elixir < cost) return;
    actor.elixir -= cost;
    if (key === "fireball") fireball(this, side, x, y);
    else if (key === "freeze") freeze(this, side, x, y);
  }
  update(dt) {
    if (this.over) return;
    this.player.elixir = Math.min(10, this.player.elixir + this.player.elixirRate * dt);
    this.enemy.elixir = Math.min(10, this.enemy.elixir + this.enemy.elixirRate * dt);
    const pKing = this.player.king;
    const eKing = this.enemy.king;
    updateLane(this.player.unitsTop, this.enemy.unitsTop, this.enemy.topTower, +1, dt);
    updateLane(this.enemy.unitsTop, this.player.unitsTop, this.player.topTower, -1, dt);
    updateLane(this.player.unitsBottom, this.enemy.unitsBottom, this.enemy.bottomTower, +1, dt);
    updateLane(this.enemy.unitsBottom, this.player.unitsBottom, this.player.bottomTower, -1, dt);
    resolvePhysicsLane(this.player.unitsTop, this.enemy.unitsTop, +1, this.width);
    resolvePhysicsLane(this.player.unitsBottom, this.enemy.unitsBottom, +1, this.width);
    resolvePhysicsLane(this.enemy.unitsTop, this.player.unitsTop, -1, this.width);
    resolvePhysicsLane(this.enemy.unitsBottom, this.player.unitsBottom, -1, this.width);
    this.player.topTower.update(dt, this.enemy.unitsTop);
    this.player.bottomTower.update(dt, this.enemy.unitsBottom);
    this.enemy.topTower.update(dt, this.player.unitsTop);
    this.enemy.bottomTower.update(dt, this.player.unitsBottom);
    pKing.update(dt, this.enemy.unitsTop.concat(this.enemy.unitsBottom));
    eKing.update(dt, this.player.unitsTop.concat(this.player.unitsBottom));
    handleKingWake(this.player, this.enemy);
    handleKingWake(this.enemy, this.player);
    cleanup(this.player.unitsTop);
    cleanup(this.player.unitsBottom);
    cleanup(this.enemy.unitsTop);
    cleanup(this.enemy.unitsBottom);
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].time -= dt;
      if (this.effects[i].time <= 0) this.effects.splice(i, 1);
    }
    this.particles.update(dt);
    if (pKing.hp <= 0 || eKing.hp <= 0) {
      this.over = true;
      this.winner = pKing.hp <= 0 ? 1 : 0;
    }
  }
  draw(ctx) {
    ctx.drawImage(this.bg, 0, 0);
    drawLanes(ctx, this.width, this.height);
    this.sprites.drawTower(ctx, this.player.topTower, "#4f7be0");
    this.sprites.drawTower(ctx, this.player.bottomTower, "#4f7be0");
    this.sprites.drawTower(ctx, this.player.king, "#4f7be0");
    this.sprites.drawTower(ctx, this.enemy.topTower, "#e04f7b");
    this.sprites.drawTower(ctx, this.enemy.bottomTower, "#e04f7b");
    this.sprites.drawTower(ctx, this.enemy.king, "#e04f7b");
    drawKingAura(ctx, this.player.king);
    drawKingAura(ctx, this.enemy.king);
    for (const u of this.player.unitsTop) this.sprites.drawUnit(ctx, u, unitKind(u));
    for (const u of this.player.unitsBottom) this.sprites.drawUnit(ctx, u, unitKind(u));
    for (const u of this.enemy.unitsTop) this.sprites.drawUnit(ctx, u, unitKind(u));
    for (const u of this.enemy.unitsBottom) this.sprites.drawUnit(ctx, u, unitKind(u));
    for (const ef of this.effects) drawEffect(ctx, ef);
    this.particles.draw(ctx);
  }
}

function unitSpecColor(u) {
  const s = unitSpecByHp(u);
  return s.color;
}

function unitSpecByHp(u) {
  if (u.maxHp >= 900) return unitSpec("tank");
  if (u.maxHp <= 200 && u.range >= 100) return unitSpec("archer");
  if (u.damage >= 45) return unitSpec("bomber");
  return unitSpec("knight");
}

function unitKind(u) {
  if (u.maxHp >= 900) return "tank";
  if (u.maxHp <= 200 && u.range >= 100) return "archer";
  if (u.damage >= 45) return "bomber";
  return "knight";
}
function updateLane(us, foes, foeTower, dir, dt) {
  for (const u of us) {
    u.update(dt, foes, foeTower, dir);
  }
}

function resolvePhysicsLane(us, foes, dir, w) {
  const k = 6;
  // Intraside formation & collision
  for (let i = 0; i < us.length; i++) {
    for (let j = i + 1; j < us.length; j++) {
      const a = us[i], b = us[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.hypot(dx, dy);
      const min = a.r + b.r + 4; // Padding for formation

      if (d < min && d > 0.001) {
        // Formation physics: if they are in each other's way, nudge vertically
        const nx = dx / d, ny = dy / d;
        const f = k * (min - d);

        // Front-back logic: units behind (relative to dir) should slow down
        const isABehind = (dir > 0) ? (a.x < b.x) : (a.x > b.x);
        const follower = isABehind ? a : b;
        const leader = isABehind ? b : a;

        // Follower slows down if too close to leader
        if (Math.abs(dx) < min * 0.8) {
          follower.vx *= 0.85; // Drag behind leader
        }

        // Horizontal separation (avoiding overlap)
        const fa = f / a.mass;
        const fb = f / b.mass;
        a.vx += nx * fa; a.vy += ny * fa;
        b.vx -= nx * fb; b.vy -= ny * fb;

        // Vertical formation: if they are roughly same X, push them apart vertically
        if (Math.abs(dx) < 10) {
          const vPush = 0.5;
          if (a.y < b.y) { a.vy -= vPush; b.vy += vPush; }
          else { a.vy += vPush; b.vy -= vPush; }
        }
      }
    }
  }
  // Intersection with enemies
  for (let i = 0; i < us.length; i++) {
    for (let j = 0; j < foes.length; j++) {
      const a = us[i], b = foes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.hypot(dx, dy);
      const min = a.r + b.r + 4;
      if (d < min && d > 0.001) {
        const f = k * (min - d) * 0.6;
        const nx = dx / d, ny = dy / d;
        const fa = f / a.mass;
        const fb = f / b.mass;
        a.vx += nx * fa; a.vy += ny * fa;
        b.vx -= nx * fb; b.vy -= ny * fb;
      }
    }
  }
  // Boundary constraints & lane sticking
  for (const a of us) {
    if (a.x < 140 && a.vx < 0) a.vx *= -0.3;
    if (a.x > w - 140 && a.vx > 0) a.vx *= -0.3;

    const laneY = a.targetY;
    // Lane sticking force
    const dy = a.y - laneY;
    a.vy -= dy * 0.05; // Spring towards lane center

    if (a.y < laneY - 24 && a.vy < 0) a.vy *= -0.3;
    if (a.y > laneY + 24 && a.vy > 0) a.vy *= -0.3;

    a.x = Math.max(140, Math.min(w - 140, a.x));
    a.y = Math.max(laneY - 26, Math.min(laneY + 26, a.y));
  }
}

function cleanup(arr) {
  let i = arr.length - 1;
  while (i >= 0) {
    if (!arr[i].isAlive()) arr.splice(i, 1);
    i--;
  }
}

function drawLanes(ctx, w, h) {
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.25);
  ctx.lineTo(w * 0.8, h * 0.25);
  ctx.moveTo(w * 0.2, h * 0.75);
  ctx.lineTo(w * 0.8, h * 0.75);
  ctx.stroke();
}

function drawEffect(ctx, ef) {
  if (ef.kind === "fireball") {
    ctx.strokeStyle = "rgba(240,120,80,0.7)";
    ctx.fillStyle = "rgba(240,120,80,0.25)";
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (ef.kind === "freeze") {
    ctx.strokeStyle = "rgba(120,180,255,0.7)";
    ctx.fillStyle = "rgba(120,180,255,0.18)";
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawKingAura(ctx, k) {
  if (!k.active) return;
  const t = Math.max(0, k.awakeBoostLeft);
  const pulse = 4 + Math.sin(Date.now() * 0.008) * 2;
  const rg = ctx.createRadialGradient(k.x, k.y, k.w * 0.6, k.x, k.y, k.w + pulse);
  rg.addColorStop(0, "rgba(255,215,120,0.25)");
  rg.addColorStop(1, "rgba(255,215,120,0.0)");
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(k.x, k.y, k.w + pulse, 0, Math.PI * 2);
  ctx.fill();
  const d = Math.max(0, k.awakeDuration);
  const p = d > 0 ? Math.max(0, Math.min(1, t / d)) : 0;
  ctx.strokeStyle = "rgba(255,215,120,0.6)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(k.x, k.y, k.w + 6, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,215,120,0.9)";
  const s = Math.ceil(t).toString();
  ctx.font = "12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(s, k.x, k.y - k.h / 2 - 24);
}

function makeBackground(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#0e1a2b");
  grad.addColorStop(1, "#0b1624");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(255,255,255,0.04)";
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 2 + Math.random() * 3;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function handleKingWake(me, foe) {
  const k = me.king;
  if (k.hp <= 0) return;
  const sidesDown = (me.topTower.hp <= 0) && (me.bottomTower.hp <= 0);
  if (sidesDown && !k.active) {
    k.active = true;
    k.awakeBoostLeft = Math.max(k.awakeBoostLeft, 10);
    k.awakeDuration = 10;
  }
  if (k.wasDamaged && !k.active) {
    k.active = true;
    k.awakeBoostLeft = Math.max(k.awakeBoostLeft, 10);
    k.awakeDuration = 10;
  }
}

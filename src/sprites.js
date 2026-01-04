export class SpriteAtlas {
  constructor() {
    this.cache = new Map();
    this.images = new Map();
    this.loaded = false;
    this.paths = {
      knight: "assets/knight.svg",
      archer: "assets/archer.svg",
      tank: "assets/tank.svg",
      bomber: "assets/bomber.svg",
      tower: "assets/tower.svg",
      fireball: "assets/fireball.svg",
      freeze: "assets/freeze.svg",
    };
  }
  async preload() {
    const entries = Object.entries(this.paths);
    await Promise.all(entries.map(([k, p]) => this._loadImage(k, p)));
    this.loaded = true;
  }
  _loadImage(key, path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images.set(key, img); resolve(); };
      img.onerror = () => { resolve(); };
      img.src = path;
    });
  }
  key(kind, t) {
    return kind + ":" + Math.floor(t * 10 % 4);
  }
  frame(kind, t) {
    const k = this.key(kind, t);
    if (this.cache.has(k)) return this.cache.get(k);
    const c = document.createElement("canvas");
    c.width = 40; c.height = 40;
    const g = c.getContext("2d");
    const img = this.images.get(kind);
    if (img) {
      g.drawImage(img, 0, 0, 40, 40);
    } else {
      this._drawFallback(g, kind);
    }
    this.cache.set(k, c);
    return c;
  }
  _drawFallback(g, kind) {
    if (kind === "knight") {
      g.fillStyle = "#4fe07b";
      g.beginPath();
      g.arc(20, 20, 12, 0, Math.PI * 2);
      g.fill();
    } else if (kind === "archer") {
      g.fillStyle = "#6af79b";
      g.beginPath();
      g.arc(20, 20, 10, 0, Math.PI * 2);
      g.fill();
    } else if (kind === "tank") {
      g.fillStyle = "#f7b66a";
      g.fillRect(10, 12, 20, 16);
    } else if (kind === "bomber") {
      g.fillStyle = "#e06a4f";
      g.beginPath();
      g.arc(20, 20, 11, 0, Math.PI * 2);
      g.fill();
    } else if (kind === "tower") {
      g.fillStyle = "#888";
      g.fillRect(12, 8, 16, 24);
    } else if (kind === "fireball") {
      g.fillStyle = "rgba(240,120,80,0.8)";
      g.beginPath();
      g.arc(20, 20, 8, 0, Math.PI * 2);
      g.fill();
    } else if (kind === "freeze") {
      g.fillStyle = "rgba(120,180,255,0.8)";
      g.beginPath();
      g.arc(20, 20, 8, 0, Math.PI * 2);
      g.fill();
    }
  }
  drawUnit(ctx, unit, kind) {
    const t = performance.now() * 0.001;
    const f = this.frame(kind, t);
    const r = unit.r || 15;
    ctx.save();
    ctx.translate(unit.x, unit.y);
    if (unit.side === 1) ctx.scale(-1, 1);
    ctx.drawImage(f, -r, -r, r * 2, r * 2);
    ctx.restore();
  }
  drawTower(ctx, tower, color) {
    const f = this.frame("tower", 0);
    const w = tower.w || 30;
    const h = tower.h || 45;
    ctx.save();
    ctx.translate(tower.x, tower.y);
    // Draw base with color
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(0, h / 2 - 5, w * 0.8, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.drawImage(f, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

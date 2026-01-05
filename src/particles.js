export class Particles {
  constructor() {
    this.ps = [];
  }
  spawn(x, y, color, count = 20, speed = 160, life = 0.6) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.5 + Math.random() * 0.5);
      this.ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, color, r: 2 + Math.random() * 2 });
    }
  }
  update(dt) {
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.life <= 0) this.ps.splice(i, 1);
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.ps) {
      const alpha = Math.max(0, Math.min(1, p.life));
      const r = p.r * (1 + (1 - alpha) * 0.5);

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      const base = p.color.replace("ALPHA", String(alpha));
      const core = p.color.replace("ALPHA", String(alpha * 1.5));

      g.addColorStop(0, core);
      g.addColorStop(0.4, base);
      g.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}


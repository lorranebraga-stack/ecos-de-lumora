// Partículas simples: faíscas de cristal, poeira de inimigo, impacto de dano.
// Cada partícula é um pixel (ou quadradinho) com velocidade, gravidade e tempo de vida.

export class Particles {
  constructor() {
    this.list = [];
  }

  // Explosão de partículas a partir de um ponto, em todas as direções.
  burst(x, y, { count = 8, colors = ['#ffffff'], speed = 60, life = 0.5, gravity = 0, size = 1, up = 0 } = {}) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.list.push({
        x,
        y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s - up,
        life: life * (0.6 + Math.random() * 0.4),
        maxLife: life,
        gravity,
        size,
        color: colors[i % colors.length],
      });
    }
  }

  update(dt) {
    for (const p of this.list) {
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.min(1, p.life / (p.maxLife * 0.5));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}

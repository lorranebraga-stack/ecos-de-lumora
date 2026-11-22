// Lanterna-marco: o checkpoint do Bosque ('K' no mapa).
// Apagada, é um poste com uma lanterna fria. Quando o Nilo passa,
// ela acende, o progresso é salvo e ali vira o ponto de retorno.

export class Lantern {
  constructor(id, tx, ty, T) {
    this.id = id;
    this.x = tx * T + T / 2;   // centro
    this.base = (ty + 1) * T;  // chão
    this.lit = false;
    this.litTime = 0;
  }

  // Onde o Nilo reaparece (pés no chão, ao lado do poste).
  respawnPoint(player) {
    return { x: this.x - player.w / 2, y: this.base - player.h };
  }

  touches(p) {
    return Math.abs(p.x + p.w / 2 - this.x) < 12 && p.y < this.base && p.y + p.h > this.base - 28;
  }

  draw(ctx, time) {
    const x = Math.round(this.x);
    const b = this.base;
    const r = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px, b + py, w, h); };

    // Poste e braço
    r(-1, -26, 2, 26, '#4a3128');
    r(-3, -2, 6, 2, '#4a3128');
    r(-1, -27, 6, 2, '#6b4a3a');

    // Lanterna pendurada (balança de leve)
    const sway = Math.round(Math.sin(time * 1.6) * 1);
    const lx = 3 + sway;
    r(lx, -25, 1, 2, '#2f2550');
    r(lx - 2, -23, 5, 7, '#2f2550');
    if (this.lit) {
      const flick = 0.75 + 0.25 * Math.sin(time * 9) * Math.sin(time * 5.3);
      ctx.globalAlpha = 0.18 * flick;
      ctx.fillStyle = '#8ff7ff';
      ctx.fillRect(x + lx - 9, b - 30, 19, 21);
      ctx.fillRect(x + lx - 13, b - 25, 27, 11);
      ctx.globalAlpha = 1;
      r(lx - 1, -22, 3, 5, '#59e0c5');
      r(lx, -21, 1, 3, '#e8fdff');
    } else {
      r(lx - 1, -22, 3, 5, '#3a3644');
    }
  }
}

export function createLanterns(entities, T) {
  return entities
    .filter((e) => e.type === 'lantern')
    .map((e, i) => new Lantern(`lanterna${i}`, e.tx, e.ty, T));
}

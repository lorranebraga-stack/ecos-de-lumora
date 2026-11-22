// Altar de habilidade ('A' no mapa): um glifo flutuando sobre um pedestal.
// Ao tocar, o Nilo "lembra" uma habilidade que fica salva para sempre.
// Se a habilidade já foi aprendida (em outra partida), o altar aparece apagado.

export class AbilityShrine {
  constructor(tx, ty, T, ability) {
    this.ability = ability;
    this.x = tx * T + T / 2;
    this.base = (ty + 1) * T;
    this.taken = false;
    this.time = 0;
  }

  touches(p) {
    return !this.taken && Math.abs(p.x + p.w / 2 - this.x) < 10 && p.y < this.base && p.y + p.h > this.base - 30;
  }

  update(dt) {
    this.time += dt;
  }

  draw(ctx) {
    const x = Math.round(this.x);
    const b = this.base;
    const r = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px, b + py, w, h); };
    // Pedestal
    r(-8, -6, 16, 6, '#26305a');
    r(-6, -8, 12, 2, '#4a5fa0');
    if (this.taken) return;
    // Glifo: dois arcos (um pulo e o seu eco), flutuando
    const y = Math.round(-22 + Math.sin(this.time * 2) * 2);
    ctx.globalAlpha = 0.2 + 0.1 * Math.sin(this.time * 3);
    r(-8, y - 8, 16, 16, '#ffd98a');
    ctx.globalAlpha = 1;
    r(-5, y + 2, 3, 1, '#ffd98a');
    r(-3, y - 1, 1, 3, '#ffd98a');
    r(-2, y - 2, 3, 1, '#ffd98a');
    r(1, y - 1, 1, 3, '#ffd98a');
    r(2, y + 2, 3, 1, '#ffd98a');
    r(-1, y - 6, 3, 1, '#8ff7ff');
    r(-2, y - 5, 1, 2, '#8ff7ff');
    r(2, y - 5, 1, 2, '#8ff7ff');
  }
}

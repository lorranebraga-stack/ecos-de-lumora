// Mira, a guardiã das lembranças: uma raposa-lanterna espectral.
// Primeiro ela espera num ponto da fase; depois do encontro, segue o Nilo
// flutuando um pouco atrás e acima dele.

export class Mira {
  constructor(x, y) {
    this.x = x; // centro
    this.y = y;
    this.mode = 'waiting'; // 'waiting' | 'follow'
    this.facing = -1;      // olhando para a esquerda, de onde o Nilo vem
    this.time = 0;
  }

  follow() {
    this.mode = 'follow';
  }

  update(dt, player) {
    this.time += dt;
    if (this.mode !== 'follow') return;

    const tx = player.x + player.w / 2 - player.facing * 20;
    const ty = player.y - 8;
    const dist = Math.hypot(tx - this.x, ty - this.y);
    if (dist > 260) {
      // Ficou longe demais (renascimento, teleporte): reaparece ao lado.
      this.x = tx;
      this.y = ty;
    } else {
      const k = 1 - Math.exp(-3.5 * dt);
      this.x += (tx - this.x) * k;
      this.y += (ty - this.y) * k;
    }
    const toPlayer = player.x + player.w / 2 - this.x;
    if (Math.abs(toPlayer) > 4) this.facing = Math.sign(toPlayer);
  }

  draw(ctx) {
    const t = this.time;
    const x = Math.round(this.x);
    const y = Math.round(this.y + Math.sin(t * 2.5) * 2);
    ctx.save();
    ctx.translate(x, y);

    // Halo de luz
    ctx.globalAlpha = 0.12 + 0.05 * Math.sin(t * 3);
    ctx.fillStyle = '#8ff7ff';
    ctx.fillRect(-10, -8, 20, 15);
    ctx.fillRect(-7, -11, 14, 21);
    ctx.globalAlpha = 1;

    ctx.scale(this.facing, 1);
    const r = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(px, py, w, h); };

    // Cauda com a chama azul na ponta (atrás do corpo)
    r(-8, -3, 3, 2, '#dfe9ff');
    r(-10, -5, 3, 3, '#dfe9ff');
    const f1 = Math.sin(t * 14) > 0 ? 1 : 0;
    const f2 = Math.sin(t * 11 + 1) > 0 ? 1 : 0;
    r(-12, -8 - f1, 3, 4, '#5fa8ff');
    r(-11, -10 - f2, 2, 3, '#8ff7ff');
    r(-11, -11 - f1 - f2, 1, 1, '#ffffff');

    // Corpo
    r(-5, -2, 9, 4, '#dfe9ff');
    r(-4, 2, 2, 1, '#9fb4ff'); // patinhas
    r(2, 2, 2, 1, '#9fb4ff');

    // Cabeça, orelhas, focinho, olho
    r(2, -6, 5, 5, '#dfe9ff');
    r(2, -8, 1, 2, '#dfe9ff');
    r(5, -8, 1, 2, '#dfe9ff');
    r(7, -4, 2, 2, '#f4f8ff');
    r(8, -4, 1, 1, '#1a1426');
    r(5, -5, 1, 1, '#1a1426');

    ctx.restore();
  }
}

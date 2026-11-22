// O Vulto: figura alta de névoa com uma máscara de cristal rachada.
// No Bosque ele só APARECE: surge devagar, fala e se desfaz em névoa.
// Nas regiões seguintes, este mesmo objeto pode ganhar ataques.

export class Vulto {
  constructor(x, base) {
    this.x = x;        // centro horizontal
    this.base = base;  // altura dos pés
    this.state = 'hidden'; // 'hidden' | 'appearing' | 'visible' | 'vanishing'
    this.alpha = 0;
    this.time = 0;
  }

  appear() {
    if (this.state === 'hidden') this.state = 'appearing';
  }

  vanish() {
    if (this.state !== 'hidden') this.state = 'vanishing';
  }

  update(dt, particles) {
    this.time += dt;
    if (this.state === 'appearing') {
      this.alpha = Math.min(1, this.alpha + dt / 1.5);
      if (this.alpha >= 1) this.state = 'visible';
    } else if (this.state === 'vanishing') {
      this.alpha = Math.max(0, this.alpha - dt / 1.2);
      if (particles && Math.random() < 0.8) {
        particles.burst(this.x + (Math.random() * 14 - 7), this.base - Math.random() * 34, {
          count: 2, colors: ['#2a2040', '#4a3f6a', '#b48cff'], speed: 25, life: 1, up: 30,
        });
      }
      if (this.alpha <= 0) this.state = 'hidden';
    }
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    const t = this.time;
    const x = Math.round(this.x);
    const b = this.base;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    const r = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px, b + py, w, h); };

    // Corpo de névoa: colunas que sobem e descem, sem pés definidos
    for (let i = -7; i < 7; i++) {
      const ragged = Math.round(Math.sin(t * 2 + i * 1.3) * 2);
      const top = i < -5 || i > 4 ? -26 : -30;
      r(i, top, 1, -top - 3 + ragged, '#141022');
    }
    r(-8, -27, 16, 4, '#141022'); // ombros

    // Fiapos de névoa subindo
    ctx.globalAlpha = this.alpha * 0.5;
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.5 + i / 3) % 1;
      r(-6 + i * 5 + Math.round(Math.sin(t + i) * 2), -30 - Math.round(k * 14), 2, 3, '#2a2040');
    }
    ctx.globalAlpha = this.alpha;

    // Máscara de cristal rachada
    r(-3, -37, 7, 8, '#cfe9ff');
    r(-2, -38, 5, 1, '#cfe9ff');
    r(0, -38, 1, 4, '#5f596b');
    r(1, -34, 1, 4, '#5f596b');

    // Olhos: fendas violeta
    ctx.globalAlpha = this.alpha * (0.6 + 0.4 * Math.sin(t * 2));
    r(-2, -34, 2, 1, '#b48cff');
    r(2, -34, 2, 1, '#b48cff');

    ctx.restore();
  }
}

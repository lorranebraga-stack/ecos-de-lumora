// Cristais de luz: o colecionável básico do jogo.
// Cada cristal vem de um 'c' no mapa. Todos ficam numa lista gerenciada aqui.

const COLORS = {
  glow: '#8ff7ff',
  light: '#e8fdff',
  mid: '#59e0c5',
  dark: '#2c7a9b',
};

export class Crystal {
  constructor(tx, ty, T) {
    this.x = tx * T + T / 2; // centro
    this.y = ty * T + T / 2;
    this.collected = false;
    this.phase = (tx * 0.7 + ty * 1.3) % (Math.PI * 2);
  }

  // Área de coleta um pouco maior que o desenho: pegar é generoso.
  touches(body) {
    return body.x < this.x + 6 && body.x + body.w > this.x - 6 && body.y < this.y + 7 && body.y + body.h > this.y - 7;
  }

  draw(ctx, time) {
    const x = Math.round(this.x);
    const y = Math.round(this.y + Math.sin(time * 3 + this.phase) * 1.5);

    // Halo em cruz (dois retângulos sobrepostos): parece mais redondo que um quadrado
    ctx.globalAlpha = 0.1 + 0.07 * Math.sin(time * 4 + this.phase);
    ctx.fillStyle = COLORS.glow;
    ctx.fillRect(x - 3, y - 7, 7, 14);
    ctx.fillRect(x - 5, y - 4, 11, 8);
    ctx.globalAlpha = 1;

    // Losango em degraus (pixel art): estreito em cima e embaixo
    ctx.fillStyle = COLORS.dark;
    ctx.fillRect(x - 1, y - 5, 3, 10);
    ctx.fillRect(x - 2, y - 3, 5, 6);
    ctx.fillRect(x - 3, y - 1, 7, 2);
    ctx.fillStyle = COLORS.mid;
    ctx.fillRect(x, y - 4, 2, 8);
    ctx.fillRect(x - 1, y - 2, 4, 4);
    ctx.fillStyle = COLORS.light;
    ctx.fillRect(x - 1, y - 2, 1, 2);

    // Brilho que passa pelo cristal de vez em quando
    if ((time + this.phase) % 2.4 < 0.15) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 4, y - 4, 1, 1);
      ctx.fillRect(x + 4, y + 3, 1, 1);
    }
  }
}

export class Collectibles {
  constructor(entities, T) {
    this.crystals = entities.filter((e) => e.type === 'crystal').map((e) => new Crystal(e.tx, e.ty, T));
    this.total = this.crystals.length;
    this.collected = 0;
  }

  // Salvamento: quais cristais (pela ordem no mapa) já foram pegos.
  saveState() {
    return this.crystals.flatMap((c, i) => (c.collected ? [i] : []));
  }

  restore(indices) {
    for (const i of indices) {
      if (this.crystals[i]) this.crystals[i].collected = true;
    }
    this.collected = this.crystals.filter((c) => c.collected).length;
  }

  // Chama onCollect(cristal) para cada cristal pego neste passo.
  update(player, onCollect) {
    for (const c of this.crystals) {
      if (!c.collected && c.touches(player)) {
        c.collected = true;
        this.collected++;
        onCollect(c);
      }
    }
  }

  draw(ctx, time, view) {
    for (const c of this.crystals) {
      if (c.collected) continue;
      if (c.x < view.x - 16 || c.x > view.x + view.w + 16) continue;
      c.draw(ctx, time);
    }
  }
}

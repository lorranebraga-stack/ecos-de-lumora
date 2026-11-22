// MECÂNICAS DAS REGIÕES NOVAS — cada uma é independente e só age se a fase tiver a peça.
//
//   WindSystem    — correntes de ar (Arquipélago): rajadas que ligam e desligam, com aviso,
//                   e correntes para cima constantes. Uma Pedra-Eco pode "acalmar" uma rajada.
//   CrumbleSystem — ilhas frágeis ('%'): tremem quando o Nilo pisa, caem e voltam depois.
//   Clock         — Relógio da Praça ('O', Cidade): com E, troca prédios lembrados/esquecidos.
//   SecretEcho    — Eco Escondido ('S'): a estrela secreta de cada região.
//
// Vento nos dados da fase (em blocos; c = coluna, r = linha, do mapa inteiro):
//   wind: [{ c0, c1, r0, r1, fx, fy, on, off, offset, calmBy }]
//     fx  = empurrão horizontal (px/s; negativo = para a esquerda)
//     fy  = corrente vertical (px/s²; negativo = para cima)
//     on/off = segundos ligada/desligada (sem "off" = sempre ligada)
//     calmBy = índice da Pedra-Eco que acalma esta rajada (opcional)

import { CONFIG } from '../config.js';

const W = CONFIG.WORLD;

// ------------------------------------------------------------------
// Vento
// ------------------------------------------------------------------
export class WindSystem {
  constructor(zones = [], T) {
    this.T = T;
    this.time = 0;
    this.zones = zones.map((z) => ({
      x: z.c0 * T,
      y: z.r0 * T,
      w: (z.c1 - z.c0 + 1) * T,
      h: (z.r1 - z.r0 + 1) * T,
      fx: z.fx || 0,
      fy: z.fy || 0,
      on: z.on || 0,
      off: z.off || 0,
      offset: z.offset || 0,
      calmBy: z.calmBy ?? null,
      calm: false,
      wasActive: false,
    }));
  }

  // Estado de uma zona agora: 'on', 'warn' (vai ligar logo) ou 'off'.
  stateOf(z) {
    if (z.calm) return 'off';
    if (!z.off) return 'on';
    const cycle = z.on + z.off;
    const t = (((this.time + z.offset) % cycle) + cycle) % cycle;
    if (t < z.on) return 'on';
    if (t > cycle - W.WIND_WARN) return 'warn';
    return 'off';
  }

  // Pedras-Eco ativas acalmam as rajadas que dependem delas.
  syncMemory(stones) {
    for (const z of this.zones) {
      if (z.calmBy !== null && stones[z.calmBy] && stones[z.calmBy].active) z.calm = true;
    }
  }

  // Força sobre um corpo agora: { fx, fy }.
  forceAt(b) {
    let fx = 0;
    let fy = 0;
    for (const z of this.zones) {
      if (this.stateOf(z) !== 'on') continue;
      if (b.x < z.x + z.w && b.x + b.w > z.x && b.y < z.y + z.h && b.y + b.h > z.y) {
        fx += z.fx;
        fy += z.fy;
      }
    }
    return { fx, fy };
  }

  // Avança o tempo e solta "fiapos de vento" (partículas) perto da câmera.
  // Retorna true quando alguma rajada visível acabou de ligar (para tocar o som).
  update(dt, particles, view) {
    this.time += dt;
    let started = false;
    for (const z of this.zones) {
      const st = this.stateOf(z);
      const visible = z.x < view.x + view.w + 40 && z.x + z.w > view.x - 40 && z.y < view.y + view.h && z.y + z.h > view.y;
      const active = st === 'on';
      if (active && !z.wasActive && z.off && visible) started = true;
      z.wasActive = active;
      if (!visible || st === 'off') continue;
      const density = (st === 'warn' ? 0.012 : 0.04) * (z.w * z.h) / (this.T * this.T * 8);
      let n = Math.floor(density) + (Math.random() < density % 1 ? 1 : 0);
      while (n-- > 0) {
        const vx = z.fx ? Math.sign(z.fx) * (90 + Math.random() * 60) : (Math.random() - 0.5) * 10;
        const vy = z.fy ? -(60 + Math.random() * 50) : (Math.random() - 0.5) * 6;
        const life = st === 'warn' ? 0.35 : 0.7;
        particles.list.push({
          x: z.x + Math.random() * z.w,
          y: z.y + Math.random() * z.h,
          vx, vy, life, maxLife: life, gravity: 0, size: 1,
          color: z.fy ? '#fff3b0' : '#ffffff',
        });
      }
    }
    return started;
  }

  saveState() {
    return this.zones.map((z) => z.calm);
  }

  restore(state = []) {
    state.forEach((calm, i) => { if (this.zones[i]) this.zones[i].calm = calm; });
  }
}

// ------------------------------------------------------------------
// Ilhas frágeis
// ------------------------------------------------------------------
export class CrumbleSystem {
  constructor(level) {
    this.level = level;
    this.fallen = []; // { tx, ty, back } — esperando para voltar
    this.onFall = null; // (x, y) => {} para partículas e som
  }

  // Blocos frágeis embaixo dos pés de um corpo no chão.
  underFeet(b) {
    const T = this.level.tile;
    const row = Math.floor((b.y + b.h + 1) / T);
    const out = [];
    for (let tx = Math.floor(b.x / T); tx <= Math.floor((b.x + b.w - 0.01) / T); tx++) {
      if (this.level.tileAt(tx, row) === '%') out.push([tx, row]);
    }
    return out;
  }

  update(dt, player) {
    const L = this.level;
    if (player.onGround) {
      for (const [tx, ty] of this.underFeet(player)) {
        const key = `${tx},${ty}`;
        if (!L.shaking.has(key)) L.shaking.set(key, W.CRUMBLE_DELAY);
      }
    }
    for (const [key, left] of L.shaking) {
      const t = left - dt;
      if (t > 0) {
        L.shaking.set(key, t);
        continue;
      }
      L.shaking.delete(key);
      const [tx, ty] = key.split(',').map(Number);
      L.setTile(tx, ty, '.');
      this.fallen.push({ tx, ty, back: W.CRUMBLE_RETURN });
      if (this.onFall) this.onFall(tx * L.tile + L.tile / 2, ty * L.tile + L.tile / 2);
    }
    const T = L.tile;
    this.fallen = this.fallen.filter((f) => {
      f.back -= dt;
      if (f.back > 0) return true;
      // Só volta se o Nilo não estiver ocupando o lugar.
      const p = player;
      if (p.x < (f.tx + 1) * T && p.x + p.w > f.tx * T && p.y < (f.ty + 1) * T && p.y + p.h > f.ty * T) return true;
      L.setTile(f.tx, f.ty, '%');
      return false;
    });
  }

  // Ao renascer num checkpoint, tudo volta ao lugar.
  reset() {
    for (const f of this.fallen) this.level.setTile(f.tx, f.ty, '%');
    this.fallen = [];
    this.level.shaking.clear();
  }
}

// ------------------------------------------------------------------
// Relógio da Praça (Cidade)
// ------------------------------------------------------------------
export class Clock {
  constructor(tx, ty, T) {
    this.x = tx * T + T / 2;
    this.base = (ty + 1) * T;
    this.time = 0;
    this.ring = 0; // segundos de animação depois de tocar
  }

  isNear(p) {
    return Math.abs(p.x + p.w / 2 - this.x) < W.CLOCK_REACH && p.y + p.h > this.base - 40 && p.y < this.base;
  }

  update(dt) {
    this.time += dt;
    this.ring = Math.max(0, this.ring - dt);
  }

  draw(ctx, cityState, highlight) {
    const x = Math.round(this.x);
    const b = this.base;
    const r = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px, b + py, w, h); };
    const sway = this.ring > 0 ? Math.round(Math.sin(this.time * 30) * 1) : 0;
    // Poste
    r(-2, -26, 4, 26, '#3a2c22');
    r(-5, -2, 10, 2, '#3a2c22');
    // Mostrador
    r(-8 + sway, -40, 16, 16, '#2e231c');
    r(-7 + sway, -39, 14, 14, cityState === 0 ? '#ffcf8a' : '#a8a8b8');
    // Ponteiros: apontam para cima (lembrado) ou para baixo (esquecido)
    r(-1 + sway, -33, 2, 2, '#2e231c');
    if (cityState === 0) r(-1 + sway, -38, 2, 6, '#2e231c');
    else r(-1 + sway, -33, 2, 6, '#2e231c');
    r(-1 + sway, -33, 5, 1, '#2e231c');
    if (highlight) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(this.time * 6);
      r(-9 + sway, -41, 18, 1, '#ffd98a');
      r(-9 + sway, -24, 18, 1, '#ffd98a');
      ctx.globalAlpha = 1;
    }
  }
}

// ------------------------------------------------------------------
// Eco Escondido: a estrela secreta de cada região
// ------------------------------------------------------------------
export class SecretEcho {
  constructor(tx, ty, T) {
    this.x = tx * T + T / 2;
    this.y = ty * T + T / 2;
    this.collected = false;
  }

  touches(b) {
    return b.x < this.x + 8 && b.x + b.w > this.x - 8 && b.y < this.y + 9 && b.y + b.h > this.y - 9;
  }

  draw(ctx, time) {
    if (this.collected) return;
    const x = Math.round(this.x);
    const y = Math.round(this.y + Math.sin(time * 2.2) * 2);
    ctx.globalAlpha = 0.18 + 0.1 * Math.sin(time * 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 8, y - 2, 17, 5);
    ctx.fillRect(x - 2, y - 8, 5, 17);
    ctx.globalAlpha = 1;
    // Estrela de 4 pontas, girando entre duas formas
    const big = Math.sin(time * 3) > 0;
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(x - 1, y - (big ? 6 : 5), 3, big ? 13 : 11);
    ctx.fillRect(x - (big ? 6 : 5), y - 1, big ? 13 : 11, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 2, y - 2, 5, 5);
    ctx.fillStyle = '#c7a6ff';
    ctx.fillRect(x, y, 1, 1);
  }
}

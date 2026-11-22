// CHEFE: Raiz Esquecida (Bosque dos Sussurros).
// Um toco enorme que já foi a Grande Árvore do Bosque. Esqueceu, e agora só sabe prender.
//
// Ataques (alternados, sempre com aviso):
//   'raizes'  — rachaduras brilham no chão; logo depois, raízes pontudas sobem ali.
//               Uma delas sempre mira o Nilo.
//   'varrida' — o toco treme e solta uma raiz que varre o chão da direita para a esquerda.
//               Pule por cima dela!
// Depois da varrida, a Raiz fica CANSADA: abaixa a copa e o botão de flor no topo se abre.
// Pise no botão. Com 1 de vida, mais raízes e uma varrida mais rápida.

import { CONFIG } from '../../config.js';
import { BossBase, spreadXs, boxHit } from './BossBase.js';

const R = CONFIG.BOSS.RAIZ;
const TALL = 46;
const LOW = 24;

export class RaizEsquecida extends BossBase {
  constructor(tx, ty, T, arena) {
    const w = 40;
    super({ name: 'Raiz Esquecida', w, h: TALL, hp: R.HEALTH, arena, x: tx * T + T / 2 - w / 2, y: (ty + 1) * T - TALL });
    this.bend = 0;      // 0 = de pé · 1 = abaixada (cansada)
    this.roots = [];    // { x, state: 'warn' | 'up', timer }
    this.sweep = null;  // { x } ponta da raiz que varre o chão
  }

  get floor() {
    return this.arena.floor;
  }

  // A caixa do chefe encolhe quando ele se abaixa.
  setBend(k) {
    this.bend = Math.max(0, Math.min(1, k));
    this.h = Math.round(TALL + (LOW - TALL) * this.bend);
    this.y = this.floor - this.h;
  }

  onDefeated() {
    this.roots = [];
    this.sweep = null;
  }

  think(dt, player) {
    switch (this.state) {
      case 'idle':
        this.setBend(this.bend - dt * 2);
        if (this.timer <= 0) this.nextPattern(player);
        break;
      case 'roots':
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 0.7; }
        break;
      case 'windup':
        if (this.timer <= 0) {
          this.state = 'sweep';
          this.sweep = { x: this.x - 6 };
          this.events.push({ type: 'charge' });
        }
        break;
      case 'sweep':
        this.sweep.x -= R.SWEEP_SPEED[this.phase] * dt;
        if (this.sweep.x <= this.arena.left) {
          this.sweep.x = this.arena.left;
          this.state = 'tired';
          this.timer = R.TIRED_TIME[this.phase];
          this.events.push({ type: 'crash' });
        }
        break;
      case 'tired':
        this.setBend(this.bend + dt * 4);
        if (this.timer <= 0) { this.state = 'recover'; this.timer = 0.6; }
        break;
      case 'hurt':
        if (this.timer <= 0) { this.state = 'recover'; this.timer = 0.6; }
        break;
      case 'recover':
        this.setBend(this.bend - dt * 2);
        if (this.sweep) {
          this.sweep.x += 400 * dt; // a raiz volta para o toco
          if (this.sweep.x >= this.x) this.sweep = null;
        }
        if (this.timer <= 0) { this.sweep = null; this.state = 'idle'; this.timer = 0.8; }
        break;
      default:
        break;
    }
  }

  nextPattern(player) {
    if (this.patternIndex++ % 2 === 0) {
      const xs = spreadXs({ ...this.arena, right: this.x - 8 }, player, R.ROOTS[this.phase], 30);
      this.roots = xs.map((x) => ({ x, state: 'warn', timer: R.ROOT_TELEGRAPH }));
      this.state = 'roots';
      this.timer = R.ROOT_TELEGRAPH + R.ROOT_UP + 0.3;
      this.events.push({ type: 'rumble' });
    } else {
      this.state = 'windup';
      this.timer = R.SWEEP_WINDUP[this.phase];
      this.events.push({ type: 'windup' });
    }
  }

  updateEffects(dt) {
    for (const r of this.roots) {
      r.timer -= dt;
      if (r.state === 'warn' && r.timer <= 0) {
        r.state = 'up';
        r.timer = R.ROOT_UP;
        this.events.push({ type: 'roots', x: r.x, y: this.floor });
      } else if (r.state === 'up' && r.timer <= 0) {
        r.state = 'gone';
      }
    }
    this.roots = this.roots.filter((r) => r.state !== 'gone');
  }

  hazardHits(p) {
    for (const r of this.roots) {
      if (r.state === 'up' && boxHit(p, r.x - 5, this.floor - 36, 10, 36)) return true;
    }
    if (this.state === 'sweep' && this.sweep && boxHit(p, this.sweep.x, this.floor - 10, 24, 10)) return true;
    return false;
  }

  drawEffects(ctx) {
    const f = this.floor;
    for (const r of this.roots) {
      const x = Math.round(r.x);
      if (r.state === 'warn') {
        const k = 1 - r.timer / R.ROOT_TELEGRAPH;
        const blink = Math.sin(this.time * 18) > 0 ? 1 : 0.6;
        ctx.globalAlpha = (0.08 + 0.12 * k) * blink;
        ctx.fillStyle = '#ffb84a';
        ctx.fillRect(x - 5, f - 40, 10, 40);
        ctx.globalAlpha = (0.6 + 0.4 * k) * blink;
        const w = Math.round(6 + k * 10);
        ctx.fillRect(x - w / 2, f - 2, w, 2);
        ctx.fillRect(x - 1, f - 4, 2, 2);
        ctx.globalAlpha = 1;
      } else {
        // Raiz pontuda subindo do chão
        const grow = Math.min(1, (R.ROOT_UP - r.timer) / 0.08);
        const h = Math.round(36 * grow);
        ctx.fillStyle = '#5a4030';
        ctx.fillRect(x - 4, f - h + 6, 8, h - 6);
        ctx.fillRect(x - 2, f - h + 2, 4, 4);
        ctx.fillRect(x - 1, f - h, 2, 2);
        ctx.fillStyle = '#7a5a40';
        ctx.fillRect(x - 4, f - h + 6, 2, h - 6);
        ctx.fillStyle = '#ff6fae';
        ctx.fillRect(x + 3, f - h + 14, 2, 1);
        ctx.fillRect(x - 6, f - h + 22, 2, 1);
      }
    }
    if (this.sweep) {
      // A raiz deitada no chão, do toco até a ponta
      const x0 = Math.round(this.sweep.x);
      const x1 = Math.round(this.x + 6);
      ctx.fillStyle = '#5a4030';
      ctx.fillRect(x0, f - 8, x1 - x0, 8);
      ctx.fillStyle = '#7a5a40';
      ctx.fillRect(x0, f - 8, x1 - x0, 2);
      for (let x = x0 + 10; x < x1; x += 14) {
        ctx.fillStyle = '#3a2a20';
        ctx.fillRect(x, f - 6, 1, 4);
      }
      // Ponta que varre: um nó com espinhos
      ctx.fillStyle = '#4a3428';
      ctx.fillRect(x0 - 2, f - 11, 12, 11);
      ctx.fillStyle = '#ff6fae';
      ctx.fillRect(x0 - 4, f - 9, 2, 1);
      ctx.fillRect(x0 - 3, f - 4, 2, 1);
    }
  }

  draw(ctx, withEffects = true) {
    if (withEffects) this.drawEffects(ctx);
    const t = this.time;
    let x = Math.round(this.x);
    const y = Math.round(this.y);
    if (this.state === 'windup') x += Math.sin(t * 50) > 0 ? 1 : -1;
    const r = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px, y + py, w, h); };
    const calm = this.defeated;
    const bark = calm ? '#6b4a3a' : '#5a5060';
    const barkDark = calm ? '#4a3128' : '#3a3444';
    const W = this.w;
    const H = this.h;

    // Raízes na base
    r(-6, H - 4, 10, 4, barkDark);
    r(W - 4, H - 4, 10, 4, barkDark);
    r(-2, H - 7, 6, 3, barkDark);
    // Tronco (encurta quando abaixado)
    r(2, 8, W - 4, H - 8, bark);
    r(0, 14, W, H - 18, bark);
    r(4, 10, 3, H - 14, barkDark);
    r(W - 10, 12, 2, H - 16, barkDark);
    // Copa seca (ou verde, lembrada)
    const crown = calm ? '#3fb59a' : '#6b6650';
    r(-4, 0, W + 8, 10, crown);
    r(2, -4, W - 4, 5, crown);
    if (calm) {
      for (let i = 0; i < 5; i++) r(2 + i * 8, -2 + (i % 2) * 6, 3, 3, '#ff9ad5');
    }
    // Rosto
    let eye = '#ffb84a';
    if (this.state === 'windup' || this.state === 'sweep') eye = '#ffffff';
    const fy = Math.min(H - 14, 18);
    if (calm) {
      r(9, fy, 4, 1, '#e8fdff');
      r(W - 13, fy, 4, 1, '#e8fdff');
    } else if (this.state === 'tired' || this.state === 'hurt') {
      r(9, fy, 4, 1, '#ffd98a');
      r(W - 13, fy, 4, 1, '#ffd98a');
    } else {
      r(9, fy - 1, 4, 3, eye);
      r(W - 13, fy - 1, 4, 3, eye);
    }
    r(W / 2 - 4, fy + 6, 8, 2, barkDark);

    // Botão de flor no topo: fechado; aberto (rosa, pulsando) quando cansada
    if (this.vulnerable) {
      const pulse = 0.6 + 0.4 * Math.sin(t * 10);
      ctx.globalAlpha = pulse;
      r(W / 2 - 9, -8, 18, 8, '#ff9ad5');
      ctx.globalAlpha = 1;
      r(W / 2 - 5, -6, 10, 5, '#ffd1f3');
      r(W / 2 - 1, -5, 2, 2, '#ffe48a');
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * 2.1;
        r(Math.round(W / 2 + Math.cos(a) * 14), Math.round(-12 + Math.sin(a) * 3), 2, 2, '#ffd98a');
      }
    } else {
      r(W / 2 - 3, -8, 6, 5, calm ? '#ff9ad5' : '#8a6a5a');
      r(W / 2 - 1, -10, 2, 2, calm ? '#ffd1f3' : '#6b5048');
    }
    this.drawFlash(ctx);
  }
}

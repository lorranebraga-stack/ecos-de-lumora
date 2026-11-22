// CHEFE FINAL: o Vulto (Santuário da Aurora).
// O último Guardião da Aurora. Escondeu o Coração para que Lumora esquecesse a Grande Queda.
//
// Ataques (sempre com aviso):
//   'mascara'  — lascas da máscara de cristal caem do alto; sombras no chão avisam onde.
//   'investida'— ele se curva e atravessa a arena rente ao chão (26 px). Pule por cima!
//   'sombras'  — (fase 2) chama dois Ecos Vazios, que seguem o Nilo por alguns segundos.
// Depois da investida, ele bate na parede e a máscara RACHA: ele se ajoelha.
// Pise na máscara. São 4 acertos; com 2 de vida, a fase 2 começa.

import { CONFIG } from '../../config.js';
import { BossBase, spreadXs, boxHit } from './BossBase.js';

const B = CONFIG.BOSS.VULTO;
const TALL = 40;
const KNEEL = 26;

export class VultoBoss extends BossBase {
  constructor(tx, ty, T, arena) {
    const w = 22;
    super({ name: 'O Vulto', w, h: TALL, hp: B.HEALTH, arena, x: tx * T + T / 2 - w / 2, y: (ty + 1) * T - TALL });
    this.shards = [];
    this.facing = -1;
  }

  get vulnerableState() {
    return 'cracked';
  }

  setKneel(k) {
    this.h = k ? KNEEL : TALL;
    this.y = this.arena.floor - this.h;
  }

  onDefeated() {
    this.shards = [];
    this.setKneel(true);
  }

  think(dt, player) {
    switch (this.state) {
      case 'idle':
        if (this.timer <= 0) this.nextPattern(player);
        break;
      case 'rain':
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 0.6; }
        break;
      case 'summon':
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 0.4; }
        break;
      case 'windup':
        if (this.timer <= 0) { this.state = 'dash'; this.events.push({ type: 'charge' }); }
        break;
      case 'dash': {
        this.x += this.facing * B.DASH_SPEED[this.phase] * dt;
        const a = this.arena;
        const hitLeft = this.facing < 0 && this.x <= a.left;
        const hitRight = this.facing > 0 && this.x + this.w >= a.right;
        if (hitLeft || hitRight) {
          this.x = hitLeft ? a.left : a.right - this.w;
          this.state = 'cracked';
          this.setKneel(true);
          this.timer = B.CRACKED_TIME[this.phase];
          this.events.push({ type: 'crash' });
        }
        break;
      }
      case 'cracked':
        if (this.timer <= 0) { this.setKneel(false); this.state = 'idle'; this.timer = 0.8; }
        break;
      case 'hurt':
        if (this.timer <= 0) { this.setKneel(false); this.state = 'idle'; this.timer = 1; }
        break;
      default:
        break;
    }
  }

  nextPattern(player) {
    const order = this.phase ? ['mascara', 'sombras', 'investida'] : ['mascara', 'investida'];
    const pattern = order[this.patternIndex++ % order.length];
    if (pattern === 'mascara') {
      const xs = spreadXs(this.arena, player, B.SHARDS[this.phase], 32);
      for (const x of xs) this.shards.push({ x, y: this.arena.ceiling, state: 'warn', timer: B.MASK_TELEGRAPH });
      this.state = 'rain';
      this.timer = B.MASK_TELEGRAPH + 1.3;
      this.events.push({ type: 'rain' });
    } else if (pattern === 'sombras') {
      const a = this.arena;
      this.events.push({ type: 'summon', x: a.left + 24, y: a.floor });
      this.events.push({ type: 'summon', x: a.right - 40, y: a.floor });
      this.state = 'summon';
      this.timer = 1;
    } else {
      // Investe na direção do Nilo, a partir do lado em que está.
      const mid = (this.arena.left + this.arena.right) / 2;
      this.facing = this.x + this.w / 2 > mid ? -1 : 1;
      this.setKneel(true); // curvado: passa rente ao chão (dá para pular por cima)
      this.state = 'windup';
      this.timer = 0.8;
      this.events.push({ type: 'windup' });
    }
  }

  updateEffects(dt) {
    for (const s of this.shards) {
      if (s.state === 'warn') {
        s.timer -= dt;
        if (s.timer <= 0) s.state = 'fall';
      } else if (s.state === 'fall') {
        s.y += B.SHARD_SPEED * dt;
        if (s.y + 12 >= this.arena.floor) {
          s.state = 'gone';
          this.events.push({ type: 'shatter', x: s.x, y: this.arena.floor });
        }
      }
    }
    this.shards = this.shards.filter((s) => s.state !== 'gone');
  }

  hazardHits(p) {
    return this.shards.some((s) => s.state === 'fall' && boxHit(p, s.x - 3, s.y, 6, 12));
  }

  drawEffects(ctx) {
    const a = this.arena;
    for (const s of this.shards) {
      const x = Math.round(s.x);
      if (s.state === 'warn') {
        const k = 1 - s.timer / B.MASK_TELEGRAPH;
        const blink = Math.sin(this.time * 18) > 0 ? 1 : 0.6;
        ctx.globalAlpha = (0.08 + 0.14 * k) * blink;
        ctx.fillStyle = '#b48cff';
        ctx.fillRect(x - 4, a.ceiling, 8, a.floor - a.ceiling);
        ctx.globalAlpha = (0.55 + 0.45 * k) * blink;
        const w = Math.round(6 + k * 10);
        ctx.fillRect(x - w / 2, a.floor - 3, w, 3);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = '#cfe9ff';
        ctx.fillRect(x - 3, Math.round(s.y), 6, 9);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, Math.round(s.y), 2, 12);
      }
    }
  }

  draw(ctx, withEffects = true) {
    if (withEffects) this.drawEffects(ctx);
    const t = this.time;
    let x = Math.round(this.x + this.w / 2);
    const b = Math.round(this.y + this.h);
    if (this.state === 'windup') x += Math.sin(t * 50) > 0 ? 1 : -1;
    const calm = this.defeated;
    const r = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px, b + py, w, h); };
    const H = this.h;
    const body = calm ? '#3a3266' : '#141022';
    // Rastro na investida
    if (this.state === 'dash') {
      ctx.globalAlpha = 0.35;
      r(-this.facing * 18 - 6, -H + 8, 12, H - 10, '#2a2040');
      ctx.globalAlpha = 1;
    }
    // Corpo de névoa
    for (let i = -9; i < 9; i++) {
      const ragged = Math.round(Math.sin(t * 2 + i * 1.3) * 2);
      const top = i < -7 || i > 6 ? -H + 6 : -H + 2;
      r(i, top, 1, -top - 2 + ragged, body);
    }
    r(-10, -H + 5, 20, 4, body);
    // Máscara (racha quando ele se ajoelha)
    const my = -H;
    r(-4, my, 9, 10, calm ? '#ffe0b0' : '#cfe9ff');
    r(-3, my - 1, 7, 1, calm ? '#ffe0b0' : '#cfe9ff');
    r(0, my, 1, 5, '#5f596b');
    r(1, my + 5, 1, 5, '#5f596b');
    if (this.vulnerable || this.state === 'hurt') {
      r(-3, my + 2, 1, 6, '#b48cff');
      r(3, my + 1, 1, 7, '#b48cff');
      const pulse = 0.6 + 0.4 * Math.sin(t * 10);
      ctx.globalAlpha = pulse;
      r(-7, my - 4, 15, 5, '#b48cff');
      ctx.globalAlpha = 1;
    }
    // Olhos
    const eyeA = calm ? 1 : 0.6 + 0.4 * Math.sin(t * 2);
    ctx.globalAlpha = eyeA;
    const eye = calm ? '#ffd98a' : (this.state === 'windup' || this.state === 'dash' ? '#ffffff' : '#b48cff');
    r(-3, my + 4, 2, 1, eye);
    r(2, my + 4, 2, 1, eye);
    ctx.globalAlpha = 1;
    this.drawFlash(ctx);
  }
}

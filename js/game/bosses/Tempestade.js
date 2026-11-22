// CHEFE: Tempestade Sem Nome (Arquipélago Suspenso).
// Uma nuvem de tempestade que esqueceu o próprio nome e, com ele, o rumo.
//
// Ataques (sempre com aviso):
//   'raios'    — colunas de luz piscam onde os raios vão cair; um mira o Nilo.
//   'ventania' — ela incha e sopra a arena inteira para um lado. Corra contra o vento
//                (nas bordas da arena há espinhos).
// Depois da ventania, ela fica sem fôlego, DESCE e o núcleo (uma estrela) aparece no topo.
// Pise no núcleo. Com 1 de vida, mais raios.

import { CONFIG } from '../../config.js';
import { BossBase, spreadXs, boxHit } from './BossBase.js';

const B = CONFIG.BOSS.TEMPESTADE;
const STRIKE = 0.25; // duração do raio (o perigo de verdade)

export class Tempestade extends BossBase {
  constructor(tx, ty, T, arena) {
    const w = 48;
    const h = 22;
    super({ name: 'Tempestade Sem Nome', w, h, hp: B.HEALTH, arena, x: tx * T + T / 2 - w / 2, y: arena.ceiling + 22 });
    this.highY = arena.ceiling + 22;
    this.lowY = arena.floor - 34;
    this.bolts = [];   // { x, state: 'warn' | 'strike', timer }
    this.gustDir = 0;  // direção da ventania ativa (-1, 0, 1)
  }

  get vulnerableState() {
    return 'tired';
  }

  get harmless() {
    return !['idle', 'bolts', 'windup', 'gust'].includes(this.state);
  }

  onDefeated() {
    this.bolts = [];
    this.gustDir = 0;
  }

  think(dt, player) {
    const a = this.arena;
    const followX = (speed) => {
      const target = Math.max(a.left + 8, Math.min(a.right - this.w - 8, player.x + player.w / 2 - this.w / 2));
      this.x += Math.max(-speed * dt, Math.min(speed * dt, target - this.x));
    };
    switch (this.state) {
      case 'idle':
        followX(45);
        if (this.timer <= 0) this.nextPattern(player);
        break;
      case 'bolts':
        followX(20);
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 0.7; }
        break;
      case 'windup':
        if (this.timer <= 0) {
          this.state = 'gust';
          this.timer = B.GUST_TIME;
          this.events.push({ type: 'gust' });
        }
        break;
      case 'gust':
        if (this.timer <= 0) {
          this.gustDir = 0;
          this.state = 'descend';
        }
        break;
      case 'descend':
        this.y = Math.min(this.lowY, this.y + 160 * dt);
        if (this.y >= this.lowY) {
          this.state = 'tired';
          this.timer = B.LOW_TIME[this.phase];
          this.events.push({ type: 'crash' });
        }
        break;
      case 'tired':
        break;
      case 'hurt':
        if (this.timer <= 0) this.state = 'rise';
        break;
      default:
        break;
    }
    if (this.state === 'tired' && this.timer <= 0) this.state = 'rise';
    if (this.state === 'rise') {
      this.y = Math.max(this.highY, this.y - 120 * dt);
      if (this.y <= this.highY) { this.state = 'idle'; this.timer = 0.9; }
    }
  }

  nextPattern(player) {
    if (this.patternIndex++ % 2 === 0) {
      const xs = spreadXs(this.arena, player, B.BOLTS[this.phase], 36, 40);
      this.bolts = xs.map((x) => ({ x, state: 'warn', timer: B.BOLT_TELEGRAPH }));
      this.state = 'bolts';
      this.timer = B.BOLT_TELEGRAPH + STRIKE + 0.5;
      this.events.push({ type: 'thunderwarn' });
    } else {
      // Sopra para o lado em que há MAIS espaço atrás do Nilo (empurra-o para a borda mais longe).
      const mid = (this.arena.left + this.arena.right) / 2;
      this.gustDir = player.x < mid ? 1 : -1;
      this.state = 'windup';
      this.timer = 0.9;
      this.events.push({ type: 'inhale' });
    }
  }

  updateEffects(dt) {
    for (const b of this.bolts) {
      b.timer -= dt;
      if (b.state === 'warn' && b.timer <= 0) {
        b.state = 'strike';
        b.timer = STRIKE;
        this.events.push({ type: 'thunder', x: b.x, y: this.arena.floor });
      } else if (b.state === 'strike' && b.timer <= 0) {
        b.state = 'gone';
      }
    }
    this.bolts = this.bolts.filter((b) => b.state !== 'gone');
  }

  hazardHits(p) {
    const a = this.arena;
    return this.bolts.some((b) => b.state === 'strike' && boxHit(p, b.x - 5, a.ceiling, 10, a.floor - a.ceiling));
  }

  // Força da ventania sobre o Nilo (px/s).
  windAt() {
    return this.state === 'gust' ? this.gustDir * B.GUST_FORCE : 0;
  }

  drawEffects(ctx) {
    const a = this.arena;
    for (const b of this.bolts) {
      const x = Math.round(b.x);
      if (b.state === 'warn') {
        const k = 1 - b.timer / B.BOLT_TELEGRAPH;
        const blink = Math.sin(this.time * 18) > 0 ? 1 : 0.55;
        ctx.globalAlpha = (0.08 + 0.15 * k) * blink;
        ctx.fillStyle = '#fff3b0';
        ctx.fillRect(x - 5, a.ceiling, 10, a.floor - a.ceiling);
        ctx.globalAlpha = (0.55 + 0.45 * k) * blink;
        const w = Math.round(6 + k * 12);
        ctx.fillRect(x - w / 2, a.floor - 3, w, 3);
        ctx.globalAlpha = 1;
      } else {
        // Raio em zigue-zague
        ctx.fillStyle = '#ffffff';
        let cx = x;
        for (let y = a.ceiling; y < a.floor; y += 12) {
          const nx = x + Math.round(Math.sin(y * 0.7 + this.time * 40) * 4);
          ctx.fillRect(Math.min(cx, nx) - 1, y, Math.abs(nx - cx) + 3, 12);
          cx = nx;
        }
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#fff3b0';
        ctx.fillRect(x - 7, a.ceiling, 14, a.floor - a.ceiling);
        ctx.globalAlpha = 1;
      }
    }
    if (this.state === 'gust') {
      // Linhas de vento atravessando a arena
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 14; i++) {
        const len = 14 + (i % 3) * 8;
        const span = a.right - a.left;
        const off = (((this.time * 260 * this.gustDir + i * 53) % span) + span) % span;
        ctx.fillRect(Math.round(a.left + off), Math.round(a.ceiling + 30 + ((i * 37) % (a.floor - a.ceiling - 40))), len, 1);
      }
      ctx.globalAlpha = 1;
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
    const body = calm ? '#ffffff' : '#4a4466';
    const dark = calm ? '#ffe0b0' : '#2a2640';
    const swell = this.state === 'windup' ? 3 : 0;
    // Corpo de nuvem: bolhas sobrepostas
    r(-2 - swell, 6 - swell, this.w + 4 + swell * 2, 14 + swell, body);
    r(6, -2 - swell, 16, 10, body);
    r(22, -5 - swell, 18, 12, body);
    r(-2, 18, this.w + 4, 4, dark);
    // Chuva embaixo (menos quando cansada)
    if (!calm) {
      ctx.fillStyle = '#8fd1ff';
      ctx.globalAlpha = this.state === 'tired' ? 0.2 : 0.55;
      for (let i = 0; i < 8; i++) {
        const dy = Math.round((t * 120 + i * 13) % 24);
        ctx.fillRect(x + 3 + i * 6, y + 22 + dy, 1, 3);
      }
      ctx.globalAlpha = 1;
    }
    // Olhos
    if (calm) {
      r(14, 10, 4, 1, '#6a4a5e');
      r(30, 10, 4, 1, '#6a4a5e');
    } else if (this.state === 'tired' || this.state === 'hurt') {
      r(14, 10, 4, 1, '#ffd98a');
      r(30, 10, 4, 1, '#ffd98a');
    } else {
      const eye = this.state === 'windup' || this.state === 'gust' ? '#ffffff' : '#fff3b0';
      r(14, 9, 4, 3, eye);
      r(30, 9, 4, 3, eye);
    }
    if (this.state === 'gust' || this.state === 'windup') r(this.gustDir > 0 ? 40 : 4, 13, 4, 3, dark);
    // Núcleo (estrela) aparece no topo quando cansada
    if (this.vulnerable) {
      const pulse = 0.6 + 0.4 * Math.sin(t * 10);
      ctx.globalAlpha = pulse;
      r(this.w / 2 - 8, -6, 16, 8, '#fff3b0');
      ctx.globalAlpha = 1;
      r(this.w / 2 - 1, -7, 3, 9, '#ffd98a');
      r(this.w / 2 - 4, -4, 9, 3, '#ffd98a');
      r(this.w / 2, -3, 1, 1, '#ffffff');
    }
    // Faíscas elétricas em volta
    if (!calm && Math.sin(t * 7) > 0.85) r(Math.round((t * 97) % this.w), -3, 1, 4, '#fff3b0');
    this.drawFlash(ctx);
  }
}

// CHEFE: O Arquivista (Cidade Sem Memória).
// O guardião dos registros da cidade. Arquivou tantas lembranças que esqueceu de lê-las.
//
// Ataques (sempre com aviso):
//   'paginas' — o livro brilha; páginas voam pela arena, umas baixas (pule por cima)
//               e outras altas (passe por baixo, andando).
//   'sino'    — ele ergue o sino: os prédios piscam e, um segundo depois, a cidade
//               troca de estado (lembrado ↔ esquecido). Saia dos prédios que piscam!
// Depois do sino, ele para para RELER o livro (cabeça baixa): pise na cabeça dele.

import { CONFIG } from '../../config.js';
import { BossBase, boxHit } from './BossBase.js';

const B = CONFIG.BOSS.ARQUIVISTA;
const TALL = 48;
const LOW = 30;
const TOGGLE_WARN = 1.1;

export class Arquivista extends BossBase {
  constructor(tx, ty, T, arena) {
    const w = 30;
    super({ name: 'O Arquivista', w, h: TALL, hp: B.HEALTH, arena, x: tx * T + T / 2 - w / 2, y: (ty + 1) * T - TALL });
    this.pages = [];    // { x, y, state: 'warn' | 'fly', timer }
    this.toPlace = [];  // páginas esperando a vez de sair
  }

  get vulnerableState() {
    return 'reading';
  }

  setLow(low) {
    this.h = low ? LOW : TALL;
    this.y = this.arena.floor - this.h;
  }

  onDefeated() {
    this.pages = [];
    this.toPlace = [];
    this.setLow(false);
  }

  think(dt) {
    switch (this.state) {
      case 'idle':
        if (this.timer <= 0) this.nextPattern();
        break;
      case 'pages':
        if (this.toPlace.length && this.timer <= this.toPlace[0].at) {
          const p = this.toPlace.shift();
          this.pages.push({ x: this.x - 4, y: p.y, state: 'fly' });
          this.events.push({ type: 'page' });
        }
        if (!this.toPlace.length && this.pages.length === 0) { this.state = 'idle'; this.timer = 0.6; }
        break;
      case 'bell':
        if (this.timer <= 0) {
          this.events.push({ type: 'toggle' });
          this.state = 'reading';
          this.setLow(true);
          this.timer = B.READ_TIME[this.phase];
        }
        break;
      case 'reading':
        if (this.timer <= 0) { this.setLow(false); this.state = 'idle'; this.timer = 0.9; }
        break;
      case 'hurt':
        if (this.timer <= 0) { this.setLow(false); this.state = 'idle'; this.timer = 1; }
        break;
      default:
        break;
    }
  }

  nextPattern() {
    if (this.patternIndex++ % 2 === 0) {
      // Páginas alternando baixa / alta, com intervalo para dar tempo de reagir.
      const f = this.arena.floor;
      const n = B.PAGES[this.phase];
      const gap = this.phase ? 0.55 : 0.7;
      this.toPlace = [];
      for (let i = 0; i < n; i++) {
        const low = i % 2 === 0;
        this.toPlace.push({ y: low ? f - 9 : f - 34, at: -(B.PAGE_WARN + i * gap) });
      }
      this.state = 'pages';
      this.timer = 0;
      this.events.push({ type: 'shardwarn' });
    } else {
      this.state = 'bell';
      this.timer = TOGGLE_WARN;
      this.events.push({ type: 'togglewarn' });
    }
  }

  updateEffects(dt) {
    const speed = B.PAGE_SPEED[this.phase];
    for (const p of this.pages) {
      p.x -= speed * dt;
      if (p.x < this.arena.left - 12) p.state = 'gone';
    }
    this.pages = this.pages.filter((p) => p.state !== 'gone');
  }

  hazardHits(pl) {
    return this.pages.some((p) => boxHit(pl, p.x, p.y, 12, 8));
  }

  drawEffects(ctx) {
    for (const p of this.pages) {
      const x = Math.round(p.x);
      const y = Math.round(p.y + Math.sin(this.time * 12 + p.x * 0.1) * 1);
      ctx.fillStyle = '#e8d6c0';
      ctx.fillRect(x, y, 12, 8);
      ctx.fillStyle = '#a8806a';
      ctx.fillRect(x + 2, y + 2, 8, 1);
      ctx.fillRect(x + 2, y + 4, 6, 1);
      ctx.fillStyle = '#ff8a6a';
      ctx.fillRect(x + 11, y, 1, 8);
    }
    // Aviso das páginas: o livro brilha e mostra as alturas que vêm
    if (this.state === 'pages' && this.toPlace.length) {
      const next = this.toPlace[0];
      const blink = Math.sin(this.time * 18) > 0 ? 0.5 : 0.25;
      ctx.globalAlpha = blink;
      ctx.fillStyle = '#ffcf8a';
      ctx.fillRect(Math.round(this.arena.left), Math.round(next.y + 3), Math.round(this.x - this.arena.left), 2);
      ctx.globalAlpha = 1;
    }
  }

  draw(ctx, withEffects = true) {
    if (withEffects) this.drawEffects(ctx);
    const t = this.time;
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const r = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px, y + py, w, h); };
    const calm = this.defeated;
    const coat = calm ? '#7a4a5a' : '#4a3a40';
    const coatDark = calm ? '#5a3040' : '#2e231c';
    const H = this.h;
    // Corpo: um casaco comprido de estante, com gavetas
    r(2, 12, 26, H - 12, coat);
    r(0, H - 4, 30, 4, coatDark);
    for (let i = 0; i < 3; i++) {
      const gy = 16 + i * Math.floor((H - 20) / 3);
      r(5, gy, 20, 1, coatDark);
      r(14, gy + 3, 2, 2, '#c99a78');
    }
    // Cabeça: uma luminária com óculos
    const headY = 0;
    r(5, headY, 20, 12, calm ? '#c99a78' : '#8a7a6a');
    r(3, headY - 2, 24, 3, coatDark);
    const reading = this.state === 'reading' || this.state === 'hurt';
    if (calm) {
      r(8, headY + 6, 5, 1, '#2e231c');
      r(17, headY + 6, 5, 1, '#2e231c');
    } else if (reading) {
      r(8, headY + 7, 5, 2, '#ffcf8a');
      r(17, headY + 7, 5, 2, '#ffcf8a');
    } else {
      r(8, headY + 4, 5, 4, '#ffcf8a');
      r(17, headY + 4, 5, 4, '#ffcf8a');
      r(13, headY + 5, 4, 1, coatDark);
    }
    // Livro (ou sino) nas mãos
    if (this.state === 'bell') {
      const ring = Math.sin(t * 30) > 0 ? 1 : -1;
      r(-6 + ring, -10, 8, 8, '#ffcf8a');
      r(-4 + ring, -2, 4, 2, '#a8806a');
    } else {
      const glow = this.state === 'pages' ? 0.6 + 0.4 * Math.sin(t * 14) : 0;
      r(-6, 18, 10, 12, '#c96a5a');
      r(-5, 19, 8, 10, '#e8d6c0');
      if (glow) {
        ctx.globalAlpha = glow;
        r(-8, 16, 14, 16, '#ffcf8a');
        ctx.globalAlpha = 1;
      }
    }
    // Ponto fraco: a "chama de leitura" no alto da cabeça, quando ele relê
    if (this.vulnerable) {
      const pulse = 0.6 + 0.4 * Math.sin(t * 10);
      ctx.globalAlpha = pulse;
      r(7, -8, 16, 8, '#ff8a6a');
      ctx.globalAlpha = 1;
      r(11, -6, 8, 5, '#ffcf8a');
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * 2.1;
        r(Math.round(15 + Math.cos(a) * 13), Math.round(-12 + Math.sin(a) * 3), 2, 2, '#ffd98a');
      }
    }
    this.drawFlash(ctx);
  }
}

export const ARQUIVISTA_TOGGLE_WARN = TOGGLE_WARN;

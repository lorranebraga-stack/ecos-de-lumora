// Base dos chefes: o que todos têm em comum.
//
// Regras de todo chefe de Ecos de Lumora:
//   - Todo ataque tem um AVISO antes (o jogo é justo).
//   - Depois de um ataque, o chefe fica CANSADO por alguns segundos: é a hora de pisar nele.
//   - Com pouca vida, ele entra na "fase 2" (mais rápido, mais ataques).
//   - Derrotado, ele LEMBRA quem era e se acalma (ninguém morre em Lumora).
//
// A cena (LevelScene) só usa esta interface:
//   name, hp, maxHp, x, y, w, h, state, events[]
//   start() · update(dt, player) · hit() · overlaps(b) · isStompedBy(b)
//   vulnerable · harmless · defeated · hazardHits(b) · windAt(b)
//   draw(ctx) · drawEffects(ctx)  (ataques espalhados pela arena)
//
// arena: { start, left, right, ceiling, floor } em pixels (veja LevelScene.setupBoss)

export class BossBase {
  constructor({ name, w, h, hp, arena, x, y }) {
    this.name = name;
    this.w = w;
    this.h = h;
    this.arena = arena;
    this.homeX = x;
    this.homeY = y;
    this.x = x;
    this.y = y;
    this.maxHp = hp;
    this.hp = hp;
    this.state = 'sleep';
    this.timer = 0;
    this.patternIndex = 0;
    this.flash = 0;
    this.time = 0;
    this.events = [];
  }

  // Fase 2 quando resta 1 de vida (ou menos da metade, para chefes com mais vida).
  get phase() {
    return this.hp <= Math.max(1, Math.floor(this.maxHp / 2)) ? 1 : 0;
  }

  // Estado em que o chefe pode levar dano (cada chefe diz qual é).
  get vulnerableState() {
    return 'tired';
  }

  get vulnerable() {
    return this.state === this.vulnerableState;
  }

  get defeated() {
    return this.state === 'defeated';
  }

  get harmless() {
    return ['sleep', this.vulnerableState, 'hurt', 'defeated'].includes(this.state);
  }

  start() {
    this.state = 'idle';
    this.timer = 1.2;
    this.events.push({ type: 'roar' });
  }

  overlaps(b) {
    return b.x < this.x + this.w && b.x + b.w > this.x && b.y < this.y + this.h && b.y + b.h > this.y;
  }

  isStompedBy(b) {
    return b.vy > 0 && b.y + b.h - this.y < 10;
  }

  hit() {
    if (!this.vulnerable) return false;
    this.hp--;
    this.flash = 0.5;
    if (this.hp <= 0) {
      this.state = 'defeated';
      this.onDefeated();
      this.events.push({ type: 'defeated' });
    } else {
      this.state = 'hurt';
      this.timer = 0.6;
      this.events.push({ type: 'hurt' });
    }
    return true;
  }

  // Limpa ataques em andamento ao ser derrotado.
  onDefeated() {}

  hazardHits() {
    return false;
  }

  windAt() {
    return 0;
  }

  update(dt, player) {
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.updateEffects(dt, player);
    if (this.state === 'sleep' || this.state === 'defeated') return;
    this.timer -= dt;
    this.think(dt, player);
  }

  updateEffects() {}

  think() {}

  drawEffects() {}

  // Brilho branco ao levar dano (desenhado por cima do corpo).
  drawFlash(ctx) {
    if (this.flash > 0 && Math.floor(this.flash * 20) % 2 === 0) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(this.x), Math.round(this.y), this.w, this.h);
      ctx.globalAlpha = 1;
    }
  }
}

// Escolhe até "count" posições x espalhadas na arena; a primeira mira o Nilo.
export function spreadXs(arena, player, count, minGap = 34, margin = 12) {
  const xs = [Math.max(arena.left + margin, Math.min(arena.right - margin, player.x + player.w / 2))];
  let tries = 0;
  while (xs.length < count && tries++ < 120) {
    const x = arena.left + margin + Math.random() * (arena.right - arena.left - margin * 2);
    if (xs.every((o) => Math.abs(o - x) > minGap)) xs.push(x);
  }
  return xs;
}

export function boxHit(b, x, y, w, h) {
  return b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y;
}

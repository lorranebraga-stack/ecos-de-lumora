// CHEFE: Matriarca de Quartzo (Minas de Cristal).
//
// Ela alterna PADRÕES DE ATAQUE, sempre com um aviso antes:
//   'chuva'    — sombras no chão marcam onde cristais vão cair do teto.
//   'investida'— ela treme e avança pela arena até bater na parede da esquerda.
// Ao bater na parede, fica TONTA: o núcleo rosa no topo aparece.
// Só pisando no núcleo, enquanto ela está tonta, dá para causar dano.
// Com 1 de vida (fase 2) ela fica mais rápida e a chuva tem mais cristais.
//
// Estados: sleep → idle → (rain | windup → charge → dizzy) → return → idle ...
//          hurt (brilha, recua) · defeated (lembra quem era e se acalma)
//
// A cena lê "events" (sons e impactos) e decide o que fazer com eles.
// Para criar outro chefe: copie a estrutura, troque os padrões em nextPattern().

import { CONFIG } from '../config.js';

const B = CONFIG.BOSS.MATRIARCA;

export class Matriarca {
  // arena: { left, right, floor, ceiling } em pixels
  constructor(tx, ty, T, arena) {
    this.name = 'Matriarca de Quartzo';
    this.w = 36;
    this.h = 34;
    this.arena = arena;
    this.homeX = tx * T + T / 2 - this.w / 2;
    this.x = this.homeX;
    this.y = (ty + 1) * T - this.h;
    this.maxHp = B.HEALTH;
    this.hp = B.HEALTH;
    this.state = 'sleep';
    this.timer = 0;
    this.patternIndex = 0;
    this.facing = -1;
    this.flash = 0;
    this.time = 0;
    this.shards = [];
    this.events = [];
    this.effects3d = 'shards'; // no 3D, os cristais dela são objetos 3D (Renderer3D.buildShards)
  }

  get phase() {
    return this.hp <= 1 ? 1 : 0;
  }

  get vulnerable() {
    return this.state === 'dizzy';
  }

  get defeated() {
    return this.state === 'defeated';
  }

  // Encostar machuca? Não quando tonta, ferida ou derrotada.
  get harmless() {
    return ['sleep', 'dizzy', 'hurt', 'defeated'].includes(this.state);
  }

  start() {
    this.state = 'idle';
    this.timer = 1.2;
    this.events.push({ type: 'roar' });
  }

  overlaps(b) {
    return b.x < this.x + this.w && b.x + b.w > this.x && b.y < this.y + this.h && b.y + b.h > this.y;
  }

  // Pisão: caindo, com os pés na parte de cima (onde fica o núcleo).
  isStompedBy(b) {
    return b.vy > 0 && b.y + b.h - this.y < 10;
  }

  // Tenta causar dano. Retorna true se acertou.
  hit() {
    if (!this.vulnerable) return false;
    this.hp--;
    this.flash = 0.5;
    if (this.hp <= 0) {
      this.state = 'defeated';
      this.shards = [];
      this.events.push({ type: 'defeated' });
    } else {
      this.state = 'hurt';
      this.timer = 0.6;
      this.events.push({ type: 'hurt' });
    }
    return true;
  }

  nextPattern(player) {
    const pattern = this.patternIndex++ % 2 === 0 ? 'chuva' : 'investida';
    if (pattern === 'chuva') this.startRain(player);
    else {
      this.state = 'windup';
      this.timer = B.CHARGE_WINDUP[this.phase];
      this.events.push({ type: 'windup' });
    }
  }

  startRain(player) {
    const a = this.arena;
    const count = B.SHARDS[this.phase];
    const xs = [player.x + player.w / 2]; // um cristal sempre mira o Nilo
    let tries = 0;
    while (xs.length < count && tries++ < 100) {
      const x = a.left + 12 + Math.random() * (a.right - a.left - 24);
      if (xs.every((o) => Math.abs(o - x) > 34)) xs.push(x);
    }
    for (const x of xs) {
      this.shards.push({ x: Math.max(a.left + 6, Math.min(a.right - 6, x)), y: a.ceiling, state: 'warn', timer: B.SHARD_TELEGRAPH });
    }
    this.state = 'rain';
    this.timer = B.SHARD_TELEGRAPH + 1.3;
    this.events.push({ type: 'rain' });
  }

  update(dt, player) {
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.updateShards(dt);
    if (this.state === 'sleep' || this.state === 'defeated') return;
    this.timer -= dt;

    switch (this.state) {
      case 'idle':
        if (this.timer <= 0) this.nextPattern(player);
        break;
      case 'rain':
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 0.6; }
        break;
      case 'windup':
        if (this.timer <= 0) { this.state = 'charge'; this.events.push({ type: 'charge' }); }
        break;
      case 'charge':
        this.x -= B.CHARGE_SPEED[this.phase] * dt;
        if (this.x <= this.arena.left) {
          this.x = this.arena.left;
          this.state = 'dizzy';
          this.timer = B.DIZZY_TIME[this.phase];
          this.events.push({ type: 'crash' });
        }
        break;
      case 'dizzy':
        if (this.timer <= 0) this.state = 'return';
        break;
      case 'hurt':
        if (this.timer <= 0) this.state = 'return';
        break;
      case 'return':
        this.x = Math.min(this.homeX, this.x + 90 * dt);
        if (this.x >= this.homeX) { this.state = 'idle'; this.timer = 0.9; }
        break;
      default:
        break;
    }
  }

  updateShards(dt) {
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

  windAt() {
    return 0;
  }

  // Interface comum dos chefes (veja bosses/BossBase.js)
  hazardHits(p) {
    return this.shardHits(p);
  }

  drawEffects(ctx) {
    this.drawShards(ctx);
  }

  // Algum cristal caindo acertou o Nilo?
  shardHits(p) {
    return this.shards.some((s) => s.state === 'fall'
      && p.x < s.x + 3 && p.x + p.w > s.x - 3 && p.y < s.y + 12 && p.y + p.h > s.y);
  }

  // withShards = false: só o corpo (o modo 3D desenha os cristais como objetos 3D).
  draw(ctx, withShards = true) {
    if (withShards) this.drawShards(ctx);
    const t = this.time;
    let x = Math.round(this.x);
    const y = Math.round(this.y);
    if (this.state === 'windup') x += Math.sin(t * 50) > 0 ? 1 : -1;
    const r = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px, y + py, w, h); };
    const calm = this.defeated;
    const body = calm ? '#2c4f7a' : '#2a2148';
    const spire1 = calm ? '#8ff7ff' : '#8fd1ff';
    const spire2 = calm ? '#c7e6ff' : '#ff8fe0';

    // Rastro de velocidade na investida
    if (this.state === 'charge') {
      ctx.globalAlpha = 0.35;
      r(this.w, 10, 14, 2, spire1);
      r(this.w + 4, 20, 10, 2, spire1);
      ctx.globalAlpha = 1;
    }

    // Cristais nas costas (mais altos atrás)
    r(22, -10, 5, 14, spire1);
    r(28, -4, 4, 10, spire2);
    r(14, -6, 4, 10, spire2);
    r(23, -12, 3, 2, '#ffffff');

    // Corpo
    r(0, 6, this.w, this.h - 6, body);
    r(3, 2, this.w - 6, 4, body);
    r(0, this.h - 3, this.w, 3, '#140f26');
    // Patas
    r(2, this.h - 2, 6, 2, '#140f26');
    r(this.w - 8, this.h - 2, 6, 2, '#140f26');

    // Rosto (olhando para a esquerda, onde fica a arena)
    r(2, 12, 14, 12, calm ? '#3a5fa0' : '#3a3266');
    let eye = '#ff8fe0';
    if (this.state === 'windup' || this.state === 'charge') eye = '#ffffff';
    if (calm) {
      r(4, 17, 3, 1, '#e8fdff');
      r(10, 17, 3, 1, '#e8fdff');
    } else if (this.state === 'dizzy') {
      r(4, 16, 3, 1, '#ffd98a');
      r(5, 17, 1, 1, '#ffd98a');
      r(10, 16, 3, 1, '#ffd98a');
      r(11, 17, 1, 1, '#ffd98a');
    } else {
      r(4, 16, 3, 2, eye);
      r(10, 16, 3, 2, eye);
    }

    // Núcleo no topo: só aparece quando ela está tonta (o ponto fraco)
    if (this.vulnerable) {
      const pulse = 0.6 + 0.4 * Math.sin(t * 10);
      ctx.globalAlpha = pulse;
      r(8, -2, 14, 8, '#ff8fe0');
      ctx.globalAlpha = 1;
      r(11, 0, 8, 5, '#ffd1f3');
      // Estrelinhas de tontura
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * 2.1;
        r(Math.round(15 + Math.cos(a) * 14), Math.round(-8 + Math.sin(a) * 3), 2, 2, '#ffd98a');
      }
    }

    // Brilho branco ao levar dano
    if (this.flash > 0 && Math.floor(this.flash * 20) % 2 === 0) {
      ctx.globalAlpha = 0.7;
      r(0, 2, this.w, this.h - 2, '#ffffff');
      ctx.globalAlpha = 1;
    }
  }

  drawShards(ctx) {
    for (const s of this.shards) {
      const x = Math.round(s.x);
      if (s.state === 'warn') {
        // O AVISO precisa ser impossível de não ver (é o que torna o ataque justo):
        // uma faixa de luz marca a coluna inteira, e a marca no chão cresce e pisca.
        const k = 1 - s.timer / B.SHARD_TELEGRAPH;
        const a = this.arena;
        const blink = Math.sin(this.time * 18) > 0 ? 1 : 0.6;
        ctx.globalAlpha = (0.08 + 0.14 * k) * blink;
        ctx.fillStyle = '#ff8fe0';
        ctx.fillRect(x - 4, a.ceiling, 8, a.floor - a.ceiling);
        const w = Math.round(6 + k * 10);
        ctx.globalAlpha = (0.55 + 0.45 * k) * blink;
        ctx.fillRect(x - w / 2, a.floor - 3, w, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, a.ceiling, 2, 3 + Math.round(k * 6));
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = '#8fd1ff';
        ctx.fillRect(x - 3, Math.round(s.y), 6, 9);
        ctx.fillStyle = '#e8fdff';
        ctx.fillRect(x - 1, Math.round(s.y), 2, 12);
      }
    }
  }
}

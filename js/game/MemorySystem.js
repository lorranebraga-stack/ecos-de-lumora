// SISTEMA DE MEMÓRIAS — a mecânica central de Ecos de Lumora.
//
// 1. O Nilo coleta FRAGMENTOS DE MEMÓRIA ('f' no mapa) e os guarda.
// 2. Perto de uma PEDRA-ECO ('E'), apertar E gasta 1 fragmento e a região "lembra":
//      - blocos latentes mudam em onda, a partir da pedra (ponte, flor, parede falsa);
//      - criaturas da região se acalmam;
//      - a cor volta ao cenário num círculo em volta da pedra.
// 3. REGRA DE POSSE: cada bloco latente e cada criatura pertence à Pedra-Eco
//    MAIS PRÓXIMA. Para criar um enigma novo no mapa, basta pôr a pedra
//    perto das peças que ela deve controlar.

import { CONFIG } from '../config.js';
import { REMEMBERED } from './Level.js';

const M = CONFIG.MEMORY;

// ------------------------------------------------------------------
// Fragmento de memória: orbe dourado com faíscas girando em volta.
// ------------------------------------------------------------------
class Fragment {
  constructor(tx, ty, T) {
    this.x = tx * T + T / 2;
    this.y = ty * T + T / 2;
    this.collected = false;
  }

  touches(b) {
    return b.x < this.x + 8 && b.x + b.w > this.x - 8 && b.y < this.y + 9 && b.y + b.h > this.y - 9;
  }

  draw(ctx, time) {
    const x = Math.round(this.x);
    const y = Math.round(this.y + Math.sin(time * 2) * 2);
    ctx.globalAlpha = 0.15 + 0.08 * Math.sin(time * 3);
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(x - 6, y - 8, 13, 17);
    ctx.fillRect(x - 8, y - 5, 17, 11);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#c98a3a';
    ctx.fillRect(x - 3, y - 4, 7, 9);
    ctx.fillRect(x - 4, y - 3, 9, 7);
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(x - 2, y - 3, 5, 7);
    ctx.fillRect(x - 3, y - 2, 7, 5);
    ctx.fillStyle = '#fff6dc';
    ctx.fillRect(x - 1, y - 2, 2, 2);
    // Espiral: três faíscas orbitando
    for (let i = 0; i < 3; i++) {
      const a = time * 2.5 + (i * Math.PI * 2) / 3;
      ctx.fillStyle = i === 0 ? '#ffffff' : '#c7a6ff';
      ctx.fillRect(Math.round(x + Math.cos(a) * 9), Math.round(y + Math.sin(a) * 5), 1, 1);
    }
  }
}

// ------------------------------------------------------------------
// Pedra-Eco: monólito com uma espiral entalhada. Acende ao ser ativada.
// ------------------------------------------------------------------
class EchoStone {
  constructor(tx, ty, T) {
    this.x = tx * T + T / 2;      // centro horizontal
    this.base = (ty + 1) * T;     // chão
    this.y = this.base - 12;      // centro aproximado
    this.active = false;
    this.activeTime = 0;
    this.tiles = [];              // blocos latentes que ela controla
    this.enemies = [];            // criaturas que ela acalma
  }

  isNear(p) {
    const cx = p.x + p.w / 2;
    return Math.abs(cx - this.x) < M.STONE_REACH && p.y + p.h > this.base - 30 && p.y < this.base;
  }

  draw(ctx, time, highlight) {
    const x = Math.round(this.x);
    const b = this.base;
    const lit = this.active;
    // Corpo de pedra (clara o bastante para se destacar no Bosque escuro)
    ctx.fillStyle = lit ? '#4a3f9a' : '#57526a';
    ctx.fillRect(x - 6, b - 22, 12, 22);
    ctx.fillRect(x - 5, b - 24, 10, 2);
    ctx.fillStyle = lit ? '#8a7fe0' : '#7d778f';
    ctx.fillRect(x - 6, b - 22, 1, 22);
    ctx.fillRect(x - 5, b - 24, 10, 1);
    ctx.fillStyle = '#231b3a';
    ctx.fillRect(x - 7, b - 2, 14, 2);

    // Espiral entalhada: apagada, pulsando (perto e com fragmento) ou acesa
    let glow = 0.45;
    let color = '#b8b0c4';
    if (lit) {
      glow = 0.75 + 0.25 * Math.sin(time * 3);
      color = '#8ff7ff';
    } else if (highlight) {
      glow = 0.5 + 0.5 * Math.sin(time * 6);
      color = '#ffd98a';
    }
    ctx.globalAlpha = glow;
    ctx.fillStyle = color;
    ctx.fillRect(x - 3, b - 18, 6, 1);
    ctx.fillRect(x + 2, b - 18, 1, 6);
    ctx.fillRect(x - 2, b - 13, 5, 1);
    ctx.fillRect(x - 2, b - 16, 1, 3);
    ctx.fillRect(x - 2, b - 16, 3, 1);
    ctx.fillRect(x, b - 15, 1, 1);
    ctx.globalAlpha = 1;

    if (lit) {
      // Luzinhas subindo da pedra
      for (let i = 0; i < 3; i++) {
        const t = (time * 0.6 + i / 3) % 1;
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = i % 2 ? '#8ff7ff' : '#ffd98a';
        ctx.fillRect(Math.round(x - 4 + i * 4 + Math.sin(time * 3 + i) * 2), Math.round(b - 26 - t * 22), 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }
}

// ------------------------------------------------------------------
// O sistema em si
// ------------------------------------------------------------------
export class MemorySystem {
  constructor(level, particles) {
    this.level = level;
    this.particles = particles;
    const T = level.tile;

    // Pedras numeradas da esquerda para a direita (pedra 0 = a primeira do caminho).
    const byX = (a, b) => a.tx - b.tx || a.ty - b.ty;
    this.stones = level.entities.filter((e) => e.type === 'stone').sort(byX).map((e) => new EchoStone(e.tx, e.ty, T));
    this.fragments = level.entities.filter((e) => e.type === 'fragment').sort(byX).map((e) => new Fragment(e.tx, e.ty, T));
    this.total = this.fragments.length;
    this.found = 0;   // fragmentos já coletados
    this.held = 0;    // fragmentos ainda não gastos

    this.time = 0;
    this.pending = [];  // blocos esperando a onda chegar
    this.effects = [];  // brilhos de blocos que acabaram de mudar
    this.zones = [];    // círculos de cor restaurada
    this.mask = null;   // canvas auxiliar, criado no primeiro desenho
    this.onTileChange = null; // função opcional (char) => {}, para tocar sons

    this.assignTiles();
  }

  nearestStone(x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const s of this.stones) {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }

  assignTiles() {
    const L = this.level;
    const T = L.tile;
    for (let ty = 0; ty < L.rows; ty++) {
      for (let tx = 0; tx < L.cols; tx++) {
        const c = L.grid[ty][tx];
        if (!(c in REMEMBERED)) continue;
        const cx = tx * T + T / 2;
        const cy = ty * T + T / 2;
        const stone = this.nearestStone(cx, cy);
        if (!stone) throw new Error(`Bloco de memória '${c}' em (${tx}, ${ty}) sem nenhuma Pedra-Eco na fase.`);
        stone.tiles.push({ tx, ty, char: c, dist: Math.hypot(stone.x - cx, stone.y - cy) });
      }
    }
  }

  // Cada criatura pertence à pedra mais próxima do lugar onde nasceu.
  assignEnemies(enemies) {
    if (this.stones.length === 0) return;
    for (const e of enemies) {
      this.nearestStone(e.centerX, e.centerY).enemies.push(e);
    }
  }

  // Pedra ainda apagada ao alcance do Nilo (ou null).
  stoneNear(player) {
    return this.stones.find((s) => !s.active && s.isNear(player)) || null;
  }

  // Tenta ecoar. Retorna 'ok', 'no-fragment' ou 'no-stone'.
  tryActivate(player) {
    const stone = this.stoneNear(player);
    if (!stone) return 'no-stone';
    if (this.held < 1) return 'no-fragment';
    this.held--;
    this.activate(stone);
    this.lastActivated = this.stones.indexOf(stone); // a história usa isso (pedra 0, 1, 2...)
    return 'ok';
  }

  activate(stone) {
    stone.active = true;
    stone.activeTime = this.time;
    for (const t of stone.tiles) {
      this.pending.push({ ...t, at: this.time + 0.25 + t.dist * M.TILE_DELAY });
    }
    for (const e of stone.enemies) {
      if (e.alive) e.remember();
    }
    this.zones.push({ x: stone.x, y: stone.y, r: 0 });
    this.particles.burst(stone.x, stone.base - 18, {
      count: 24, colors: ['#8ff7ff', '#ffd98a', '#c7a6ff'], speed: 90, life: 0.9,
    });
  }

  // ---------- Salvamento ----------

  saveState() {
    return {
      stones: this.stones.flatMap((s, i) => (s.active ? [i] : [])),
      fragments: this.fragments.flatMap((f, i) => (f.collected ? [i] : [])),
      held: this.held,
    };
  }

  // Restaura sem animação: tudo que foi lembrado já aparece lembrado.
  restore(state) {
    for (const i of state.fragments) {
      if (this.fragments[i]) this.fragments[i].collected = true;
    }
    this.found = state.fragments.length;
    this.held = state.held;
    for (const i of state.stones) {
      const stone = this.stones[i];
      if (!stone) continue;
      stone.active = true;
      for (const t of stone.tiles) this.level.setTile(t.tx, t.ty, REMEMBERED[t.char]);
      for (const e of stone.enemies) if (e.alive) e.remember();
      this.zones.push({ x: stone.x, y: stone.y, r: M.ZONE_RADIUS });
    }
  }

  // Coleta fragmentos; chama onCollect(fragmento) para cada um.
  collect(player, onCollect) {
    for (const f of this.fragments) {
      if (!f.collected && f.touches(player)) {
        f.collected = true;
        this.found++;
        this.held++;
        onCollect(f);
      }
    }
  }

  update(dt, player) {
    this.time += dt;
    const T = this.level.tile;

    for (const z of this.zones) z.r = Math.min(M.ZONE_RADIUS, z.r + M.ZONE_GROW * dt);

    // A onda chega a cada bloco no seu tempo.
    this.pending = this.pending.filter((p) => {
      if (this.time < p.at) return true;
      const becomesSolid = p.char === 'L';
      // Segurança: nunca solidifica um bloco por cima do Nilo (ele ficaria preso).
      if (becomesSolid && overlapsTile(player, p.tx, p.ty, T)) return true;
      this.level.setTile(p.tx, p.ty, REMEMBERED[p.char]);
      if (this.onTileChange) this.onTileChange(p.char);
      this.effects.push({ tx: p.tx, ty: p.ty, kind: p.char === 'X' ? 'dissolve' : 'appear', t: 0 });
      const cx = p.tx * T + T / 2;
      const cy = p.ty * T + T / 2;
      if (p.char === 'X') {
        this.particles.burst(cx, cy, { count: 6, colors: ['#231b3a', '#b48cff', '#2f2550'], speed: 50, life: 0.7, gravity: 160, size: 2 });
      } else {
        this.particles.burst(cx, cy, { count: 4, colors: ['#8ff7ff', '#ffffff'], speed: 40, life: 0.5 });
      }
      return false;
    });

    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < 0.6);
  }

  // Desenha pedras e brilhos (no espaço do mundo, com a câmera aplicada).
  drawWorld(ctx, time, player) {
    for (const s of this.stones) {
      s.draw(ctx, time, this.held > 0 && s.isNear(player));
    }
    const T = this.level.tile;
    for (const e of this.effects) {
      const k = 1 - e.t / 0.6;
      ctx.globalAlpha = k;
      if (e.kind === 'appear') {
        ctx.fillStyle = '#e8fdff';
        ctx.fillRect(e.tx * T - 1, e.ty * T - 1, T + 2, T + 2);
      } else {
        // Parede se desfazendo: o bloco encolhe para o centro
        const s = Math.round(T * k);
        ctx.fillStyle = '#2f2550';
        ctx.fillRect(e.tx * T + (T - s) / 2, e.ty * T + (T - s) / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawFragments(ctx, time, view) {
    for (const f of this.fragments) {
      if (f.collected || f.x < view.x - 20 || f.x > view.x + view.w + 20) continue;
      f.draw(ctx, time);
    }
  }

  // O MUNDO ESQUECIDO: tira a cor de tudo que já foi desenhado,
  // menos dentro dos círculos de memória restaurada.
  // Técnica: uma "máscara" cinza num canvas auxiliar, com buracos nas zonas
  // lembradas, aplicada com o modo de mistura "saturation".
  drawForgetting(ctx, view) {
    if (!this.mask) {
      this.mask = document.createElement('canvas');
      this.mask.width = view.w;
      this.mask.height = view.h;
    }
    const m = this.mask.getContext('2d');
    m.globalCompositeOperation = 'source-over';
    m.clearRect(0, 0, view.w, view.h);
    m.fillStyle = '#808080';
    m.fillRect(0, 0, view.w, view.h);

    m.globalCompositeOperation = 'destination-out';
    for (const z of this.zones) {
      if (z.r <= 0) continue;
      const x = z.x - view.x;
      const y = z.y - view.y;
      const g = m.createRadialGradient(x, y, z.r * 0.55, x, y, z.r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = g;
      m.fillRect(x - z.r, y - z.r, z.r * 2, z.r * 2);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = M.FORGOTTEN;
    ctx.drawImage(this.mask, 0, 0);
    ctx.restore();
  }
}

function overlapsTile(b, tx, ty, T) {
  return b.x < (tx + 1) * T && b.x + b.w > tx * T && b.y < (ty + 1) * T && b.y + b.h > ty * T;
}

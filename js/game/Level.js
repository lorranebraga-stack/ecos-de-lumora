// Uma fase feita de blocos, descrita como texto (veja js/levels/).
//   '#' = rocha sólida
//   '=' = galho: atravessa por baixo, pisa por cima
//   '^' = espinhos de cristal (perigo)
//   'P' = ponto de partida do Nilo
//   'F' = saída da fase
//   'c' = cristal · 'm' = Murcho · 't' = Traça-de-Cinza
//   'f' = fragmento de memória · 'E' = Pedra-Eco · 'K' = lanterna (checkpoint)
//   'r' = Cristalídeo · 'A' = altar de habilidade · 'Q' = chefe
//   'G' = portão de cristal (sólido; a cena fecha/abre a arena do chefe)
//   '.' = vazio
//
// Blocos das regiões novas:
//   'H' = passagem secreta: parece rocha, mas dá para atravessar (some ao entrar)
//   '%' = ilha frágil: sólida, mas treme e cai logo depois que o Nilo pisa (volta depois)
//   'a' = prédio LEMBRADO: sólido quando a cidade está no estado 0
//   'b' = prédio ESQUECIDO: sólido quando a cidade está no estado 1
//   (o Relógio da Praça, 'O', troca o estado da cidade)
// Objetos novos: 'S' = Eco Escondido (estrela secreta) · 'O' = Relógio da Praça
//                'Y' = Eco Vazio (sombra) · 's' = Sopro (nuvem que sopra)
//
// Blocos de MEMÓRIA (mudam quando uma Pedra-Eco é ativada, veja MemorySystem.js):
//   'L' = ponte latente   → vira 'B' (ponte sólida)
//   'v' = flor latente    → vira 'w' (flor-plataforma, atravessável por baixo)
//   'X' = parede falsa    → vira '.' (some)
// Tudo é desenhado por código, no estilo do Bosque dos Sussurros.

import { CONFIG } from '../config.js';

const BOSQUE_PALETTE = {
  rock: '#231b3a',
  rockSpeck: '#2f2550',
  rockEdge: '#1a142c',
  moss: '#2c7a6b',
  mossLight: '#59e0c5',
  mushroom: '#ff9ad5',
  mushroomStem: '#e8d9f0',
  wood: '#6b4a3a',
  woodDark: '#4a3128',
  leaf: '#3fb59a',
  thorn: '#ff6fae',
  thornDark: '#a63a78',
  arch: '#3a3266',
  archLight: '#5a4f9a',
  rune: '#8ff7ff',
  ghost: '#9fe9ff',
  bridge: '#3d3570',
  bridgeLight: '#6a5fb0',
  petal: '#ff9ad5',
  petalDark: '#c45a9c',
  pad: '#3fb59a',
  falseCrack: '#b48cff',
  gate: '#8fd1ff',
};

// TEMAS VISUAIS: o mesmo código de desenho, com outras cores.
// Uma região nova pode reaproveitar um tema ou criar o seu (só as cores que mudam).
// Nas Minas: rocha azulada, "musgo" vira veio de cristal, cogumelos viram drusas,
// galhos viram vigas de madeira e flores viram prateleiras de cristal.
const MINAS_PALETTE = {
  ...BOSQUE_PALETTE,
  rock: '#141a2e',
  rockSpeck: '#22305a',
  rockEdge: '#0b0f1e',
  moss: '#2a4f8a',
  mossLight: '#8fd1ff',
  mushroom: '#ff8fe0',
  mushroomStem: '#c7e6ff',
  wood: '#5a4636',
  woodDark: '#3a2c22',
  leaf: '#8fd1ff',
  arch: '#26305a',
  archLight: '#4a5fa0',
  bridge: '#2a3f7a',
  bridgeLight: '#8fd1ff',
  pad: '#5fa8ff',
  petal: '#c7e6ff',
  petalDark: '#5f7fd0',
};

// Arquipélago Suspenso: ilhas de terra clara no céu de pêssego; pontes de nuvem dourada.
const ARQUIPELAGO_PALETTE = {
  ...BOSQUE_PALETTE,
  rock: '#6a4a5e',
  rockSpeck: '#85607a',
  rockEdge: '#4a3045',
  moss: '#6fbf73',
  mossLight: '#c9f29b',
  mushroom: '#ffe08a',
  mushroomStem: '#fff3d6',
  wood: '#a8746a',
  woodDark: '#7a5048',
  leaf: '#c9f29b',
  thorn: '#ff6fae',
  thornDark: '#a63a78',
  arch: '#c98a6a',
  archLight: '#f2c4a0',
  rune: '#fff3b0',
  ghost: '#fff6e0',
  bridge: '#f2d6b0',
  bridgeLight: '#ffffff',
  pad: '#ffd98a',
  petal: '#ffffff',
  petalDark: '#f2c4a0',
  falseCrack: '#ff9ad5',
  gate: '#fff3b0',
  crumble: '#8a6a7a',
  crumbleTop: '#9fe0a0',
};

// Cidade Sem Memória: tijolos sépia, telhados vermelho-desbotado.
const CIDADE_PALETTE = {
  ...BOSQUE_PALETTE,
  rock: '#4a3a30',
  rockSpeck: '#5e4a3c',
  rockEdge: '#2e231c',
  moss: '#7a5a48',
  mossLight: '#c99a78',
  mushroom: '#ffcf8a',
  mushroomStem: '#e8d6c0',
  wood: '#6b4a3a',
  woodDark: '#4a3128',
  leaf: '#a8806a',
  arch: '#5e4a3c',
  archLight: '#a8806a',
  rune: '#ffcf8a',
  ghost: '#e8d6c0',
  bridge: '#7a5a48',
  bridgeLight: '#e8b48a',
  pad: '#c96a5a',
  petal: '#ffcf8a',
  petalDark: '#c96a5a',
  falseCrack: '#ff8a6a',
  gate: '#ffcf8a',
  bricks: true,
  remembered: '#c96a5a',
  rememberedLight: '#ffcf8a',
  forgotten: '#6a6a78',
  forgottenLight: '#a8a8b8',
};

// Santuário da Aurora: mármore claro com veios de aurora.
const SANTUARIO_PALETTE = {
  ...BOSQUE_PALETTE,
  rock: '#2a2a52',
  rockSpeck: '#3a3a6a',
  rockEdge: '#1a1a3a',
  moss: '#59e0c5',
  mossLight: '#c9fff3',
  mushroom: '#ff9ad5',
  mushroomStem: '#ffffff',
  wood: '#4a5fa0',
  woodDark: '#2a3f7a',
  leaf: '#8ff7ff',
  arch: '#4a4a8a',
  archLight: '#9f9fe0',
  rune: '#ffd98a',
  ghost: '#ffffff',
  bridge: '#4a4a8a',
  bridgeLight: '#ffd98a',
  pad: '#ff9ad5',
  petal: '#ffd98a',
  petalDark: '#ff6fae',
  falseCrack: '#ffd98a',
  gate: '#ffd98a',
  crumble: '#4a4a8a',
  crumbleTop: '#8ff7ff',
  remembered: '#59e0c5',
  rememberedLight: '#c9fff3',
  forgotten: '#5a4f7a',
  forgottenLight: '#b48cff',
};

BOSQUE_PALETTE.crumble = '#3a2f5a';
BOSQUE_PALETTE.crumbleTop = '#59e0c5';

export const TILE_THEMES = {
  bosque: BOSQUE_PALETTE,
  minas: MINAS_PALETTE,
  arquipelago: ARQUIPELAGO_PALETTE,
  cidade: CIDADE_PALETTE,
  santuario: SANTUARIO_PALETTE,
};

// Letras do mapa que viram objetos (e não blocos).
const ENTITY_CHARS = {
  c: 'crystal', m: 'murcho', t: 'traca', r: 'cristalideo',
  f: 'fragment', E: 'stone', K: 'lantern', A: 'shrine', Q: 'boss',
  S: 'secret', O: 'clock', Y: 'eco', s: 'sopro',
};

// Que bloco cada bloco latente vira quando é lembrado.
export const REMEMBERED = { L: 'B', v: 'w', X: '.' };

// Junta trechos de tela lado a lado num único mapa.
// Cada trecho é uma lista de linhas; todos precisam ter o mesmo número de linhas.
export function joinSections(sections) {
  const rows = sections[0].length;
  sections.forEach((s, i) => {
    if (s.length !== rows) throw new Error(`Trecho ${i + 1} tem ${s.length} linhas, esperado ${rows}.`);
  });
  return Array.from({ length: rows }, (_, r) => sections.map((s) => s[r]).join(''));
}

export class Level {
  constructor(data) {
    this.name = data.name;
    this.theme = data.theme || 'bosque';
    this.pal = TILE_THEMES[this.theme];
    if (!this.pal) throw new Error(`Tema visual desconhecido: "${this.theme}"`);
    this.exitHidden = false; // a cena esconde a saída enquanto um chefe estiver vivo
    this.cityState = 0;      // Cidade: 0 = prédios lembrados sólidos · 1 = esquecidos sólidos
    this.shaking = new Map(); // ilhas frágeis tremendo: "tx,ty" → segundos até cair
    this.reveal = null;      // área (px) onde as passagens secretas ficam transparentes
    this.tile = CONFIG.TILE;
    this.grid = data.map.map((row) => row.split(''));
    this.rows = this.grid.length;
    this.cols = this.grid[0].length;
    this.pixelWidth = this.cols * this.tile;
    this.pixelHeight = this.rows * this.tile;

    this.grid.forEach((row, i) => {
      if (row.length !== this.cols) {
        throw new Error(`Mapa "${data.name}": linha ${i} tem ${row.length} colunas, esperado ${this.cols}.`);
      }
    });

    this.spawn = null;
    this.exit = null;
    this.entities = []; // { type, tx, ty } — lidos por Collectibles e Enemy
    this.extractMarkers();
    if (!this.spawn) throw new Error(`Mapa "${this.name}" não tem ponto de partida 'P'.`);
  }

  // Procura 'P' e 'F', guarda as posições e troca por vazio no mapa.
  extractMarkers() {
    const T = this.tile;
    const P = CONFIG.PLAYER;
    for (let ty = 0; ty < this.rows; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        const c = this.grid[ty][tx];
        if (c === 'P') {
          this.spawn = { x: tx * T + (T - P.WIDTH) / 2, y: (ty + 1) * T - P.HEIGHT };
          this.grid[ty][tx] = '.';
        } else if (c === 'F') {
          // A área da saída é o vão do arco: 2 blocos de largura, 3 de altura.
          this.exit = { x: tx * T - T / 2, y: (ty - 2) * T, w: T * 2, h: T * 3 };
          this.grid[ty][tx] = '.';
        } else if (ENTITY_CHARS[c]) {
          this.entities.push({ type: ENTITY_CHARS[c], tx, ty });
          this.grid[ty][tx] = '.';
        }
      }
    }
  }

  tileAt(tx, ty) {
    if (ty < 0 || ty >= this.rows || tx < 0 || tx >= this.cols) return null;
    return this.grid[ty][tx];
  }

  // Fora do mapa pelos lados conta como parede; acima e abaixo, como vazio.
  // Sólidos: rocha, ponte lembrada e parede falsa (enquanto ninguém a lembrar).
  isSolid(tx, ty) {
    if (tx < 0 || tx >= this.cols) return true;
    const c = this.tileAt(tx, ty);
    if (c === 'a') return this.cityState === 0;
    if (c === 'b') return this.cityState === 1;
    return c === '#' || c === 'B' || c === 'X' || c === 'G' || c === '%';
  }

  // Para DESENHAR: a passagem secreta se disfarça de rocha.
  looksSolid(tx, ty) {
    return this.isSolid(tx, ty) || this.tileAt(tx, ty) === 'H';
  }

  // Cidade: troca quais prédios estão sólidos. Retorna false se algum corpo
  // (o Nilo, por exemplo) ficaria preso dentro de um prédio que vai aparecer.
  toggleCity(bodies = []) {
    const next = this.cityState ^ 1;
    const appearing = next === 0 ? 'a' : 'b';
    const T = this.tile;
    for (const b of bodies) {
      for (let ty = Math.floor(b.y / T); ty <= Math.floor((b.y + b.h - 0.01) / T); ty++) {
        for (let tx = Math.floor(b.x / T); tx <= Math.floor((b.x + b.w - 0.01) / T); tx++) {
          if (this.tileAt(tx, ty) === appearing) return false;
        }
      }
    }
    this.cityState = next;
    this.version = (this.version || 0) + 1;
    return true;
  }

  // Atravessáveis por baixo: galho e flor lembrada.
  isPlatform(tx, ty) {
    const c = this.tileAt(tx, ty);
    return c === '=' || c === 'w';
  }

  // Troca um bloco (usado pelo sistema de memórias e pelo portão do chefe).
  // "version" aumenta a cada troca: o renderizador 3D usa isso para refazer o terreno.
  setTile(tx, ty, c) {
    if (this.tileAt(tx, ty) === null || this.grid[ty][tx] === c) return;
    this.grid[ty][tx] = c;
    this.version = (this.version || 0) + 1;
  }

  isHazard(tx, ty) {
    return this.tileAt(tx, ty) === '^';
  }

  // Os espinhos machucam só na parte de baixo do bloco, com folga nas laterais.
  // Assim, raspar na quina não conta: o jogo parece justo.
  touchesHazard(body) {
    const T = this.tile;
    const x0 = Math.floor(body.x / T);
    const x1 = Math.floor((body.x + body.w) / T);
    const y0 = Math.floor(body.y / T);
    const y1 = Math.floor((body.y + body.h) / T);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.isHazard(tx, ty)) continue;
        const hx = tx * T + 3;
        const hy = ty * T + 8;
        if (body.x < hx + T - 6 && body.x + body.w > hx && body.y < hy + 8 && body.y + body.h > hy) return true;
      }
    }
    return false;
  }

  touchesExit(body) {
    const e = this.exit;
    if (!e || this.exitHidden) return false;
    return body.x < e.x + e.w && body.x + body.w > e.x && body.y < e.y + e.h && body.y + body.h > e.y;
  }

  // Desenha só os blocos visíveis na câmera (a fase pode ser enorme).
  draw(ctx, time, view) {
    const T = this.tile;
    const tx0 = Math.max(0, Math.floor(view.x / T) - 1);
    const tx1 = Math.min(this.cols - 1, Math.floor((view.x + view.w) / T) + 1);
    const ty0 = Math.max(0, Math.floor(view.y / T) - 1);
    const ty1 = Math.min(this.rows - 1, Math.floor((view.y + view.h) / T) + 1);

    if (this.exit && !this.exitHidden) this.drawExit(ctx, time);

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const c = this.grid[ty][tx];
        if (c === '#') this.drawRock(ctx, tx, ty, T, time);
        else if (c === '=') this.drawBranch(ctx, tx, ty, T, time);
        else if (c === '^') this.drawThorns(ctx, tx, ty, T, time);
        else if (c === 'X') this.drawFalseWall(ctx, tx, ty, T, time);
        else if (c === 'L') this.drawGhostBridge(ctx, tx, ty, T, time);
        else if (c === 'v') this.drawGhostFlower(ctx, tx, ty, T, time);
        else if (c === 'B') this.drawBridge(ctx, tx, ty, T, time);
        else if (c === 'w') this.drawFlower(ctx, tx, ty, T, time);
        else if (c === 'G') this.drawGate(ctx, tx, ty, T, time);
        else if (c === 'H') this.drawSecret(ctx, tx, ty, T, time);
        else if (c === '%') this.drawCrumble(ctx, tx, ty, T, time);
        else if (c === 'a' || c === 'b') this.drawCityBlock(ctx, tx, ty, T, time, c);
      }
    }
  }

  // A passagem secreta é desenhada como rocha; perto do Nilo, fica transparente.
  secretRevealed(tx, ty) {
    const r = this.reveal;
    if (!r) return false;
    const T = this.tile;
    return tx * T < r.x + r.w + 24 && (tx + 1) * T > r.x - 24 && ty * T < r.y + r.h + 24 && (ty + 1) * T > r.y - 24;
  }

  drawSecret(ctx, tx, ty, T, time) {
    if (this.secretRevealed(tx, ty)) {
      ctx.globalAlpha = 0.28;
      this.drawRock(ctx, tx, ty, T, time);
      ctx.globalAlpha = 1;
      return;
    }
    this.drawRock(ctx, tx, ty, T, time);
    // Pista justa: de vez em quando, um brilhinho passa pela "rocha".
    if ((time * 0.7 + tx * 0.37 + ty * 0.11) % 4 < 0.12) {
      ctx.fillStyle = this.pal.rune;
      ctx.fillRect(tx * T + 7, ty * T + 7, 2, 2);
    }
  }

  // Ilha frágil: um pedaço de terra solto, que treme antes de cair.
  drawCrumble(ctx, tx, ty, T, time) {
    const left = this.shaking.get(`${tx},${ty}`);
    const shake = left !== undefined ? (Math.sin(time * 70 + tx) > 0 ? 1 : -1) : 0;
    const px = tx * T + shake;
    const py = ty * T;
    ctx.fillStyle = this.pal.crumble;
    ctx.fillRect(px + 1, py + 2, T - 2, T - 6);
    ctx.fillRect(px + 3, py + T - 4, T - 6, 2);
    ctx.fillRect(px + 6, py + T - 2, 4, 2);
    ctx.fillStyle = this.pal.crumbleTop;
    ctx.fillRect(px, py, T, 3);
    ctx.fillStyle = this.pal.rockEdge;
    ctx.fillRect(px + 4, py + 6, 1, 4); // rachaduras
    ctx.fillRect(px + 10, py + 5, 1, 3);
    if (left !== undefined) {
      ctx.fillStyle = this.pal.rockSpeck;
      ctx.fillRect(px + 2 + ((time * 40) % 10), py + T - 1, 1, 1);
    }
  }

  // Cidade: prédio sólido (janelas acesas) ou só o contorno (o outro estado).
  drawCityBlock(ctx, tx, ty, T, time, c) {
    const px = tx * T;
    const py = ty * T;
    const remembered = c === 'a';
    const base = remembered ? this.pal.remembered : this.pal.forgotten;
    const light = remembered ? this.pal.rememberedLight : this.pal.forgottenLight;
    if (this.isSolid(tx, ty)) {
      // Aviso: a cidade vai trocar e este prédio vai sumir — ele pisca.
      if (this.toggleWarn > 0 && Math.sin(time * 30) > 0) ctx.globalAlpha = 0.35;
      ctx.fillStyle = base;
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = light;
      if (this.tileAt(tx, ty - 1) !== c) ctx.fillRect(px, py, T, 2);
      // Janelas (lembrados: acesas; esquecidos: apagadas, com uma rachadura)
      ctx.globalAlpha = remembered ? 0.6 + 0.3 * Math.sin(time * 2 + tx) : 0.45;
      ctx.fillRect(px + 3, py + 5, 3, 4);
      ctx.fillRect(px + 10, py + 5, 3, 4);
      ctx.globalAlpha = 1;
      if (!remembered) {
        ctx.fillStyle = this.pal.rockEdge;
        ctx.fillRect(px + 8, py + 2, 1, 6);
      }
      ctx.fillStyle = this.pal.rockEdge;
      ctx.fillRect(px, py + T - 1, T, 1);
      ctx.globalAlpha = 1;
    } else {
      // Contorno pontilhado: "este prédio existe no outro jeito de lembrar"
      ctx.globalAlpha = 0.35 + 0.1 * Math.sin(time * 3 + tx);
      ctx.fillStyle = light;
      for (let i = 0; i < T; i += 4) {
        ctx.fillRect(px + i, py, 2, 1);
        ctx.fillRect(px + i, py + T - 1, 2, 1);
        ctx.fillRect(px, py + i, 1, 2);
        ctx.fillRect(px + T - 1, py + i, 1, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  drawRock(ctx, tx, ty, T, time) {
    const px = tx * T;
    const py = ty * T;
    const h = hash(tx, ty);

    ctx.fillStyle = this.pal.rock;
    ctx.fillRect(px, py, T, T);

    ctx.fillStyle = this.pal.rockSpeck;
    ctx.fillRect(px + (h % 11) + 2, py + ((h >> 4) % 10) + 4, 2, 1);
    ctx.fillRect(px + ((h >> 8) % 9) + 3, py + ((h >> 12) % 8) + 6, 1, 1);

    if (this.pal.bricks) {
      // Cidade: fiadas de tijolo
      ctx.fillStyle = this.pal.rockEdge;
      ctx.fillRect(px, py + 7, T, 1);
      ctx.fillRect(px, py + 15, T, 1);
      ctx.fillRect(px + (ty % 2 ? 4 : 11), py, 1, 7);
      ctx.fillRect(px + (ty % 2 ? 11 : 4), py + 8, 1, 7);
    }
    const solidLook = (x, y) => this.looksSolid(x, y) && this.tileAt(x, y) !== '%';
    const openTop = ty > 0 && !solidLook(tx, ty - 1);
    if (!solidLook(tx - 1, ty)) { ctx.fillStyle = this.pal.rockEdge; ctx.fillRect(px, py, 1, T); }
    if (!solidLook(tx + 1, ty)) { ctx.fillStyle = this.pal.rockEdge; ctx.fillRect(px + T - 1, py, 1, T); }

    if (openTop) {
      ctx.fillStyle = this.pal.moss;
      ctx.fillRect(px, py, T, 4);
      ctx.fillStyle = this.pal.mossLight;
      ctx.fillRect(px, py, T, 1);

      // Sem grama nem cogumelo embaixo de espinhos, para não confundir a leitura.
      if (this.isHazard(tx, ty - 1)) return;

      for (let i = 0; i < 3; i++) {
        const gx = px + ((h >> (i * 3)) % 15);
        const sway = Math.sin(time * 2 + tx + i) > 0.3 ? 1 : 0;
        ctx.fillRect(gx + sway, py - 2, 1, 2);
      }

      if (h % 7 === 0) {
        const mx = px + 4 + (h % 6);
        ctx.fillStyle = this.pal.mushroomStem;
        ctx.fillRect(mx + 1, py - 3, 1, 3);
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 3 + tx);
        ctx.fillStyle = this.pal.mushroom;
        ctx.fillRect(mx - 1, py - 6, 5, 4);
        ctx.globalAlpha = 1;
        ctx.fillRect(mx, py - 5, 3, 2);
      }
    }
  }

  // Galho: fino, para o jogador entender que dá para atravessar por baixo.
  drawBranch(ctx, tx, ty, T, time) {
    const px = tx * T;
    const py = ty * T;
    const h = hash(tx, ty);
    ctx.fillStyle = this.pal.wood;
    ctx.fillRect(px, py, T, 5);
    ctx.fillStyle = this.pal.woodDark;
    ctx.fillRect(px, py + 4, T, 1);
    ctx.fillRect(px + (h % 12) + 2, py + 2, 2, 1);
    ctx.fillStyle = this.pal.mossLight;
    ctx.fillRect(px, py, T, 1);
    // Folhas penduradas, balançando
    ctx.fillStyle = this.pal.leaf;
    const sway = Math.round(Math.sin(time * 2.2 + tx) * 1);
    ctx.fillRect(px + 3 + sway, py + 5, 2, 3);
    if (h % 2) ctx.fillRect(px + 10 - sway, py + 5, 2, 2);
    // Pontas do galho, só nas extremidades
    ctx.fillStyle = this.pal.wood;
    if (!this.isPlatform(tx - 1, ty)) ctx.fillRect(px - 2, py + 1, 2, 3);
    if (!this.isPlatform(tx + 1, ty)) ctx.fillRect(px + T, py + 1, 2, 3);
  }

  // Espinhos de cristal: rosa-choque, a única cor "agressiva" do Bosque.
  drawThorns(ctx, tx, ty, T, time) {
    const px = tx * T;
    const py = ty * T;
    ctx.globalAlpha = 0.18 + 0.1 * Math.sin(time * 4 + tx);
    ctx.fillStyle = this.pal.thorn;
    ctx.fillRect(px, py + 6, T, 10);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
      const sx = px + i * 4;
      const tall = i % 2 ? 7 : 9;
      ctx.fillStyle = this.pal.thornDark;
      ctx.fillRect(sx, py + T - 3, 4, 3);
      ctx.fillStyle = this.pal.thorn;
      ctx.fillRect(sx + 1, py + T - tall, 2, tall - 2);
      ctx.fillRect(sx + 1.5, py + T - tall - 1, 1, 1);
    }
  }

  // ---------- Blocos de memória ----------

  // Parede falsa: parece rocha, mas tem rachaduras violeta que pulsam devagar.
  // É uma pista justa: quem observa percebe que ela é diferente.
  drawFalseWall(ctx, tx, ty, T, time) {
    const px = tx * T;
    const py = ty * T;
    ctx.fillStyle = this.pal.rock;
    ctx.fillRect(px, py, T, T);
    ctx.fillStyle = this.pal.rockSpeck;
    ctx.fillRect(px + 3, py + 5, 2, 1);
    ctx.globalAlpha = 0.25 + 0.25 * Math.sin(time * 1.5 + ty * 0.7);
    ctx.fillStyle = this.pal.falseCrack;
    const zig = (tx + ty) % 2 ? 1 : -1;
    ctx.fillRect(px + 7, py, 1, 5);
    ctx.fillRect(px + 7 + zig, py + 5, 1, 5);
    ctx.fillRect(px + 7, py + 10, 1, 6);
    ctx.globalAlpha = 1;
  }

  // Ponte latente: só o contorno, tremeluzindo, como uma lembrança incompleta.
  drawGhostBridge(ctx, tx, ty, T, time) {
    const px = tx * T;
    const py = ty * T;
    ctx.globalAlpha = 0.22 + 0.12 * Math.sin(time * 2.5 + tx * 0.8);
    ctx.fillStyle = this.pal.ghost;
    ctx.fillRect(px, py, T, 1);
    ctx.fillRect(px, py + 5, T, 1);
    for (let i = 0; i < T; i += 4) ctx.fillRect(px + i, py + 1, 1, 4);
    ctx.globalAlpha = 1;
  }

  drawGhostFlower(ctx, tx, ty, T, time) {
    const px = tx * T;
    const py = ty * T;
    ctx.globalAlpha = 0.2 + 0.12 * Math.sin(time * 2.5 + tx);
    ctx.fillStyle = this.pal.ghost;
    ctx.fillRect(px + 1, py, T - 2, 1);
    ctx.fillRect(px + 1, py + 3, T - 2, 1);
    ctx.fillRect(px + 7, py + 4, 1, 6);
    ctx.globalAlpha = 1;
  }

  // Ponte lembrada: lajes antigas com uma runa acesa no meio.
  drawBridge(ctx, tx, ty, T, time) {
    const px = tx * T;
    const py = ty * T;
    ctx.fillStyle = this.pal.bridge;
    ctx.fillRect(px, py, T, 6);
    ctx.fillStyle = this.pal.bridgeLight;
    ctx.fillRect(px, py, T, 1);
    ctx.fillStyle = this.pal.rockEdge;
    ctx.fillRect(px + T - 1, py + 1, 1, 5); // junta entre as lajes
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin(time * 3 + tx);
    ctx.fillStyle = this.pal.rune;
    ctx.fillRect(px + 5, py + 3, 5, 1);
    ctx.globalAlpha = 1;
    // Correntes de luz que "seguram" a ponte no ar
    ctx.fillStyle = this.pal.mossLight;
    if (tx % 2 === 0) ctx.fillRect(px + 7, py + 6, 1, 3);
  }

  // Flor lembrada: uma folha larga e firme, com uma flor rosa no centro.
  drawFlower(ctx, tx, ty, T, time) {
    const px = tx * T;
    const py = ty * T;
    const sway = Math.sin(time * 1.8 + tx) > 0.6 ? 1 : 0;
    ctx.fillStyle = '#2c7a6b';
    ctx.fillRect(px + 7, py + 4, 2, T - 4); // caule
    ctx.fillStyle = this.pal.pad;
    ctx.fillRect(px, py + sway, T, 4);
    ctx.fillStyle = this.pal.mossLight;
    ctx.fillRect(px, py + sway, T, 1);
    ctx.fillStyle = this.pal.petalDark;
    ctx.fillRect(px + 5, py - 3 + sway, 6, 3);
    ctx.fillStyle = this.pal.petal;
    ctx.fillRect(px + 6, py - 4 + sway, 4, 3);
    ctx.fillStyle = '#ffe48a';
    ctx.fillRect(px + 7, py - 3 + sway, 2, 1);
  }

  // Portão de cristal: barras verticais que brilham (fecha a arena do chefe).
  drawGate(ctx, tx, ty, T, time) {
    const px = tx * T;
    const py = ty * T;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = this.pal.gate;
    ctx.fillRect(px + 2, py, T - 4, T);
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time * 6 + ty);
    for (let i = 0; i < 3; i++) ctx.fillRect(px + 3 + i * 4, py, 2, T);
    ctx.globalAlpha = 1;
  }

  // Arco de pedra antigo com runas que pulsam: a saída da fase.
  drawExit(ctx, time) {
    const { x, y, w, h } = this.exit;
    const pillar = 5;
    ctx.fillStyle = this.pal.arch;
    ctx.fillRect(x - pillar, y + 4, pillar, h - 4);
    ctx.fillRect(x + w, y + 4, pillar, h - 4);
    ctx.fillRect(x - pillar, y - 2, w + pillar * 2, 7);
    ctx.fillStyle = this.pal.archLight;
    ctx.fillRect(x - pillar, y - 2, w + pillar * 2, 1);

    ctx.globalAlpha = 0.12 + 0.08 * Math.sin(time * 2);
    ctx.fillStyle = this.pal.rune;
    ctx.fillRect(x, y + 5, w, h - 5);
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 3);
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x - 3, y + 10 + i * 9, 1, 3);
      ctx.fillRect(x + w + 2, y + 10 + i * 9, 1, 3);
    }
    ctx.globalAlpha = 1;
  }
}

function hash(x, y) {
  let h = (x * 73856093) ^ (y * 19349663);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

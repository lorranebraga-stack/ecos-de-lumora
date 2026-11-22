// Inimigos do Bosque dos Sussurros.
//
// Todos herdam de Enemy, que cuida do que é comum: caixa de colisão,
// "estar vivo", animação de derrota e a regra de pisar em cima.
// Cada inimigo novo só precisa implementar update() e draw().
//
// As cores são propositalmente DESBOTADAS: são criaturas que esqueceram
// quem eram. Na Etapa 7, devolver a memória a elas trará a cor de volta.

import { CONFIG } from '../config.js';
import { moveAndCollide } from './Physics.js';

const E = CONFIG.ENEMIES;

class Enemy {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.alive = true;
    this.dying = 0; // tempo restante da animação de derrota
    this.calm = false; // true depois que uma Pedra-Eco devolve a memória da criatura
    this.time = Math.random() * 10;
  }

  // Chamado pelo MemorySystem. Criaturas calmas não causam dano.
  remember() {
    this.calm = true;
  }

  // ---- Regras que cada inimigo pode mudar (a cena só pergunta) ----

  // Encostar machuca? Por padrão, só criaturas lembradas são inofensivas.
  get harmless() {
    return this.calm;
  }

  // O que acontece quando o Nilo pisa em cima:
  //   'defeat' = derrotado · 'bounce' = o Nilo quica sem derrotar (blindado)
  onStomp() {
    return 'defeat';
  }

  // Olha um pixel à frente (na direção de "facing"): falta chão ou há espinhos?
  dangerAhead(level) {
    const T = level.tile;
    const aheadX = this.facing > 0 ? this.x + this.w + 1 : this.x - 1;
    const tx = Math.floor(aheadX / T);
    const floorRow = Math.floor((this.y + this.h + 1) / T);
    const bodyRow = Math.floor((this.y + this.h - 1) / T);
    const noFloor = !level.isSolid(tx, floorRow) && !level.isPlatform(tx, floorRow);
    return noFloor || level.isHazard(tx, bodyRow);
  }

  get removable() {
    return !this.alive && this.dying <= 0;
  }

  get centerX() {
    return this.x + this.w / 2;
  }

  get centerY() {
    return this.y + this.h / 2;
  }

  overlaps(b) {
    return this.alive && b.x < this.x + this.w && b.x + b.w > this.x && b.y < this.y + this.h && b.y + b.h > this.y;
  }

  // Pisão: o Nilo está caindo e seus pés estão na parte de cima do inimigo.
  isStompedBy(player) {
    return player.vy > 0 && player.y + player.h - this.y < 8;
  }

  defeat() {
    this.alive = false;
    this.dying = 0.6;
  }
}

// ------------------------------------------------------------------
// MURCHO — planta seca que anda de um lado para o outro.
// Vira nas paredes, nas bordas e antes de espinhos. Derrota: pisar em cima.
// LEMBRADO: para, floresce e vira um trampolim vivo (quique bem alto).
// ------------------------------------------------------------------
export class Murcho extends Enemy {
  constructor(tx, ty, T) {
    super(tx * T + (T - 12) / 2, (ty + 1) * T - 12, 12, 12);
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    this.onGround = false;
  }

  update(dt, level) {
    this.time += dt;
    if (!this.alive) {
      this.dying -= dt;
      return;
    }

    this.vy = Math.min(this.vy + CONFIG.PLAYER.GRAVITY * dt, CONFIG.PLAYER.MAX_FALL);
    this.vx = this.calm ? 0 : this.facing * E.MURCHO.SPEED;
    this.springTime = Math.max(0, (this.springTime || 0) - dt);
    moveAndCollide(this, level, dt);

    // Se a física zerou vx, ele bateu numa parede.
    if (!this.calm && (this.vx === 0 || (this.onGround && this.dangerAhead(level)))) {
      this.facing *= -1;
    }
  }

  // Ao ser lembrado, a flor cresce: a caixa de colisão sobe 5 px para
  // o Nilo pisar exatamente no topo da flor desenhada.
  remember() {
    super.remember();
    this.y -= 5;
    this.h += 5;
  }

  // Animação de mola quando o Nilo quica num Murcho calmo.
  spring() {
    this.springTime = 0.25;
  }

  draw(ctx) {
    const cx = Math.round(this.centerX);
    const feet = Math.round(this.y + this.h);
    ctx.save();
    ctx.translate(cx, feet);

    if (!this.alive) {
      this.drawBloom(ctx);
      ctx.restore();
      return;
    }

    if (this.calm) {
      this.drawCalm(ctx);
      ctx.restore();
      return;
    }

    ctx.scale(this.facing, 1);
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const step = Math.sin(this.time * 10) > 0 ? 1 : 0;
    const bob = step;

    // Raízes-perninhas, alternando
    r(-4, -2, 2, 2 - step, '#4f4438');
    r(2, -2, 2, 1 + step, '#4f4438');

    // Corpo (bulbo seco)
    r(-5, -9 + bob, 10, 7, '#7a6a5a');
    r(-4, -10 + bob, 8, 1, '#7a6a5a');
    r(-5, -3 + bob, 10, 1, '#4f4438');
    r(-3, -6 + bob, 1, 2, '#5f5346'); // rachadura

    // Folhas murchas caídas
    r(-1, -13 + bob, 2, 3, '#6b6650');
    r(-6, -12 + bob, 5, 2, '#8c8a6a');
    r(-7, -11 + bob, 2, 2, '#8c8a6a');
    r(1, -13 + bob, 4, 2, '#8c8a6a');

    // Olhos: brasas fracas
    r(1, -8 + bob, 1, 2, '#ffcf6b');
    r(3, -8 + bob, 1, 2, '#ffcf6b');

    ctx.restore();
  }

  // Murcho lembrado: verde, folhas erguidas, uma flor grande no topo
  // que serve de trampolim. Achata quando o Nilo quica nele.
  drawCalm(ctx) {
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const k = (this.springTime || 0) / 0.25;
    ctx.scale(this.facing * (1 + 0.25 * k), 1 - 0.3 * k);
    const sway = Math.sin(this.time * 2) > 0.5 ? 1 : 0;

    r(-4, -2, 2, 2, '#2c7a6b');
    r(2, -2, 2, 2, '#2c7a6b');
    r(-5, -9, 10, 7, '#4fa86a');
    r(-4, -10, 8, 1, '#4fa86a');
    r(-5, -3, 10, 1, '#2c7a6b');
    r(-7, -11 + sway, 3, 2, '#7fe08a'); // folhas erguidas
    r(4, -11 - sway, 3, 2, '#7fe08a');
    // Olhos felizes (arquinhos)
    r(0, -7, 2, 1, '#1a1426');
    r(3, -7, 2, 1, '#1a1426');
    // Flor-trampolim
    r(-1, -13, 2, 3, '#2c7a6b');
    r(-5, -16, 10, 3, '#c45a9c');
    r(-4, -17, 8, 1, '#ff9ad5');
    r(-1, -16, 2, 1, '#ffe48a');
  }

  // Ao ser derrotado, o Murcho achata e solta uma florzinha:
  // uma pista de que essas criaturas podem ser "lembradas".
  drawBloom(ctx) {
    const k = Math.max(0, this.dying / 0.6);
    ctx.globalAlpha = k;
    ctx.fillStyle = '#5f5346';
    ctx.fillRect(-6, -3, 12, 3);
    ctx.fillStyle = '#ff9ad5';
    const s = Math.round((1 - k) * 3) + 1;
    ctx.fillRect(-s, -6 - s, s * 2, s * 2);
    ctx.fillStyle = '#ffe48a';
    ctx.fillRect(-1, -7, 2, 2);
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------
// TRAÇA-DE-CINZA — mariposa que paira e mergulha.
// Estados: hover (vaivém) → windup (treme, aviso) → dive (mergulho reto)
//          → return (volta ao ponto onde estava) → hover, com tempo de recarga.
// Derrota: pisar em cima. Ela ignora o terreno, exceto blocos sólidos no mergulho.
// ------------------------------------------------------------------
export class Traca extends Enemy {
  constructor(tx, ty, T) {
    const cx = tx * T + T / 2;
    const cy = ty * T + T / 2;
    super(cx - 6, cy - 5, 12, 10);
    this.homeX = cx;
    this.homeY = cy;
    this.state = 'hover';
    this.timer = 0;
    this.cooldown = 0;
    this.phase = 0;
    this.dvx = 0;
    this.dvy = 0;
  }

  setCenter(cx, cy) {
    this.x = cx - this.w / 2;
    this.y = cy - this.h / 2;
  }

  hoverPoint() {
    return {
      x: this.homeX + Math.sin(this.phase * E.TRACA.HOVER_SPEED) * E.TRACA.HOVER_RANGE,
      y: this.homeY + Math.sin(this.phase * 3) * 4,
    };
  }

  update(dt, level, player) {
    this.time += dt;
    if (!this.alive) {
      this.dying -= dt;
      this.y += 50 * dt; // cai enquanto se desfaz em cinzas
      return;
    }

    const T = E.TRACA;
    this.cooldown = Math.max(0, this.cooldown - dt);
    // Lembrada no meio de um ataque: desiste e volta a pairar.
    if (this.calm && (this.state === 'windup' || this.state === 'dive')) this.state = 'return';
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;

    if (this.state === 'hover') {
      this.phase += dt;
      const p = this.hoverPoint();
      this.setCenter(p.x, p.y);
      const below = py > this.centerY && py - this.centerY < T.DETECT_Y;
      if (!this.calm && this.cooldown === 0 && player.alive && below && Math.abs(px - this.centerX) < T.DETECT_X) {
        this.state = 'windup';
        this.timer = T.WINDUP;
        this.sound = 'windup'; // a cena lê e toca o som (veja LevelScene.updateEnemies)
      }
    } else if (this.state === 'windup') {
      this.timer -= dt;
      if (this.timer <= 0) {
        // Mira onde o Nilo está AGORA e mergulha em linha reta: dá para desviar.
        const dx = px - this.centerX;
        const dy = py - this.centerY;
        const len = Math.hypot(dx, dy) || 1;
        this.dvx = (dx / len) * T.DIVE_SPEED;
        this.dvy = (dy / len) * T.DIVE_SPEED;
        this.state = 'dive';
        this.timer = T.DIVE_TIME;
        this.sound = 'dive';
      }
    } else if (this.state === 'dive') {
      this.timer -= dt;
      const nx = this.centerX + this.dvx * dt;
      const ny = this.centerY + this.dvy * dt;
      const tile = level.tile;
      if (this.timer <= 0 || level.isSolid(Math.floor(nx / tile), Math.floor(ny / tile))) {
        this.state = 'return';
      } else {
        this.setCenter(nx, ny);
      }
    } else if (this.state === 'return') {
      const target = this.hoverPoint();
      const dx = target.x - this.centerX;
      const dy = target.y - this.centerY;
      const dist = Math.hypot(dx, dy);
      const stepLen = T.RETURN_SPEED * dt;
      if (dist <= stepLen) {
        this.setCenter(target.x, target.y);
        this.state = 'hover';
        this.cooldown = T.COOLDOWN;
      } else {
        this.setCenter(this.centerX + (dx / dist) * stepLen, this.centerY + (dy / dist) * stepLen);
      }
    }
  }

  draw(ctx) {
    let cx = Math.round(this.centerX);
    const cy = Math.round(this.centerY);
    if (this.state === 'windup') cx += Math.sin(this.time * 60) > 0 ? 1 : -1; // tremida

    ctx.save();
    ctx.translate(cx, cy);
    if (!this.alive) ctx.globalAlpha = Math.max(0, this.dying / 0.6);

    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const diving = this.state === 'dive';
    const flap = diving ? 0 : (Math.sin(this.time * 22) > 0 ? 1 : 0);
    const warn = this.state === 'windup' && Math.sin(this.time * 30) > 0;

    // Lembrada: um rastro de luz embaixo dela
    if (this.calm) {
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(this.time * 4);
      ctx.fillStyle = '#c7a6ff';
      ctx.fillRect(-3, 4, 6, 3);
      ctx.globalAlpha = 1; // criaturas calmas nunca são derrotadas
    }

    // Asas: abertas/fechadas alternando; coladas ao corpo no mergulho.
    // Lembrada, as asas ganham cor: lilás com pintas douradas.
    const wing = this.calm ? '#c7a6ff' : '#8a8496';
    const wingDark = this.calm ? '#8a5fd0' : '#5f596b';
    if (diving) {
      r(-4, -4, 3, 7, wing);
      r(1, -4, 3, 7, wing);
    } else {
      r(-7, -4 + flap * 2, 5, 4 - flap, wing);
      r(2, -4 + flap * 2, 5, 4 - flap, wing);
      r(-6, -1 + flap, 4, 2, wingDark);
      r(2, -1 + flap, 4, 2, wingDark);
      const dust = this.calm ? '#ffd98a' : '#b8b0c4';
      r(-5, -3 + flap * 2, 1, 1, dust); // pintas nas asas
      r(4, -3 + flap * 2, 1, 1, dust);
    }

    // Corpo e antenas
    r(-1, -4, 2, 8, warn ? '#ffffff' : '#4a4456');
    r(-2, -6, 1, 2, '#4a4456');
    r(1, -6, 1, 2, '#4a4456');

    // Olhos: acendem em brasa quando ela ataca
    let eye = this.state === 'hover' ? '#c9a37a' : '#ff8a3d';
    if (this.calm) eye = '#e8fdff';
    r(-1, -3, 1, 1, eye);
    r(0, -3, 1, 1, eye);

    ctx.restore();
  }
}

// ------------------------------------------------------------------
// CRISTALÍDEO (Minas de Cristal) — tatu de cristal blindado.
// Estados: idle (parado) → windup (se encolhe: aviso) → roll (rola até o Nilo)
//          → cracked (bateu na parede: casca rachada, tonto) → idle
// Pisar em cima com a casca inteira: o Nilo só quica (blindado).
// Pisar com a casca rachada: derrotado. Rachado, ele também não machuca.
// Na beira de um abismo ou espinho, ele para (sem rachar).
// ------------------------------------------------------------------
export class Cristalideo extends Enemy {
  constructor(tx, ty, T) {
    super(tx * T + (T - 14) / 2, (ty + 1) * T - 12, 14, 12);
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    this.onGround = false;
    this.state = 'idle';
    this.timer = 0;
    this.spin = 0;
  }

  get harmless() {
    return this.calm || this.state === 'cracked';
  }

  onStomp() {
    return this.state === 'cracked' ? 'defeat' : 'bounce';
  }

  update(dt, level, player) {
    this.time += dt;
    if (!this.alive) {
      this.dying -= dt;
      return;
    }
    const C = E.CRISTALIDEO;
    this.vy = Math.min(this.vy + CONFIG.PLAYER.GRAVITY * dt, CONFIG.PLAYER.MAX_FALL);
    this.timer -= dt;

    if (this.state === 'idle') {
      this.vx = 0;
      const dx = player.x + player.w / 2 - this.centerX;
      const dy = Math.abs(player.y + player.h - (this.y + this.h));
      if (!this.calm && player.alive && this.onGround && Math.abs(dx) < C.SIGHT_X && dy < C.SIGHT_Y) {
        this.facing = Math.sign(dx) || this.facing;
        this.state = 'windup';
        this.timer = C.WINDUP;
        this.sound = 'curl';
      }
    } else if (this.state === 'windup') {
      this.vx = 0;
      if (this.timer <= 0) {
        this.state = 'roll';
        this.vx = this.facing * C.ROLL_SPEED; // já começa rolando neste passo
      }
    } else if (this.state === 'roll') {
      this.vx = this.facing * C.ROLL_SPEED;
      this.spin += this.vx * dt;
    } else if (this.state === 'cracked') {
      this.vx = 0;
      if (this.timer <= 0) this.state = 'idle';
    }

    // "Bateu na parede" = estava rolando COM velocidade e a física zerou a velocidade.
    // (Bug achado pelos testes: comparar só vx === 0 rachava no primeiro passo do rolamento.)
    const rolling = this.state === 'roll' && this.vx !== 0;
    moveAndCollide(this, level, dt);
    if (rolling && this.vx === 0) {
      // Bateu numa parede: racha.
      this.state = 'cracked';
      this.timer = C.CRACKED_TIME;
      this.sound = 'crack';
    } else if (rolling && this.onGround && this.dangerAhead(level)) {
      this.state = 'idle'; // freia na beira
      this.vx = 0;
    }
  }

  draw(ctx) {
    const cx = Math.round(this.centerX);
    const feet = Math.round(this.y + this.h);
    ctx.save();
    ctx.translate(cx, feet);
    if (!this.alive) ctx.globalAlpha = Math.max(0, this.dying / 0.6);
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const shell = this.calm ? '#2c7a9b' : '#2a3f7a';
    const plate = this.calm ? '#8ff7ff' : '#8fd1ff';

    if (this.state === 'roll') {
      // Bola girando: a faixa clara dá a sensação de rotação.
      r(-6, -12, 12, 12, shell);
      r(-5, -13, 10, 1, shell);
      const band = Math.round(((this.spin / 3) % 10 + 10) % 10) - 5;
      r(band, -12, 2, 12, plate);
      r(-6, -7, 12, 1, '#1a2550');
    } else {
      ctx.scale(this.facing, 1);
      const curl = this.state === 'windup';
      const shake = curl ? (Math.sin(this.time * 50) > 0 ? 1 : 0) : 0;
      // Perninhas
      if (!curl) {
        r(-5, -2, 2, 2, '#1a2550');
        r(3, -2, 2, 2, '#1a2550');
      }
      // Casca em cúpula com placas de cristal
      r(-7 + shake, -9, 14, 7, shell);
      r(-5 + shake, -11, 10, 2, shell);
      r(-4 + shake, -13, 2, 3, plate);
      r(0 + shake, -14, 2, 4, plate);
      r(4 + shake, -12, 2, 2, plate);
      // Cabeça
      if (!curl) {
        r(6, -6, 3, 4, '#3a5fa0');
        r(8, -5, 1, 1, this.calm ? '#e8fdff' : '#ff8fe0');
      }
      if (this.state === 'cracked') {
        // Rachaduras rosa e estrelinhas de tontura
        r(-3, -10, 1, 4, '#ff8fe0');
        r(-2, -7, 1, 2, '#ff8fe0');
        r(2, -11, 1, 3, '#ff8fe0');
        const a = this.time * 6;
        for (let i = 0; i < 3; i++) {
          r(Math.round(Math.cos(a + i * 2.1) * 6), Math.round(-17 + Math.sin(a + i * 2.1) * 2), 1, 1, '#ffd98a');
        }
      }
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------
// SOPRO (Arquipélago Suspenso) — nuvenzinha que flutua parada e sopra rajadas.
// Estados: idle → inhale (incha: aviso) → blow (rajada para a frente) → idle
// A rajada empurra o Nilo (a cena pergunta gustAt). Derrota: pisar em cima.
// LEMBRADO: para de soprar e vira uma nuvem-trampolim (como o Murcho).
// ------------------------------------------------------------------
export class Sopro extends Enemy {
  constructor(tx, ty, T) {
    super(tx * T + (T - 16) / 2, ty * T + 2, 16, 12);
    this.facing = -1;
    this.state = 'idle';
    this.timer = E.SOPRO.IDLE * (0.5 + Math.random() * 0.5);
    this.baseY = this.y;
  }

  // Pisado (calmo) quica como trampolim.
  spring() {
    this.springTime = 0.25;
  }

  update(dt, level, player) {
    this.time += dt;
    if (!this.alive) {
      this.dying -= dt;
      this.y -= 20 * dt;
      return;
    }
    const S = E.SOPRO;
    this.springTime = Math.max(0, (this.springTime || 0) - dt);
    this.y = this.baseY + Math.round(Math.sin(this.time * 1.8) * 2);
    if (this.calm) {
      this.state = 'idle';
      return;
    }
    this.timer -= dt;
    const dx = player.x + player.w / 2 - this.centerX;
    if (this.state === 'idle' && this.timer <= 0) {
      if (Math.abs(dx) < 200) {
        this.facing = Math.sign(dx) || this.facing;
        this.state = 'inhale';
        this.timer = S.INHALE;
        this.sound = 'inhale';
      } else {
        this.timer = 0.4;
      }
    } else if (this.state === 'inhale' && this.timer <= 0) {
      this.state = 'blow';
      this.timer = S.BLOW;
      this.sound = 'gust';
    } else if (this.state === 'blow' && this.timer <= 0) {
      this.state = 'idle';
      this.timer = S.IDLE;
    }
  }

  // Área da rajada (em px), só enquanto sopra.
  get gustBox() {
    if (this.state !== 'blow' || !this.alive || this.calm) return null;
    const R = E.SOPRO.REACH;
    const x = this.facing > 0 ? this.x + this.w : this.x - R;
    return { x, y: this.y - 10, w: R, h: 34 };
  }

  // Força da rajada sobre um corpo (px/s), ou 0.
  gustAt(b) {
    const g = this.gustBox;
    if (!g) return 0;
    const inside = b.x < g.x + g.w && b.x + b.w > g.x && b.y < g.y + g.h && b.y + b.h > g.y;
    return inside ? this.facing * E.SOPRO.FORCE : 0;
  }

  draw(ctx) {
    const cx = Math.round(this.centerX);
    const cy = Math.round(this.centerY);
    ctx.save();
    ctx.translate(cx, cy);
    if (!this.alive) ctx.globalAlpha = Math.max(0, this.dying / 0.6);
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const k = (this.springTime || 0) / 0.25;
    let grow = 0;
    if (this.state === 'inhale') grow = Math.round((1 - this.timer / E.SOPRO.INHALE) * 3);
    ctx.scale(this.facing * (1 + 0.2 * k), 1 - 0.3 * k);
    const body = this.calm ? '#ffffff' : '#d8d0e8';
    const shade = this.calm ? '#ffe0b0' : '#a8a0c0';
    // Nuvem: três bolhas
    r(-8 - grow, -3 - grow, 16 + grow * 2, 8 + grow, body);
    r(-5 - grow, -7 - grow, 7 + grow, 5, body);
    r(1, -6 - grow, 6 + grow, 4, body);
    r(-8 - grow, 4, 16 + grow * 2, 2, shade);
    // Rosto
    if (this.calm) {
      r(-2, -1, 2, 1, '#6a4a5e');
      r(3, -1, 2, 1, '#6a4a5e');
      r(5, 2, 2, 1, '#ff9ad5');
    } else if (this.state === 'blow') {
      r(-1, -2, 2, 1, '#4a3045');
      r(3, -2, 2, 1, '#4a3045');
      r(7, 0, 2, 2, '#4a3045'); // boca soprando
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 3; i++) {
        const off = Math.round(((this.time * 120) + i * 30) % 80);
        r(10 + off, -4 + i * 4, 6, 1, '#ffffff');
      }
      ctx.globalAlpha = 1;
    } else {
      r(-1, -2, 2, 2, '#4a3045');
      r(3, -2, 2, 2, '#4a3045');
      if (this.state === 'inhale') r(6, 1, 1, 1, '#4a3045');
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------
// ECO VAZIO (Cidade e Santuário) — uma sombra do Nilo que repete o caminho
// dele com atraso. Não dá para pisar nela (é sombra): é preciso fugir...
// ou usar as próprias armadilhas: se um prédio aparecer em cima dela, ela se desfaz.
// Uma Pedra-Eco próxima também a desfaz (ela "lembra" de quem era).
// Estados: dormant (esperando o Nilo passar) → chasing → (defeat)
// ------------------------------------------------------------------
export class EcoVazio extends Enemy {
  constructor(tx, ty, T) {
    super(tx * T + (T - 10) / 2, (ty + 1) * T - 18, 10, 18);
    this.homeX = this.x;
    this.homeY = this.y;
    this.state = 'dormant';
    this.trail = [];
    this.facing = 1;
    this.pose = 'idle';
    this.delaySteps = Math.round(E.ECO.DELAY / CONFIG.STEP);
  }

  get harmless() {
    return this.calm || this.state !== 'chasing' || this.trail.length < this.delaySteps;
  }

  // Começa a perseguir: a sombra sai de onde está e "anda" até o caminho do Nilo.
  wake(player) {
    this.state = 'chasing';
    this.sound = 'shadow';
    this.trail = [];
    for (let i = 0; i < this.delaySteps; i++) {
      const k = i / this.delaySteps;
      const facing = player.x >= this.x ? 1 : -1;
      this.trail.push({ x: this.x + (player.x - this.x) * k, y: this.y + (player.y - this.y) * k, facing, pose: 'run' });
    }
  }

  // É uma sombra: pisar não funciona (o contato machuca).
  isStompedBy() {
    return false;
  }

  // Só uma sombra que JÁ está perseguindo se desfaz com a memória (uma adormecida nem percebe).
  remember() {
    if (this.alive && this.state === 'chasing') {
      super.remember();
      this.defeat();
    }
  }

  update(dt, level, player) {
    this.time += dt;
    if (!this.alive) {
      this.dying -= dt;
      return;
    }
    if (this.state === 'dormant') {
      if (this.calm) return;
      const passed = player.x > this.homeX + E.ECO.SPAWN_DISTANCE && Math.abs(player.y - this.homeY) < 120;
      if (passed && player.alive) this.wake(player);
      return;
    }
    // A sombra se cansa depois de um tempo perseguindo (e se desfaz em névoa).
    this.chaseTime = (this.chaseTime || 0) + dt;
    if (this.chaseTime > E.ECO.MAX_CHASE) {
      this.defeat();
      this.sound = 'dissolve';
      return;
    }
    this.trail.push({ x: player.x, y: player.y, facing: player.facing, pose: player.state });
    const p = this.trail.shift();
    this.x = p.x;
    this.y = p.y;
    this.facing = p.facing;
    this.pose = p.pose;

    // Presa dentro de um bloco sólido (um prédio que apareceu): se desfaz.
    const T = level.tile;
    // (mesma folga da colisão do Nilo: se o Nilo não caberia ali, a sombra também não cabe)
    for (let ty = Math.floor((this.y + 0.5) / T); ty <= Math.floor((this.y + this.h - 0.5) / T); ty++) {
      for (let tx = Math.floor((this.x + 0.5) / T); tx <= Math.floor((this.x + this.w - 0.5) / T); tx++) {
        if (level.isSolid(tx, ty)) {
          this.defeat();
          this.sound = 'dissolve';
          this.crushed = true;
          return;
        }
      }
    }
  }

  draw(ctx) {
    if (this.state === 'dormant') {
      // Uma poça de sombra no chão, que pulsa
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(this.time * 3);
      ctx.fillStyle = '#1a1028';
      ctx.fillRect(Math.round(this.homeX - 4), Math.round(this.homeY + this.h - 2), 18, 2);
      ctx.globalAlpha = 1;
      return;
    }
    const cx = Math.round(this.centerX);
    const feet = Math.round(this.y + this.h);
    ctx.save();
    ctx.translate(cx, feet);
    ctx.scale(this.facing, 1);
    let a = 0.85;
    if (!this.alive) a = Math.max(0, this.dying / 0.6);
    if (this.calm) a *= 0.4;
    ctx.globalAlpha = a;
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const dark = '#1a1028';
    const mid = '#2e1f45';
    const run = this.pose === 'run' && Math.sin(this.time * 20) > 0 ? 1 : 0;
    // Silhueta do Nilo, feita de névoa
    r(-4 + run, -5, 3, 5, dark);
    r(1 - run, -5, 3, 5, dark);
    r(-5, -12, 10, 7, mid);
    r(-5, -20, 10, 8, dark);
    r(-6, -22, 11, 3, dark);
    r(-8, -21, 2, 2, dark);
    for (let i = 0; i < 4; i++) r(-7 - i * 2, -13 + Math.round(Math.sin(this.time * 9 - i) * 1.5), 2, 2, mid);
    // Olhos violeta
    r(1, -17, 1, 2, '#b48cff');
    r(3, -17, 1, 2, '#b48cff');
    // Fiapos subindo
    ctx.globalAlpha = a * 0.5;
    r(-3 + Math.round(Math.sin(this.time * 4) * 2), -25 - Math.round((this.time * 12) % 6), 2, 2, mid);
    ctx.restore();
  }
}

// Cria os inimigos a partir das marcações do mapa.
// INIMIGO NOVO? Crie a classe acima, escolha uma letra em Level.js (ENTITY_CHARS)
// e registre a fábrica aqui. Nada mais precisa mudar.
const FACTORIES = {
  murcho: (e, T) => new Murcho(e.tx, e.ty, T),
  traca: (e, T) => new Traca(e.tx, e.ty, T),
  cristalideo: (e, T) => new Cristalideo(e.tx, e.ty, T),
  sopro: (e, T) => new Sopro(e.tx, e.ty, T),
  eco: (e, T) => new EcoVazio(e.tx, e.ty, T),
};

export function createEnemies(entities, T) {
  return entities.filter((e) => FACTORIES[e.type]).map((e) => FACTORIES[e.type](e, T));
}

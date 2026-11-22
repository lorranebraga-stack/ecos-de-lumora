// Nilo, o protagonista.
// Responsável por: ler a intenção do jogador, aplicar física, escolher
// o estado de animação e se desenhar (pixel art feita com retângulos).

import { CONFIG } from '../config.js';
import { moveAndCollide, approach } from './Physics.js';

const P = CONFIG.PLAYER;

// Paleta do Nilo. O cachecol laranja é a "assinatura" dele: é o único
// tom quente forte no Bosque, então o olho do jogador sempre o encontra.
const C = {
  boot: '#241d38',
  pants: '#3d4f7a',
  tunic: '#2e9c8c',
  tunicDark: '#1f6f66',
  belt: '#d9b25f',
  skin: '#f4cfa6',
  cheek: '#f29a8a',
  hood: '#4a3f9a',
  hoodDark: '#2b255f',
  eye: '#1a1426',
  scarf: '#ff8a3d',
  scarfDark: '#d9622a',
  gem: '#8ff7ff',
  gemCharged: '#ffd98a',
};

export class Player {
  constructor(x, y) {
    this.w = P.WIDTH;
    this.h = P.HEIGHT;
    this.facing = 1;
    this.maxHealth = P.MAX_HEALTH;
    this.health = P.MAX_HEALTH;
    this.alive = true;
    this.invuln = 0;     // segundos restantes de invulnerabilidade
    this.charged = false; // carrega um fragmento de memória? (a gema fica dourada)
    // Memórias restauradas: muda a aparência do Nilo.
    //   1 = fios dourados no cachecol · 2 = borda luminosa no capuz · 3 = aura de memória
    this.memoryLevel = 0;
    // Habilidades desbloqueadas (vêm do salvamento). Ex.: 'pulo-eco' = pulo duplo.
    this.abilities = new Set();
    this.airJumps = 0;
    // Vento (px/s) que a cena aplica neste passo: windX empurra, windY < 0 levanta.
    this.windX = 0;
    this.windY = 0;
    this.respawn({ x, y });
  }

  // Recoloca o Nilo num ponto, parado. NÃO mexe na energia:
  // quem decide se ele perdeu energia é a cena, via hurt().
  respawn(point) {
    this.x = point.x;
    this.y = point.y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpCutDone = true;
    this.running = false;
    this.hurtTimer = 0;  // segundos restantes sem controle (empurrão do dano)
    this.state = 'idle';
    this.animTime = 0;
    this.squash = 0; // tempo restante do "achatamento" ao aterrissar
  }

  // Recebe 1 de dano vindo de fromX (para saber para que lado empurrar).
  // Retorna true se o dano foi aplicado, false se estava invulnerável.
  hurt(fromX) {
    if (this.invuln > 0 || !this.alive) return false;
    this.health = Math.max(0, this.health - 1);
    if (this.health === 0) this.alive = false;
    this.invuln = P.INVULN_TIME;
    this.hurtTimer = P.HURT_TIME;
    const away = this.x + this.w / 2 < fromX ? -1 : 1;
    this.vx = away * P.KNOCKBACK_X;
    this.vy = -P.KNOCKBACK_Y;
    this.jumpCutDone = true;
    return true;
  }

  // Quique ao pisar num inimigo. Como o "corte do pulo" fica ativo,
  // segurar Espaço dá um quique alto; soltar dá um quique baixo.
  bounce(power = P.STOMP_BOUNCE) {
    this.vy = -power;
    this.jumpCutDone = false;
    this.coyote = 0;
  }

  // Fase concluída: o Nilo para e comemora com pulinhos.
  celebrate() {
    this.celebrating = true;
  }

  update(dt, input, level) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    const controllable = this.hurtTimer === 0 && this.alive && !this.celebrating;
    // "Eventos" deste passo: a cena lê para tocar sons e soltar poeira.
    this.justJumped = false;
    this.justLanded = false;
    this.justEchoJumped = false;

    // 1) Intenção horizontal
    let dir = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    if (!controllable) dir = 0;
    this.running = input.isDown('run');
    const maxSpeed = this.running ? P.RUN_SPEED : P.WALK_SPEED;

    if (dir !== 0) {
      const accel = this.onGround ? P.ACCEL_GROUND : P.ACCEL_AIR;
      this.vx = approach(this.vx, dir * maxSpeed, accel * dt);
      this.facing = dir;
    } else if (controllable) {
      const friction = this.onGround ? P.FRICTION_GROUND : P.ACCEL_AIR * 0.4;
      this.vx = approach(this.vx, 0, friction * dt);
    }
    // Durante o empurrão, vx não é freado: o Nilo voa para trás.

    // 2) Pulo com "coyote time" e "buffer"
    this.coyote = this.onGround ? P.COYOTE_TIME : Math.max(0, this.coyote - dt);
    if (input.wasPressed('jump')) this.jumpBuffer = P.JUMP_BUFFER;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    // Pulo-Eco: no chão, recarrega 1 pulo extra (se a habilidade foi desbloqueada).
    if (this.onGround) this.airJumps = this.abilities.has('pulo-eco') ? 1 : 0;

    if (controllable && this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = -P.JUMP_VELOCITY;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.jumpCutDone = false;
      this.justJumped = true;
    } else if (controllable && input.wasPressed('jump') && !this.onGround && this.coyote === 0 && this.airJumps > 0) {
      // Segundo pulo no ar: um "eco" do primeiro. Também vale o pulo variável.
      this.vy = -P.ECHO_JUMP_VELOCITY;
      this.airJumps--;
      this.jumpBuffer = 0;
      this.jumpCutDone = false;
      this.justEchoJumped = true;
    }

    // Pulo variável: soltar a tecla durante a subida corta a altura (uma vez).
    if (!this.jumpCutDone && this.vy < 0 && !input.isDown('jump')) {
      this.vy *= P.JUMP_CUT;
      this.jumpCutDone = true;
    }

    // 3) Gravidade (mais forte na descida)
    const g = this.vy > 0 ? P.GRAVITY * P.FALL_MULTIPLIER : P.GRAVITY;
    this.vy = Math.min(this.vy + g * dt, P.MAX_FALL);
    // Corrente de ar para cima: empurra contra a gravidade, até uma velocidade de subida máxima.
    if (this.windY < 0) this.vy = Math.max(this.vy + this.windY * dt, P.MAX_RISE);

    // 4) Mover e colidir. O vento horizontal desloca o Nilo sem mudar a "vontade" dele (vx).
    const wasOnGround = this.onGround;
    const fallSpeed = this.vy;
    const own = this.vx;
    if (this.windX) this.vx = own + this.windX;
    moveAndCollide(this, level, dt);
    if (this.windX) this.vx = this.vx === 0 ? 0 : own;
    if (!wasOnGround && this.onGround && fallSpeed > 120) {
      this.squash = 0.12;
      this.justLanded = true;
    }
    this.squash = Math.max(0, this.squash - dt);

    // 5) Estado de animação
    if (this.celebrating) {
      this.vx = approach(this.vx, 0, P.FRICTION_GROUND * dt);
      if (this.onGround) this.vy = -150; // pulinho de alegria
      this.state = 'victory';
    } else if (this.hurtTimer > 0 || !this.alive) this.state = 'hurt';
    else if (!this.onGround) this.state = this.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(this.vx) > 8) this.state = 'run';
    else this.state = 'idle';

    this.animTime += dt * (this.state === 'run' ? Math.abs(this.vx) / P.WALK_SPEED : 1);
  }

  draw(ctx, time) {
    // Invulnerável: pisca (some em quadros alternados) para o jogador perceber.
    if (this.alive && this.invuln > 0 && Math.floor(this.invuln * 16) % 2 === 0) return;

    const cx = Math.round(this.x + this.w / 2);
    const feet = Math.round(this.y + this.h);

    ctx.save();
    ctx.translate(cx, feet);

    // Achatar ao aterrissar, esticar ao pular: dá peso ao personagem.
    let sx = 1;
    let sy = 1;
    if (this.squash > 0) {
      const k = this.squash / 0.12;
      sx = 1 + 0.22 * k;
      sy = 1 - 0.18 * k;
    } else if (this.state === 'jump') {
      sx = 0.92;
      sy = 1.08;
    }
    ctx.scale(this.facing * sx, sy);

    const r = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };

    const moving = this.state !== 'idle';
    const phase = this.animTime * 11;
    // "u" desloca o tronco: respiração parado, sobe e desce ao correr.
    let u = 0;
    if (this.state === 'idle') u = Math.sin(time * 3) > 0.4 ? 1 : 0;
    if (this.state === 'run') u = Math.sin(phase * 2) > 0 ? 1 : 0;

    // Cachecol: tremula para trás em movimento, cai suavemente parado.
    for (let i = 0; i < 5; i++) {
      const wave = Math.sin(time * 9 - i * 0.9) * (moving ? 1.2 : 0.5);
      const droop = moving ? (this.state === 'fall' ? -i * 0.8 : i * 0.2) : i * 0.9;
      const sy = Math.round(-13 + u + wave + droop);
      r(-6 - i * 2, sy, 2, 2, i % 2 ? C.scarfDark : C.scarf);
      // Nível 1: fios dourados que piscam ao longo do cachecol
      if (this.memoryLevel >= 1 && i % 2 === 0) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 5 - i);
        r(-6 - i * 2, sy, 1, 1, C.gemCharged);
        ctx.globalAlpha = 1;
      }
    }

    // Braço de trás
    let arm = 0;
    if (this.state === 'run') arm = Math.round(Math.sin(phase) * 2);
    if (this.state === 'jump') arm = -2;
    if (this.state === 'fall') arm = -3;
    if (this.state === 'hurt') arm = -4;
    if (this.state === 'victory') arm = -6; // braços para o alto
    r(-6, -11 + u + arm, 2, 4, C.tunicDark);

    // Pernas
    let back = -4;
    let front = 1;
    let lift = 0;
    if (this.state === 'run') {
      const s = Math.round(Math.sin(phase) * 2);
      back = -4 + s;
      front = 1 - s;
    } else if (this.state === 'jump') {
      lift = 1;
      front = 2;
    } else if (this.state === 'fall') {
      back = -5;
      front = 2;
    } else if (this.state === 'hurt') {
      back = -6;
      front = 3;
      lift = 1;
    }
    r(back, -5 - lift, 3, 3, C.pants);
    r(back, -2 - lift, 3, 2, C.boot);
    r(front, -5, 3, 3, C.pants);
    r(front, -2, 3 + (this.state === 'run' ? 1 : 0), 2, C.boot);

    // Túnica e cinto
    r(-5, -12 + u, 10, 7, C.tunic);
    r(-5, -6 + u, 10, 1, C.tunicDark);
    r(-5, -8 + u, 10, 1, C.belt);

    // Gema da memória no peito: pulsa. É aqui que, mais tarde,
    // os fragmentos absorvidos vão "acender" o Nilo.
    // Com um fragmento guardado, a gema fica dourada e pulsa mais forte:
    // é o indicador de que a habilidade de ecoar está disponível.
    const gem = this.charged ? C.gemCharged : C.gem;
    ctx.globalAlpha = this.charged ? 0.5 + 0.4 * Math.sin(time * 6) : 0.35 + 0.25 * Math.sin(time * 4);
    r(this.charged ? -1 : 0, this.charged ? -13 + u : -12 + u, this.charged ? 6 : 4, this.charged ? 6 : 4, gem);
    ctx.globalAlpha = 1;
    r(1, -11 + u, 2, 2, gem);

    // Gola do cachecol
    r(-5, -13 + u, 10, 2, C.scarf);

    // Cabeça e capuz
    r(-5, -20 + u, 10, 7, C.skin);
    r(-6, -22 + u, 11, 3, C.hood);
    r(-6, -19 + u, 3, 6, C.hood);
    r(-6, -22 + u, 11, 1, C.hoodDark);
    r(-8, -21 + u, 2, 2, C.hood); // ponta do capuz para trás
    r(-3, -19 + u, 2, 1, C.hoodDark); // franja
    // Nível 2: a borda do capuz passa a brilhar
    if (this.memoryLevel >= 2) {
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time * 3);
      r(-6, -23 + u, 11, 1, C.gem);
      r(-8, -21 + u, 1, 1, C.gem);
      ctx.globalAlpha = 1;
    }

    // Olhos (piscam a cada ~3,5 s). No dano: olhos apertados, um tracinho.
    if (this.state === 'hurt') {
      r(0, -16 + u, 2, 1, C.eye);
      r(3, -16 + u, 2, 1, C.eye);
    } else if (this.state === 'victory') {
      // Olhos sorrindo: arquinhos ^ ^
      r(0, -16 + u, 1, 1, C.eye);
      r(1, -17 + u, 1, 1, C.eye);
      r(2, -16 + u, 1, 1, C.eye);
      r(3, -16 + u, 1, 1, C.eye);
      r(4, -17 + u, 1, 1, C.eye);
      r(5, -16 + u, 1, 1, C.eye);
    } else {
      const blink = (time % 3.5) < 0.12;
      r(1, blink ? -16 + u : -17 + u, 1, blink ? 1 : 2, C.eye);
      r(3, blink ? -16 + u : -17 + u, 1, blink ? 1 : 2, C.eye);
    }
    r(3, -15 + u, 1, 1, C.cheek);

    // Braço da frente (com a mão)
    r(3, -11 + u - arm, 2, 3, C.tunic);
    r(3, -8 + u - arm, 2, 1, C.skin);

    ctx.restore();
  }
}

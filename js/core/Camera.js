// Câmera que segue o Nilo com suavidade.
//
// - Olha à frente: mostra mais cenário na direção em que ele corre.
// - Zona morta vertical: no ar, a câmera não "pula junto" a cada salto;
//   ela só acompanha quando ele pisa no chão ou se aproxima da borda da tela.
// - Nunca mostra nada fora da fase (sem faixas vazias nas bordas).

import { CONFIG } from '../config.js';

export class Camera {
  constructor(level) {
    this.level = level;
    this.w = CONFIG.WIDTH;
    this.h = CONFIG.HEIGHT;
    this.x = 0;
    this.y = 0;
    this.lookAhead = 0;
    this.shakeTime = 0;
    this.shakeAmount = 0;
    this.locked = null;
  }

  // Tremor curto (dano, impacto). amount em pixels, duration em segundos.
  shake(amount, duration) {
    this.shakeAmount = amount;
    this.shakeTime = duration;
  }

  targetX(player) {
    return player.x + player.w / 2 + this.lookAhead - this.w / 2;
  }

  targetY(player) {
    // O Nilo fica um pouco abaixo do centro: o jogador vê mais o que está acima.
    return player.y + player.h / 2 - this.h * 0.58;
  }

  update(dt, player) {
    const C = CONFIG.CAMERA;
    this.shakeTime = Math.max(0, this.shakeTime - dt);

    if (Math.abs(player.vx) > 20) {
      const wanted = Math.sign(player.vx) * C.LOOK_AHEAD;
      this.lookAhead += (wanted - this.lookAhead) * smooth(C.LOOK_SPEED, dt);
    }

    this.x += (this.targetX(player) - this.x) * smooth(C.FOLLOW_X, dt);

    const onScreenY = player.y - this.y;
    const nearEdge = onScreenY < C.TOP_MARGIN || onScreenY + player.h > this.h - C.BOTTOM_MARGIN;
    if (player.onGround || nearEdge) {
      this.y += (this.targetY(player) - this.y) * smooth(C.FOLLOW_Y, dt);
    }

    this.clamp();
  }

  // Posiciona a câmera de uma vez (início da fase, renascimento).
  snap(player) {
    this.lookAhead = 0;
    this.x = this.targetX(player);
    this.y = this.targetY(player);
    this.clamp();
  }

  // Prende a câmera horizontalmente num trecho (ex.: arena de chefe).
  lock(minX, maxX) {
    this.locked = { minX, maxX };
  }

  unlock() {
    this.locked = null;
  }

  clamp() {
    const maxX = this.level.pixelWidth - this.w;
    const maxY = this.level.pixelHeight - this.h;
    // Fase menor que a tela: centraliza. Maior: prende nas bordas.
    this.x = maxX < 0 ? maxX / 2 : Math.min(Math.max(this.x, 0), maxX);
    this.y = maxY < 0 ? maxY / 2 : Math.min(Math.max(this.y, 0), maxY);
    if (this.locked) this.x = Math.min(Math.max(this.x, this.locked.minX), this.locked.maxX);
  }

  // Posição arredondada: evita que a pixel art "trema" entre pixels.
  // O tremor é somado aqui e preso aos limites da fase, para nunca mostrar o vazio.
  get view() {
    let x = this.x;
    let y = this.y;
    if (this.shakeTime > 0) {
      x += (Math.random() * 2 - 1) * this.shakeAmount;
      y += (Math.random() * 2 - 1) * this.shakeAmount;
      const maxX = Math.max(0, this.level.pixelWidth - this.w);
      const maxY = Math.max(0, this.level.pixelHeight - this.h);
      x = Math.min(Math.max(x, 0), maxX);
      y = Math.min(Math.max(y, 0), maxY);
    }
    return { x: Math.round(x), y: Math.round(y), w: this.w, h: this.h };
  }
}

// Suavização que independe da taxa de quadros:
// a cada segundo, a câmera percorre a mesma fração da distância.
function smooth(rate, dt) {
  return 1 - Math.exp(-rate * dt);
}

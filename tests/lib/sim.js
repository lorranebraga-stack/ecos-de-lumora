// Ferramentas para simular o jogo sem desenhar nada:
// um "teclado de mentira", mapas pequenos de teste e passos de física.

import { Level } from '../../js/game/Level.js';
import { Player } from '../../js/game/Player.js';
import { CONFIG } from '../../js/config.js';

export const DT = CONFIG.STEP;
export const T = CONFIG.TILE;

// Teclado de mentira: hold('right') segura, press('jump') aperta neste passo.
export class FakeInput {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
  }
  hold(...actions) { actions.forEach((a) => this.held.add(a)); return this; }
  release(...actions) { actions.forEach((a) => this.held.delete(a)); return this; }
  press(action) { this.pressed.add(action); this.held.add(action); return this; }
  isDown(a) { return this.held.has(a); }
  wasPressed(a) { return this.pressed.has(a); }
  endStep() { this.pressed.clear(); }
}

// Cria uma fase a partir de linhas de texto (precisa ter um 'P').
export function levelFrom(rows, name = 'teste') {
  return new Level({ name, map: rows });
}

// Cria o Nilo no 'P' da fase e deixa ele assentar no chão.
export function spawnPlayer(level, settleFrames = 30) {
  const p = new Player(level.spawn.x, level.spawn.y);
  const input = new FakeInput();
  steps(p, level, input, settleFrames);
  return { p, input };
}

// Avança N passos de física. onStep(p, i) é opcional (para medir coisas).
export function steps(p, level, input, n, onStep) {
  for (let i = 0; i < n; i++) {
    p.update(DT, input, level);
    input.endStep();
    if (onStep) onStep(p, i);
  }
}

// O corpo está ocupando algum bloco sólido? (nunca deveria)
export function insideSolid(body, level) {
  const x0 = Math.floor(body.x / T);
  const x1 = Math.floor((body.x + body.w - 0.01) / T);
  const y0 = Math.floor(body.y / T);
  const y1 = Math.floor((body.y + body.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tx >= 0 && tx < level.cols && level.isSolid(tx, ty)) return true;
    }
  }
  return false;
}

// Linha de mapa com '#' nas bordas e um miolo repetido.
export const row = (inner, width) => `#${inner.repeat(width - 2).slice(0, width - 2)}#`;

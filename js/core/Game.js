// Coração técnico do jogo: o laço principal e a troca de cenas.
//
// Usamos "passo fixo": a física sempre avança em fatias de 1/60 s,
// mesmo num monitor de 144 Hz ou num computador lento. Assim o pulo
// tem sempre a mesma altura em qualquer máquina.

import { CONFIG } from '../config.js';

const FADE_MS = 320; // duração do escurecimento entre cenas (igual ao CSS de #fade)

export class Game {
  // options.fadeEl: elemento HTML que escurece a tela nas trocas de cena
  // options.audio:  AudioEngine (as cenas tocam sons através de game.audio)
  constructor(canvas, input, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.input = input;
    this.fadeEl = options.fadeEl || null;
    this.audio = options.audio || null;

    this.factories = {};
    this.scene = null;
    this.transitioning = false;
    this.accumulator = 0;
    this.lastTime = 0;
  }

  // Toca um efeito, se houver áudio.
  sfx(name, opt) {
    if (this.audio) this.audio.play(name, opt);
  }

  // Registra uma cena pelo nome. A fábrica cria uma cena nova a cada entrada,
  // então "Novo jogo" sempre começa limpo.
  register(name, factory) {
    this.factories[name] = factory;
  }

  // Troca de cena com escurecimento: a tela escurece, a cena muda, a tela clareia.
  // A primeira cena (ou options.instant) entra sem escurecer.
  go(name, params, { instant = false } = {}) {
    if (!this.factories[name]) throw new Error(`Cena desconhecida: "${name}"`);
    if (this.transitioning) return; // ignora cliques duplos durante a transição
    if (instant || !this.fadeEl || !this.scene) {
      this.switchTo(name, params);
      return;
    }
    this.transitioning = true;
    this.fadeEl.classList.add('on');
    setTimeout(() => {
      this.switchTo(name, params);
      this.fadeEl.classList.remove('on');
      this.transitioning = false;
    }, FADE_MS);
  }

  switchTo(name, params) {
    if (this.scene && this.scene.exit) this.scene.exit();
    this.scene = this.factories[name](params);
    if (this.scene.enter) this.scene.enter();
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  frame(now) {
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    // Se a aba ficou escondida, não tente "recuperar" segundos de física de uma vez.
    if (dt > 0.25) dt = 0.25;

    this.accumulator += dt;
    while (this.accumulator >= CONFIG.STEP) {
      if (this.scene) this.scene.update(CONFIG.STEP);
      this.input.endStep();
      this.accumulator -= CONFIG.STEP;
    }

    if (this.scene) this.scene.draw(this.ctx);
    requestAnimationFrame((t) => this.frame(t));
  }
}

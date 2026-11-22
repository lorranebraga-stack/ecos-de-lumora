// Caixa de diálogo: retrato, nome e texto que aparece letra por letra.
//
// Uso:  dialog.open(falas, aoTerminar)
//   falas = [{ who: 'mira', name: 'Mira', text: '...' }, ...]
//   who = 'nilo' | 'mira' | 'vulto' | 'narrador' (narrador não tem retrato)
//
// Controles: Espaço / Enter / E. O primeiro toque completa a fala;
// o segundo passa para a próxima.

import { CONFIG } from '../config.js';
import { drawPortrait, PORTRAIT_SIZE } from './Portraits.js';

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado no index.html`);
  return el;
};

const PAUSE_AFTER = '.!?…';

export class DialogBox {
  constructor() {
    this.root = $('dialog');
    this.nameEl = $('dialog-name');
    this.textEl = $('dialog-text');
    this.nextEl = $('dialog-next');
    this.portrait = $('dialog-portrait');
    this.portrait.width = PORTRAIT_SIZE;
    this.portrait.height = PORTRAIT_SIZE;
    this.pctx = this.portrait.getContext('2d');

    this.lines = [];
    this.index = 0;
    this.shown = 0;      // quantas letras já aparecem
    this.wait = 0;       // pausa de pontuação restante
    this.onDone = null;
    this.time = 0;
    this.onType = null; // função opcional (falante) => {}, chamada enquanto as letras aparecem
  }

  get active() {
    return this.lines.length > 0;
  }

  open(lines, onDone = null) {
    this.lines = lines;
    this.onDone = onDone;
    this.index = 0;
    this.root.classList.remove('hidden');
    this.startLine();
  }

  startLine() {
    const line = this.lines[this.index];
    this.shown = 0;
    this.wait = 0;
    this.nameEl.textContent = line.name || '';
    this.nameEl.className = `dialog-name who-${line.who}`;
    this.root.classList.toggle('narrator', line.who === 'narrador');
    this.textEl.textContent = '';
    this.nextEl.classList.add('hidden');
    this.renderPortrait();
  }

  get currentText() {
    return this.lines[this.index].text;
  }

  get lineComplete() {
    return this.shown >= this.currentText.length;
  }

  renderPortrait() {
    const has = drawPortrait(this.pctx, this.lines[this.index].who, this.time);
    this.portrait.classList.toggle('hidden', !has);
  }

  update(dt, input) {
    if (!this.active) return;
    this.time += dt;
    this.renderPortrait();

    if (input.wasPressed('confirm')) {
      if (!this.lineComplete) {
        this.shown = this.currentText.length; // completa a fala de uma vez
      } else if (this.index < this.lines.length - 1) {
        this.index++;
        this.startLine();
        return;
      } else {
        this.close();
        return;
      }
    }

    // Revela letras no ritmo configurado, pausando depois de pontuação.
    if (!this.lineComplete) {
      if (this.wait > 0) {
        this.wait -= dt;
      } else {
        const before = Math.floor(this.shown);
        this.shown = Math.min(this.currentText.length, this.shown + CONFIG.DIALOG.CHARS_PER_SECOND * dt);
        const after = Math.floor(this.shown);
        if (after > before && PAUSE_AFTER.includes(this.currentText[after - 1])) {
          this.wait = CONFIG.DIALOG.PUNCTUATION_PAUSE;
        }
        // "Voz" do personagem: um bipe a cada duas letras (não em espaços)
        if (this.onType && after > before && after % 2 === 0 && this.currentText[after - 1] !== ' ') {
          this.onType(this.lines[this.index].who);
        }
      }
    }

    const visible = this.currentText.slice(0, Math.floor(this.shown));
    if (this.textEl.textContent !== visible) this.textEl.textContent = visible;
    this.nextEl.classList.toggle('hidden', !this.lineComplete);
  }

  close() {
    this.lines = [];
    this.root.classList.add('hidden');
    const done = this.onDone;
    this.onDone = null;
    if (done) done();
  }

  // Fecha sem chamar o "aoTerminar" (ex.: ao sair da fase).
  hide() {
    this.lines = [];
    this.onDone = null;
    this.root.classList.add('hidden');
  }
}

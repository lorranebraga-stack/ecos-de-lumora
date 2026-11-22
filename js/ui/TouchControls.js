// Controles de toque para celular e tablet.
//
// Lado esquerdo: ◀ ▶ — dá para DESLIZAR o dedo de um para o outro sem soltar.
// Lado direito:  Pular (grande), Correr (segurar), Ecoar (E) e Pausa.
//
// Cada dedo é acompanhado separadamente (Pointer Events), então dá para andar
// e pular ao mesmo tempo. Os botões só ligam e desligam AÇÕES no Input; o jogo
// nem sabe se a ação veio do teclado ou da tela.
//
// Alguns botões disparam mais de uma ação: Pular também avança diálogos
// ("confirm"), e Ecoar também ("confirm"), como Espaço e E no teclado.

const ACTIONS = {
  left: ['left'],
  right: ['right'],
  jump: ['jump', 'confirm'],
  run: ['run'],
  interact: ['interact', 'confirm'],
  pause: ['pause'],
};

export function isTouchDevice() {
  return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
}

export class TouchControls {
  constructor(input, root) {
    this.input = input;
    this.root = root;
    this.fingers = new Map(); // pointerId → nome do botão sob o dedo

    root.addEventListener('pointerdown', (e) => this.onDown(e));
    root.addEventListener('pointermove', (e) => this.onMove(e));
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      root.addEventListener(type, (e) => this.onUp(e));
    }
    // Sem menu de "copiar/salvar imagem" ao segurar o dedo
    root.addEventListener('contextmenu', (e) => e.preventDefault());

    // Qualquer toque na tela liga o modo toque (mesmo em notebooks com tela sensível).
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') this.enable();
    }, { capture: true });
    if (isTouchDevice()) this.enable();
  }

  enable() {
    if (this.input.touchMode) return;
    this.input.touchMode = true;
    document.body.classList.add('touch');
  }

  // Qual botão está sob o ponto (x, y)? Só vale botão deste controle.
  buttonAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const btn = el && el.closest('[data-touch]');
    return btn && this.root.contains(btn) ? btn : null;
  }

  press(name, on) {
    for (const action of ACTIONS[name]) this.input.setVirtual(action, on);
    const btn = this.root.querySelector(`[data-touch="${name}"]`);
    if (btn) btn.classList.toggle('active', on);
  }

  onDown(e) {
    const btn = e.target.closest('[data-touch]');
    if (!btn) return;
    e.preventDefault();
    this.enable();
    try { btn.setPointerCapture(e.pointerId); } catch { /* alguns navegadores não deixam */ }
    const name = btn.dataset.touch;
    this.fingers.set(e.pointerId, name);
    this.press(name, true);
    if (navigator.vibrate && name === 'jump') navigator.vibrate(8); // "clique" sutil no Android
  }

  // Deslizar o dedo de ◀ para ▶ troca a direção sem precisar soltar.
  onMove(e) {
    const current = this.fingers.get(e.pointerId);
    if (!current || (current !== 'left' && current !== 'right')) return;
    const btn = this.buttonAt(e.clientX, e.clientY);
    const next = btn && btn.dataset.touch;
    if (next && next !== current && (next === 'left' || next === 'right')) {
      this.press(current, false);
      this.press(next, true);
      this.fingers.set(e.pointerId, next);
    }
  }

  onUp(e) {
    const name = this.fingers.get(e.pointerId);
    if (!name) return;
    this.fingers.delete(e.pointerId);
    // Só solta se nenhum outro dedo estiver no mesmo botão
    if (![...this.fingers.values()].includes(name)) this.press(name, false);
  }

  releaseAll() {
    for (const name of new Set(this.fingers.values())) this.press(name, false);
    this.fingers.clear();
  }
}

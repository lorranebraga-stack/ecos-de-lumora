// Lê o teclado (e os botões de toque) e traduz tudo em AÇÕES do jogo ("left", "jump"...).
// O resto do código nunca pergunta por "Space" nem por "dedo na tela"; pergunta por "jump".
// Por isso os controles de toque funcionam sem mudar nada no Nilo, nos menus ou nos diálogos.

export class Input {
  constructor(bindings) {
    this.bindings = bindings;
    this.down = new Set();     // teclas seguradas agora
    this.pressed = new Set();  // teclas apertadas desde o último passo da simulação
    this.gameCodes = new Set(Object.values(bindings).flat());

    // Ações "virtuais": vêm dos botões na tela (TouchControls.js).
    this.virtualDown = new Set();
    this.virtualPressed = new Set();
    this.touchMode = false; // true quando o jogador está usando toque

    window.addEventListener('keydown', (e) => {
      // Impede que Espaço e setas rolem a página.
      if (this.gameCodes.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
    });

    // Se a janela perde o foco com uma tecla segurada, o keyup nunca chega.
    // Limpar evita o "personagem andando sozinho".
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
  }

  releaseAll() {
    this.down.clear();
    this.pressed.clear();
    this.virtualDown.clear();
    this.virtualPressed.clear();
  }

  // Liga/desliga uma ação virtual (um botão na tela foi tocado ou solto).
  setVirtual(action, isDown) {
    if (isDown) {
      if (!this.virtualDown.has(action)) this.virtualPressed.add(action);
      this.virtualDown.add(action);
    } else {
      this.virtualDown.delete(action);
    }
  }

  isDown(action) {
    return this.virtualDown.has(action) || this.bindings[action].some((code) => this.down.has(code));
  }

  wasPressed(action) {
    return this.virtualPressed.has(action) || this.bindings[action].some((code) => this.pressed.has(code));
  }

  // Chamado pelo Game ao fim de cada passo da simulação.
  endStep() {
    this.pressed.clear();
    this.virtualPressed.clear();
  }
}

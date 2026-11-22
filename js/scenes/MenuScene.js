// Menu principal: o céu de Lumora animado ao fundo, botões em HTML por cima.
// params.panel = 'map' abre direto no Mapa de Lumora (usado após concluir uma fase).

import { Background } from '../game/Background.js';
import { showMenu, hideMenu } from '../ui/Screens.js';

export class MenuScene {
  constructor(game, menu, params = {}) {
    this.game = game;
    this.menu = menu;
    this.params = params;
    this.bg = new Background(3);
    this.time = 0;
  }

  enter() {
    if (this.game.audio) {
      this.game.audio.duck(false);
      this.game.audio.playMusic('menu');
    }
    showMenu();
    if (this.params.panel === 'map') this.menu.openMap();
    else this.menu.openMain();
  }

  exit() {
    hideMenu();
  }

  update(dt) {
    this.time += dt;
    this.bg.update(dt);
  }

  // Uma "câmera" imaginária desliza devagar: o menu exibe o parallax.
  draw(ctx) {
    const camX = this.time * 14;
    this.bg.draw(ctx, this.time, camX, 0);
    this.bg.drawFront(ctx, this.time, camX);
  }
}

// Menu principal: Continuar, Novo jogo (com confirmação), Mapa de Lumora,
// Configurações (apagar progresso com confirmação), Controles e Créditos.
// Ele lê o Progress para decidir o que mostrar; quem inicia as partidas
// é o main.js, através das funções em "actions".

import { REGIONS } from '../levels/regions.js';
import { showMenuPanel, formatTime, starText } from './Screens.js';

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado no index.html`);
  return el;
};

export class Menu {
  // actions: { newGame(), continueGame(run), playRegion(id) }
  constructor(progress, actions) {
    this.progress = progress;
    this.actions = actions;

    const on = (id, fn) => $(id).addEventListener('click', fn);
    on('btn-continue', () => this.actions.continueGame(this.progress.currentRun));
    on('btn-new', () => {
      if (this.progress.currentRun) showMenuPanel('menu-confirm-new');
      else this.actions.newGame();
    });
    on('btn-confirm-new', () => this.actions.newGame());
    on('btn-map', () => this.openMap());
    on('btn-settings', () => this.openSettings());
    on('btn-controls', () => showMenuPanel('menu-controls'));
    on('btn-credits', () => showMenuPanel('menu-credits'));
    on('btn-erase', () => showMenuPanel('menu-confirm-erase'));
    on('btn-cancel-erase', () => this.openSettings());
    on('btn-confirm-erase', () => {
      this.progress.eraseAll();
      this.refresh();
      this.openSettings();
      $('save-status').textContent = 'Progresso apagado.';
    });
    document.querySelectorAll('#menu [data-back]').forEach((b) =>
      b.addEventListener('click', () => this.openMain()),
    );
  }

  regionName(id) {
    const r = REGIONS.find((x) => x.id === id);
    return r ? r.name : id;
  }

  // Atualiza o botão Continuar conforme o salvamento.
  refresh() {
    const run = this.progress.currentRun;
    $('btn-continue').classList.toggle('hidden', !run);
    if (run) {
      $('continue-detail').textContent = `${this.regionName(run.level)} · ${formatTime(run.snapshot.playTime)} jogados`;
    }
  }

  openMain() {
    this.refresh();
    showMenuPanel('menu-main');
  }

  openSettings() {
    $('save-status').textContent = this.progress.canPersist
      ? 'Salvamento automático: ativo (nas lanternas e nas Pedras-Eco).'
      : 'Salvamento indisponível neste navegador (talvez em modo anônimo). O progresso vale só até fechar a aba.';
    showMenuPanel('menu-settings');
  }

  openMap() {
    $('map-stars').textContent = `Estrelas da Aurora: ${this.progress.totalStars()}/${this.progress.maxStars()} · cada região tem 3: concluir, todos os cristais e o Eco Escondido.`;
    const list = $('region-list');
    list.innerHTML = '';
    for (const r of REGIONS) {
      const info = this.progress.levelInfo(r.id);
      const unlocked = this.progress.isUnlocked(r.id);
      const li = document.createElement('li');
      let status = 'Bloqueada';
      if (unlocked && !r.implemented) status = 'Caminho aberto · em construção';
      if (unlocked && r.implemented) status = r.preview ? 'Prévia jogável' : 'Disponível';
      if (info.completed) {
        const c = info.bestCrystals;
        const stars = starText(info.stars || [true, false, false]);
        status = `${stars} · recorde ${info.bestScore} pts · ${formatTime(info.bestTime)} · ${c} ${c === 1 ? 'cristal' : 'cristais'}`;
        li.classList.add('done');
      }
      if (!unlocked) li.classList.add('locked');

      const label = document.createElement('div');
      const name = document.createElement('span');
      name.className = 'region-name';
      name.textContent = `${r.number}. ${r.name}`;
      const st = document.createElement('span');
      st.className = 'region-status';
      st.textContent = status;
      label.append(name, st);
      li.append(label);

      if (unlocked && r.implemented) {
        const play = document.createElement('button');
        play.textContent = 'Jogar';
        play.addEventListener('click', () => this.actions.playRegion(r.id));
        li.append(play);
      }
      list.append(li);
    }
    showMenuPanel('menu-map');
  }
}

// Cena genérica de fase: recebe os dados de uma região (mapa + nome),
// o roteiro dela (opcional) e junta fundo, câmera, fase, Nilo, inimigos,
// cristais, memória, checkpoints, personagens, diálogos e HUD.
// Novas regiões reutilizam esta cena.
//
// options:
//   levelId    — identificador da região ('bosque'), usado no salvamento
//   progress   — objeto Progress (salvamento); pode faltar em testes
//   skipIntro  — pula o prólogo
//   restore    — "foto" de um checkpoint para continuar de onde parou
//   abilities  — habilidades do Nilo (padrão: as do salvamento)
//
// levelData pode trazer: theme (tema visual), shrineAbility (o que o altar 'A' ensina),
// boss (qual chefe o 'Q' representa) e wind (correntes de ar, veja Mechanics.js).

import { CONFIG } from '../config.js';
import { Background } from '../game/Background.js';
import { Level } from '../game/Level.js';
import { Player } from '../game/Player.js';
import { Collectibles } from '../game/Collectibles.js';
import { createEnemies, EcoVazio } from '../game/Enemy.js';
import { Particles } from '../game/Particles.js';
import { MemorySystem } from '../game/MemorySystem.js';
import { createLanterns } from '../game/Checkpoint.js';
import { AbilityShrine } from '../game/AbilityShrine.js';
import { createBoss } from '../game/bosses/index.js';
import { WindSystem, CrumbleSystem, Clock, SecretEcho } from '../game/Mechanics.js';
import { Missions } from '../game/Missions.js';
import { REGIONS } from '../levels/regions.js';
import { Camera } from '../core/Camera.js';
import { Mira } from '../game/Mira.js';
import { Vulto } from '../game/Vulto.js';
import { StoryDirector } from '../story/StoryDirector.js';
import { HUD } from '../ui/HUD.js';
import { DialogBox } from '../ui/DialogBox.js';
import {
  setPaused, showDefeat, hideDefeat, showComplete, hideComplete, releaseFocus, setPauseMission,
} from '../ui/Screens.js';

const HINT = 'A/D mover · Espaço pular · Shift correr · Esc pausar';
const HINT_TOUCH = '◀ ▶ mover · ⤒ pular · » correr · ❚❚ pausar';
const DEFEAT_DELAY = 1.1;    // segundos entre perder a última energia e a tela de derrota
const COMPLETE_DELAY = 1.8;  // segundos de comemoração antes da tela de conclusão
const ALL_CRYSTALS_BONUS = 500;

// Textos das habilidades (aviso ao aprender). Habilidade nova? Acrescente aqui.
const ABILITY_INFO = {
  'pulo-eco': 'Nova habilidade: Pulo-Eco · pule de novo no ar',
};
const SUMMON_TTL = 6; // segundos que um Eco Vazio chamado pelo Vulto dura

export class LevelScene {
  constructor(game, levelData, story = null, options = {}) {
    this.game = game;
    this.story = story;
    this.options = options;
    this.levelId = options.levelId || 'fase';
    this.levelData = levelData;
    this.progress = options.progress || null;
    this.level = new Level(levelData);
    const T = this.level.tile;

    this.bg = new Background(11, this.level.theme);
    this.player = new Player(this.level.spawn.x, this.level.spawn.y);
    // Habilidades vêm do salvamento: o que foi aprendido vale em todas as regiões.
    this.player.abilities = new Set(options.abilities || (this.progress ? this.progress.data.abilities : []));
    this.shrines = this.level.entities
      .filter((e) => e.type === 'shrine')
      .map((e) => new AbilityShrine(e.tx, e.ty, T, levelData.shrineAbility || 'pulo-eco'));
    for (const s of this.shrines) s.taken = this.player.abilities.has(s.ability);
    this.collectibles = new Collectibles(this.level.entities, T);
    this.allEnemies = createEnemies(this.level.entities, T);
    this.allEnemies.forEach((e, i) => { e.id = i; }); // id estável, para o salvamento
    this.enemies = [...this.allEnemies];
    this.particles = new Particles();
    this.memory = new MemorySystem(this.level, this.particles);
    this.memory.assignEnemies(this.enemies);
    this.lanterns = createLanterns(this.level.entities, T);
    // Mecânicas das regiões novas (só agem se a fase tiver as peças)
    this.wind = new WindSystem(levelData.wind, T);
    this.crumble = new CrumbleSystem(this.level);
    this.crumble.onFall = (x, y) => {
      this.game.sfx('crumble');
      this.particles.burst(x, y, { count: 8, colors: [this.level.pal.crumble, this.level.pal.crumbleTop], speed: 40, life: 0.8, gravity: 300, size: 2 });
    };
    this.clocks = this.level.entities.filter((e) => e.type === 'clock').map((e) => new Clock(e.tx, e.ty, T));
    this.secrets = this.level.entities.filter((e) => e.type === 'secret').map((e) => new SecretEcho(e.tx, e.ty, T));
    this.secretFound = false;
    this.secretPassageSeen = false;
    this.pendingToggle = 0; // o Arquivista pediu para trocar a cidade (tenta de novo se o Nilo estiver no caminho)
    this.missions = new Missions(story);
    this.missions.onComplete = (o) => {
      this.game.sfx('objective');
      this.hud.toast(`Objetivo concluído · ${o.text}`);
    };
    this.camera = new Camera(this.level);
    this.hud = new HUD();
    this.dialog = new DialogBox();
    this.setupStory(T);
    this.setupBoss(T);

    // Sons ligados a sistemas que não conhecem o áudio
    this.memory.onTileChange = (c) => game.sfx(c === 'X' ? 'dissolve' : 'tile');
    this.dialog.onType = (who) => game.sfx('blip', { who });

    // Ponto seguro: último chão firme (para quedas e espinhos).
    this.safePoint = { ...this.level.spawn };
    // Checkpoint: onde a partida recomeça depois de uma derrota.
    this.checkpoint = null;
    this.lastSnapshot = null;

    this.state = 'playing'; // 'playing' | 'defeat' | 'complete'
    this.stateTimer = 0;
    this.overlayShown = false;
    this.paused = false;
    this.reachedExit = false;
    this.score = 0;
    this.playTime = 0; // só conta enquanto se joga (sem pausa nem diálogo)
    this.time = 0;

    // Dicas no topo da tela: uma mensagem temporária tem prioridade,
    // depois a dica da Pedra-Eco por perto, depois a dica padrão.
    this.baseHint = HINT;
    this.message = '';
    this.messageTimer = 0;

    if (options.restore) this.restore(options.restore);
    this.camera.snap(this.player);
  }

  say(text, seconds = 3) {
    this.message = text;
    this.messageTimer = seconds;
  }

  // ---------- História ----------

  // Personagens e diretor só existem se a região tiver roteiro.
  setupStory(T) {
    this.director = null;
    this.mira = null;
    this.vulto = null;
    if (!this.story) return;

    const s = this.story;
    this.mira = new Mira(s.miraSpot.col * T + T / 2, s.miraSpot.row * T + T / 2);
    this.vulto = s.vultoSpot ? new Vulto(s.vultoSpot.col * T + T, (s.vultoSpot.row + 1) * T) : null;
    this.director = new StoryDirector(s, {
      dialog: this.dialog,
      tile: T,
      // Ao abrir um diálogo, o Nilo para (sem deslizar quando o jogo voltar).
      onOpen: () => {
        this.player.vx = 0;
        this.player.state = 'idle';
        this.hud.hideRegionCard();
      },
      onAction: (name) => this.storyAction(name),
    });
    // Flags que já valem desde o início da região (ex.: a Mira já acompanha o Nilo).
    for (const flag of s.startFlags || []) this.director.setFlag(flag);
    if (this.director.flags.has('miraJoined')) this.mira.follow();
  }

  // ---------- Chefe ----------

  // Um 'Q' no mapa vira o chefe. A arena é o trecho de 30 colunas onde ele está.
  setupBoss(T) {
    this.boss = null;
    const q = this.level.entities.find((e) => e.type === 'boss');
    if (!q) return;
    const start = Math.floor(q.tx / 30) * 30;
    let ceiling = 0;
    while (this.level.isSolid(start + 2, ceiling + 1) || this.level.isSolid(start + 2, ceiling)) ceiling++;
    const floorRow = q.ty + 1;
    this.arena = {
      start,
      gateCol: start + 1,
      left: (start + 2) * T,
      right: (start + 29) * T,
      ceiling: ceiling * T,
      floor: floorRow * T,
    };
    this.boss = createBoss(this.levelData.boss, q.tx, q.ty, T, this.arena);
    this.bossFight = false;
    this.level.exitHidden = true; // a saída só aparece quando o chefe se acalma
  }

  startBossFight() {
    const a = this.arena;
    const T = this.level.tile;
    this.bossFight = true;
    // Fecha o portão atrás do Nilo e prende a câmera na arena.
    for (let ty = a.ceiling / T; ty < a.floor / T; ty++) {
      if (!this.level.isSolid(a.gateCol, ty)) this.level.setTile(a.gateCol, ty, 'G');
    }
    // A arena tem 30 colunas; se a tela for mais larga (celular), centraliza nela
    // sem mostrar nada fora da fase.
    const maxX = Math.max(0, this.level.pixelWidth - this.camera.w);
    const lockX = Math.min(maxX, Math.max(0, a.start * T - (this.camera.w - 30 * T) / 2));
    this.camera.lock(lockX, lockX);
    this.hud.showBoss(this.boss.name, this.boss.hp, this.boss.maxHp);
    if (this.game.audio) this.game.audio.playMusic('chefe');
    this.game.sfx('crash');
    this.camera.shake(3, 0.4);
    if (this.director && this.story.dialogs.bossIntro) this.director.play('bossIntro', { after: 'bossStart' });
    else this.boss.start();
  }

  updateBoss(dt) {
    const b = this.boss;
    if (!b) return;
    const p = this.player;
    if (!this.bossFight && p.onGround && p.x > (this.arena.start + 3) * this.level.tile) this.startBossFight();
    b.update(dt, p);
    this.handleBossEvents();
    if (b.defeated || b.state === 'sleep') return;

    if (b.overlaps(p)) {
      if (b.vulnerable && b.isStompedBy(p)) {
        b.hit();
        p.bounce();
      } else if (!b.harmless && p.hurt(b.x + b.w / 2)) {
        this.onDamage();
      }
    }
    if (b.hazardHits(p) && p.hurt(p.x + p.w / 2)) this.onDamage();
  }

  handleBossEvents() {
    const b = this.boss;
    for (const ev of b.events) {
      if (ev.type === 'roar') this.game.sfx('roar');
      else if (ev.type === 'windup') this.game.sfx('rumble');
      else if (ev.type === 'charge') this.game.sfx('dive');
      else if (ev.type === 'rain') this.game.sfx('shardwarn');
      else if (ev.type === 'thunderwarn') this.game.sfx('thunderwarn');
      else if (ev.type === 'inhale') this.game.sfx('inhale');
      else if (ev.type === 'gust') this.game.sfx('gust');
      else if (ev.type === 'page') this.game.sfx('page');
      else if (ev.type === 'togglewarn') {
        this.game.sfx('shardwarn');
        this.level.toggleWarn = 1.1;
      } else if (ev.type === 'toggle') {
        this.pendingToggle = 0.001;
      } else if (ev.type === 'summon') {
        this.summonShadow(ev.x, ev.y);
      } else if (ev.type === 'thunder') {
        this.game.sfx('thunder');
        this.camera.shake(3, 0.25);
        this.particles.burst(ev.x, ev.y - 2, { count: 10, colors: ['#ffffff', '#fff3b0'], speed: 90, life: 0.4, gravity: 200, up: 50 });
      } else if (ev.type === 'roots') {
        this.game.sfx('roots');
        this.camera.shake(2, 0.2);
        this.particles.burst(ev.x, ev.y - 2, { count: 8, colors: ['#5a4030', '#7a5a40', '#2c7a6b'], speed: 60, life: 0.5, gravity: 250, up: 60 });
      } else if (ev.type === 'crash') {
        this.game.sfx('crash');
        this.camera.shake(4, 0.35);
        this.particles.burst(b.x, b.y + b.h / 2, { count: 14, colors: ['#8fd1ff', '#2a2148', '#ff8fe0'], speed: 80, life: 0.6, gravity: 200 });
      } else if (ev.type === 'shatter') {
        this.game.sfx('shatter');
        this.particles.burst(ev.x, ev.y - 2, { count: 8, colors: ['#8fd1ff', '#e8fdff'], speed: 60, life: 0.5, gravity: 220, up: 40 });
      } else if (ev.type === 'hurt') {
        this.game.sfx('bosshit');
        this.camera.shake(3, 0.25);
        this.hud.setBossHp(b.hp);
        this.particles.burst(b.x + b.w / 2, b.y, { count: 16, colors: ['#ff8fe0', '#ffd1f3', '#ffffff'], speed: 90, life: 0.6 });
      } else if (ev.type === 'defeated') {
        this.game.sfx('bosshit');
        this.missions.mark('bossDefeated');
        for (const e of this.enemies) if (e.summoned && e.alive) e.defeat();
        this.score += 1000;
        this.hud.setBossHp(0);
        this.camera.shake(5, 0.6);
        this.particles.burst(b.x + b.w / 2, b.y + b.h / 2, { count: 40, colors: ['#ff8fe0', '#8fd1ff', '#ffd98a', '#ffffff'], speed: 120, life: 1 });
        if (this.director && this.story.dialogs.bossDefeat) this.director.play('bossDefeat', { delay: 1, after: 'bossEnd' });
        else this.finishBoss();
      }
    }
    b.events.length = 0;
  }

  // Depois da luta: abre o portão, mostra a saída e solta a câmera.
  finishBoss() {
    const a = this.arena;
    const T = this.level.tile;
    for (let ty = a.ceiling / T; ty < a.floor / T; ty++) {
      if (this.level.tileAt(a.gateCol, ty) === 'G') this.level.setTile(a.gateCol, ty, '.');
    }
    this.level.exitHidden = false;
    this.camera.unlock();
    this.hud.hideBoss();
    if (this.game.audio) this.game.audio.playMusic(this.levelId);
    const e = this.level.exit;
    if (e) this.particles.burst(e.x + e.w / 2, e.y + e.h / 2, { count: 30, colors: ['#8ff7ff', '#ffd98a'], speed: 70, life: 1 });
  }

  // O Vulto chama sombras: Ecos Vazios que já nascem perseguindo o Nilo.
  summonShadow(x, floorY) {
    const T = this.level.tile;
    const e = new EcoVazio(Math.floor(x / T), Math.floor(floorY / T) - 1, T);
    e.summoned = true;
    e.ttl = SUMMON_TTL;
    e.wake(this.player);
    this.enemies.push(e);
    this.game.sfx('shadow');
    this.particles.burst(x, floorY - 10, { count: 14, colors: ['#2a2040', '#b48cff'], speed: 50, life: 0.7, up: 20 });
  }

  // ---------- Cidade: trocar lembrado ↔ esquecido ----------

  toggleCity(fromClock) {
    const ok = this.level.toggleCity([this.player]);
    if (!ok) return false;
    this.level.toggleWarn = 0;
    this.game.sfx('toggle');
    this.camera.shake(1, 0.2);
    for (const c of this.clocks) c.ring = 0.6;
    if (fromClock) this.missions.mark('clock');
    return true;
  }

  updatePendingToggle(dt) {
    if (!this.pendingToggle) return;
    if (this.toggleCity(false)) {
      this.pendingToggle = 0;
      return;
    }
    // O Nilo está dentro de um prédio que vai aparecer: depois de um instante, ele é
    // empurrado para cima do prédio (nunca fica preso).
    this.pendingToggle += dt;
    if (this.pendingToggle > 0.4) {
      const p = this.player;
      const T = this.level.tile;
      let row = Math.floor((p.y + p.h - 0.01) / T);
      while (row > 0 && ['a', 'b'].includes(this.level.tileAt(Math.floor((p.x + p.w / 2) / T), row))) row--;
      p.y = (row + 1) * T - p.h;
      p.vy = 0;
    }
  }

  // ---------- Altar de habilidade ----------

  updateShrines() {
    for (const s of this.shrines) {
      s.update(1 / 60);
      if (!s.touches(this.player)) continue;
      s.taken = true;
      this.player.abilities.add(s.ability);
      if (this.progress) {
        this.progress.addAbility(s.ability);
        this.progress.persist(); // habilidade aprendida vale mesmo se o Nilo cair logo depois
      }
      this.game.sfx('ability');
      this.hud.flashMemory();
      this.hud.toast(ABILITY_INFO[s.ability] || `Nova habilidade: ${s.ability}`);
      this.particles.burst(s.x, s.base - 22, { count: 30, colors: ['#ffd98a', '#8ff7ff', '#ffffff'], speed: 90, life: 0.9 });
      if (this.director) this.director.event('ability');
      this.missions.mark('ability');
    }
  }

  // Ações que o roteiro pede para a cena executar.
  storyAction(name) {
    if (name === 'miraJoins') {
      this.mira.follow();
      this.director.setFlag('miraJoined');
    } else if (name === 'vultoVanish') {
      if (this.vulto) this.vulto.vanish();
      this.director.play('afterVulto', { delay: 1.2 });
    } else if (name === 'bossStart') {
      this.boss.start();
    } else if (name === 'bossEnd') {
      this.finishBoss();
    } else if (name === 'showRegion') {
      this.hud.showRegionCard(this.story.region, this.missions.mission);
    } else if (name === 'complete') {
      this.complete();
    } else {
      throw new Error(`Ação de roteiro desconhecida: "${name}"`);
    }
  }

  // ---------- Entrada e saída da cena ----------

  // O renderizador 3D (se existir e estiver ligado) mostra esta cena em 3D.
  get renderer3d() {
    const r = this.game.renderer3d;
    return r && r.attached === this ? r : null;
  }

  enter() {
    releaseFocus();
    const r3d = this.game.renderer3d;
    if (r3d && r3d.enabled) r3d.attach(this);
    if (this.game.audio) {
      this.game.audio.duck(false);
      this.game.audio.playMusic(this.levelId); // tema com o mesmo nome da região
    }
    this.hud.show(this.level.name);
    // No celular, a dica fala dos botões na tela em vez do teclado.
    if (this.game.input.touchMode) this.baseHint = HINT_TOUCH;
    this.hud.setHint(this.baseHint);
    this.refreshHUD();
    if (!this.story) return;
    if (this.options.skipIntro || this.options.restore) {
      this.hud.showRegionCard(this.story.region, this.missions.mission);
    } else {
      this.director.play(this.story.intro, { after: 'showRegion' });
    }
  }

  exit() {
    if (this.renderer3d) this.renderer3d.detach();
    this.hud.hide();
    this.hud.hideBoss();
    this.dialog.hide();
    setPaused(false);
    hideDefeat();
    hideComplete();
  }

  setPaused(value) {
    this.paused = value;
    setPauseMission(this.missions.mission, this.missions.checklist());
    setPaused(value);
    this.game.sfx('select');
    if (this.game.audio) this.game.audio.duck(value);
    if (!value) releaseFocus();
  }

  // Parâmetros para "Tentar novamente": volta ao último checkpoint, se houver.
  retryParams() {
    return this.lastSnapshot ? { restore: this.lastSnapshot } : { skipIntro: true };
  }

  refreshHUD() {
    this.hud.setEnergy(this.player.health, this.player.maxHealth);
    this.hud.setCrystals(this.collectibles.collected, this.collectibles.total);
    this.hud.setScore(this.score);
    this.hud.setFragments(this.memory.held, this.memory.found, this.memory.total);
    this.hud.setOwnedAbilities(this.player.abilities);
    let ability = 'off';
    if (this.memory.held > 0) ability = this.memory.stoneNear(this.player) ? 'near' : 'ready';
    this.hud.setAbility(ability);
    this.hud.setMission(this.missions.currentText({
      fragments: [this.memory.found, this.memory.total],
      stones: [this.memory.stones.filter((s) => s.active).length, this.memory.stones.length],
    }));
  }

  // ---------- Laço principal ----------

  update(dt) {
    const input = this.game.input;
    if (this.state === 'playing' && input.wasPressed('pause')) this.setPaused(!this.paused);
    if (this.paused) return;

    this.time += dt;
    this.bg.update(dt);
    this.particles.update(dt);
    if (this.mira) this.mira.update(dt, this.player);
    if (this.vulto) this.vulto.update(dt, this.particles);

    // Durante um diálogo, o mundo para: só o texto anda.
    if (this.dialog.active) {
      this.dialog.update(dt, input);
      this.hud.setHint('');
      this.camera.update(dt, this.player);
      return;
    }

    this.applyWind();
    this.player.update(dt, input, this.level);
    this.updatePlayerFx();

    if (this.state === 'defeat') {
      this.updateDefeat(dt);
    } else if (this.state === 'complete') {
      this.updateComplete(dt);
    } else {
      this.playTime += dt;
      this.updateWorld(dt);
      this.updateMemory(dt, input);
      this.updateEnemies(dt);
      this.updateHazards();
      this.updateCollectibles();
      this.updateLanterns();
      this.updateShrines();
      this.updateBoss(dt);
      this.updateExit();
      this.updateHint(dt);
      if (this.director) this.director.update(dt, this.player);
      this.syncMissions();
    }

    this.camera.update(dt, this.player);
    this.refreshHUD();
  }

  // Vento sobre o Nilo neste passo: correntes da fase + rajadas de Sopros + ventania do chefe.
  applyWind() {
    const p = this.player;
    const f = this.wind.forceAt(p);
    let fx = f.fx;
    for (const e of this.enemies) if (e.gustAt) fx += e.gustAt(p);
    if (this.boss && !this.boss.defeated) fx += this.boss.windAt(p);
    p.windX = this.state === 'playing' && !this.dialog.active ? fx : 0;
    p.windY = this.state === 'playing' && !this.dialog.active ? f.fy : 0;
  }

  // Ilhas frágeis, relógios, passagens secretas, Eco Escondido e sombras chamadas.
  updateWorld(dt) {
    const p = this.player;
    if (this.wind.update(dt, this.particles, this.camera.view)) this.game.sfx('gust');
    this.crumble.update(dt, p);
    for (const c of this.clocks) c.update(dt);
    this.level.toggleWarn = Math.max(0, (this.level.toggleWarn || 0) - dt);
    this.updatePendingToggle(dt);

    // Passagem secreta: fica transparente em volta do Nilo.
    this.level.reveal = { x: p.x, y: p.y, w: p.w, h: p.h };
    if (!this.secretPassageSeen && this.insideSecret(p)) {
      this.secretPassageSeen = true;
      this.game.sfx('secret');
      this.hud.toast('Uma passagem secreta!');
    }

    for (const s of this.secrets) {
      if (s.collected || !s.touches(p)) continue;
      s.collected = true;
      this.secretFound = true;
      this.score += 500;
      this.game.sfx('star');
      this.hud.flashMemory();
      this.hud.toast('★ Eco Escondido encontrado!');
      this.particles.burst(s.x, s.y, { count: 30, colors: ['#ffd98a', '#ffffff', '#c7a6ff'], speed: 90, life: 0.9 });
    }

    // Sombras chamadas pelo Vulto duram pouco.
    for (const e of this.enemies) {
      if (!e.summoned || !e.alive) continue;
      e.ttl -= dt;
      if (e.ttl <= 0) e.defeat();
    }
  }

  insideSecret(b) {
    const T = this.level.tile;
    for (let ty = Math.floor(b.y / T); ty <= Math.floor((b.y + b.h - 0.01) / T); ty++) {
      for (let tx = Math.floor(b.x / T); tx <= Math.floor((b.x + b.w - 0.01) / T); tx++) {
        if (this.level.tileAt(tx, ty) === 'H') return true;
      }
    }
    return false;
  }

  // Objetivos que dependem do roteiro (gatilhos de posição e eventos).
  syncMissions() {
    const d = this.director;
    if (!d) return;
    for (const o of this.missions.objectives) {
      if (!this.missions.isDone(o) && (d.seen.has(o.flag) || d.flags.has(o.flag))) this.missions.mark(o.flag);
    }
  }

  // Poeira, sons de movimento e a aparência do Nilo conforme as memórias restauradas.
  updatePlayerFx() {
    const p = this.player;
    const feetX = p.x + p.w / 2;
    const feetY = p.y + p.h;
    const dust = ['#8a8496', '#59e0c5', '#b8b0c4'];
    if (p.justJumped) {
      this.game.sfx('jump');
      this.particles.burst(feetX, feetY, { count: 5, colors: dust, speed: 30, life: 0.35, up: 10 });
    }
    if (p.justEchoJumped) {
      // Pulo-Eco: um anel de luz embaixo dos pés
      this.game.sfx('echojump');
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        this.particles.list.push({
          x: feetX, y: feetY, vx: Math.cos(a) * 50, vy: Math.sin(a) * 18, life: 0.35, maxLife: 0.35,
          gravity: 0, size: 1, color: i % 2 ? '#ffd98a' : '#8ff7ff',
        });
      }
    }
    if (p.justLanded) {
      this.game.sfx('land');
      this.particles.burst(feetX, feetY - 1, { count: 8, colors: dust, speed: 45, life: 0.4, gravity: 60, up: 15 });
    }
    // Correndo rápido no chão: um fiapo de poeira de vez em quando, atrás dos pés
    if (p.onGround && Math.abs(p.vx) > 120 && Math.random() < 0.25) {
      this.particles.burst(feetX - Math.sign(p.vx) * 5, feetY - 1, { count: 1, colors: dust, speed: 15, life: 0.3, up: 12 });
    }

    p.memoryLevel = this.memory.stones.filter((s) => s.active).length;
    // Nível 3: uma aura de memória sobe do Nilo
    if (p.memoryLevel >= 3 && Math.random() < 0.18) {
      this.particles.burst(p.x + Math.random() * p.w, p.y + Math.random() * p.h, {
        count: 1, colors: ['#ffd98a', '#8ff7ff'], speed: 8, life: 0.8, up: 18,
      });
    }
  }

  updateMemory(dt, input) {
    const m = this.memory;
    const p = this.player;
    m.update(dt, p);

    m.collect(p, (f) => {
      this.missions.mark(`fragment${m.found}`);
      this.score += CONFIG.SCORE.FRAGMENT;
      this.game.sfx('fragment');
      this.hud.flashMemory();
      this.particles.burst(f.x, f.y, { count: 16, colors: ['#ffd98a', '#fff6dc', '#c7a6ff'], speed: 70, life: 0.7 });
      if (m.found === 1 && this.director) {
        this.director.event('firstFragment');
      } else {
        this.say(m.found === 1
          ? 'Um fragmento de memória! Leve-o até uma Pedra-Eco e aperte E.'
          : 'Outro fragmento de memória. A gema do Nilo brilha mais forte.', 4);
      }
    });
    p.charged = m.held > 0;

    if (input.wasPressed('interact')) {
      const clock = this.clocks.find((c) => c.isNear(p));
      const result = m.tryActivate(p);
      if (result === 'no-stone' && clock) {
        if (!this.toggleCity(true)) {
          this.game.sfx('denied');
          this.say('Algo está no caminho de um prédio. Saia de dentro do contorno.', 3);
        }
      }
      if (result === 'ok') {
        const i = m.lastActivated;
        const stone = m.stones[i];
        this.missions.mark(`stone${i}`);
        this.wind.syncMemory(m.stones);
        this.score += CONFIG.SCORE.REMEMBER;
        this.game.sfx('echo');
        this.hud.flashMemory();
        this.camera.shake(2, 0.35);
        this.say(this.story && this.story.rememberLine ? this.story.rememberLine : 'O mundo se lembra...', 3);
        if (this.progress) this.progress.addAbility('eco');
        if (this.director) {
          // Espera a onda de memória terminar antes de falar.
          this.director.event(`stone${i}`, { delay: 1.8 });
          const vultoStone = this.story.vultoAfterStone ?? 1;
          if (i === vultoStone && this.vulto) {
            this.vulto.appear();
            this.game.sfx('vulto');
          }
        }
        // Toda Pedra-Eco ativada também é um checkpoint.
        this.reachCheckpoint(`pedra${i}`, { x: stone.x - p.w / 2, y: stone.base - p.h }, 'Memória restaurada');
      } else if (result === 'no-fragment') {
        this.game.sfx('denied');
        this.say('A Pedra-Eco está fria. Ela precisa de um fragmento de memória.', 3);
      }
    }
  }

  updateHint(dt) {
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    // Prioridade: poder ecoar AGORA > mensagem temporária > pedra sem fragmento > padrão.
    let hint = this.baseHint;
    const stone = this.memory.stoneNear(this.player);
    if (stone) hint = 'Uma Pedra-Eco. Ela responde a fragmentos de memória.';
    if (this.messageTimer > 0) hint = this.message;
    if (stone && this.memory.held > 0) hint = 'E · Ecoar a memória';
    if (!stone && this.clocks.some((c) => c.isNear(this.player))) hint = 'E · Tocar o Relógio da Praça (lembrado ↔ esquecido)';
    this.hud.setHint(hint);
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      e.update(dt, this.level, p);
      // Sons de inimigos só tocam se eles estiverem perto do Nilo.
      if (e.sound) {
        if (Math.abs(e.centerX - p.x) < 260) this.game.sfx(e.sound);
        e.sound = null;
      }
      if (!e.overlaps(p)) continue;

      // PISÃO: cada inimigo decide o resultado (Enemy.onStomp).
      // Criaturas lembradas: o Murcho vira trampolim; as outras não reagem.
      if (e.isStompedBy(p)) {
        const result = e.calm ? (e.spring ? 'spring' : 'none') : e.onStomp();
        if (result === 'defeat') {
          e.defeat();
          p.bounce();
          this.game.sfx('stomp');
          this.score += CONFIG.SCORE.ENEMY;
          this.particles.burst(e.centerX, e.y, {
            count: 12, colors: ['#b8b0c4', '#8a8496', '#ff9ad5'], speed: 70, life: 0.6, gravity: 120, up: 30,
          });
        } else if (result === 'bounce') {
          // Blindado: o Nilo quica sem derrotar (e sem se machucar)
          p.bounce();
          this.game.sfx('clank');
          this.particles.burst(e.centerX, e.y, { count: 6, colors: ['#e8fdff', '#8fd1ff'], speed: 60, life: 0.3 });
        } else if (result === 'spring') {
          e.spring();
          p.bounce(CONFIG.MEMORY.SPRING_BOUNCE);
          this.game.sfx('spring');
          this.particles.burst(e.centerX, e.y, { count: 6, colors: ['#ff9ad5', '#7fe08a'], speed: 50, life: 0.4 });
        }
        continue;
      }

      // ENCOSTAR: machuca, a menos que o inimigo esteja inofensivo (Enemy.harmless).
      if (!e.harmless && p.hurt(e.centerX)) this.onDamage();
    }
    this.enemies = this.enemies.filter((e) => !e.removable);
  }

  updateHazards() {
    const p = this.player;
    const fell = p.y > this.level.pixelHeight + 40;
    if (!fell && !this.level.touchesHazard(p)) {
      this.updateSafePoint();
      return;
    }
    // Espinhos ou abismo: perde 1 de energia (se não estiver invulnerável)
    // e volta ao último ponto seguro.
    if (p.hurt(p.x + p.w / 2)) this.onDamage();
    if (p.alive) {
      p.respawn(this.safePoint);
      this.camera.snap(p);
    }
  }

  updateCollectibles() {
    this.collectibles.update(this.player, (c) => {
      this.score += CONFIG.SCORE.CRYSTAL;
      this.game.sfx('crystal');
      this.particles.burst(c.x, c.y, {
        count: 10, colors: ['#e8fdff', '#8ff7ff', '#59e0c5'], speed: 55, life: 0.45,
      });
    });
  }

  // ---------- Checkpoints e salvamento ----------

  updateLanterns() {
    for (const l of this.lanterns) {
      if (l.lit || !l.touches(this.player)) continue;
      l.lit = true;
      this.game.sfx('lantern');
      this.particles.burst(l.x + 3, l.base - 20, { count: 14, colors: ['#8ff7ff', '#59e0c5', '#ffffff'], speed: 60, life: 0.7, up: 20 });
      this.reachCheckpoint(l.id, l.respawnPoint(this.player), 'Lanterna acesa');
    }
  }

  reachCheckpoint(id, point, label) {
    this.checkpoint = { id, x: point.x, y: point.y };
    this.safePoint = { x: point.x, y: point.y };
    this.lastSnapshot = this.snapshot();
    let saved = false;
    if (this.progress) saved = this.progress.checkpoint(this.levelId, this.lastSnapshot);
    this.hud.toast(`${label} · ${saved ? 'progresso salvo' : 'salvo só nesta sessão'}`);
  }

  // A "foto" da partida: tudo o que precisa para continuar daqui depois.
  snapshot() {
    return {
      checkpoint: { ...this.checkpoint },
      score: this.score,
      playTime: this.playTime,
      crystals: this.collectibles.saveState(),
      memory: this.memory.saveState(),
      enemiesGone: this.allEnemies.filter((e) => !e.alive).map((e) => e.id),
      lanterns: this.lanterns.filter((l) => l.lit).map((l) => l.id),
      story: this.director ? this.director.saveState() : null,
      missions: this.missions.saveState(),
      secret: this.secretFound,
      wind: this.wind.saveState(),
      cityState: this.level.cityState,
    };
  }

  restore(snap) {
    this.score = snap.score;
    this.playTime = snap.playTime;
    this.collectibles.restore(snap.crystals);

    const gone = new Set(snap.enemiesGone);
    for (const e of this.allEnemies) if (gone.has(e.id)) e.alive = false;
    this.enemies = this.allEnemies.filter((e) => e.alive);
    this.memory.restore(snap.memory);
    this.player.charged = this.memory.held > 0;

    for (const l of this.lanterns) l.lit = snap.lanterns.includes(l.id);
    this.missions.restore(snap.missions);
    this.secretFound = !!snap.secret;
    for (const s of this.secrets) s.collected = this.secretFound;
    this.wind.restore(snap.wind);
    this.wind.syncMemory(this.memory.stones);
    if (snap.cityState && this.level.cityState !== snap.cityState) this.level.toggleCity();

    if (this.director && snap.story) {
      this.director.restore(snap.story);
      const f = this.director.flags;
      if (f.has('miraJoined')) this.mira.follow();
      if (f.has('stone1') && !this.director.seen.has('vulto')) {
        this.vulto.state = 'visible';
        this.vulto.alpha = 1;
      }
    }

    this.checkpoint = { ...snap.checkpoint };
    this.lastSnapshot = snap;
    this.player.respawn(this.checkpoint);
    this.safePoint = { x: this.checkpoint.x, y: this.checkpoint.y };
    if (this.mira) {
      this.mira.x = this.player.x - 20;
      this.mira.y = this.player.y - 8;
    }
  }

  // ---------- Fim da fase ----------

  updateExit() {
    if (this.reachedExit || !this.level.touchesExit(this.player)) return;
    this.reachedExit = true;
    this.missions.mark('exit');
    const talking = this.director && this.director.event('exit', { after: 'complete' });
    if (!talking) this.complete();
  }

  complete() {
    if (this.state === 'complete') return;
    this.state = 'complete';
    this.stateTimer = COMPLETE_DELAY;
    this.overlayShown = false;
    this.player.celebrate();
    this.hud.setHint('');
    this.game.sfx('complete');
    if (this.game.audio) {
      if (this.story && this.story.final) this.game.audio.playMusic('final');
      this.game.audio.duck(true);
    }

    const crystals = this.collectibles.collected;
    const allCrystals = crystals === this.collectibles.total;
    const bonus = allCrystals ? ALL_CRYSTALS_BONUS : 0;
    // Estrelas da Aurora: concluir · todos os cristais · Eco Escondido
    const stars = [true, allCrystals, this.secrets.length === 0 || this.secretFound];
    this.score += bonus;
    const i = REGIONS.findIndex((r) => r.id === this.levelId);
    this.result = {
      region: this.story ? this.story.region : { number: '', name: this.level.name },
      next: i >= 0 && REGIONS[i + 1] ? REGIONS[i + 1] : null,
      crystals,
      totalCrystals: this.collectibles.total,
      memories: this.memory.stones.filter((s) => s.active).length,
      totalMemories: this.memory.stones.length,
      time: this.playTime,
      score: this.score,
      bonus,
      stars,
      hasSecret: this.secrets.length > 0,
      final: !!(this.story && this.story.final),
      ending: this.story && this.story.ending ? this.story.ending : null,
      records: { score: false, time: false },
    };
    if (this.progress) {
      this.result.records = this.progress.completeLevel(this.levelId, {
        score: this.score, time: this.playTime, crystals, stars,
      });
      this.result.totalStars = this.progress.totalStars();
      this.result.maxStars = this.progress.maxStars();
    }
  }

  updateComplete(dt) {
    this.stateTimer -= dt;
    // Faíscas de memória subindo do arco
    const e = this.level.exit;
    if (e && Math.random() < 0.5) {
      this.particles.burst(e.x + Math.random() * e.w, e.y + e.h, {
        count: 2, colors: ['#8ff7ff', '#ffd98a', '#c7a6ff'], speed: 30, life: 1.2, up: 60,
      });
    }
    if (this.stateTimer <= 0 && !this.overlayShown) {
      this.overlayShown = true;
      showComplete(this.result);
    }
  }

  // ---------- Dano e derrota ----------

  onDamage() {
    const p = this.player;
    this.game.sfx('hurt');
    this.hud.flashDamage();
    this.camera.shake(3, 0.25);
    this.particles.burst(p.x + p.w / 2, p.y + p.h / 2, {
      count: 10, colors: ['#ff8a3d', '#ff6fae', '#ffd98a'], speed: 80, life: 0.4,
    });
    if (!p.alive) this.enterDefeat();
  }

  enterDefeat() {
    this.game.sfx('defeat');
    if (this.game.audio) this.game.audio.stopMusic();
    this.state = 'defeat';
    this.stateTimer = DEFEAT_DELAY;
    this.overlayShown = false;
    this.hud.setHint('');
  }

  updateDefeat(dt) {
    this.stateTimer -= dt;
    // A gema do Nilo se desfaz em faíscas enquanto a tela escurece.
    if (Math.random() < 0.3) {
      const p = this.player;
      this.particles.burst(p.x + p.w / 2, p.y + 6, { count: 1, colors: ['#8ff7ff'], speed: 20, life: 0.8, up: 25 });
    }
    if (this.stateTimer <= 0 && !this.overlayShown) {
      this.overlayShown = true;
      showDefeat({
        crystals: this.collectibles.collected,
        total: this.collectibles.total,
        score: this.score,
        hasCheckpoint: this.lastSnapshot !== null,
      });
    }
  }

  // Só grava como seguro um chão de rocha firme, com rocha também um bloco
  // para cada lado e sem espinhos por perto. Assim nunca renascemos na beira
  // de um abismo ou em cima de um galho.
  updateSafePoint() {
    const p = this.player;
    if (!p.onGround || p.hurtTimer > 0) return;
    const T = this.level.tile;
    const floorRow = Math.floor((p.y + p.h + 1) / T);
    const from = Math.floor(p.x / T) - 1;
    const to = Math.floor((p.x + p.w) / T) + 1;
    for (let tx = from; tx <= to; tx++) {
      // Só chão que não some: rocha ou ponte lembrada (nada de ilha frágil ou prédio que troca).
      const c = this.level.tileAt(tx, floorRow);
      if (c !== '#' && c !== 'B') return;
      if (this.level.isHazard(tx, floorRow - 1)) return;
      if (this.level.isHazard(tx - 1, floorRow - 1) || this.level.isHazard(tx + 1, floorRow - 1)) return;
    }
    this.safePoint.x = p.x;
    this.safePoint.y = p.y;
  }

  // ---------- Desenho ----------

  draw(ctx) {
    // Modo 3D: o renderizador lê o estado desta cena e desenha tudo em 3D.
    if (this.renderer3d) {
      this.renderer3d.render(this);
      return;
    }
    const view = this.camera.view;
    this.bg.draw(ctx, this.time, view.x, view.y);

    // Camada 1: o mundo (perde a cor onde ainda está esquecido)
    ctx.save();
    ctx.translate(-view.x, -view.y);
    this.level.draw(ctx, this.time, view);
    for (const e of this.enemies) e.draw(ctx);
    ctx.restore();

    this.memory.drawForgetting(ctx, view);

    // Camada 2: o que é luz e memória fica sempre colorido
    ctx.save();
    ctx.translate(-view.x, -view.y);
    for (const l of this.lanterns) l.draw(ctx, this.time);
    for (const s of this.shrines) s.draw(ctx);
    for (const c of this.clocks) c.draw(ctx, this.level.cityState, c.isNear(this.player));
    for (const s of this.secrets) s.draw(ctx, this.time);
    if (this.boss) this.boss.draw(ctx);
    this.memory.drawWorld(ctx, this.time, this.player);
    if (this.vulto) this.vulto.draw(ctx);
    this.collectibles.draw(ctx, this.time, view);
    this.memory.drawFragments(ctx, this.time, view);
    this.player.draw(ctx, this.time);
    if (this.mira) this.mira.draw(ctx);
    this.particles.draw(ctx);
    ctx.restore();

    this.bg.drawFront(ctx, this.time, view.x);
  }
}

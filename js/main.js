// Ponto de entrada: cria o jogo, o salvamento e as cenas, e liga os botões do HTML.

import { CONFIG } from './config.js';
import { Input } from './core/Input.js';
import { Game } from './core/Game.js';
import { Progress } from './core/Progress.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { MenuScene } from './scenes/MenuScene.js';
import { LevelScene } from './scenes/LevelScene.js';
import { BOSQUE } from './levels/bosque.js';
import { BOSQUE_STORY } from './story/bosque-story.js';
import { MINAS } from './levels/minas.js';
import { MINAS_STORY } from './story/minas-story.js';
import { ARQUIPELAGO } from './levels/arquipelago.js';
import { ARQUIPELAGO_STORY } from './story/arquipelago-story.js';
import { CIDADE } from './levels/cidade.js';
import { CIDADE_STORY } from './story/cidade-story.js';
import { SANTUARIO } from './levels/santuario.js';
import { SANTUARIO_STORY } from './story/santuario-story.js';
import { Menu } from './ui/Menu.js';
import { TouchControls, isTouchDevice } from './ui/TouchControls.js';
import { showPausePanel } from './ui/Screens.js';

const canvas = document.getElementById('game');
canvas.width = CONFIG.WIDTH;
canvas.height = CONFIG.HEIGHT;
// O CSS usa a largura interna para manter o formato certo da tela do jogo.
document.documentElement.style.setProperty('--gw', CONFIG.WIDTH);

const input = new Input(CONFIG.KEYS);
const progress = new Progress();
const audio = new AudioEngine(progress.data.settings);
const game = new Game(canvas, input, { fadeEl: document.getElementById('fade'), audio });

// ---------- Som ----------

// Os navegadores só liberam áudio depois de uma interação: o primeiro
// clique ou tecla "destrava" o som (e começa a música que estava esperando).
const unlockAudio = () => audio.unlock();
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// Atualiza todos os lugares que mostram o estado do som.
function syncAudioUI() {
  document.getElementById('btn-mute').classList.toggle('muted', audio.muted);
  document.getElementById('btn-toggle-sound').textContent = `Som: ${audio.muted ? 'desligado' : 'ligado'}`;
  document.getElementById('btn-toggle-music').textContent = `Música: ${audio.musicOn ? 'ligada' : 'desligada'}`;
  document.getElementById('audio-status').textContent = audio.supported
    ? 'Sons e música são sintetizados ao vivo pelo navegador. Tecla M liga/desliga o som.'
    : 'Este navegador não suporta Web Audio: o jogo funciona em silêncio.';
}

function toggleMute() {
  audio.setMuted(!audio.muted);
  progress.saveSettings();
  syncAudioUI();
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !e.repeat) toggleMute();
});
document.getElementById('btn-mute').addEventListener('click', (e) => {
  toggleMute();
  e.currentTarget.blur(); // senão o Espaço "apertaria" este botão
});
document.getElementById('btn-toggle-sound').addEventListener('click', toggleMute);
document.getElementById('btn-toggle-music').addEventListener('click', () => {
  audio.setMusic(!audio.musicOn);
  progress.saveSettings();
  syncAudioUI();
});
// Todo botão faz um "clique" sonoro
document.addEventListener('click', (e) => {
  if (e.target.closest('button') && !e.target.closest('#btn-mute')) audio.play('select');
});
syncAudioUI();

// ---------- Gráficos 3D ----------
// O 3D é carregado à parte: se o Three.js ou o WebGL falharem, o jogo segue em 2D.
const settings = progress.data.settings;
let renderer3d = null;
try {
  const { Renderer3D } = await import('./render3d/Renderer3D.js');
  if (Renderer3D.supported()) renderer3d = new Renderer3D(document.getElementById('stage'));
} catch (err) {
  console.warn('Modo 3D indisponível; usando o 2D clássico.', err);
}
game.renderer3d = renderer3d;
if (renderer3d) renderer3d.enabled = settings.graphics !== '2d';
// No celular, o 3D já começa mais leve (a qualidade automática ajusta o resto).
if (renderer3d && isTouchDevice()) renderer3d.setQuality(1);

// ---------- Celular: toque, diálogo, tela cheia, app instalável ----------
const touch = new TouchControls(input, document.getElementById('touch-controls'));

// Se uma tela abrir (pausa, derrota...) ou a fase acabar com um dedo na tela, solta tudo.
new MutationObserver(() => {
  const cls = document.body.classList;
  if (cls.contains('overlay-open') || !cls.contains('playing')) touch.releaseAll();
}).observe(document.body, { attributes: true, attributeFilter: ['class'] });

// Tocar (ou clicar) na caixa de diálogo avança a fala, como Espaço/Enter.
document.getElementById('dialog').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  input.setVirtual('confirm', true);
  input.setVirtual('confirm', false);
});

// Tela cheia (e, no Android, trava o celular deitado). O iPhone não permite: o botão some.
const fsBtn = document.getElementById('btn-fullscreen');
const canFullscreen = document.fullscreenEnabled || document.webkitFullscreenEnabled;
const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
fsBtn.classList.toggle('hidden', !canFullscreen);

async function enterFullscreen() {
  if (!canFullscreen || isFullscreen()) return;
  const el = document.documentElement;
  try {
    await (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
  } catch (err) {
    console.warn('Tela cheia não disponível:', err);
  }
}

fsBtn.addEventListener('click', async () => {
  if (!isFullscreen()) return enterFullscreen();
  try {
    await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } catch (err) {
    console.warn('Não saiu da tela cheia:', err);
  }
});

// No celular, começar a jogar já entra em tela cheia (precisa ser num toque do jogador).
const playOnPhone = () => { if (document.body.classList.contains('touch')) enterFullscreen(); };

// Alguns sites de hospedagem (ex.: Netlify) colocam um selo fixo no canto da página.
// Se aparecer um, os botões da direita sobem para não ficarem embaixo dele.
const OWN = new Set(['stage', 'touch-controls']);
function measureBadge() {
  let h = 0;
  for (const el of [...document.body.children, ...document.documentElement.children]) {
    if (OWN.has(el.id) || /^(SCRIPT|STYLE|LINK|HEAD|BODY|NOSCRIPT)$/.test(el.tagName)) continue;
    const st = getComputedStyle(el);
    if (st.position !== 'fixed' || st.display === 'none' || st.visibility === 'hidden') continue;
    if (el.offsetHeight > 0 && el.offsetHeight < 120) h = Math.max(h, el.offsetHeight + 8);
  }
  document.documentElement.style.setProperty('--badge', `${h}px`);
}
new MutationObserver(measureBadge).observe(document.body, { childList: true });
new MutationObserver(measureBadge).observe(document.documentElement, { childList: true });
setTimeout(measureBadge, 1500);
document.addEventListener('fullscreenchange', () => {
  fsBtn.textContent = document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia';
});

// App instalável e jogável sem internet. Só funciona em https:// ou localhost
// (por segurança dos navegadores); em outros endereços o jogo roda normalmente, só não instala.
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker não registrado:', err));
}

function syncGraphicsUI() {
  const btn = document.getElementById('btn-toggle-graphics');
  btn.disabled = !renderer3d;
  btn.textContent = `Gráficos: ${renderer3d && renderer3d.enabled ? '3D' : '2D clássico'}`;
  const chars = document.getElementById('btn-toggle-chars');
  chars.disabled = !renderer3d || !renderer3d.enabled;
  chars.textContent = `Personagens: ${renderer3d && renderer3d.useModels ? '3D' : 'recortes (mais leve)'}`;
  document.getElementById('graphics-status').textContent = renderer3d
    ? '3D desenhado pela placa de vídeo (WebGL). Se ficar lento, use o 2D clássico.'
    : 'Este navegador não suporta o modo 3D: usando o 2D clássico.';
}

document.getElementById('btn-toggle-graphics').addEventListener('click', () => {
  if (!renderer3d) return;
  renderer3d.enabled = !renderer3d.enabled;
  settings.graphics = renderer3d.enabled ? '3d' : '2d';
  progress.saveSettings();
  // Se estiver numa fase, troca na hora.
  const scene = game.scene;
  if (scene && scene.level) {
    if (renderer3d.enabled) renderer3d.attach(scene);
    else renderer3d.detach();
  }
  syncGraphicsUI();
});
// Personagens 3D (modelos) ou recortes de papel (mais leve). Só vale no modo 3D.
if (renderer3d) renderer3d.useModels = settings.chars !== 'card';
document.getElementById('btn-toggle-chars').addEventListener('click', () => {
  if (!renderer3d) return;
  renderer3d.setUseModels(!renderer3d.useModels);
  settings.chars = renderer3d.useModels ? '3d' : 'card';
  progress.saveSettings();
  syncGraphicsUI();
});
syncGraphicsUI();

// Cada região jogável: mapa + roteiro. REGIÃO NOVA? Entra aqui (e em levels/regions.js).
const LEVELS = {
  bosque: { data: BOSQUE, story: BOSQUE_STORY },
  minas: { data: MINAS, story: MINAS_STORY },
  arquipelago: { data: ARQUIPELAGO, story: ARQUIPELAGO_STORY },
  cidade: { data: CIDADE, story: CIDADE_STORY },
  santuario: { data: SANTUARIO, story: SANTUARIO_STORY },
};

// Registra uma cena por região.
// params: { skipIntro, restore } — veja LevelScene.js
for (const [id, def] of Object.entries(LEVELS)) {
  game.register(id, (params = {}) =>
    new LevelScene(game, def.data, def.story, { ...params, levelId: id, progress }),
  );
}

const menu = new Menu(progress, {
  newGame: () => {
    playOnPhone();
    progress.clearRun();
    game.go('bosque');
  },
  continueGame: (run) => {
    if (!run || !LEVELS[run.level]) return;
    playOnPhone();
    game.go(run.level, { restore: run.snapshot });
  },
  // Pelo mapa: quem já concluiu a região não precisa ver o prólogo de novo.
  playRegion: (id) => {
    playOnPhone();
    game.go(id, { skipIntro: progress.levelInfo(id).completed });
  },
});
game.register('menu', (params = {}) => new MenuScene(game, menu, params));

const on = (id, handler) => document.getElementById(id).addEventListener('click', handler);
const currentLevelId = () => game.scene.levelId;

// Pausa
on('btn-resume', () => game.scene.setPaused(false));
on('btn-pause-controls', () => showPausePanel('pause-controls'));
on('btn-pause-back', () => showPausePanel('pause-main'));
on('btn-restart', () => {
  progress.clearRun(); // reiniciar a fase descarta o checkpoint salvo dela
  game.go(currentLevelId(), { skipIntro: true });
});
on('btn-quit', () => game.go('menu'));

// Derrota: volta ao último checkpoint (ou ao começo, se não houver).
on('btn-retry', () => game.go(currentLevelId(), game.scene.retryParams()));
on('btn-defeat-menu', () => game.go('menu'));

// Fase concluída
on('btn-complete-next', (e) => {
  const id = e.currentTarget.dataset.region;
  if (LEVELS[id]) game.go(id);
});
on('btn-complete-map', () => game.go('menu', { panel: 'map' }));
on('btn-complete-again', () => game.go(currentLevelId(), { skipIntro: true }));
on('btn-complete-menu', () => game.go('menu'));

// Modo de depuração: abra o jogo com ?debug no endereço
// (ex.: http://127.0.0.1:5500/index.html?debug) e use "lumora" no console (F12).
// Exemplos: lumora.scene.player.x = 1400  ·  lumora.scene.player.health = 3
if (new URLSearchParams(location.search).has('debug')) {
  window.lumora = game;
  window.lumoraProgress = progress;
  window.lumoraAudio = audio;
  window.lumora3d = renderer3d;
  console.info('Modo de depuração ativo: use "lumora", "lumoraProgress" e "lumoraAudio" no console.');
}

game.go('menu', {}, { instant: true });
game.start();

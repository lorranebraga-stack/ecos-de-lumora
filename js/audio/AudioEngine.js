// Motor de áudio do jogo.
//
// REGRA DOS NAVEGADORES: nenhum som pode tocar antes de o jogador interagir
// com a página (clique ou tecla). Por isso o AudioContext só é criado em
// unlock(), chamado no primeiro clique/tecla. Até lá, play() simplesmente
// não faz nada, e a música pedida fica "pendente" para começar no desbloqueio.
//
// Se o navegador não tiver Web Audio, o jogo funciona normalmente, em silêncio.

import { CONFIG } from '../config.js';
import { SOUNDS, MIN_INTERVAL } from './sounds.js';
import { Music } from './music.js';

const A = CONFIG.AUDIO;

export class AudioEngine {
  // settings: objeto salvo { muted, music } (o mesmo do Progress)
  constructor(settings) {
    this.settings = settings;
    this.ac = null;
    this.buffers = {};       // sons carregados de arquivo (opcionais)
    this.lastPlayed = {};
    this.warned = new Set();
    this.pendingTheme = null;
    this.ducked = false;
  }

  get supported() {
    return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
  }

  get muted() {
    return this.settings.muted === true;
  }

  get musicOn() {
    return this.settings.music !== false;
  }

  unlock() {
    if (this.ac) {
      if (this.ac.state === 'suspended') this.ac.resume();
      return;
    }
    if (!this.supported) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ac = new Ctx();
      this.master = this.ac.createGain();
      this.sfx = this.ac.createGain();
      this.musicGain = this.ac.createGain();
      this.sfx.connect(this.master);
      this.musicGain.connect(this.master);
      this.master.connect(this.ac.destination);
      this.sfx.gain.value = A.SFX;

      // 1 segundo de ruído branco, reaproveitado por todos os sons de impacto
      const len = this.ac.sampleRate;
      this.noise = this.ac.createBuffer(1, len, len);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      this.music = new Music(this.ac, this.musicGain);
      this.applySettings(true);
      this.loadFiles();
      if (this.pendingTheme) this.music.start(this.pendingTheme);
    } catch (err) {
      console.warn('Áudio indisponível:', err);
      this.ac = null;
    }
  }

  // Carrega os arquivos opcionais de CONFIG.AUDIO.FILES. Falhas viram aviso, nunca erro.
  async loadFiles() {
    for (const [name, url] of Object.entries(A.FILES)) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.buffers[name] = await this.ac.decodeAudioData(await res.arrayBuffer());
      } catch (err) {
        console.warn(`Som "${name}" (${url}) não carregou; usando o sintetizado.`, err);
      }
    }
  }

  applySettings(instant = false) {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    const smooth = instant ? 0.001 : 0.08;
    this.master.gain.setTargetAtTime(this.muted ? 0 : A.MASTER, t, smooth);
    const music = this.musicOn ? A.MUSIC * (this.ducked ? 0.35 : 1) : 0;
    this.musicGain.gain.setTargetAtTime(music, t, instant ? 0.001 : 0.3);
  }

  setMuted(value) {
    this.settings.muted = value;
    this.applySettings();
  }

  setMusic(value) {
    this.settings.music = value;
    this.applySettings();
  }

  // Abaixa a música (pausa, tela de conclusão).
  duck(value) {
    this.ducked = value;
    this.applySettings();
  }

  play(name, opt) {
    if (!this.ac || this.muted) return;
    const now = this.ac.currentTime;
    const gap = MIN_INTERVAL[name] || 0;
    if (gap && now - (this.lastPlayed[name] || -1) < gap) return;
    this.lastPlayed[name] = now;

    if (this.buffers[name]) {
      const src = this.ac.createBufferSource();
      src.buffer = this.buffers[name];
      src.connect(this.sfx);
      src.start();
      return;
    }
    const recipe = SOUNDS[name];
    if (!recipe) {
      if (!this.warned.has(name)) console.warn(`Som desconhecido: "${name}"`);
      this.warned.add(name);
      return;
    }
    recipe(this.ac, this.sfx, this.noise, opt);
  }

  playMusic(theme) {
    this.pendingTheme = theme;
    if (this.music) this.music.start(theme);
  }

  stopMusic() {
    this.pendingTheme = null;
    if (this.music) this.music.stop();
  }
}

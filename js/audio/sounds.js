// Efeitos sonoros SINTETIZADOS (Web Audio API) — nenhum arquivo necessário.
//
// Cada receita recebe:
//   ac    = AudioContext
//   out   = nó de saída (o volume de efeitos)
//   noise = buffer de ruído branco (para sons de impacto, vento, poeira)
//   opt   = opções da chamada (ex.: quem está falando, no som do diálogo)
//
// Os dois tijolos básicos são tone() (uma nota com envelope) e hiss() (ruído filtrado).

function tone(ac, out, { type = 'sine', f0, f1 = f0, at = 0, dur, vol, attack = 0.005 }) {
  const t = ac.currentTime + at;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function hiss(ac, out, noise, { at = 0, dur, vol, type = 'lowpass', freq = 1000, freq1 = freq, q = 1, attack = 0.005 }) {
  const t = ac.currentTime + at;
  const src = ac.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (freq1 !== freq) f.frequency.exponentialRampToValueAtTime(freq1, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random()); // começa num ponto aleatório do ruído
  src.stop(t + dur + 0.05);
}

const PENTA = [1175, 1397, 1568, 1760, 2093, 2349]; // notas agudas da escala do Bosque

const BLIP_VOICE = {
  nilo: { type: 'square', f: 620, vol: 0.025 },
  mira: { type: 'triangle', f: 940, vol: 0.05 },
  vulto: { type: 'sine', f: 130, vol: 0.09 },
  narrador: { type: 'sine', f: 520, vol: 0.03 },
  matriarca: { type: 'triangle', f: 196, vol: 0.07 },
  raiz: { type: 'sawtooth', f: 110, vol: 0.035 },
  tempestade: { type: 'square', f: 150, vol: 0.03 },
  arquivista: { type: 'triangle', f: 330, vol: 0.06 },
  guardia: { type: 'sine', f: 780, vol: 0.05 },
};

export const SOUNDS = {
  // --- Nilo ---
  jump: (ac, out) => {
    tone(ac, out, { type: 'triangle', f0: 260, f1: 620, dur: 0.14, vol: 0.18 });
    tone(ac, out, { type: 'square', f0: 260, f1: 620, dur: 0.08, vol: 0.03 });
  },
  land: (ac, out, noise) => {
    hiss(ac, out, noise, { dur: 0.09, vol: 0.22, freq: 380 });
  },
  hurt: (ac, out, noise) => {
    tone(ac, out, { type: 'sawtooth', f0: 440, f1: 110, dur: 0.28, vol: 0.09 });
    hiss(ac, out, noise, { dur: 0.16, vol: 0.2, freq: 1400 });
  },
  defeat: (ac, out) => {
    [523, 440, 349, 262].forEach((f, i) => tone(ac, out, { type: 'triangle', f0: f, at: i * 0.2, dur: 0.6, vol: 0.12 }));
  },

  // --- Coletáveis e memória ---
  crystal: (ac, out) => {
    tone(ac, out, { f0: 1318, dur: 0.15, vol: 0.13 });
    tone(ac, out, { f0: 1976, at: 0.06, dur: 0.28, vol: 0.11 });
    tone(ac, out, { type: 'triangle', f0: 2637, at: 0.06, dur: 0.2, vol: 0.03 });
  },
  fragment: (ac, out, noise) => {
    [784, 988, 1175, 1568].forEach((f, i) => tone(ac, out, { f0: f, at: i * 0.07, dur: 0.6, vol: 0.1 }));
    hiss(ac, out, noise, { dur: 0.5, vol: 0.04, type: 'highpass', freq: 6000 });
  },
  echo: (ac, out, noise) => {
    tone(ac, out, { f0: 73.4, dur: 2.2, vol: 0.3, attack: 0.4 });
    tone(ac, out, { type: 'triangle', f0: 146.8, dur: 2.2, vol: 0.08, attack: 0.6 });
    [587, 698, 880, 1047, 1175].forEach((f, i) => tone(ac, out, { f0: f, at: 0.25 + i * 0.16, dur: 1.1, vol: 0.07, attack: 0.02 }));
    hiss(ac, out, noise, { dur: 1.6, vol: 0.05, type: 'bandpass', freq: 800, freq1: 5000, q: 2, attack: 0.3 });
  },
  tile: (ac, out) => {
    const f = PENTA[Math.floor(Math.random() * PENTA.length)];
    tone(ac, out, { f0: f, dur: 0.18, vol: 0.035 });
  },
  dissolve: (ac, out, noise) => {
    hiss(ac, out, noise, { dur: 0.35, vol: 0.12, type: 'bandpass', freq: 320, q: 1.5 });
    tone(ac, out, { f0: 110, f1: 55, dur: 0.3, vol: 0.05 });
  },
  denied: (ac, out) => {
    tone(ac, out, { type: 'square', f0: 110, dur: 0.2, vol: 0.05 });
    tone(ac, out, { type: 'square', f0: 104, dur: 0.2, vol: 0.05 });
  },
  lantern: (ac, out, noise) => {
    tone(ac, out, { type: 'triangle', f0: 587, dur: 0.7, vol: 0.12 });
    tone(ac, out, { f0: 880, at: 0.09, dur: 0.8, vol: 0.08 });
    hiss(ac, out, noise, { dur: 0.35, vol: 0.05, type: 'bandpass', freq: 1200, freq1: 3000, q: 1 });
  },

  // --- Criaturas ---
  stomp: (ac, out, noise) => {
    tone(ac, out, { type: 'square', f0: 190, f1: 60, dur: 0.12, vol: 0.1 });
    hiss(ac, out, noise, { dur: 0.07, vol: 0.18, freq: 900 });
    tone(ac, out, { f0: 900, at: 0.03, dur: 0.08, vol: 0.06 });
  },
  spring: (ac, out) => {
    tone(ac, out, { f0: 210, f1: 760, dur: 0.26, vol: 0.16 });
    tone(ac, out, { type: 'triangle', f0: 315, f1: 1140, dur: 0.2, vol: 0.04 });
  },
  windup: (ac, out, noise) => {
    for (let i = 0; i < 6; i++) hiss(ac, out, noise, { at: i * 0.06, dur: 0.04, vol: 0.06, type: 'bandpass', freq: 1800, q: 3 });
  },
  dive: (ac, out, noise) => {
    hiss(ac, out, noise, { dur: 0.4, vol: 0.1, type: 'bandpass', freq: 3200, freq1: 500, q: 2 });
  },
  vulto: (ac, out, noise) => {
    tone(ac, out, { f0: 55, dur: 2.8, vol: 0.22, attack: 0.9 });
    tone(ac, out, { f0: 58.3, dur: 2.8, vol: 0.16, attack: 0.9 }); // quase igual: "bate" e incomoda
    hiss(ac, out, noise, { dur: 2.2, vol: 0.05, freq: 300, attack: 0.6 });
  },

  // --- Minas de Cristal (Etapa 12) ---
  curl: (ac, out) => {
    tone(ac, out, { type: 'triangle', f0: 520, f1: 260, dur: 0.18, vol: 0.08 });
  },
  crack: (ac, out, noise) => {
    hiss(ac, out, noise, { dur: 0.12, vol: 0.18, type: 'highpass', freq: 2500 });
    tone(ac, out, { type: 'square', f0: 1400, f1: 700, dur: 0.08, vol: 0.04 });
  },
  clank: (ac, out) => {
    tone(ac, out, { type: 'square', f0: 1250, dur: 0.06, vol: 0.05 });
    tone(ac, out, { f0: 1870, dur: 0.18, vol: 0.06 });
  },
  echojump: (ac, out) => {
    tone(ac, out, { type: 'triangle', f0: 520, f1: 1040, dur: 0.16, vol: 0.12 });
    tone(ac, out, { f0: 1040, f1: 2080, at: 0.05, dur: 0.18, vol: 0.05 });
  },
  ability: (ac, out, noise) => {
    [523, 784, 1047, 1568, 2093].forEach((f, i) => tone(ac, out, { f0: f, at: i * 0.09, dur: 0.9, vol: 0.08 }));
    hiss(ac, out, noise, { dur: 1, vol: 0.04, type: 'highpass', freq: 5000, attack: 0.2 });
  },
  roar: (ac, out, noise) => {
    tone(ac, out, { type: 'sawtooth', f0: 90, f1: 60, dur: 1.2, vol: 0.12, attack: 0.15 });
    hiss(ac, out, noise, { dur: 1, vol: 0.12, freq: 500, attack: 0.15 });
  },
  rumble: (ac, out, noise) => {
    hiss(ac, out, noise, { dur: 0.6, vol: 0.15, freq: 200, attack: 0.1 });
  },
  crash: (ac, out, noise) => {
    hiss(ac, out, noise, { dur: 0.5, vol: 0.3, freq: 600 });
    tone(ac, out, { f0: 80, f1: 40, dur: 0.4, vol: 0.25 });
  },
  shardwarn: (ac, out) => {
    [2093, 2349, 2637].forEach((f, i) => tone(ac, out, { f0: f, at: i * 0.12, dur: 0.15, vol: 0.04 }));
  },
  shatter: (ac, out, noise) => {
    hiss(ac, out, noise, { dur: 0.25, vol: 0.12, type: 'highpass', freq: 3500 });
    tone(ac, out, { f0: 2637 + Math.random() * 400, dur: 0.12, vol: 0.04 });
  },
  bosshit: (ac, out, noise) => {
    tone(ac, out, { type: 'square', f0: 330, f1: 110, dur: 0.35, vol: 0.1 });
    hiss(ac, out, noise, { dur: 0.3, vol: 0.15, type: 'bandpass', freq: 1500, q: 2 });
    tone(ac, out, { f0: 1760, at: 0.05, dur: 0.4, vol: 0.06 });
  },

  // --- Regiões novas ---
  gust: (ac, out, noise) => {
    hiss(ac, out, noise, { dur: 1.1, vol: 0.09, type: 'bandpass', freq: 500, freq1: 1400, q: 0.8, attack: 0.25 });
  },
  inhale: (ac, out, noise) => {
    hiss(ac, out, noise, { dur: 0.55, vol: 0.06, type: 'bandpass', freq: 1800, freq1: 600, q: 1.5, attack: 0.3 });
  },
  crumble: (ac, out, noise) => {
    hiss(ac, out, noise, { dur: 0.35, vol: 0.12, freq: 700, freq1: 250 });
    tone(ac, out, { f0: 120, f1: 70, dur: 0.25, vol: 0.08 });
  },
  thunderwarn: (ac, out) => {
    [1568, 1175].forEach((f, i) => tone(ac, out, { type: 'square', f0: f, at: i * 0.1, dur: 0.08, vol: 0.025 }));
  },
  thunder: (ac, out, noise) => {
    hiss(ac, out, noise, { dur: 0.15, vol: 0.3, type: 'highpass', freq: 2000 });
    hiss(ac, out, noise, { at: 0.05, dur: 1.2, vol: 0.22, freq: 300, freq1: 80, attack: 0.02 });
  },
  toggle: (ac, out) => {
    // Sino da praça: dois toques, com harmônicos
    [0, 0.22].forEach((at, k) => {
      const f = k ? 659 : 880;
      tone(ac, out, { f0: f, at, dur: 1.4, vol: 0.09 });
      tone(ac, out, { f0: f * 2.76, at, dur: 0.5, vol: 0.025 });
    });
  },
  page: (ac, out, noise) => {
    hiss(ac, out, noise, { dur: 0.18, vol: 0.08, type: 'highpass', freq: 2500, freq1: 5000 });
  },
  roots: (ac, out, noise) => {
    hiss(ac, out, noise, { dur: 0.5, vol: 0.18, freq: 400, freq1: 150 });
    tone(ac, out, { type: 'sawtooth', f0: 70, f1: 50, dur: 0.4, vol: 0.06 });
  },
  shadow: (ac, out) => {
    tone(ac, out, { type: 'sine', f0: 220, f1: 110, dur: 0.8, vol: 0.08, attack: 0.2 });
    tone(ac, out, { type: 'sine', f0: 233, f1: 116, dur: 0.8, vol: 0.06, attack: 0.2 });
  },
  secret: (ac, out) => {
    [784, 988, 1175, 1568].forEach((f, i) => tone(ac, out, { type: 'triangle', f0: f, at: i * 0.07, dur: 0.4, vol: 0.07 }));
  },
  star: (ac, out, noise) => {
    [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone(ac, out, { f0: f, at: i * 0.06, dur: 1.2, vol: 0.06 }));
    hiss(ac, out, noise, { dur: 1.2, vol: 0.03, type: 'highpass', freq: 6000, attack: 0.1 });
  },
  objective: (ac, out) => {
    [659, 988].forEach((f, i) => tone(ac, out, { type: 'triangle', f0: f, at: i * 0.1, dur: 0.35, vol: 0.07 }));
  },

  // --- Interface ---
  blip: (ac, out, noise, opt = {}) => {
    const v = BLIP_VOICE[opt.who] || BLIP_VOICE.narrador;
    tone(ac, out, { type: v.type, f0: v.f * (0.97 + Math.random() * 0.06), dur: 0.035, vol: v.vol });
  },
  select: (ac, out) => {
    tone(ac, out, { type: 'triangle', f0: 880, f1: 1320, dur: 0.09, vol: 0.08 });
  },
  complete: (ac, out) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(ac, out, { type: 'triangle', f0: f, at: i * 0.12, dur: 0.3, vol: 0.11 }));
    [523, 659, 784, 1047].forEach((f) => tone(ac, out, { f0: f, at: 0.5, dur: 1.6, vol: 0.06, attack: 0.05 }));
  },
};

// Intervalo mínimo entre repetições do mesmo som (evita "metralhadora").
export const MIN_INTERVAL = { blip: 0.035, tile: 0.05, land: 0.08, crystal: 0.03, shatter: 0.05, crumble: 0.1, page: 0.06, gust: 0.4 };

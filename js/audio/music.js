// Música ambiente PROCEDURAL: tocada nota a nota, sem arquivos.
//
// Cada tema tem: andamento, uma sequência de acordes (o "pad", som longo e macio),
// um baixo opcional e uma melodia de "harpa" que caminha por uma escala,
// sorteando notas próximas. Nunca repete exatamente igual, mas sempre soa coerente.
//
// Agendador: a cada 25 ms, agenda as notas dos próximos 0,2 s no relógio do áudio.
// Esse "olhar adiante" é o jeito correto de tocar ritmo no navegador sem atrasos.

// Notas MIDI (60 = Dó central). Escala do Bosque: Ré dórico.
const THEMES = {
  menu: {
    bpm: 54,
    chords: [[50, 57, 60, 64], [45, 52, 55, 60], [48, 55, 59, 64], [43, 50, 55, 62]],
    melody: [62, 65, 67, 69, 72, 74, 77, 79],
    pluckChance: 0.18,
    bass: false,
  },
  bosque: {
    bpm: 72,
    chords: [[50, 57, 60, 64], [45, 52, 55, 60], [48, 55, 59, 64], [43, 50, 55, 62]],
    melody: [62, 65, 67, 69, 72, 74, 77, 79, 81],
    pluckChance: 0.42,
    bass: true,
  },
  // Minas: Mi frígio (escuro), notas mais espaçadas e graves — eco de caverna.
  minas: {
    bpm: 60,
    chords: [[40, 47, 52, 55], [41, 48, 53, 57], [40, 47, 52, 55], [38, 45, 50, 53]],
    melody: [64, 65, 67, 71, 72, 74, 76, 77, 79],
    pluckChance: 0.28,
    bass: true,
  },
  // Chefe: mais rápido, baixo em todo tempo forte, melodia insistente.
  chefe: {
    bpm: 126,
    chords: [[40, 47, 52, 55], [41, 48, 53, 57], [43, 50, 55, 59], [41, 48, 53, 57]],
    melody: [64, 65, 67, 71, 72, 76],
    pluckChance: 0.7,
    bass: true,
  },
  // Arquipélago: Lá lídio, aberto e luminoso — flauta ao vento.
  arquipelago: {
    bpm: 84,
    chords: [[57, 64, 68, 71], [59, 66, 69, 73], [54, 61, 64, 69], [52, 59, 64, 68]],
    melody: [69, 71, 73, 75, 76, 78, 80, 81, 83],
    pluckChance: 0.5,
    bass: true,
  },
  // Cidade: Dó menor com notas "fora do lugar", lenta — caixa de música esquecida.
  cidade: {
    bpm: 66,
    chords: [[48, 55, 58, 63], [44, 51, 55, 60], [46, 53, 56, 62], [43, 50, 55, 59]],
    melody: [72, 74, 75, 77, 78, 79, 82, 84],
    pluckChance: 0.34,
    bass: true,
  },
  // Santuário: Ré maior, tema principal em tom de revelação.
  santuario: {
    bpm: 70,
    chords: [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61]],
    melody: [62, 64, 66, 69, 71, 74, 76, 78, 81],
    pluckChance: 0.45,
    bass: true,
  },
  // Final: o tema do Bosque, mais lento e em tom maior.
  final: {
    bpm: 58,
    chords: [[50, 57, 62, 66], [55, 59, 62, 67], [52, 59, 64, 67], [57, 61, 64, 69]],
    melody: [62, 66, 69, 71, 74, 76, 78, 81],
    pluckChance: 0.3,
    bass: false,
  },
};
// TEMA NOVO? Acrescente aqui com o mesmo nome da região (id em regions.js):
// a cena de fase toca automaticamente o tema com o nome da região.

const LOOKAHEAD = 0.2;
const EIGHTHS_PER_CHORD = 16; // cada acorde dura 2 compassos

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

export class Music {
  constructor(ac, out) {
    this.ac = ac;
    // Volume do tema atual (permite fade sem mexer no volume geral da música)
    this.bus = ac.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(out);

    // Eco (delay com realimentação) para dar espaço à harpa
    this.delay = ac.createDelay(1);
    this.delay.delayTime.value = 0.36;
    const feedback = ac.createGain();
    feedback.gain.value = 0.32;
    const tone = ac.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2200;
    this.delay.connect(tone).connect(feedback).connect(this.delay);
    tone.connect(this.bus);

    this.theme = null;
    this.timer = null;
  }

  start(name) {
    const theme = THEMES[name];
    if (!theme || this.theme === theme) return;
    this.theme = theme;
    this.step = 0;
    this.melodyIndex = 2;
    this.nextTime = this.ac.currentTime + 0.1;
    const t = this.ac.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(this.bus.gain.value, t);
    this.bus.gain.linearRampToValueAtTime(1, t + 2);
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 25);
  }

  stop(fade = 1.2) {
    if (!this.theme) return;
    this.theme = null;
    const t = this.ac.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(this.bus.gain.value, t);
    this.bus.gain.linearRampToValueAtTime(0, t + fade);
    clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    const th = this.theme;
    if (!th) return;
    const eighth = 60 / th.bpm / 2;
    while (this.nextTime < this.ac.currentTime + LOOKAHEAD) {
      this.playStep(th, this.step, this.nextTime, eighth);
      this.step++;
      this.nextTime += eighth;
    }
  }

  playStep(th, step, t, eighth) {
    const chord = th.chords[Math.floor(step / EIGHTHS_PER_CHORD) % th.chords.length];
    const inChord = step % EIGHTHS_PER_CHORD;

    if (inChord === 0) {
      for (const n of chord) this.pad(freq(n), t, eighth * EIGHTHS_PER_CHORD);
    }
    if (th.bass && step % 8 === 0) {
      this.pluck(freq(chord[0] - 12), t, 0.09, 'sine', 2.2, false);
    }

    // Melodia: anda 1 ou 2 notas para cima/baixo; no começo do acorde, prefere notas dele.
    if (Math.random() < th.pluckChance || inChord === 0) {
      const m = th.melody;
      this.melodyIndex += Math.floor(Math.random() * 5) - 2;
      this.melodyIndex = Math.max(0, Math.min(m.length - 1, this.melodyIndex));
      let note = m[this.melodyIndex];
      if (inChord === 0) {
        const chordTone = m.find((x) => chord.some((c) => (x - c) % 12 === 0) && Math.abs(x - note) <= 3);
        if (chordTone) note = chordTone;
      }
      this.pluck(freq(note), t, 0.05 + Math.random() * 0.03, 'triangle', 1.4, true);
    }
  }

  // Som longo e macio: dois osciladores levemente desafinados, filtro suave.
  pad(f, t, dur) {
    const ac = this.ac;
    const g = ac.createGain();
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.03, t + 1.2);
    g.gain.setValueAtTime(0.03, t + dur - 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.2);
    filter.connect(g).connect(this.bus);
    for (const detune of [-7, 7]) {
      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = detune;
      o.connect(filter);
      o.start(t);
      o.stop(t + dur + 1.3);
    }
  }

  // Nota de "harpa": ataque rápido e queda longa.
  pluck(f, t, vol, type, decay, echo) {
    const ac = this.ac;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g);
    g.connect(this.bus);
    if (echo) g.connect(this.delay);
    o.start(t);
    o.stop(t + decay + 0.05);
  }
}

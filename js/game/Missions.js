// MISSÕES: a missão da região e a lista de objetivos, mostrados no HUD e na pausa.
//
// No roteiro de cada região:
//   mission: 'Devolver as cores ao bosque...',
//   objectives: [
//     { text: 'Encontre um fragmento de memória', flag: 'fragment1' },
//     { text: 'Pegue os fragmentos', flag: 'fragment3', progress: 'fragments' },
//   ]
//
// Cada objetivo termina quando a FLAG dele é marcada. A cena marca flags quando:
//   fragmentN (pegou o N-ésimo fragmento) · stoneN (ativou a pedra N, começando em 0)
//   ability (aprendeu uma habilidade) · bossDefeated · clock (tocou o relógio) · exit
//   e qualquer gatilho de posição do roteiro (pelo id do gatilho).
// "progress" mostra um contador ao lado: 'fragments' ou 'stones'.
//
// O objetivo ATUAL é o primeiro ainda não concluído (os anteriores podem ser
// concluídos fora de ordem: ficam marcados e o jogo segue para o próximo pendente).

export class Missions {
  constructor(story) {
    this.mission = (story && story.mission) || '';
    this.objectives = (story && story.objectives) || [];
    this.flags = new Set();
    this.onComplete = null; // (objetivo) => {}  — som e aviso
  }

  mark(flag) {
    if (this.flags.has(flag)) return;
    this.flags.add(flag);
    const done = this.objectives.find((o) => o.flag === flag);
    if (done && this.onComplete) this.onComplete(done);
  }

  isDone(o) {
    return this.flags.has(o.flag);
  }

  get current() {
    return this.objectives.find((o) => !this.isDone(o)) || null;
  }

  get allDone() {
    return this.objectives.length > 0 && this.objectives.every((o) => this.isDone(o));
  }

  // Texto do objetivo atual, com contador quando faz sentido.
  currentText(counts = {}) {
    const o = this.current;
    if (!o) return '';
    if (o.progress && counts[o.progress]) {
      const [n, total] = counts[o.progress];
      return `${o.text} (${n}/${total})`;
    }
    return o.text;
  }

  // Lista para a pausa: [{ text, done }]
  checklist() {
    return this.objectives.map((o) => ({ text: o.text, done: this.isDone(o) }));
  }

  saveState() {
    return [...this.flags];
  }

  restore(flags = []) {
    this.flags = new Set(flags);
  }
}

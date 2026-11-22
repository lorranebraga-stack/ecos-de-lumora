// Diretor da história: decide QUANDO cada diálogo acontece.
//
// - Gatilhos de posição: o Nilo passou de uma coluna e está no chão.
// - Eventos: o jogo avisa ("pegou o 1º fragmento", "ativou a pedra 2"...).
// - Fila: diálogos esperam o anterior terminar e o Nilo pisar no chão,
//   para ninguém ficar congelado no meio de um pulo.
// - Flags: lembram o que já aconteceu (ex.: 'miraJoined', 'stone1').
//
// O diretor não sabe desenhar nada: ele só abre a caixa de diálogo e
// pede à cena para executar "ações" (ex.: a Mira começar a seguir o Nilo).

export class StoryDirector {
  constructor(story, { dialog, tile, onAction, onOpen }) {
    this.story = story;
    this.dialog = dialog;
    this.tile = tile;
    this.onAction = onAction || (() => {});
    this.onOpen = onOpen || (() => {});
    this.flags = new Set();
    this.seen = new Set();
    this.queue = [];
  }

  // Coloca um diálogo na fila. lines pode ser um id do roteiro ou uma lista de falas.
  play(dialogOrLines, { after = null, delay = 0 } = {}) {
    const lines = typeof dialogOrLines === 'string' ? this.story.dialogs[dialogOrLines] : dialogOrLines;
    if (!lines) throw new Error(`Diálogo "${dialogOrLines}" não existe no roteiro.`);
    this.queue.push({ lines, after, delay });
  }

  // Um acontecimento do jogo. Cada evento liga uma flag e toca seu diálogo (uma vez).
  // Retorna true se um diálogo foi colocado na fila.
  event(name, { delay = 0, after = null } = {}) {
    this.flags.add(name);
    const id = this.story.events[name];
    if (!id || this.seen.has(`event:${name}`)) return false;
    this.seen.add(`event:${name}`);
    this.play(id, { delay, after });
    return true;
  }

  // Salvamento: o que já aconteceu na história.
  // (Diálogos ainda na fila não são salvos: ao voltar, eles não se repetem.)
  saveState() {
    return { seen: [...this.seen], flags: [...this.flags] };
  }

  restore(state) {
    this.seen = new Set(state.seen);
    this.flags = new Set(state.flags);
  }

  setFlag(name) {
    this.flags.add(name);
  }

  // Há algo acontecendo ou prestes a acontecer?
  get busy() {
    return this.dialog.active;
  }

  update(dt, player) {
    for (const t of this.story.triggers) {
      if (this.seen.has(t.id)) continue;
      if (t.requires && !this.flags.has(t.requires)) continue;
      if (player.onGround && player.x >= t.col * this.tile) {
        this.seen.add(t.id);
        this.play(t.dialog, { after: t.after });
      }
    }

    if (this.dialog.active || this.queue.length === 0) return;
    const next = this.queue[0];
    next.delay -= dt;
    if (next.delay > 0 || !player.onGround) return;
    this.queue.shift();
    this.onOpen();
    this.dialog.open(next.lines, () => {
      if (next.after) this.onAction(next.after);
    });
  }
}

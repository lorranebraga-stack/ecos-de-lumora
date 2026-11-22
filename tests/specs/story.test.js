// Roteiro: todo diálogo citado existe, todo falante é conhecido, toda ação é tratada.
import { BOSQUE_STORY } from '../../js/story/bosque-story.js';
import { MINAS_STORY } from '../../js/story/minas-story.js';
import { ARQUIPELAGO_STORY } from '../../js/story/arquipelago-story.js';
import { CIDADE_STORY } from '../../js/story/cidade-story.js';
import { SANTUARIO_STORY } from '../../js/story/santuario-story.js';
import { StoryDirector } from '../../js/story/StoryDirector.js';

const SPEAKERS = new Set(['nilo', 'mira', 'vulto', 'narrador', 'matriarca', 'raiz', 'tempestade', 'arquivista']);
// Flags que a cena marca sozinha (além dos gatilhos de posição do roteiro).
const SCENE_FLAGS = new Set(['fragment1', 'fragment2', 'fragment3', 'stone0', 'stone1', 'stone2', 'ability', 'bossDefeated', 'clock', 'exit']);
// Ações que LevelScene.storyAction sabe executar.
const ACTIONS = new Set(['miraJoins', 'vultoVanish', 'showRegion', 'complete', 'bossStart', 'bossEnd']);

// Caixa de diálogo de mentira: guarda o que foi aberto.
class FakeDialog {
  constructor() { this.opened = []; this.active = false; this.done = null; }
  open(lines, onDone) { this.opened.push(lines); this.active = true; this.done = onDone; }
  finish() { this.active = false; if (this.done) this.done(); }
}

export default function (t) {
  const s = BOSQUE_STORY;
  const ALL = [['Bosque', BOSQUE_STORY], ['Minas', MINAS_STORY], ['Arquipélago', ARQUIPELAGO_STORY], ['Cidade', CIDADE_STORY], ['Santuário', SANTUARIO_STORY]];

  t.test('toda região tem missão e objetivos que o jogo sabe concluir', () => {
    for (const [region, st] of ALL) {
      t.ok(st.mission && st.mission.length > 10, `${region}: sem missão`);
      t.ok(st.objectives.length >= 5, `${region}: poucos objetivos`);
      const triggers = new Set(st.triggers.map((tr) => tr.id));
      for (const o of st.objectives) {
        t.ok(SCENE_FLAGS.has(o.flag) || triggers.has(o.flag), `${region}: objetivo "${o.text}" usa a flag "${o.flag}", que nada marca`);
      }
      t.equal(st.objectives[st.objectives.length - 1].flag, 'exit', `${region}: o último objetivo é chegar à saída`);
    }
  });

  t.test('regiões com Vulto têm o diálogo afterVulto; todos os chefes têm falas', () => {
    for (const [region, st] of ALL) {
      if (st.vultoSpot) t.ok(st.dialogs.afterVulto, `${region}: falta afterVulto`);
      t.ok(st.dialogs.bossIntro && st.dialogs.bossDefeat, `${region}: falta diálogo do chefe`);
    }
    t.ok(SANTUARIO_STORY.final && SANTUARIO_STORY.ending, 'o Santuário é o final e tem texto de encerramento');
  });

  t.test('todo gatilho e evento aponta para um diálogo que existe (todas as regiões)', () => {
    for (const [region, st] of ALL) {
      for (const tr of st.triggers) t.ok(st.dialogs[tr.dialog], `${region}: gatilho "${tr.id}" → "${tr.dialog}" não existe`);
      for (const [ev, id] of Object.entries(st.events)) t.ok(st.dialogs[id], `${region}: evento "${ev}" → "${id}" não existe`);
    }
    t.ok(s.dialogs.afterVulto, 'diálogo "afterVulto" (usado pela ação vultoVanish) não existe');
    t.ok(MINAS_STORY.dialogs.bossIntro && MINAS_STORY.dialogs.bossDefeat, 'diálogos do chefe nas Minas');
  });

  t.test('toda fala tem falante conhecido e texto (todas as regiões)', () => {
    const all = ALL.flatMap(([, st]) => [st.intro, ...Object.values(st.dialogs)]);
    for (const lines of all) {
      t.ok(lines.length > 0, 'diálogo vazio');
      for (const l of lines) {
        t.ok(SPEAKERS.has(l.who), `falante desconhecido: ${l.who}`);
        t.ok(typeof l.text === 'string' && l.text.trim().length > 0, 'fala sem texto');
      }
    }
  });

  t.test('toda ação usada pelo roteiro é tratada pela cena', () => {
    for (const tr of s.triggers) if (tr.after) t.ok(ACTIONS.has(tr.after), `ação desconhecida: ${tr.after}`);
  });

  t.test('falas cabem na caixa (até 160 letras)', () => {
    for (const [id, lines] of ALL.flatMap(([, st]) => Object.entries(st.dialogs))) {
      for (const l of lines) t.ok(l.text.length <= 160, `fala longa demais em "${id}": ${l.text.length} letras`);
    }
  });

  t.test('diretor: gatilho só dispara com o Nilo no chão e depois da coluna', () => {
    const dialog = new FakeDialog();
    const d = new StoryDirector(s, { dialog, tile: 16 });
    d.update(1 / 60, { x: 13 * 16, onGround: true });
    d.update(1 / 60, { x: 13 * 16, onGround: true });
    t.equal(dialog.opened.length, 0, 'antes da coluna 14');
    d.update(1 / 60, { x: 15 * 16, onGround: false });
    d.update(1 / 60, { x: 15 * 16, onGround: false });
    t.equal(dialog.opened.length, 0, 'no ar');
    d.update(1 / 60, { x: 15 * 16, onGround: true });
    t.equal(dialog.opened.length, 1, 'no chão, depois da coluna');
  });

  t.test('diretor: gatilho com requisito espera a flag', () => {
    const dialog = new FakeDialog();
    const d = new StoryDirector(s, { dialog, tile: 16 });
    d.seen.add('mira'); // pula o encontro
    d.update(1 / 60, { x: 63 * 16, onGround: true });
    t.equal(dialog.opened.length, 0, 'aviso da Traça sem a Mira');
    d.setFlag('miraJoined');
    d.update(1 / 60, { x: 63 * 16, onGround: true });
    d.update(1 / 60, { x: 63 * 16, onGround: true });
    t.equal(dialog.opened.length, 1, 'com a Mira');
  });

  t.test('diretor: evento toca uma vez só e executa a ação ao terminar', () => {
    const dialog = new FakeDialog();
    const actions = [];
    const d = new StoryDirector(s, { dialog, tile: 16, onAction: (a) => actions.push(a) });
    t.ok(d.event('exit', { after: 'complete' }), 'primeira vez deveria tocar');
    t.ok(!d.event('exit', { after: 'complete' }), 'segunda vez não');
    d.update(1 / 60, { x: 0, onGround: true });
    dialog.finish();
    t.equal(actions, ['complete']);
  });

  t.test('diretor: salvar e restaurar mantém o que já aconteceu', () => {
    const d1 = new StoryDirector(s, { dialog: new FakeDialog(), tile: 16 });
    d1.event('stone0');
    d1.setFlag('miraJoined');
    const d2 = new StoryDirector(s, { dialog: new FakeDialog(), tile: 16 });
    d2.restore(JSON.parse(JSON.stringify(d1.saveState())));
    t.ok(d2.flags.has('miraJoined') && d2.flags.has('stone0'), 'flags');
    t.ok(!d2.event('stone0'), 'diálogo já visto não deveria repetir');
  });
}

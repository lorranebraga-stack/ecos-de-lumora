// Expansão (Etapa 12): Minas de Cristal, Cristalídeo, Pulo-Eco e a Matriarca de Quartzo.
import { CONFIG } from '../../js/config.js';
import { Level } from '../../js/game/Level.js';
import { Player } from '../../js/game/Player.js';
import { Cristalideo } from '../../js/game/Enemy.js';
import { Matriarca } from '../../js/game/Boss.js';
import { MemorySystem } from '../../js/game/MemorySystem.js';
import { Collectibles } from '../../js/game/Collectibles.js';
import { Particles } from '../../js/game/Particles.js';
import { AbilityShrine } from '../../js/game/AbilityShrine.js';
import { MINAS } from '../../js/levels/minas.js';
import { explore } from '../lib/reach.js';
import { FakeInput, levelFrom, spawnPlayer, steps, DT, T } from '../lib/sim.js';

const FLAT = [
  '##############################',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#P...........................#',
  '##############################',
];

// Sala do Cristalídeo: ele à direita, parede à esquerda do Nilo.
const ROLL_ROOM = [
  '##############################',
  '#............................#',
  '#............................#',
  '#....#..................r....#',
  '##############################',
];

function echoJumpHeight(abilities, secondAt = 18) {
  const level = levelFrom(FLAT);
  const { p, input } = spawnPlayer(level);
  p.abilities = new Set(abilities);
  const y0 = p.y;
  let minY = y0;
  let echoes = 0;
  input.press('jump');
  steps(p, level, input, 120, (pl, i) => {
    if (i === secondAt || i === secondAt + 10) input.press('jump'); // tenta 2x no ar
    if (pl.justEchoJumped) echoes++;
    minY = Math.min(minY, pl.y);
  });
  return { height: y0 - minY, echoes };
}

function arenaFor(level) {
  const q = level.entities.find((e) => e.type === 'boss');
  const start = Math.floor(q.tx / 30) * 30;
  return { q, start, arena: { left: (start + 2) * T, right: (start + 29) * T, ceiling: 7 * T, floor: (q.ty + 1) * T } };
}

export default function (t) {
  // ---------- Região ----------
  t.test('Minas: mapa bem formado, tema e objetos planejados', () => {
    t.equal([...new Set(MINAS.map.map((r) => r.length))], [120], 'larguras');
    const level = new Level(MINAS);
    t.equal(level.theme, 'minas');
    const count = (type) => level.entities.filter((e) => e.type === type).length;
    t.equal([count('shrine'), count('boss'), count('stone'), count('fragment'), count('lantern'), count('cristalideo')],
      [1, 1, 1, 1, 1, 2], 'altar, chefe, pedra, fragmento, lanterna, cristalídeos');
    t.ok(level.exit, 'tem saída');
  });

  t.test('Minas: a arena do chefe ocupa um trecho inteiro e é fechada à direita', () => {
    const level = new Level(MINAS);
    const { start, q } = arenaFor(level);
    t.equal(q.tx - start < 30, true);
    for (let ty = 7; ty <= 16; ty++) t.ok(level.isSolid(start + 29, ty), `parede direita aberta na linha ${ty}`);
    for (let ty = 7; ty <= 16; ty++) t.ok(!level.isSolid(start + 1, ty), `coluna do portão bloqueada na linha ${ty}`);
  });

  // ---------- Pulo-Eco ----------
  t.test('Pulo-Eco: sem a habilidade, apertar no ar não faz nada', () => {
    const r = echoJumpHeight([]);
    t.equal(r.echoes, 0);
    t.near(r.height, 47.5, 2, 'altura de um pulo comum');
  });

  t.test('Pulo-Eco: com a habilidade, sobe ~5 blocos e só uma vez por pulo', () => {
    const r = echoJumpHeight(['pulo-eco']);
    t.equal(r.echoes, 1, 'pulos extras');
    t.between(r.height, 75, 95, 'altura total');
  });

  t.test('Pulo-Eco: recarrega ao tocar o chão', () => {
    const level = levelFrom(FLAT);
    const { p, input } = spawnPlayer(level);
    p.abilities = new Set(['pulo-eco']);
    let echoes = 0;
    for (let round = 0; round < 2; round++) {
      input.press('jump');
      steps(p, level, input, 100, (pl, i) => {
        if (i === 18) input.press('jump');
        if (pl.justEchoJumped) echoes++;
      });
    }
    t.equal(echoes, 2);
  });

  // ---------- Cristalídeo ----------
  t.test('Cristalídeo: vê o Nilo → se encolhe → rola → bate na parede → racha', () => {
    const level = levelFrom(ROLL_ROOM.map((r, i) => (i === 3 ? r.replace('#....#', '#P...#') : r)));
    const c = new Cristalideo(24, 3, T);
    // A 8 blocos do Cristalídeo: dentro da distância de visão (CONFIG ENEMIES.CRISTALIDEO.SIGHT_X)
    const nilo = { x: 16 * T, y: 3 * T + 16 - 18, w: 10, h: 18, alive: true };
    const seen = [c.state];
    for (let i = 0; i < 400; i++) {
      c.update(DT, level, nilo);
      if (seen[seen.length - 1] !== c.state) seen.push(c.state);
      if (c.state === 'cracked') break;
      if (c.state !== 'idle') nilo.y = -999; // depois de avistado, o Nilo "pula fora" do caminho
    }
    t.equal(seen, ['idle', 'windup', 'roll', 'cracked'], 'estados');
  });

  t.test('Cristalídeo: inteiro é blindado; rachado pode ser derrotado e não machuca', () => {
    const c = new Cristalideo(5, 5, T);
    t.equal(c.onStomp(), 'bounce', 'inteiro');
    t.ok(!c.harmless, 'inteiro machuca');
    c.state = 'cracked';
    t.equal(c.onStomp(), 'defeat', 'rachado');
    t.ok(c.harmless, 'rachado não machuca');
  });

  t.test('Cristalídeo: freia na beira de um abismo (não cai)', () => {
    const level = levelFrom([
      '##############################',
      '#P...........................#',
      '#............................#',
      '#............................#',
      '#####......###########.......#',
    ]);
    const c = new Cristalideo(16, 3, T);
    const nilo = { x: 2 * T, y: 3 * T + 16 - 18, w: 10, h: 18, alive: true };
    for (let i = 0; i < 400; i++) c.update(DT, level, nilo);
    t.ok(c.y < level.pixelHeight, 'caiu no abismo');
    t.ok(c.x >= 11 * T - 1, `passou da beira: x=${c.x}`);
  });

  // ---------- Chefe ----------
  t.test('Matriarca: alterna chuva e investida, sempre com aviso antes', () => {
    const level = new Level(MINAS);
    const { q, arena } = arenaFor(level);
    const b = new Matriarca(q.tx, q.ty, T, arena);
    const nilo = { x: arena.left + 60, y: arena.floor - 18, w: 10, h: 18, alive: true };
    b.start();
    const states = [b.state];
    for (let i = 0; i < 60 * 14; i++) {
      b.update(DT, nilo);
      if (states[states.length - 1] !== b.state) states.push(b.state);
    }
    const seq = states.join(' → ');
    t.ok(seq.includes('idle → rain → idle → windup → charge → dizzy → return → idle'), `sequência: ${seq}`);
  });

  t.test('Matriarca: na chuva, um cristal mira o Nilo e todos avisam antes de cair', () => {
    const level = new Level(MINAS);
    const { q, arena } = arenaFor(level);
    const b = new Matriarca(q.tx, q.ty, T, arena);
    const nilo = { x: arena.left + 100, y: arena.floor - 18, w: 10, h: 18, alive: true };
    b.startRain(nilo);
    t.equal(b.shards.length, CONFIG.BOSS.MATRIARCA.SHARDS[0], 'quantidade na fase 1');
    t.ok(b.shards.every((s) => s.state === 'warn'), 'todos começam avisando');
    t.ok(b.shards.some((s) => Math.abs(s.x - (nilo.x + 5)) < 1), 'um mira o Nilo');
    t.ok(!b.shardHits(nilo), 'avisando ainda não machuca');
  });

  t.test('Matriarca: só leva dano tonta; 3 acertos a acalmam', () => {
    const level = new Level(MINAS);
    const { q, arena } = arenaFor(level);
    const b = new Matriarca(q.tx, q.ty, T, arena);
    b.start();
    t.ok(!b.hit(), 'não pode levar dano parada');
    for (let n = 0; n < 3; n++) {
      b.state = 'dizzy';
      t.ok(b.hit(), `acerto ${n + 1}`);
    }
    t.ok(b.defeated, 'deveria estar derrotada');
    t.ok(b.harmless, 'derrotada não machuca');
  });

  t.test('Matriarca: fase 2 (1 de vida) tem mais cristais', () => {
    const level = new Level(MINAS);
    const { q, arena } = arenaFor(level);
    const b = new Matriarca(q.tx, q.ty, T, arena);
    b.hp = 1;
    b.startRain({ x: arena.left + 100, w: 10 });
    t.equal(b.shards.length, CONFIG.BOSS.MATRIARCA.SHARDS[1]);
  });

  // ---------- Alcance (lento) ----------
  t.test('Minas: o Pulo-Eco e a memória são obrigatórios, nessa ordem', async () => {
    const FAR = { x: -9999, y: -9999, w: 10, h: 18 };
    const run = async (abilities, memory) => {
      const level = new Level(MINAS);
      const m = new MemorySystem(level, new Particles());
      const shrines = level.entities.filter((e) => e.type === 'shrine').map((e) => new AbilityShrine(e.tx, e.ty, T, 'pulo-eco'));
      const crystals = new Collectibles(level.entities, T).crystals;
      if (memory) {
        m.held = 1;
        m.activate(m.stones[0]);
        for (let i = 0; i < 300; i++) m.update(DT, FAR);
      }
      const f = await explore(level, { crystals, fragments: m.fragments, stones: m.stones, shrines }, { abilities });
      return { shrine: f.shrines.size, fragment: f.fragments.size, stone: f.stones.size, exit: f.exit, crystals: `${f.crystals.size}/${crystals.length}` };
    };
    const none = await run([], false);
    t.equal([none.shrine, none.fragment, none.stone, none.exit], [1, 0, 0, false], 'sem nada: só o altar');
    const memOnly = await run([], true);
    t.equal([memOnly.fragment, memOnly.exit], [0, false], 'só memória (sem Pulo-Eco) não basta');
    const echo = await run(['pulo-eco'], false);
    t.equal([echo.fragment, echo.stone, echo.exit], [1, 1, false], 'com Pulo-Eco: fragmento e pedra, sem saída');
    const all = await run(['pulo-eco'], true);
    t.equal([all.exit, all.crystals], [true, '10/10'], 'com os dois: saída e todos os cristais');
  }, { slow: true });

  t.test('o Nilo começa sem habilidades (elas vêm do salvamento)', () => {
    t.equal(new Player(0, 0).abilities.size, 0);
    t.ok(new FakeInput(), 'ok');
  });
}

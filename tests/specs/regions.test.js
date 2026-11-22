// v1.4: Arquipélago, Cidade e Santuário; mecânicas novas; os quatro chefes novos; missões e estrelas.
import { CONFIG } from '../../js/config.js';
import { Level } from '../../js/game/Level.js';
import { Player } from '../../js/game/Player.js';
import { EcoVazio, Sopro } from '../../js/game/Enemy.js';
import { MemorySystem } from '../../js/game/MemorySystem.js';
import { Collectibles } from '../../js/game/Collectibles.js';
import { Particles } from '../../js/game/Particles.js';
import { WindSystem, CrumbleSystem, Clock, SecretEcho } from '../../js/game/Mechanics.js';
import { Missions } from '../../js/game/Missions.js';
import { BOSSES } from '../../js/game/bosses/index.js';
import { Progress } from '../../js/core/Progress.js';
import { BOSQUE } from '../../js/levels/bosque.js';
import { MINAS } from '../../js/levels/minas.js';
import { ARQUIPELAGO } from '../../js/levels/arquipelago.js';
import { CIDADE } from '../../js/levels/cidade.js';
import { SANTUARIO } from '../../js/levels/santuario.js';
import { explore } from '../lib/reach.js';
import { FakeInput, levelFrom, spawnPlayer, steps, DT, T } from '../lib/sim.js';

const NEW = [['Arquipélago', ARQUIPELAGO], ['Cidade', CIDADE], ['Santuário', SANTUARIO]];
const ALL = [['Bosque', BOSQUE], ['Minas', MINAS], ...NEW];
const FAR = { x: -9999, y: -9999, w: 10, h: 18 };

const ROOM = [
  '##############################',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#P...........................#',
  '##############################',
];

// Arena genérica para testar os chefes: o 'Q' fica no chão, à direita.
function arenaFor(data) {
  const level = new Level(data);
  const q = level.entities.find((e) => e.type === 'boss');
  const start = Math.floor(q.tx / 30) * 30;
  let ceiling = 0;
  while (level.isSolid(start + 2, ceiling + 1) || level.isSolid(start + 2, ceiling)) ceiling++;
  return { level, q, arena: { start, left: (start + 2) * T, right: (start + 29) * T, ceiling: ceiling * T, floor: (q.ty + 1) * T } };
}

// Coloca o chefe no estado vulnerável jogando "de verdade" (sem o Nilo atrapalhar) e conta os estados.
function runBoss(Cls, data, seconds = 25) {
  const { q, arena } = arenaFor(data);
  const b = new Cls(q.tx, q.ty, T, arena);
  const nilo = { x: arena.left + 60, y: arena.floor - 18, w: 10, h: 18, vy: 0, alive: true };
  b.start();
  const states = [b.state];
  let warnedBeforeHit = true;
  let sawVulnerable = false;
  for (let i = 0; i < seconds * 60; i++) {
    b.update(DT, nilo);
    if (b.vulnerable) sawVulnerable = true;
    if (states[states.length - 1] !== b.state) states.push(b.state);
    b.events.length = 0;
    // Nenhum perigo pode acertar no mesmo passo em que é criado (sempre há aviso antes).
    if (i === 0 && b.hazardHits(nilo)) warnedBeforeHit = false;
  }
  return { b, states, warnedBeforeHit, sawVulnerable, arena };
}

export default function (t) {
  // ---------- Mapas ----------
  t.test('as cinco regiões: mapas bem formados, com fragmentos, pedras, chefe e Eco Escondido', () => {
    for (const [name, data] of ALL) {
      t.equal(data.map.length, 20, `${name}: linhas`);
      t.equal(new Set(data.map.map((r) => r.length)).size, 1, `${name}: larguras diferentes`);
      const level = new Level(data);
      const count = (type) => level.entities.filter((e) => e.type === type).length;
      t.equal(count('boss'), 1, `${name}: chefe`);
      t.equal(count('secret'), 1, `${name}: Eco Escondido`);
      t.ok(level.exit, `${name}: saída`);
      t.ok(BOSSES[data.boss || 'matriarca'], `${name}: chefe "${data.boss}" não registrado`);
      new MemorySystem(level, new Particles()); // lança erro se algum bloco de memória ficar sem pedra
    }
    for (const [name, data] of NEW) {
      const level = new Level(data);
      const count = (type) => level.entities.filter((e) => e.type === type).length;
      t.equal([count('fragment'), count('stone')], [3, 3], `${name}: 3 fragmentos e 3 pedras`);
      t.ok(count('lantern') >= 1, `${name}: pelo menos uma lanterna`);
    }
  });

  t.test('nenhum objeto nasce dentro de bloco sólido (todas as regiões, nos dois estados da cidade)', () => {
    for (const [name, data] of ALL) {
      const level = new Level(data);
      for (const cs of [0, 1]) {
        level.cityState = cs;
        for (const e of level.entities) {
          if (e.type === 'boss') continue;
          t.ok(!level.isSolid(e.tx, e.ty), `${name}: ${e.type} em (${e.tx}, ${e.ty}) dentro de bloco (estado ${cs})`);
        }
      }
    }
  });

  t.test('as pedras são numeradas da esquerda para a direita', () => {
    for (const [name, data] of ALL) {
      const m = new MemorySystem(new Level(data), new Particles());
      const xs = m.stones.map((s) => s.x);
      t.equal(xs, [...xs].sort((a, b) => a - b), `${name}: ordem das pedras`);
    }
  });

  // ---------- Mecânicas ----------
  t.test('ilha frágil: treme, cai e volta depois', () => {
    const level = levelFrom(ROOM);
    level.grid[7][2] = '%';
    const cr = new CrumbleSystem(level);
    const p = { x: 2 * T + 3, y: 7 * T - 18, w: 10, h: 18, onGround: true };
    cr.update(DT, p);
    t.ok(level.shaking.size > 0, 'deveria começar a tremer');
    for (let i = 0; i < 60; i++) cr.update(DT, { ...p, onGround: false, x: -999 });
    t.equal(level.tileAt(2, 7), '.', 'deveria ter caído');
    for (let i = 0; i < 60 * 4; i++) cr.update(DT, { ...p, onGround: false, x: -999 });
    t.equal(level.tileAt(2, 7), '%', 'deveria ter voltado');
  });

  t.test('vento: rajada empurra, corrente levanta, e a pedra acalma', () => {
    const level = levelFrom(ROOM);
    const wind = new WindSystem([{ c0: 0, c1: 29, r0: 0, r1: 7, fx: -200, calmBy: 0 }], T);
    const { p, input } = spawnPlayer(level);
    p.x = 15 * T;
    const x0 = p.x;
    steps(p, level, input, 60, (pl) => { const f = wind.forceAt(pl); pl.windX = f.fx; });
    t.ok(p.x < x0 - 100, `o vento deveria empurrar para a esquerda (andou ${Math.round(p.x - x0)} px)`);
    wind.syncMemory([{ active: true }]);
    t.equal(wind.forceAt(p).fx, 0, 'acalmado pela pedra 0');

    const up = new WindSystem([{ c0: 10, c1: 12, r0: 1, r1: 6, fy: -1700 }], T);
    const q = spawnPlayer(level);
    q.p.x = 11 * T;
    const y0 = q.p.y;
    let minY = y0;
    steps(q.p, level, q.input, 90, (pl) => { const f = up.forceAt(pl); pl.windY = f.fy; minY = Math.min(minY, pl.y); });
    t.ok(y0 - minY > 60, `a corrente deveria levantar o Nilo (subiu ${Math.round(y0 - minY)} px)`);
  });

  t.test('rajadas avisam antes de ligar', () => {
    const w = new WindSystem([{ c0: 0, c1: 3, r0: 0, r1: 3, fx: -100, on: 1, off: 2 }], T);
    const seen = [];
    for (let i = 0; i < 60 * 4; i++) {
      w.time += DT;
      const st = w.stateOf(w.zones[0]);
      if (seen[seen.length - 1] !== st) seen.push(st);
    }
    t.ok(seen.join(' → ').includes('off → warn → on'), `sequência: ${seen.join(' → ')}`);
  });

  t.test('cidade: o relógio troca os prédios e nunca prende o Nilo', () => {
    const level = levelFrom(['#####', '#Pab#', '#####']);
    t.ok(level.isSolid(2, 1) && !level.isSolid(3, 1), 'estado 0: lembrado sólido');
    t.ok(level.toggleCity([]), 'troca');
    t.ok(!level.isSolid(2, 1) && level.isSolid(3, 1), 'estado 1: esquecido sólido');
    const inside = { x: 2 * T + 2, y: T, w: 10, h: 14 };
    t.ok(!level.toggleCity([inside]), 'não troca com alguém dentro do prédio que vai aparecer');
    t.equal(level.cityState, 1, 'continua no estado 1');
    const clock = new Clock(1, 1, T);
    t.ok(clock.isNear({ x: T + 2, y: 2 * T - 18, w: 10, h: 18 }), 'perto do relógio');
  });

  t.test('Eco Vazio: acorda, repete o caminho com atraso e se desfaz dentro de um prédio', () => {
    const level = levelFrom(ROOM);
    const e = new EcoVazio(3, 6, T);
    const nilo = new Player(5 * T, 6 * T - 18);
    nilo.onGround = true;
    t.ok(e.harmless && e.state === 'dormant', 'começa dormindo e inofensivo');
    const input = new FakeInput().hold('right');
    const path = [];
    for (let i = 0; i < 160; i++) {
      nilo.update(DT, input, level);
      e.update(DT, level, nilo);
      path.push(nilo.x);
    }
    t.equal(e.state, 'chasing', 'acordou');
    const delay = Math.round(CONFIG.ENEMIES.ECO.DELAY / DT);
    t.near(e.x, path[path.length - 1 - delay], 1, 'está onde o Nilo estava há DELAY segundos');
    // Um prédio aparece onde a sombra está: ela se desfaz.
    level.grid[Math.floor((e.y + 9) / T)][Math.floor((e.x + 5) / T)] = '#';
    e.update(DT, level, nilo);
    t.ok(!e.alive && e.crushed, 'deveria ter se desfeito');
  });

  t.test('Sopro: incha (aviso), sopra e empurra; lembrado vira trampolim', () => {
    const s = new Sopro(10, 3, T);
    const nilo = { x: 6 * T, y: 3 * T, w: 10, h: 18, alive: true };
    const level = levelFrom(ROOM);
    const states = [s.state];
    let pushed = 0;
    for (let i = 0; i < 60 * 5; i++) {
      s.update(DT, level, nilo);
      if (states[states.length - 1] !== s.state) states.push(s.state);
      pushed = Math.min(pushed, s.gustAt(nilo));
    }
    t.ok(states.join(' → ').includes('idle → inhale → blow'), `estados: ${states.join(' → ')}`);
    t.ok(pushed < 0, 'a rajada deveria empurrar o Nilo para longe (esquerda)');
    s.remember();
    t.ok(s.harmless && typeof s.spring === 'function', 'calmo: inofensivo e trampolim');
  });

  t.test('missões: o objetivo atual é o primeiro pendente, com contador', () => {
    const m = new Missions({ mission: 'X', objectives: [{ text: 'A', flag: 'a' }, { text: 'B', flag: 'b', progress: 'fragments' }, { text: 'C', flag: 'exit' }] });
    const done = [];
    m.onComplete = (o) => done.push(o.text);
    t.equal(m.currentText(), 'A');
    m.mark('a');
    t.equal(m.currentText({ fragments: [1, 3] }), 'B (1/3)');
    m.mark('exit');
    t.equal(m.current.text, 'B', 'fora de ordem: continua no B');
    m.mark('b');
    t.ok(m.allDone && m.currentText() === '', 'tudo concluído');
    t.equal(done, ['A', 'C', 'B']);
    const m2 = new Missions({ objectives: m.objectives });
    m2.restore(m.saveState());
    t.ok(m2.allDone, 'salvamento das missões');
  });

  t.test('estrelas: ficam para sempre e somam no mapa', () => {
    const mem = { data: null, available: true, load() { return this.data; }, save(d) { this.data = JSON.parse(JSON.stringify(d)); return true; }, clear() { this.data = null; } };
    const pr = new Progress(mem);
    pr.completeLevel('bosque', { score: 10, time: 100, crystals: 5, stars: [true, false, true] });
    pr.completeLevel('bosque', { score: 5, time: 200, crystals: 23, stars: [true, true, false] });
    t.equal(pr.levelInfo('bosque').stars, [true, true, true], 'estrelas acumulam entre partidas');
    t.equal([pr.totalStars(), pr.maxStars()], [3, 15]);
  });

  t.test('Eco Escondido: área de coleta generosa', () => {
    const s = new SecretEcho(5, 5, T);
    t.ok(s.touches({ x: 5 * T, y: 5 * T, w: 10, h: 18 }));
    t.ok(!s.touches({ x: 9 * T, y: 5 * T, w: 10, h: 18 }));
  });

  // ---------- Chefes ----------
  const BOSS_CASES = [
    ['Raiz Esquecida', 'raiz', BOSQUE, 'tired'],
    ['Tempestade Sem Nome', 'tempestade', ARQUIPELAGO, 'tired'],
    ['O Arquivista', 'arquivista', CIDADE, 'reading'],
    ['O Vulto', 'vulto', SANTUARIO, 'cracked'],
  ];
  for (const [name, id, data, weak] of BOSS_CASES) {
    t.test(`${name}: alterna ataques e fica vulnerável ("${weak}") depois deles`, () => {
      const r = runBoss(BOSSES[id], data);
      t.ok(r.sawVulnerable, `nunca ficou vulnerável: ${r.states.join(' → ')}`);
      t.ok(r.states.length >= 6, `poucos estados: ${r.states.join(' → ')}`);
      t.ok(r.warnedBeforeHit, 'algum ataque acertou sem aviso');
      t.equal(r.b.name, name);
    });

    t.test(`${name}: só leva dano vulnerável; derrotado, se acalma e não machuca`, () => {
      const { q, arena } = arenaFor(data);
      const b = new BOSSES[id](q.tx, q.ty, T, arena);
      b.start();
      t.ok(!b.hit(), 'não pode levar dano fora do estado vulnerável');
      for (let n = 0; n < b.maxHp; n++) {
        b.state = weak;
        t.ok(b.hit(), `acerto ${n + 1}`);
      }
      t.ok(b.defeated && b.harmless, 'derrotado e inofensivo');
      t.ok(b.events.some((e) => e.type === 'defeated'), 'avisa a cena');
    });
  }

  t.test('Tempestade: a ventania empurra menos que a corrida (dá para resistir)', () => {
    t.ok(CONFIG.BOSS.TEMPESTADE.GUST_FORCE < CONFIG.PLAYER.RUN_SPEED, 'força da ventania');
  });

  t.test('Vulto: na investida ele se curva (dá para pular por cima)', () => {
    const { q, arena } = arenaFor(SANTUARIO);
    const b = new BOSSES.vulto(q.tx, q.ty, T, arena);
    b.start();
    b.patternIndex = 1; // a próxima é a investida
    b.nextPattern({ x: arena.left + 40, w: 10 });
    t.equal(b.state, 'windup');
    t.ok(b.h <= 26, `altura na investida: ${b.h}`);
  });

  // ---------- Alcance (lento) ----------
  for (const [name, data] of NEW) {
    t.test(`${name}: cada Pedra-Eco abre o trecho seguinte; no fim, saída, cristais e segredo`, async () => {
      const stages = [[], [0], [0, 1], [0, 1, 2]];
      const results = [];
      for (const active of stages) {
        const level = new Level(data);
        const m = new MemorySystem(level, new Particles());
        for (const i of active) { m.held = 1; m.activate(m.stones[i]); }
        for (let i = 0; i < 400; i++) m.update(DT, FAR);
        const crystals = new Collectibles(level.entities, T).crystals;
        const secrets = level.entities.filter((e) => e.type === 'secret').map((e) => new SecretEcho(e.tx, e.ty, T));
        const clocks = level.entities.filter((e) => e.type === 'clock').map((e) => new Clock(e.tx, e.ty, T));
        const wind = (data.wind || []).filter((z) => z.calmBy === undefined || !active.includes(z.calmBy));
        const f = await explore(level, { crystals, fragments: m.fragments, stones: m.stones, shrines: secrets, clocks }, { abilities: ['pulo-eco'], wind });
        results.push({ stones: [...f.stones].sort(), exit: f.exit, crystals: f.crystals.size === crystals.length, secret: f.shrines.size === 1 });
      }
      t.equal(results.map((r) => r.stones), [[0], [0, 1], [0, 1, 2], [0, 1, 2]], 'pedras alcançáveis em cada estágio');
      t.equal(results.map((r) => r.exit), [false, false, false, true], 'saída só no fim');
      t.ok(results[3].crystals, 'todos os cristais no fim');
      t.ok(results[3].secret, 'Eco Escondido alcançável');
    }, { slow: true });
  }

  t.test('Bosque e Minas: o Eco Escondido é alcançável', async () => {
    for (const [name, data, abilities, stones] of [['Bosque', BOSQUE, [], [0, 1, 2]], ['Minas', MINAS, ['pulo-eco'], [0]]]) {
      const level = new Level(data);
      const m = new MemorySystem(level, new Particles());
      for (const i of stones) { m.held = 1; m.activate(m.stones[i]); }
      for (let i = 0; i < 400; i++) m.update(DT, FAR);
      const secrets = level.entities.filter((e) => e.type === 'secret').map((e) => new SecretEcho(e.tx, e.ty, T));
      const f = await explore(level, { shrines: secrets }, { abilities });
      t.equal(f.shrines.size, 1, `${name}: segredo`);
      t.ok(f.exit, `${name}: saída`);
    }
  }, { slow: true });
}

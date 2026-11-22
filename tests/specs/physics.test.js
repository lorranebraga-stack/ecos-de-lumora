// Física e colisões do Nilo.
import { CONFIG } from '../../js/config.js';
import { Player } from '../../js/game/Player.js';
import { Level } from '../../js/game/Level.js';
import { BOSQUE } from '../../js/levels/bosque.js';
import { FakeInput, levelFrom, spawnPlayer, steps, insideSolid, T, DT } from '../lib/sim.js';

// Sala plana: chão na linha 7 (topo em y = 112), então o Nilo em pé fica em y = 112 - 18 = 94.
const FLAT = [
  '##############################',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#P...........................#',
  '##############################',
];

// Parede de 4 blocos (64 px): alta demais para pular.
const WALL = [
  '##############################',
  '#............................#',
  '#............................#',
  '#..........#.................#',
  '#..........#.................#',
  '#..........#.................#',
  '#P.........#.................#',
  '##############################',
];

// Teto baixo: a base do teto fica em y = 80 (linha 4 sólida).
const LOW_CEILING = [
  '##############################',
  '#............................#',
  '#............................#',
  '#............................#',
  '##############################',
  '#............................#',
  '#P...........................#',
  '##############################',
];

// Galho dois blocos acima do chão (topo em y = 96; em pé nele, y = 78).
const PLATFORM = [
  '##############################',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#..====......................#',
  '#...P........................#',
  '##############################',
];

// Borda: chão só até a coluna 10, depois um abismo.
const LEDGE = [
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '.P............................',
  '###########...................',
  '..............................',
  '..............................',
];

function tallShaft() {
  const rows = ['######', '#P...#'];
  for (let i = 0; i < 56; i++) rows.push('#....#');
  rows.push('######');
  return rows;
}

// Mede a altura máxima de um pulo segurando Espaço por holdFrames passos.
function jumpHeight(holdFrames) {
  const level = levelFrom(FLAT);
  const { p, input } = spawnPlayer(level);
  const y0 = p.y;
  let minY = y0;
  input.press('jump');
  steps(p, level, input, 90, (pl, i) => {
    if (i === holdFrames) input.release('jump');
    minY = Math.min(minY, pl.y);
  });
  return y0 - minY;
}

// Mede a distância horizontal de um pulo em pista plana.
function jumpDistance(run) {
  const level = levelFrom(FLAT);
  const { p, input } = spawnPlayer(level);
  input.hold('right');
  if (run) input.hold('run');
  steps(p, level, input, 45); // pega velocidade
  const x0 = p.x;
  input.press('jump');
  let n = 0;
  p.update(DT, input, level);
  input.endStep();
  while (!p.onGround && n++ < 200) {
    p.update(DT, input, level);
    input.endStep();
  }
  return p.x - x0;
}

export default function (t) {
  t.test('o Nilo pousa exatamente no chão', () => {
    const level = levelFrom(FLAT);
    const { p } = spawnPlayer(level, 60);
    t.ok(p.onGround, 'deveria estar no chão');
    t.equal(p.y, 7 * T - CONFIG.PLAYER.HEIGHT, 'posição y');
  });

  t.test('pulo cheio sobe ~3 blocos (47 ± 2 px)', () => {
    t.near(jumpHeight(60), 47.5, 2, 'altura');
  });

  t.test('soltar o pulo cedo dá um pulo bem mais baixo', () => {
    const full = jumpHeight(60);
    const short = jumpHeight(3);
    t.ok(short < full * 0.6, `pulo curto ${short.toFixed(1)} px deveria ser < 60% de ${full.toFixed(1)} px`);
  });

  t.test('pulo andando alcança entre 48 e 64 px', () => {
    t.between(jumpDistance(false), 48, 64, 'distância');
  });

  t.test('pulo correndo alcança entre 85 e 100 px', () => {
    t.between(jumpDistance(true), 85, 100, 'distância');
  });

  t.test('não atravessa uma parede correndo e pulando por 3 s', () => {
    const level = levelFrom(WALL);
    const { p, input } = spawnPlayer(level);
    input.hold('right', 'run');
    steps(p, level, input, 180, (pl, i) => { if (i % 20 === 0) input.press('jump'); });
    t.ok(p.x + p.w <= 11 * T + 0.01, `a borda direita (${(p.x + p.w).toFixed(2)}) passou da parede (${11 * T})`);
  });

  t.test('não atravessa o chão caindo na velocidade máxima', () => {
    const level = levelFrom(tallShaft());
    const { p } = spawnPlayer(level, 300);
    t.ok(p.onGround, 'deveria ter pousado');
    t.equal(p.y, (level.rows - 1) * T - CONFIG.PLAYER.HEIGHT, 'posição y');
  });

  t.test('bate a cabeça no teto e não entra nele', () => {
    const level = levelFrom(LOW_CEILING);
    const { p, input } = spawnPlayer(level);
    let minY = p.y;
    input.press('jump');
    steps(p, level, input, 60, (pl) => { minY = Math.min(minY, pl.y); });
    t.ok(minY >= 5 * T - 0.01, `a cabeça chegou em y=${minY.toFixed(2)}, acima do teto (${5 * T})`);
  });

  t.test('galho: atravessa por baixo e fica em pé em cima', () => {
    const level = levelFrom(PLATFORM);
    const { p, input } = spawnPlayer(level);
    input.press('jump');
    steps(p, level, input, 90);
    t.ok(p.onGround, 'deveria estar apoiado');
    t.equal(p.y, 6 * T - CONFIG.PLAYER.HEIGHT, 'em pé sobre o galho (topo na linha 6)');
  });

  // Regressão: antes da correção em Physics.js, o Nilo era teletransportado
  // para CIMA do teto quando nascia com a cabeça encostada nele.
  t.test('regressão: nascer com a cabeça no teto não teletransporta o Nilo', () => {
    const level = levelFrom(['#####', '#P..#', '#...#', '#...#', '#####']);
    const p = new Player(level.spawn.x, level.spawn.y);
    t.ok(p.y < T, 'o mapa de teste precisa começar com a cabeça dentro do teto');
    const input = new FakeInput();
    steps(p, level, input, 60);
    t.ok(p.onGround, 'deveria estar no chão');
    t.equal(p.y, 4 * T - CONFIG.PLAYER.HEIGHT, 'deveria cair até o chão, não subir no teto');
  });

  t.test('regressão: encostado numa parede, cair não "sobe" o Nilo nela', () => {
    const level = levelFrom(['#######', '#.....#', '#..#..#', '#..#..#', '#..#..#', '#.P#..#', '#######']);
    const p = new Player(3 * T - 9, 2 * T); // borda direita 1 px dentro da parede
    const input = new FakeInput();
    steps(p, level, input, 60);
    t.ok(p.y > 2 * T, `deveria ter caído ao lado da parede, está em y=${p.y.toFixed(1)}`);
  });

  t.test('coyote time: ainda pula 4 passos depois de sair da borda', () => {
    t.ok(jumpAfterLeavingEdge(4), 'deveria ter pulado');
  });

  t.test('coyote time: NÃO pula 10 passos depois de sair da borda', () => {
    t.ok(!jumpAfterLeavingEdge(10), 'não deveria ter pulado');
  });

  t.test('buffer: Espaço apertado pouco antes de pousar vira pulo', () => {
    t.ok(bufferedJump(5), 'deveria pular ao tocar o chão');
  });

  t.test('buffer: Espaço apertado muito antes de pousar é ignorado', () => {
    t.ok(!bufferedJump(14), 'não deveria pular');
  });

  t.test('teste de estresse: 300 partidas aleatórias no Bosque sem ficar preso em bloco', () => {
    const level = new Level(BOSQUE);
    const starts = [level.spawn, { x: 520, y: 238 }, { x: 980, y: 254 }, { x: 1760, y: 254 }, { x: 1990, y: 254 }, { x: 2500, y: 254 }];
    const actions = ['left', 'right', 'run', 'jump'];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let run = 0; run < 300; run++) {
      const s = starts[run % starts.length];
      const p = new Player(s.x, s.y);
      const input = new FakeInput();
      for (let f = 0; f < 300; f++) {
        if (f % 12 === 0) {
          input.held.clear();
          for (const a of actions) if (rnd() < 0.45) (a === 'jump' ? input.press(a) : input.hold(a));
        }
        p.update(DT, input, level);
        input.endStep();
        if (insideSolid(p, level)) {
          throw new Error(`preso dentro de um bloco em x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)} (partida ${run}, passo ${f})`);
        }
        t.ok(p.x >= 0 && p.x + p.w <= level.pixelWidth, `saiu dos limites laterais: x=${p.x}`);
        if (p.y > level.pixelHeight + 40) p.respawn(s);
      }
    }
  });
}

function jumpAfterLeavingEdge(framesAfter) {
  const level = levelFrom(LEDGE);
  const { p, input } = spawnPlayer(level);
  input.hold('right');
  let left = -1;
  for (let i = 0; i < 300; i++) {
    if (left >= 0 && i - left === framesAfter) input.press('jump');
    p.update(DT, input, level);
    input.endStep();
    if (p.justJumped) return true;
    if (left < 0 && !p.onGround) left = i;
    if (left >= 0 && i - left > framesAfter + 2) return false;
  }
  return false;
}

function bufferedJump(framesBefore) {
  // 1ª passada: descobre em que passo o Nilo pousa caindo do alto.
  const level = levelFrom(tallShaft().slice(0, 12).concat(['######']));
  const first = new Player(level.spawn.x, level.spawn.y);
  const input = new FakeInput();
  let landAt = -1;
  for (let i = 0; i < 300 && landAt < 0; i++) {
    first.update(DT, input, level);
    if (first.onGround) landAt = i;
  }
  // 2ª passada: aperta Espaço framesBefore passos antes do pouso e solta logo.
  const p = new Player(level.spawn.x, level.spawn.y);
  for (let i = 0; i < landAt + 4; i++) {
    if (i === landAt - framesBefore) input.press('jump');
    if (i === landAt - framesBefore + 1) input.release('jump');
    p.update(DT, input, level);
    input.endStep();
    if (p.justJumped) return true;
  }
  return false;
}

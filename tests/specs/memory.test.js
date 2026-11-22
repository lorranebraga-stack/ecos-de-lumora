// Sistema de memórias: fragmentos, Pedras-Eco, blocos que mudam, segurança e salvamento.
import { Level, REMEMBERED } from '../../js/game/Level.js';
import { MemorySystem } from '../../js/game/MemorySystem.js';
import { Particles } from '../../js/game/Particles.js';
import { createEnemies } from '../../js/game/Enemy.js';
import { BOSQUE } from '../../js/levels/bosque.js';
import { DT } from '../lib/sim.js';

const FAR = { x: -9999, y: -9999, w: 10, h: 18 };

function setup() {
  const level = new Level(BOSQUE);
  const memory = new MemorySystem(level, new Particles());
  const enemies = createEnemies(level.entities, level.tile);
  memory.assignEnemies(enemies);
  return { level, memory, enemies };
}

// Nilo parado em pé ao lado da pedra i
function atStone(memory, i) {
  const s = memory.stones[i];
  return { x: s.x - 5, y: s.base - 18, w: 10, h: 18 };
}

function runWave(memory, player = FAR, seconds = 4) {
  for (let i = 0; i < seconds / DT; i++) memory.update(DT, player);
}

export default function (t) {
  t.test('sem fragmento, a pedra recusa', () => {
    const { memory } = setup();
    t.equal(memory.tryActivate(atStone(memory, 0)), 'no-fragment');
  });

  t.test('longe da pedra, nada acontece', () => {
    const { memory } = setup();
    memory.held = 1;
    t.equal(memory.tryActivate(FAR), 'no-stone');
    t.equal(memory.held, 1, 'o fragmento não pode ser gasto');
  });

  t.test('com fragmento: gasta 1 e transforma todos os blocos da pedra', () => {
    const { level, memory } = setup();
    memory.held = 1;
    t.equal(memory.tryActivate(atStone(memory, 0)), 'ok');
    t.equal(memory.held, 0, 'fragmentos guardados');
    runWave(memory);
    for (const tile of memory.stones[0].tiles) {
      t.equal(level.tileAt(tile.tx, tile.ty), REMEMBERED[tile.char], `bloco (${tile.tx}, ${tile.ty})`);
    }
  });

  t.test('ativar uma pedra não mexe nos blocos das outras', () => {
    const { level, memory } = setup();
    memory.held = 1;
    memory.tryActivate(atStone(memory, 0));
    runWave(memory);
    for (const s of memory.stones.slice(1)) {
      for (const tile of s.tiles) t.equal(level.tileAt(tile.tx, tile.ty), tile.char, 'bloco de outra pedra mudou');
    }
  });

  t.test('as criaturas da pedra se acalmam; as outras não', () => {
    const { memory, enemies } = setup();
    memory.held = 1;
    memory.tryActivate(atStone(memory, 0));
    const mine = new Set(memory.stones[0].enemies);
    t.ok(mine.size > 0, 'a 1ª pedra deveria ter criaturas');
    for (const e of enemies) t.equal(e.calm, mine.has(e), `${e.constructor.name} em x=${Math.round(e.x)}`);
  });

  t.test('segurança: a ponte não se solidifica em cima do Nilo', () => {
    const { level, memory } = setup();
    const tile = memory.stones[0].tiles.find((x) => x.char === 'L');
    const T = level.tile;
    const nilo = { x: tile.tx * T + 3, y: tile.ty * T - 4, w: 10, h: 18 }; // atravessando a ponte latente
    memory.held = 1;
    memory.tryActivate(atStone(memory, 0));
    runWave(memory, nilo);
    t.equal(level.tileAt(tile.tx, tile.ty), 'L', 'o bloco sob o Nilo deveria esperar');
    runWave(memory, FAR, 0.2);
    t.equal(level.tileAt(tile.tx, tile.ty), 'B', 'depois que o Nilo sai, o bloco aparece');
  });

  t.test('salvar e restaurar a memória dá o mesmo mapa', () => {
    const a = setup();
    a.memory.held = 2;
    a.memory.fragments[0].collected = true;
    a.memory.found = 1;
    a.memory.tryActivate(atStone(a.memory, 0));
    runWave(a.memory);
    const state = a.memory.saveState();

    const b = setup();
    b.memory.restore(JSON.parse(JSON.stringify(state)));
    t.equal(b.level.grid.map((r) => r.join('')), a.level.grid.map((r) => r.join('')), 'mapa');
    t.equal(b.memory.held, a.memory.held, 'fragmentos guardados');
    t.equal(b.memory.found, 1, 'fragmentos encontrados');
    t.ok(b.memory.stones[0].active, 'pedra ativa');
    t.ok(b.memory.stones[0].enemies.every((e) => e.calm), 'criaturas calmas');
  });
}

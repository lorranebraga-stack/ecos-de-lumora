// A fase do Bosque: mapa bem formado, objetos em lugares válidos, câmera nos limites.
import { Level } from '../../js/game/Level.js';
import { MemorySystem } from '../../js/game/MemorySystem.js';
import { Particles } from '../../js/game/Particles.js';
import { Camera } from '../../js/core/Camera.js';
import { BOSQUE } from '../../js/levels/bosque.js';
import { T } from '../lib/sim.js';

export default function (t) {
  t.test('todas as linhas do mapa têm o mesmo tamanho', () => {
    const widths = new Set(BOSQUE.map.map((r) => r.length));
    t.equal([...widths], [210], 'larguras (7 trechos de 30)');
    t.equal(BOSQUE.map.length, 20, 'número de linhas');
  });

  t.test('o mapa só usa letras conhecidas', () => {
    const known = new Set('.#=^PFcmtfEKLvXQHS'.split(''));
    for (const [i, r] of BOSQUE.map.entries()) {
      for (const c of r) t.ok(known.has(c), `letra desconhecida '${c}' na linha ${i}`);
    }
  });

  t.test('tem início, saída e as contagens planejadas', () => {
    const level = new Level(BOSQUE);
    t.ok(level.spawn, 'sem início');
    t.ok(level.exit, 'sem saída');
    const count = (type) => level.entities.filter((e) => e.type === type).length;
    t.equal(count('fragment'), 3, 'fragmentos');
    t.equal(count('stone'), 3, 'Pedras-Eco');
    t.equal(count('lantern'), 2, 'lanternas');
    t.equal(count('crystal'), 23, 'cristais');
    t.equal(count('boss'), 1, 'chefe (Raiz Esquecida)');
    t.equal(count('secret'), 1, 'Eco Escondido');
  });

  t.test('todo bloco de memória (L, v, X) pertence a uma Pedra-Eco', () => {
    const level = new Level(BOSQUE);
    const m = new MemorySystem(level, new Particles()); // lança erro se algum bloco ficar sem pedra
    const owned = m.stones.reduce((n, s) => n + s.tiles.length, 0);
    t.ok(owned > 0, 'nenhum bloco de memória encontrado');
  });

  t.test('nenhum objeto nasce dentro de rocha', () => {
    const level = new Level(BOSQUE);
    for (const e of level.entities) {
      t.ok(!level.isSolid(e.tx, e.ty), `${e.type} em (${e.tx}, ${e.ty}) está dentro de um bloco sólido`);
    }
  });

  t.test('Murchos, lanternas e Pedras-Eco têm chão embaixo', () => {
    const level = new Level(BOSQUE);
    for (const e of level.entities.filter((x) => ['murcho', 'lantern', 'stone'].includes(x.type))) {
      t.ok(level.isSolid(e.tx, e.ty + 1), `${e.type} em (${e.tx}, ${e.ty}) está flutuando`);
    }
  });

  t.test('a câmera nunca mostra nada fora da fase', () => {
    const level = new Level(BOSQUE);
    const cam = new Camera(level);
    for (let x = -60; x <= level.pixelWidth + 60; x += 13) {
      for (let y = -80; y <= level.pixelHeight + 80; y += 17) {
        const body = { x, y, w: 10, h: 18, vx: x % 2 ? 150 : -150, onGround: y % 3 === 0 };
        cam.update(1 / 60, body);
        cam.snap(body);
        const v = cam.view;
        t.ok(v.x >= 0 && v.y >= 0 && v.x + v.w <= level.pixelWidth && v.y + v.h <= level.pixelHeight,
          `vista fora da fase em (${v.x}, ${v.y}) para o Nilo em (${x}, ${y})`);
      }
    }
  });

  t.test('mapa com linha de tamanho errado dá um erro claro', () => {
    t.throws(() => new Level({ name: 'quebrado', map: ['#P#', '##'] }));
  });

  t.test('mapa sem início dá um erro claro', () => {
    t.throws(() => new Level({ name: 'sem início', map: ['###', '#.#', '###'] }));
  });

  t.test('o tamanho de bloco é o esperado', () => t.equal(T, 16));
}

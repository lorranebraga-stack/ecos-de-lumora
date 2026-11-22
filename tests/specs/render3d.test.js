// Gráficos 3D: o terreno e o cenário são montados corretamente a partir do mapa.
// (Estes testes criam só a geometria; não precisam de placa de vídeo.)
import { Level } from '../../js/game/Level.js';
import { BOSQUE } from '../../js/levels/bosque.js';
import { MINAS } from '../../js/levels/minas.js';
import { buildTerrain, QuadBuffer } from '../../js/render3d/TerrainBuilder.js';
import { buildScenery } from '../../js/render3d/Scenery.js';
import { createMemoryUniforms } from '../../js/render3d/memoryShader.js';
import { Renderer3D } from '../../js/render3d/Renderer3D.js';

const room = (rows) => new Level({ name: 'teste', map: rows });

export default function (t) {
  t.test('caixa 3D: 6 faces = 12 triângulos', () => {
    const q = new QuadBuffer();
    q.box(0, 1, 0, 1, 0, 1, { front: true, top: true, bottom: true, left: true, right: true, back: true }, () => ({ r: 1, g: 1, b: 1 }));
    t.equal(q.triangles, 12);
  });

  t.test('faces escondidas entre blocos vizinhos não são criadas', () => {
    const one = buildTerrain(room(['.....', '.P#..', '.....']), createMemoryUniforms());
    const two = buildTerrain(room(['.....', '.P##.', '.....']), createMemoryUniforms());
    // Dois blocos juntos: a face entre eles some dos dois lados, então é menos que o dobro.
    t.ok(two.stats.rockTriangles < one.stats.rockTriangles * 2,
      `1 bloco: ${one.stats.rockTriangles}, 2 blocos: ${two.stats.rockTriangles} triângulos`);
    one.dispose();
    two.dispose();
  });

  t.test('o terreno do Bosque e o das Minas são montados', () => {
    for (const data of [BOSQUE, MINAS]) {
      const level = new Level(data);
      const terrain = buildTerrain(level, createMemoryUniforms());
      t.ok(terrain.stats.rockTriangles > 500, `${data.name}: poucos triângulos (${terrain.stats.rockTriangles})`);
      t.ok(terrain.group.children.length >= 5, `${data.name}: faltam partes do terreno`);
      terrain.dispose();
    }
    const bosque = buildTerrain(new Level(BOSQUE), createMemoryUniforms());
    t.ok(bosque.stats.spikes > 0, 'os espinhos do Bosque viraram cones 3D');
    t.ok(bosque.stats.grass > 100, 'grama no topo dos blocos');
    bosque.dispose();
  });

  t.test('quando a memória muda um bloco, a fase avisa (para o 3D refazer o terreno)', () => {
    const level = new Level(BOSQUE);
    const v0 = level.version || 0;
    level.setTile(36, 17, 'B');
    t.equal(level.version, v0 + 1, 'versão depois da troca');
    level.setTile(36, 17, 'B');
    t.equal(level.version, v0 + 1, 'trocar pelo mesmo bloco não conta');
  });

  t.test('o cenário 3D de cada tema é montado', () => {
    for (const data of [BOSQUE, MINAS]) {
      const s = buildScenery(new Level(data), createMemoryUniforms());
      t.ok(s.group.children.length >= 3, `${data.name}: cenário vazio`);
      s.dispose();
    }
  });

  t.test('este navegador suporta o modo 3D (WebGL)', () => {
    t.ok(Renderer3D.supported(), 'sem WebGL: o jogo vai usar o 2D clássico automaticamente');
  });
}

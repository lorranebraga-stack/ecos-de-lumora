// LENTO: prova, com a física real, que a fase pode ser concluída E que a memória é obrigatória.
// A cada Pedra-Eco ativada, deve abrir exatamente o trecho seguinte.
import { Level } from '../../js/game/Level.js';
import { MemorySystem } from '../../js/game/MemorySystem.js';
import { Collectibles } from '../../js/game/Collectibles.js';
import { Particles } from '../../js/game/Particles.js';
import { BOSQUE } from '../../js/levels/bosque.js';
import { explore } from '../lib/reach.js';
import { DT } from '../lib/sim.js';

const FAR = { x: -9999, y: -9999, w: 10, h: 18 };

export default function (t) {
  t.test('progressão da memória: cada pedra abre só o próximo trecho, e a saída exige as três', async () => {
    const level = new Level(BOSQUE);
    const memory = new MemorySystem(level, new Particles());
    const crystals = new Collectibles(level.entities, level.tile).crystals;
    const probes = { crystals, fragments: memory.fragments, stones: memory.stones };
    const sorted = (s) => [...s].sort();

    // [fragmentos esperados, pedras esperadas, saída?] em cada estágio
    const expected = [
      [[0], [0], false],
      [[0, 1], [0, 1], false],
      [[0, 1, 2], [0, 1, 2], false],
      [[0, 1, 2], [0, 1, 2], true],
    ];
    for (let stage = 0; stage < 4; stage++) {
      if (stage > 0) {
        memory.held = 1;
        memory.activate(memory.stones[stage - 1]);
        for (let i = 0; i < 300; i++) memory.update(DT, FAR);
      }
      const found = await explore(level, probes);
      const [frags, stones, exit] = expected[stage];
      t.equal(sorted(found.fragments), frags, `estágio ${stage}: fragmentos alcançáveis`);
      t.equal(sorted(found.stones), stones, `estágio ${stage}: pedras alcançáveis`);
      t.equal(found.exit, exit, `estágio ${stage}: saída alcançável`);
      if (stage === 3) t.equal(found.crystals.size, crystals.length, 'todos os cristais alcançáveis no fim');
    }
  }, { slow: true });
}

// Inimigos: patrulha, pisão, mergulho da Traça e criaturas lembradas.
import { Level } from '../../js/game/Level.js';
import { createEnemies, Traca, Murcho } from '../../js/game/Enemy.js';
import { BOSQUE } from '../../js/levels/bosque.js';
import { DT, T } from '../lib/sim.js';

const FAR = { x: -9999, y: -9999, w: 10, h: 18, alive: true, vy: 0 };

export default function (t) {
  t.test('Murchos patrulham 30 s sem cair nem pisar em espinhos', () => {
    const level = new Level(BOSQUE);
    const murchos = createEnemies(level.entities, T).filter((e) => e instanceof Murcho);
    t.ok(murchos.length >= 3, 'esperava vários Murchos');
    for (const m of murchos) {
      let minX = m.x;
      let maxX = m.x;
      for (let i = 0; i < 1800; i++) {
        m.update(DT, level, FAR);
        minX = Math.min(minX, m.x);
        maxX = Math.max(maxX, m.x);
        t.ok(m.y < level.pixelHeight, `Murcho que nasceu em x≈${Math.round(minX)} caiu`);
        t.ok(!level.touchesHazard(m), `Murcho entrou em espinhos em x=${Math.round(m.x)}`);
      }
      t.ok(maxX - minX > 30, `Murcho parado demais (andou só ${Math.round(maxX - minX)} px)`);
    }
  });

  t.test('pisão: caindo por cima conta; encostar de lado não conta', () => {
    const m = new Murcho(5, 5, T);
    const top = { x: m.x, y: m.y - 12, w: 10, h: 18, vy: 120 };
    t.ok(m.overlaps(top) && m.isStompedBy(top), 'caindo por cima deveria ser pisão');
    const side = { x: m.x - 6, y: m.y - 4, w: 10, h: 18, vy: 0 };
    t.ok(m.overlaps(side) && !m.isStompedBy(side), 'de lado não deveria ser pisão');
    const rising = { ...top, vy: -100 };
    t.ok(!m.isStompedBy(rising), 'subindo não deveria ser pisão');
  });

  t.test('Traça: paira → aviso → mergulho → volta → paira', () => {
    const level = new Level(BOSQUE);
    const tr = new Traca(80, 9, T);
    const p = { x: tr.homeX - 5, y: tr.homeY + 40, w: 10, h: 18, alive: true };
    const seen = [tr.state]; // estado inicial, antes do primeiro passo
    for (let i = 0; i < 600; i++) {
      tr.update(DT, level, p);
      if (seen[seen.length - 1] !== tr.state) seen.push(tr.state);
      if (seen.length >= 5) break;
    }
    t.equal(seen.slice(0, 5), ['hover', 'windup', 'dive', 'return', 'hover'], 'sequência de estados');
  });

  t.test('Traça: o aviso dura tempo suficiente para reagir (≥ 0,3 s)', () => {
    const level = new Level(BOSQUE);
    const tr = new Traca(80, 9, T);
    const p = { x: tr.homeX - 5, y: tr.homeY + 40, w: 10, h: 18, alive: true };
    let windupFrames = 0;
    for (let i = 0; i < 400 && tr.state !== 'dive'; i++) {
      tr.update(DT, level, p);
      if (tr.state === 'windup') windupFrames++;
    }
    t.ok(windupFrames * DT >= 0.3, `aviso de só ${(windupFrames * DT).toFixed(2)} s`);
  });

  t.test('Traça lembrada nunca ataca', () => {
    const level = new Level(BOSQUE);
    const tr = new Traca(80, 9, T);
    tr.remember();
    const p = { x: tr.homeX - 5, y: tr.homeY + 40, w: 10, h: 18, alive: true };
    for (let i = 0; i < 900; i++) {
      tr.update(DT, level, p);
      t.ok(tr.state === 'hover', `Traça lembrada entrou no estado ${tr.state}`);
    }
  });

  t.test('Murcho lembrado para de andar e fica com o topo 5 px mais alto (trampolim)', () => {
    const level = new Level(BOSQUE);
    const m = createEnemies(level.entities, T).find((e) => e instanceof Murcho);
    for (let i = 0; i < 30; i++) m.update(DT, level, FAR);
    const bottom = m.y + m.h;
    m.remember();
    const x0 = m.x;
    for (let i = 0; i < 300; i++) m.update(DT, level, FAR);
    t.near(m.x, x0, 0.01, 'posição x');
    t.near(m.y + m.h, bottom, 0.01, 'continua no chão');
    t.equal(m.h, 17, 'altura com a flor');
  });

  t.test('inimigo derrotado some depois da animação', () => {
    const m = new Murcho(5, 5, T);
    m.defeat();
    t.ok(!m.removable, 'não deveria sumir na hora');
    for (let i = 0; i < 60; i++) m.update(DT, new Level(BOSQUE), FAR);
    t.ok(m.removable, 'deveria ter sumido após 1 s');
  });
}

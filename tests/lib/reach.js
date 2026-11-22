// Busca de alcance: descobre TUDO que o Nilo consegue alcançar numa fase,
// testando combinações de andar, correr e pular a partir de cada ponto já alcançado.
// Usa a física real do jogo. É lenta (alguns segundos), por isso pausa de vez
// em quando para a página não congelar.

import { Player } from '../../js/game/Player.js';
import { WindSystem } from '../../js/game/Mechanics.js';
import { FakeInput, DT } from './sim.js';

const ACTIONS = [];
for (const dir of [-1, 1, 0]) {
  for (const run of [false, true]) {
    for (const jumpAt of [0, 8, 20]) {
      for (const hold of [0, 5, 10, 40]) ACTIONS.push({ dir, run, jumpAt, hold });
    }
  }
}

// Com o Pulo-Eco: também tenta um segundo pulo no ar, em momentos diferentes.
const ECHO_ACTIONS = [];
for (const dir of [-1, 1, 0]) {
  for (const run of [false, true]) {
    for (const second of [8, 16, 24, 32]) ECHO_ACTIONS.push({ dir, run, jumpAt: 0, hold: 60, second });
  }
}

// probes: { crystals, fragments, stones, shrines, clocks } — objetos com touches()/isNear()
// options.abilities: habilidades do Nilo durante a busca (ex.: ['pulo-eco'])
// options.wind: correntes de ar da fase. Só as CONSTANTES entram na busca
//   (rajadas que ligam e desligam contam como desligadas: o melhor caso).
// Relógios (probes.clocks): perto de um, a busca também tenta a cidade no outro estado.
export async function explore(level, probes = {}, options = {}) {
  const abilities = new Set(options.abilities || []);
  const actions = abilities.has('pulo-eco') ? [...ACTIONS, ...ECHO_ACTIONS] : ACTIONS;
  const input = new FakeInput();
  const wind = options.wind ? new WindSystem(options.wind.filter((z) => !z.off), level.tile) : null;
  const key = (p, cs) => `${Math.round(p.x / 3)},${Math.round(p.y)},${cs}`;
  const startCs = level.cityState || 0;
  const start = new Player(level.spawn.x, level.spawn.y);
  for (let i = 0; i < 5; i++) start.update(DT, input, level);

  const seen = new Set([key(start, startCs)]);
  const queue = [{ x: start.x, y: start.y, cs: startCs }];
  const found = { exit: false, crystals: new Set(), fragments: new Set(), stones: new Set(), shrines: new Set(), maxX: 0 };

  const mark = (p) => {
    (probes.crystals || []).forEach((c, i) => { if (c.touches(p)) found.crystals.add(i); });
    (probes.fragments || []).forEach((f, i) => { if (f.touches(p)) found.fragments.add(i); });
    (probes.shrines || []).forEach((s, i) => { if (s.touches(p)) found.shrines.add(i); });
    if (p.onGround) (probes.stones || []).forEach((s, i) => { if (s.isNear(p)) found.stones.add(i); });
    if (level.touchesExit(p)) found.exit = true;
    found.maxX = Math.max(found.maxX, p.x);
  };
  mark(start);

  let work = 0;
  while (queue.length) {
    const s = queue.shift();
    level.cityState = s.cs;
    // Perto de um relógio: a cidade pode ser trocada daqui.
    const here = { x: s.x, y: s.y, w: start.w, h: start.h };
    if ((probes.clocks || []).some((c) => c.isNear(here))) {
      const cs = s.cs;
      if (level.toggleCity([here])) {
        const k = key(here, level.cityState);
        if (!seen.has(k)) {
          seen.add(k);
          queue.push({ x: s.x, y: s.y, cs: level.cityState });
        }
      }
      level.cityState = cs;
    }
    for (const a of actions) {
      const p = new Player(s.x, s.y);
      p.abilities = abilities;
      p.onGround = true;
      input.held.clear();
      if (a.dir) input.hold(a.dir > 0 ? 'right' : 'left');
      if (a.run) input.hold('run');
      let leftGround = false;
      let dead = false;
      for (let f = 0; f < 240; f++) {
        if (f === a.jumpAt && a.hold > 0) input.press('jump');
        if (a.second && f === a.jumpAt + a.second) input.press('jump');
        if (a.hold > 0 && f === a.jumpAt + a.hold) input.release('jump');
        if (a.hold === 0 && f > a.jumpAt + 30 && p.onGround) break;
        if (wind) {
          const f = wind.forceAt(p);
          p.windX = f.fx;
          p.windY = f.fy;
        }
        p.update(DT, input, level);
        input.endStep();
        mark(p);
        if (p.y > level.pixelHeight + 40 || level.touchesHazard(p)) { dead = true; break; }
        if (!p.onGround) leftGround = true;
        if (leftGround && p.onGround) break;
      }
      if (dead || !p.onGround) continue;
      const k = key(p, s.cs);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push({ x: p.x, y: p.y, cs: s.cs });
      }
    }
    if (++work % 40 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  level.cityState = startCs;
  return found;
}

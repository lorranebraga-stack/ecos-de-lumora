// Página de testes: carrega cada arquivo de testes, roda e mostra os resultados.
// Para adicionar uma suíte nova: crie tests/specs/algo.test.js e inclua na lista SPECS.

import { Suite, runSuites } from './lib/mini-test.js';
import { AudioEngine } from '../js/audio/AudioEngine.js';
import { SOUNDS } from '../js/audio/sounds.js';

const SPECS = [
  ['Física e colisões', './specs/physics.test.js'],
  ['Fase do Bosque', './specs/level.test.js'],
  ['Inimigos', './specs/enemies.test.js'],
  ['Sistema de memórias', './specs/memory.test.js'],
  ['Salvamento e progresso', './specs/save.test.js'],
  ['Roteiro e diálogos', './specs/story.test.js'],
  ['Áudio', './specs/audio.test.js'],
  ['Arquivos e referências', './specs/files.test.js'],
  ['Fase completa (alcance)', './specs/reach.test.js'],
  ['Expansão: Minas de Cristal', './specs/minas.test.js'],
  ['Gráficos 3D', './specs/render3d.test.js'],
  ['Celular', './specs/mobile.test.js'],
  ['Regiões novas, chefes, missões e estrelas', './specs/regions.test.js'],
];

const $ = (id) => document.getElementById(id);

async function loadSuites() {
  const suites = [];
  for (const [name, path] of SPECS) {
    const suite = new Suite(name);
    try {
      const mod = await import(path);
      mod.default(suite);
    } catch (err) {
      // Um arquivo de testes que nem carrega vira um teste que falha, com o motivo.
      suite.test('carregar o arquivo de testes', () => { throw err; });
    }
    suites.push(suite);
  }
  return suites;
}

async function run(includeSlow) {
  const buttons = [$('run-fast'), $('run-all')];
  buttons.forEach((b) => { b.disabled = true; });
  const results = $('results');
  results.innerHTML = '';
  const suites = await loadSuites();
  const total = suites.reduce((n, s) => n + s.tests.length, 0);
  const lists = {};
  for (const s of suites) {
    const box = document.createElement('section');
    box.className = 'suite';
    box.innerHTML = `<h3>${s.name}</h3><ul></ul>`;
    results.append(box);
    lists[s.name] = box.querySelector('ul');
  }

  let done = 0;
  const summary = $('summary');
  summary.className = '';
  summary.textContent = 'Rodando…';
  const all = await runSuites(suites, {
    includeSlow,
    onResult: (r) => {
      done++;
      $('progress').value = done / total;
      const li = document.createElement('li');
      li.className = r.status;
      const icon = { pass: '✔', fail: '✘', skip: '–' }[r.status];
      const time = r.status === 'skip' ? 'lento (pulado)' : `${Math.round(r.ms)} ms`;
      li.innerHTML = `<span class="icon">${icon}</span><span></span><span class="ms">${time}</span>`;
      li.children[1].textContent = r.name;
      if (r.error) {
        const err = document.createElement('span');
        err.className = 'err';
        err.textContent = r.error;
        li.append(err);
      }
      lists[r.suite].append(li);
    },
  });

  const pass = all.filter((r) => r.status === 'pass').length;
  const fail = all.filter((r) => r.status === 'fail').length;
  const skip = all.filter((r) => r.status === 'skip').length;
  summary.textContent = `${pass} passaram · ${fail} falharam${skip ? ` · ${skip} pulados` : ''}`;
  summary.className = fail ? 'bad' : 'ok';
  console.log(`[testes] ${pass} passaram, ${fail} falharam, ${skip} pulados`);
  window.__testResults = { pass, fail, skip, failures: all.filter((r) => r.status === 'fail') };
  buttons.forEach((b) => { b.disabled = false; });
}

$('run-fast').addEventListener('click', () => run(false));
$('run-all').addEventListener('click', () => run(true));

// ---------- Ouvir os sons ----------
const audio = new AudioEngine({ muted: false, music: true });
const box = $('sounds');
for (const name of Object.keys(SOUNDS)) {
  const b = document.createElement('button');
  b.textContent = name;
  b.addEventListener('click', () => {
    audio.unlock();
    audio.play(name, { who: ['nilo', 'mira', 'vulto'][Math.floor(Math.random() * 3)] });
  });
  box.append(b);
}
$('music-menu').addEventListener('click', () => { audio.unlock(); audio.playMusic('menu'); });
$('music-bosque').addEventListener('click', () => { audio.unlock(); audio.playMusic('bosque'); });
$('music-stop').addEventListener('click', () => audio.stopMusic());

run(new URLSearchParams(location.search).has('all'));

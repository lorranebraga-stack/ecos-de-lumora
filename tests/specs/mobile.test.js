// Celular: ações virtuais (botões na tela), app instalável e configuração de tela.
import { Input } from '../../js/core/Input.js';
import { CONFIG } from '../../js/config.js';

export default function (t) {
  t.test('botão de toque: apertar conta uma vez; segurar continua valendo', () => {
    const input = new Input(CONFIG.KEYS);
    input.setVirtual('jump', true);
    t.ok(input.wasPressed('jump') && input.isDown('jump'), 'no passo em que foi apertado');
    input.endStep();
    t.ok(!input.wasPressed('jump') && input.isDown('jump'), 'segurando, no passo seguinte');
    input.setVirtual('jump', true); // o mesmo dedo continua: não é um novo aperto
    t.ok(!input.wasPressed('jump'), 'não repete o aperto');
    input.setVirtual('jump', false);
    t.ok(!input.isDown('jump'), 'soltou');
  });

  t.test('toque rápido (aperta e solta antes do próximo passo) ainda conta como aperto', () => {
    const input = new Input(CONFIG.KEYS);
    input.setVirtual('confirm', true);
    input.setVirtual('confirm', false);
    t.ok(input.wasPressed('confirm'), 'o diálogo precisa receber o toque');
  });

  t.test('soltar tudo (app em segundo plano) não deixa nada preso', () => {
    const input = new Input(CONFIG.KEYS);
    input.setVirtual('right', true);
    input.setVirtual('run', true);
    input.releaseAll();
    t.ok(!input.isDown('right') && !input.isDown('run'));
  });

  t.test('o manifesto do app é válido e seus ícones existem', async () => {
    const res = await fetch('../manifest.webmanifest');
    t.ok(res.ok, 'manifest.webmanifest não encontrado');
    const m = await res.json();
    t.equal([m.name, m.display, m.orientation], ['Ecos de Lumora', 'fullscreen', 'landscape']);
    for (const icon of m.icons) {
      const r = await fetch(`../${icon.src}`);
      t.ok(r.ok && (r.headers.get('content-type') || '').includes('png'), `ícone ${icon.src} não encontrado`);
    }
  });

  t.test('a página impede zoom e respeita o entalhe da tela', async () => {
    const html = await (await fetch('../index.html')).text();
    t.ok(/user-scalable=no/.test(html), 'sem user-scalable=no');
    t.ok(/viewport-fit=cover/.test(html), 'sem viewport-fit=cover');
  });

  t.test('existe um botão de toque para cada controle necessário', async () => {
    const html = await (await fetch('../index.html')).text();
    for (const name of ['left', 'right', 'jump', 'run', 'interact', 'pause']) {
      t.ok(html.includes(`data-touch="${name}"`), `falta o botão "${name}"`);
    }
  });
}

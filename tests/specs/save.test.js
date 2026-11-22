// Salvamento: armazenamento seguro, regras de progresso e recordes.
// Estes testes usam uma chave PRÓPRIA no localStorage: seu save real não é tocado.
import { Storage, SAVE_VERSION } from '../../js/core/Storage.js';
import { Progress } from '../../js/core/Progress.js';
import { Collectibles } from '../../js/game/Collectibles.js';
import { Level } from '../../js/game/Level.js';
import { BOSQUE } from '../../js/levels/bosque.js';

const KEY = 'ecos-de-lumora/teste-automatico';

function fresh() {
  try { localStorage.removeItem(KEY); } catch { /* sem localStorage */ }
  return new Progress(new Storage(KEY));
}

// Simula um navegador que bloqueia o salvamento, só durante fn().
// (window.Storage é a classe do navegador; "Storage" importado acima é a nossa.)
function withBlockedStorage(fn) {
  const realSet = window.Storage.prototype.setItem;
  window.Storage.prototype.setItem = () => { throw new Error('bloqueado (teste)'); };
  try {
    return fn();
  } finally {
    window.Storage.prototype.setItem = realSet;
  }
}

export default function (t) {
  t.test('salva e carrega de volta o mesmo conteúdo', () => {
    const p = fresh();
    p.checkpoint('bosque', { checkpoint: { id: 'lanterna0', x: 1, y: 2 }, playTime: 10 });
    const again = new Progress(new Storage(KEY));
    t.equal(again.currentRun.snapshot.checkpoint.id, 'lanterna0');
    localStorage.removeItem(KEY);
  });

  t.test('save corrompido é ignorado (sem quebrar o jogo)', () => {
    localStorage.setItem(KEY, '{isso não é json');
    const s = new Storage(KEY);
    t.equal(s.load(), null);
    localStorage.removeItem(KEY);
  });

  t.test('save de outra versão é ignorado', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: SAVE_VERSION + 99 }));
    t.equal(new Storage(KEY).load(), null);
    localStorage.removeItem(KEY);
  });

  t.test('com o navegador bloqueando: não quebra, avisa e guarda em memória', () => {
    withBlockedStorage(() => {
      const s = new Storage(KEY);
      t.equal(s.available, false, 'deveria detectar o bloqueio');
      t.equal(s.save({ version: SAVE_VERSION, ok: 1 }), false, 'save() deveria retornar false');
      t.equal(s.load().ok, 1, 'load() deveria devolver a cópia em memória');
      const p = new Progress(s);
      t.equal(p.checkpoint('bosque', { playTime: 1 }), false);
      t.equal(p.currentRun.level, 'bosque', 'a partida continua disponível nesta sessão');
    });
  });

  t.test('desbloqueio: Bosque aberto; Minas só depois de concluir o Bosque', () => {
    const p = fresh();
    t.ok(p.isUnlocked('bosque'));
    t.ok(!p.isUnlocked('minas'));
    p.completeLevel('bosque', { score: 100, time: 60, crystals: 5 });
    t.ok(p.isUnlocked('minas'));
    t.ok(!p.isUnlocked('arquipelago'));
    localStorage.removeItem(KEY);
  });

  t.test('recordes: só contam quando melhoram', () => {
    const p = fresh();
    let r = p.completeLevel('bosque', { score: 500, time: 120, crystals: 10 });
    t.equal(r, { score: true, time: true }, '1ª vez');
    r = p.completeLevel('bosque', { score: 400, time: 150, crystals: 8 });
    t.equal(r, { score: false, time: false }, 'pior nas duas');
    r = p.completeLevel('bosque', { score: 450, time: 90, crystals: 9 });
    t.equal(r, { score: false, time: true }, 'só o tempo melhorou');
    const info = p.levelInfo('bosque');
    t.equal([info.bestScore, Math.round(info.bestTime), info.bestCrystals], [500, 90, 10], 'melhores marcas');
    localStorage.removeItem(KEY);
  });

  t.test('concluir a fase encerra a partida em andamento', () => {
    const p = fresh();
    p.checkpoint('bosque', { playTime: 5 });
    p.completeLevel('bosque', { score: 1, time: 1, crystals: 0 });
    t.equal(p.currentRun, null);
    localStorage.removeItem(KEY);
  });

  t.test('apagar progresso zera tudo, mas mantém as preferências de som', () => {
    const p = fresh();
    const settings = p.data.settings;
    settings.muted = true;
    p.completeLevel('bosque', { score: 1, time: 1, crystals: 0 });
    p.eraseAll();
    t.ok(!p.levelInfo('bosque').completed, 'recorde deveria sumir');
    t.ok(p.data.settings === settings, 'o objeto de preferências deve ser o mesmo (o áudio usa ele)');
    t.equal(p.data.settings.muted, true, 'preferência de som mantida');
    localStorage.removeItem(KEY);
  });

  t.test('cristais: salvar e restaurar devolve os mesmos', () => {
    const level = new Level(BOSQUE);
    const a = new Collectibles(level.entities, 16);
    a.crystals[0].collected = true;
    a.crystals[5].collected = true;
    const b = new Collectibles(level.entities, 16);
    b.restore(a.saveState());
    t.equal(b.collected, 2);
    t.equal(b.saveState(), [0, 5]);
  });
}

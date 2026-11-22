// Áudio: todo som usado existe, e nada quebra antes do desbloqueio ou sem Web Audio.
import { SOUNDS } from '../../js/audio/sounds.js';
import { AudioEngine } from '../../js/audio/AudioEngine.js';
import { CONFIG } from '../../js/config.js';

// Nomes de som usados pelo código do jogo (sfx('...') e play('...')).
// Se você criar um som novo no jogo, acrescente aqui.
export const USED_SOUNDS = [
  'jump', 'land', 'hurt', 'defeat', 'crystal', 'fragment', 'echo', 'tile', 'dissolve', 'denied',
  'lantern', 'stomp', 'spring', 'windup', 'dive', 'vulto', 'blip', 'select', 'complete',
  // Etapa 12 (Minas de Cristal)
  'curl', 'crack', 'clank', 'echojump', 'ability', 'roar', 'rumble', 'crash', 'shardwarn', 'shatter', 'bosshit',
  // v1.4 (Arquipélago, Cidade, Santuário, chefes, missões e segredos)
  'gust', 'inhale', 'crumble', 'thunderwarn', 'thunder', 'toggle', 'page', 'roots', 'shadow', 'secret', 'star', 'objective',
];

export default function (t) {
  t.test('todo som usado pelo jogo tem uma receita sintetizada', () => {
    for (const name of USED_SOUNDS) t.ok(typeof SOUNDS[name] === 'function', `som "${name}" não existe em sounds.js`);
  });

  t.test('o código do jogo não usa nenhum som fora da lista', async () => {
    const files = ['js/scenes/LevelScene.js', 'js/main.js', 'js/scenes/MenuScene.js'];
    for (const f of files) {
      const src = await (await fetch(`../${f}`)).text();
      for (const m of src.matchAll(/(?:sfx|play)\('([a-z]+)'/g)) {
        t.ok(USED_SOUNDS.includes(m[1]), `${f} usa o som "${m[1]}", que não está na lista`);
      }
    }
  });

  t.test('antes do primeiro clique, tocar som não faz nada e não quebra', () => {
    const a = new AudioEngine({ muted: false, music: true });
    a.play('jump');
    a.playMusic('bosque');
    t.equal(a.ac, null, 'o áudio não deveria ter sido criado');
    t.equal(a.pendingTheme, 'bosque', 'a música deveria ficar esperando');
  });

  t.test('preferências: mudo e música refletem o objeto salvo', () => {
    const settings = { muted: false, music: true };
    const a = new AudioEngine(settings);
    a.setMuted(true);
    a.setMusic(false);
    t.equal(settings, { muted: true, music: false });
  });

  t.test('arquivos de som opcionais configurados existem', async () => {
    for (const [name, url] of Object.entries(CONFIG.AUDIO.FILES)) {
      const res = await fetch(`../${url}`);
      t.ok(res.ok, `som "${name}": arquivo ${url} não encontrado`);
    }
  });
}

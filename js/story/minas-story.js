// Roteiro das Minas de Cristal.
// Mesmo formato do Bosque. Novidades aqui:
//   - startFlags: a Mira já chega acompanhando o Nilo
//   - um falante novo: a Matriarca (retrato em ui/Portraits.js)
//   - diálogos do chefe (bossIntro, bossDefeat), tocados pela cena na hora da luta
//   - nenhum Vulto nesta região (vultoSpot ausente)

const N = (text) => ({ who: 'nilo', name: 'Nilo', text });
const M = (text) => ({ who: 'mira', name: 'Mira', text });
const Q = (text) => ({ who: 'matriarca', name: 'Matriarca de Quartzo', text });
const NARR = (text) => ({ who: 'narrador', name: '', text });

export const MINAS_STORY = {
  region: { number: 2, name: 'Minas de Cristal', subtitle: 'onde a luz foi guardada' },
  rememberLine: 'As Minas se lembram...',
  mission: 'Atravessar as Minas de Cristal e acalmar a Matriarca de Quartzo.',
  objectives: [
    { text: 'Cuidado com o Cristalídeo: deixe ele bater na parede', flag: 'cristalideo' },
    { text: 'Toque o altar e aprenda o Pulo-Eco', flag: 'ability' },
    { text: 'Use o Pulo-Eco para pegar o fragmento no alto', flag: 'fragment1' },
    { text: 'Ecoe a memória e lembre a ponte de cristal', flag: 'stone0' },
    { text: 'Acalme a Matriarca de Quartzo', flag: 'bossDefeated' },
    { text: 'Siga para a saída das Minas', flag: 'exit' },
  ],
  startFlags: ['miraJoined'],
  miraSpot: { col: 1, row: 14 },

  intro: [
    M('Escuro, não? Fique perto da minha luz.'),
    N('Tem coisas brilhando nas paredes.'),
    M('Cristais que lembram do sol. Faz muito tempo que nenhum deles vê um.'),
  ],

  triggers: [
    { id: 'cristalideo', col: 5, dialog: 'cristalideoWarning' },
  ],

  events: {
    ability: 'ability',
    stone0: 'stone0',
    exit: 'exit',
  },

  dialogs: {
    cristalideoWarning: [
      M('Um Cristalídeo. A casca é dura demais para pisar.'),
      M('Quando ele se encolher, saia do caminho. Deixe ele bater em alguma coisa.'),
    ],

    ability: [
      N('Eu… lembro de pular duas vezes. Mas eu nunca fiz isso.'),
      M('Não é uma lembrança sua. É de alguém que correu por estas minas antes da Queda.'),
      N('Queda?'),
      M('Pule, e pule de novo ainda no ar. Depois a gente conversa.'),
    ],

    stone0: [
      M('Uma ponte de cristal. Os mineiros lembravam bem do caminho de volta para casa.'),
    ],

    bossIntro: [
      Q('Quem acende luzes na minha casa?'),
      N('Eu só estou de passagem!'),
      Q('Ninguém passa. Eu esqueci quem eu era… e gostei de esquecer.'),
    ],

    bossDefeat: [
      Q('…Estas luzes. Eu cuidava delas.'),
      Q('Antes da Grande Queda, eu acendia uma para cada mineiro que voltava.'),
      N('E eles… voltaram?'),
      Q('Nem todos. Por isso preferi esquecer.'),
    ],

    exit: [
      M('A Grande Queda. Ela disse "a Grande Queda".'),
      N('Você sabe o que foi, não sabe?'),
      M('Sei que alguém se esforçou muito para ninguém lembrar.'),
      M('Lá fora fica o Arquipélago Suspenso. Segure o cachecol: venta muito por lá.'),
    ],
  },
};

// Roteiro do Santuário da Aurora — o final da jornada.
// Revelação: a Memória Viva guarda TUDO, inclusive a Grande Queda. O Vulto (Orin) escondeu
// o Coração para que Lumora esquecesse a dor e sobrevivesse. A resposta do Nilo:
// lembrar JUNTOS, para que ninguém carregue a dor sozinho.

const N = (text) => ({ who: 'nilo', name: 'Nilo', text });
const M = (text) => ({ who: 'mira', name: 'Mira', text });
const V = (text) => ({ who: 'vulto', name: 'Orin, o Vulto', text });
const NARR = (text) => ({ who: 'narrador', name: '', text });

export const SANTUARIO_STORY = {
  region: { number: 5, name: 'Santuário da Aurora', subtitle: 'onde a luz de Lumora foi escondida' },
  rememberLine: 'O Santuário se lembra...',
  final: true, // a última região: a tela de conclusão vira o final do jogo
  mission: 'Chegar ao Coração da Aurora, enfrentar o Vulto e decidir como Lumora vai lembrar.',
  objectives: [
    { text: 'Atravesse o Portal da Aurora', flag: 'portal' },
    { text: 'Suba pelo jardim e pegue o primeiro fragmento', flag: 'fragment1' },
    { text: 'Lembre a ponte do Pátio das Duas Luas', flag: 'stone0' },
    { text: 'Escape da sombra na galeria e pegue o segundo fragmento', flag: 'fragment2' },
    { text: 'Acalme o vento da Grande Queda', flag: 'stone1' },
    { text: 'Suba a Escada da Memória até o último fragmento', flag: 'fragment3' },
    { text: 'Lembre o caminho até o Coração', flag: 'stone2' },
    { text: 'Enfrente o Vulto', flag: 'bossDefeated' },
    { text: 'Toque o Coração da Aurora', flag: 'exit' },
  ],
  startFlags: ['miraJoined'],
  miraSpot: { col: 1, row: 12 },

  // Texto mostrado na tela final (depois do último diálogo).
  ending: 'Lumora lembrou da Grande Queda, e chorou. Depois, lembrou de tudo o que veio antes, e de quem ficou. As ilhas flutuam de novo, a cidade decidiu como é, e no Bosque a Grande Árvore floresce todo Primeiro Sol. Orin cuida do Santuário com Mira. Ninguém mais lembra sozinho.',

  intro: [
    NARR('No alto de tudo, onde a aurora nasce, fica o Santuário. Faz uma geração que nenhuma luz sai dele.'),
    N('É bonito. Mesmo cinza, é bonito.'),
    M('Você devia ter visto antes. A aurora descia por estes pilares como água.'),
    M('Tudo o que você aprendeu vai ser preciso aqui, Nilo. Tudo.'),
  ],

  triggers: [
    { id: 'portal', col: 24, dialog: 'portal' },
    { id: 'galeria', col: 92, dialog: 'galeria' },
    { id: 'queda', col: 124, dialog: 'queda' },
    { id: 'limiar', col: 204, dialog: 'limiar', requires: 'stone2' },
  ],

  events: {
    firstFragment: 'firstFragment',
    stone0: 'stone0',
    stone1: 'stone1',
    stone2: 'stone2',
    exit: 'exit',
  },

  dialogs: {
    portal: [
      M('Ilhas frágeis, como no Arquipélago. Não pare em cima delas.'),
    ],

    firstFragment: [
      N('Uma festa. Gente de todas as regiões, aqui no Santuário.'),
      N('E um homem alto, sem máscara, rindo com uma raposa de chama azul no ombro.'),
      M('…Era o dia em que ele me escolheu como aprendiz.'),
    ],

    stone0: [
      M('O Pátio das Duas Luas. Aqui a gente treinava, toda manhã.'),
    ],

    galeria: [
      M('Relógios e sombras. Ele preparou tudo o que você já venceu, de uma vez só.'),
      N('Então eu já sei como vencer.'),
    ],

    queda: [
      NARR('O vento aqui não sopra. Ele uiva, como se lembrasse de algo terrível.'),
      M('Foi daqui que a Grande Queda começou. Uma estrela caiu sobre o Santuário. Muita gente…'),
      M('A Pedra-Eco lembra de antes. Do vento calmo. Use o fragmento.'),
    ],

    stone1: [
      N('O vento parou de chorar.'),
      M('Ele não precisava esquecer a Queda. Só precisava lembrar que existiu um antes.'),
    ],

    stone2: [
      M('O Limiar. Do outro lado, o Coração da Aurora. E Orin.'),
    ],

    limiar: [
      N('Mira. E se ele tiver razão? E se lembrar doer demais?'),
      M('Vai doer. Mas dor dividida é mais leve. Foi isso que ele esqueceu.'),
    ],

    bossIntro: [
      V('Você chegou, pequeno eco.'),
      N('Orin. A Mira me contou tudo.'),
      V('Então você sabe. Se o Coração voltar, Lumora vai lembrar da Queda. De cada pessoa que se foi.'),
      N('E de cada pessoa que ficou! Você apagou elas também!'),
      V('…Então me mostre que você aguenta o peso.'),
      M('Nilo! Quando ele atravessar a arena, pule por cima. Quando a máscara rachar, pise nela!'),
    ],

    bossDefeat: [
      V('…A máscara. Ela era para não verem que eu chorava.'),
      V('Eu escondi o Coração porque não aguentava lembrar. Achei que ninguém aguentaria.'),
      N('Ninguém aguenta sozinho. Por isso a gente lembra junto.'),
      M('Mestre. Você não precisa mais segurar isso sozinho.'),
      V('…Mira. Você cresceu.'),
      V('O Coração está logo ali. Vá, pequeno eco. Lembre por nós.'),
    ],

    exit: [
      NARR('Nilo toca o Coração da Aurora.'),
      NARR('A luz desce pelos pilares, como água. E Lumora lembra.'),
      NARR('Lembra da Grande Queda. E de tudo o que veio antes dela. E de todos que ainda estão aqui.'),
      M('Viu? O mundo não desmoronou.'),
      N('Ele só… ficou colorido de novo.'),
      V('Obrigado, Nilo. O eco que lembrou o mundo inteiro.'),
    ],
  },
};

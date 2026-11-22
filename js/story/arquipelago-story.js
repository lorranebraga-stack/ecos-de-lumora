// Roteiro do Arquipélago Suspenso.
// Revelação desta região: o Coração da Aurora não foi roubado — foi ESCONDIDO, por quem o protegia.

const N = (text) => ({ who: 'nilo', name: 'Nilo', text });
const M = (text) => ({ who: 'mira', name: 'Mira', text });
const V = (text) => ({ who: 'vulto', name: 'Vulto', text });
const T = (text) => ({ who: 'tempestade', name: 'Tempestade Sem Nome', text });
const NARR = (text) => ({ who: 'narrador', name: '', text });

export const ARQUIPELAGO_STORY = {
  region: { number: 3, name: 'Arquipélago Suspenso', subtitle: 'ilhas que flutuam enquanto alguém lembra delas' },
  rememberLine: 'As ilhas se lembram...',
  mission: 'Atravessar as ilhas no céu, descobrir o que houve com o Coração da Aurora e acalmar a Tempestade Sem Nome.',
  objectives: [
    { text: 'Atravesse as ilhas frágeis sem parar em cima delas', flag: 'ilhas' },
    { text: 'Pule na corrente de ar e pegue o fragmento lá no alto', flag: 'fragment1' },
    { text: 'Ecoe a memória e lembre as ilhas esquecidas', flag: 'stone0' },
    { text: 'Vença as rajadas e pegue o segundo fragmento', flag: 'fragment2' },
    { text: 'Acalme o paredão de vento com a Pedra-Eco', flag: 'stone1' },
    { text: 'Suba a escada de ar até o terceiro fragmento', flag: 'fragment3' },
    { text: 'Lembre o caminho até o Olho da Tempestade', flag: 'stone2' },
    { text: 'Acalme a Tempestade Sem Nome', flag: 'bossDefeated' },
    { text: 'Siga para a Cidade Sem Memória', flag: 'exit' },
  ],
  startFlags: ['miraJoined'],
  miraSpot: { col: 1, row: 12 },
  // O Vulto aparece sobre a ilha depois do paredão de vento (veja o gatilho "vulto").
  vultoSpot: { col: 146, row: 8 },
  vultoAfterStone: 1,

  intro: [
    NARR('Acima das Minas, o céu de Lumora se parte em ilhas. Elas só flutuam porque alguém, um dia, lembrou delas.'),
    N('Mira… o chão está no céu.'),
    M('E o céu está debaixo do chão. Bem-vindo ao Arquipélago. Não olhe muito para baixo.'),
    M('Aquelas ilhas pequenas estão quase esquecidas. Aguentam um passo, não dois.'),
  ],

  triggers: [
    { id: 'ilhas', col: 23, dialog: 'ilhas' },
    { id: 'corrente', col: 33, dialog: 'corrente' },
    { id: 'rajadas', col: 92, dialog: 'rajadas', requires: 'stone0' },
    { id: 'paredao', col: 124, dialog: 'paredao' },
    { id: 'vulto', col: 140, dialog: 'vulto', requires: 'stone1', after: 'vultoVanish' },
  ],

  events: {
    firstFragment: 'firstFragment',
    stone0: 'stone0',
    stone1: 'stone1',
    stone2: 'stone2',
    exit: 'exit',
  },

  dialogs: {
    ilhas: [
      M('Viu? Elas caem. Mas voltam, depois de um tempo. Ilhas são teimosas.'),
    ],

    corrente: [
      M('Está vendo os fiapos de luz subindo? É uma corrente de ar.'),
      M('Pule nela e deixe o vento te levar. Depois é só ir para o lado.'),
    ],

    firstFragment: [
      N('Eu ouço… um sino? E gente rindo no alto de uma torre.'),
      M('As ilhas eram ligadas por pontes de luz. As pessoas atravessavam o céu a pé.'),
      M('A pedra lá embaixo ainda lembra o caminho. Leve o fragmento até ela.'),
    ],

    stone0: [
      M('Ilhas que voltam a flutuar. Ainda bem que elas não guardam rancor.'),
    ],

    rajadas: [
      M('Rajadas. Quando os fiapos de vento aparecerem, segure firme: o vento vem logo depois.'),
      M('Espere ele passar. Pressa aqui é queda.'),
    ],

    paredao: [
      N('Esse vento… eu não consigo nem ficar de pé!'),
      M('Ninguém consegue. É uma lembrança zangada. Mas a Pedra-Eco ali sabe que antes era só uma brisa.'),
    ],

    stone1: [
      N('Parou! O vento parou.'),
      M('Ele só precisava lembrar que não era uma muralha.'),
    ],

    vulto: [
      V('Você de novo, pequeno eco. Costurando o céu.'),
      N('Por que você apaga tudo? As pessoas eram felizes aqui!'),
      V('Eram. E depois deixaram de ser. A Grande Queda começou aqui em cima, sabia?'),
      V('O Coração da Aurora não foi roubado, criança. Foi escondido. Por quem cuidava dele.'),
      M('…'),
    ],

    afterVulto: [
      N('Mira? Você ficou quieta.'),
      M('Eu estava pensando no vento.'),
      N('Mira.'),
      M('Depois, Nilo. Prometo. Ainda falta uma pedra.'),
    ],

    stone2: [
      M('O caminho para o Olho da Tempestade. Ela está lá desde a Queda, girando sem saber por quê.'),
      N('Ela também esqueceu?'),
      M('Esqueceu o próprio nome. É o pior jeito de esquecer.'),
    ],

    bossIntro: [
      T('VOCÊ… LEMBRA… DE ALGUÉM?'),
      N('Eu lembro de muita gente agora!'),
      T('EU NÃO. EU NÃO LEMBRO NEM DE MIM.'),
      M('Quando ela soprar, corra contra o vento! E quando ela cansar e descer, pise na estrela!'),
    ],

    bossDefeat: [
      T('…Brisa. Meu nome era Brisa da Tarde.'),
      T('Eu levava as pipas das crianças de uma ilha para a outra.'),
      T('No dia da Queda, eu soprei tão forte… para afastar o que caía. E nunca mais parei.'),
      N('Agora pode parar. Já passou.'),
    ],

    exit: [
      N('Mira. Quem escondeu o Coração?'),
      M('…Alguém que eu conheci muito bem.'),
      M('Na Cidade Sem Memória eu te conto. Lá ninguém vai nos ouvir: ninguém lá lembra de escutar.'),
    ],
  },
};

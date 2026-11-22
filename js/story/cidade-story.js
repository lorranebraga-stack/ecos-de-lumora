// Roteiro da Cidade Sem Memória.
// Revelação desta região: o Vulto foi o último Guardião da Aurora, e a Mira foi a aprendiz dele.
// Ela o ajudou a esconder o Coração — e depois se arrependeu.

const N = (text) => ({ who: 'nilo', name: 'Nilo', text });
const M = (text) => ({ who: 'mira', name: 'Mira', text });
const V = (text) => ({ who: 'vulto', name: 'Vulto', text });
const A = (text) => ({ who: 'arquivista', name: 'O Arquivista', text });
const NARR = (text) => ({ who: 'narrador', name: '', text });

export const CIDADE_STORY = {
  region: { number: 4, name: 'Cidade Sem Memória', subtitle: 'onde as casas não sabem se existem' },
  rememberLine: 'A Cidade se lembra...',
  mission: 'Atravessar a Cidade trocando o que é lembrado e o que é esquecido, ouvir a verdade da Mira e acalmar o Arquivista.',
  objectives: [
    { text: 'Toque o Relógio da Praça (E) e abra a rua', flag: 'clock' },
    { text: 'Suba a escadaria e pegue o fragmento no alto', flag: 'fragment1' },
    { text: 'Ecoe a memória e lembre a ponte do canal', flag: 'stone0' },
    { text: 'Fuja da sombra no beco e pegue o segundo fragmento', flag: 'fragment2' },
    { text: 'Descubra a estante falsa da biblioteca', flag: 'stone1' },
    { text: 'Suba os telhados até o terceiro fragmento', flag: 'fragment3' },
    { text: 'Lembre a ponte da Torre do Relógio', flag: 'stone2' },
    { text: 'Acalme o Arquivista', flag: 'bossDefeated' },
    { text: 'Siga para o Santuário da Aurora', flag: 'exit' },
  ],
  startFlags: ['miraJoined'],
  miraSpot: { col: 1, row: 13 },
  // O Vulto aparece na biblioteca, depois que a estante falsa some.
  vultoSpot: { col: 140, row: 14 },
  vultoAfterStone: 1,

  intro: [
    NARR('A Cidade Sem Memória não é vazia. Ela só não decide como é.'),
    NARR('Num dia, uma casa está ali. No outro, ela é só um contorno, esperando alguém lembrar.'),
    N('Mira, você prometeu me contar.'),
    M('Prometi. Primeiro atravesse a rua. Depois a gente conversa, longe dos relógios.'),
  ],

  triggers: [
    { id: 'relogio', col: 12, dialog: 'relogio' },
    { id: 'beco', col: 92, dialog: 'beco' },
    { id: 'verdade', col: 124, dialog: 'verdade' },
    { id: 'vulto', col: 134, dialog: 'vulto', requires: 'stone1', after: 'vultoVanish' },
    { id: 'telhados', col: 152, dialog: 'telhados' },
  ],

  events: {
    firstFragment: 'firstFragment',
    stone0: 'stone0',
    stone1: 'stone1',
    stone2: 'stone2',
    exit: 'exit',
  },

  dialogs: {
    relogio: [
      M('O Relógio da Praça. Ele decide de que jeito a cidade se lembra.'),
      M('Prédios de contorno pontilhado existem no OUTRO jeito de lembrar. Toque o relógio com E e veja.'),
      M('Só não fique dentro de um contorno quando trocar. Ninguém gosta de virar parede.'),
    ],

    firstFragment: [
      N('Um mercado… cheio de gente. Cheiro de pão. Uma menina vendendo lanternas.'),
      M('Era a feira do Primeiro Sol. Todo mundo vinha.'),
      M('A pedra da praça ainda lembra da ponte do canal. Vamos.'),
    ],

    stone0: [
      M('A ponte do canal. Os namorados escreviam nomes nela.'),
      N('Tem nomes aqui! Ainda dá para ler alguns.'),
    ],

    beco: [
      M('Cuidado, Nilo. Atrás de você.'),
      N('É… uma sombra minha?'),
      M('Um Eco Vazio. Ele repete o seu caminho, um pouco atrasado. Não pare!'),
      M('Se um prédio aparecer onde ele estiver, ele se desfaz. Use o relógio.'),
    ],

    verdade: [
      M('Nilo. A verdade.'),
      M('O Vulto se chamava Orin. Era o último Guardião da Aurora.'),
      M('E eu era a aprendiz dele.'),
      N('Você…'),
      M('Quando a Grande Queda aconteceu, a dor de lembrar estava fazendo Lumora desmoronar.'),
      M('Orin decidiu esconder o Coração. Sem ele, o mundo esqueceria a Queda… e sobreviveria.'),
      M('Eu o ajudei. Eu segurei a lanterna enquanto ele apagava tudo.'),
      N('Por que você está me ajudando agora?'),
      M('Porque esquecer não curou ninguém. Só deixou todo mundo cinza.'),
    ],

    stone1: [
      N('A estante era de mentira, como a parede do Bosque.'),
      M('O mesmo jeito de mentir. Ele sempre foi caprichoso.'),
    ],

    vulto: [
      V('Você contou a ele, Mira.'),
      M('Ele merecia saber o que está consertando.'),
      V('Ele está desfazendo o único remédio que funcionou.'),
      N('Esconder não é remédio. É só um curativo em cima de tudo!'),
      V('Então venha até o Santuário, pequeno eco. Veja com os próprios olhos o que eu escondi.'),
    ],

    afterVulto: [
      N('Mira… você está bem?'),
      M('Faz muito tempo que eu não ouvia a voz dele sem máscara.'),
      M('Vamos. Os telhados levam à torre.'),
    ],

    telhados: [
      M('Degraus lembrados até o pilar. Lá em cima, troque, e suba pelos esquecidos.'),
    ],

    stone2: [
      M('A ponte da torre. Do outro lado fica o Arquivo Central.'),
      M('O Arquivista guarda os registros da cidade. Todos. Inclusive os que ninguém quer ler.'),
    ],

    bossIntro: [
      A('Visitante não registrado. Lembrança não autorizada.'),
      N('Eu só quero passar!'),
      A('Passagens foram arquivadas. Tudo foi arquivado. Arquivado é seguro.'),
      M('Pule as páginas baixas e passe por baixo das altas. Quando ele tocar o sino, saia das prateleiras que piscam!'),
      M('Depois ele para para reler. É a sua chance: a cabeça!'),
    ],

    bossDefeat: [
      A('…Registro número um. "Hoje a cidade inteira cantou."'),
      A('Eu guardei isso. Eu guardei tudo. Mas parei de ler, porque doía.'),
      N('Lembrar dói. Mas esquecer deixou você sozinho aqui.'),
      A('…Leve isto. O caminho para o Santuário estava no último registro.'),
    ],

    exit: [
      M('O Santuário da Aurora. Onde tudo começou.'),
      N('E onde o Orin está.'),
      M('Ele vai lutar, Nilo. Não porque é mau. Porque tem medo.'),
    ],
  },
};

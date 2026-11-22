// Roteiro do Bosque dos Sussurros.
//
// Este arquivo só tem TEXTO e GATILHOS — nenhuma lógica.
// Para reescrever uma fala, mude o texto aqui; o resto do jogo não precisa mudar.
//
// Falantes: 'nilo' · 'mira' · 'vulto' · 'narrador' (sem retrato)
//
// Gatilhos de posição (triggers): disparam UMA vez, quando o Nilo está no chão
// e já passou da coluna indicada (col = coluna do mapa inteiro, 30 por trecho).
//   requires: flag que precisa estar ligada antes (opcional)
//   after:    ação executada quando o diálogo termina (opcional)
//
// Eventos (events): disparados pelo jogo (pegar o 1º fragmento, ativar uma pedra...).

const N = (text) => ({ who: 'nilo', name: 'Nilo', text });
const M = (text) => ({ who: 'mira', name: 'Mira', text });
const V = (text, name = '???') => ({ who: 'vulto', name, text });
const NARR = (text) => ({ who: 'narrador', name: '', text });
const R = (text) => ({ who: 'raiz', name: 'Raiz Esquecida', text });

export const BOSQUE_STORY = {
  region: { number: 1, name: 'Bosque dos Sussurros', subtitle: 'onde as árvores ainda tentam lembrar' },
  rememberLine: 'O Bosque se lembra...',

  // MISSÃO e OBJETIVOS (veja js/game/Missions.js). O HUD mostra o primeiro objetivo pendente.
  mission: 'Devolver as cores ao Bosque e acalmar a Raiz Esquecida no alto do penhasco.',
  objectives: [
    { text: 'Siga em frente e encontre quem mora no Bosque', flag: 'mira' },
    { text: 'Pegue o brilho dourado: um fragmento de memória', flag: 'fragment1' },
    { text: 'Ecoe o fragmento na Pedra-Eco (E) para lembrar a ponte', flag: 'stone0' },
    { text: 'Ache outro fragmento e descubra o segredo da muralha', flag: 'stone1' },
    { text: 'Leve o último fragmento à pedra perto do penhasco', flag: 'stone2' },
    { text: 'Suba as flores e acalme a Raiz Esquecida', flag: 'bossDefeated' },
    { text: 'Atravesse o Arco das Minas', flag: 'exit' },
  ],

  // Posição em que a Mira espera o Nilo antes de se apresentarem (coluna e linha do mapa).
  miraSpot: { col: 19, row: 14 },
  // Onde o Vulto aparece (em cima do bloco antes do grande abismo).
  vultoSpot: { col: 128, row: 14 },

  intro: [
    NARR('Em Lumora, as coisas só existem enquanto alguém se lembra delas.'),
    NARR('Há uma geração, o Coração da Aurora desapareceu. Desde então, o mundo se apaga devagar, como tinta na chuva.'),
    N('O Bosque está cinza de novo… Ontem aquela árvore ainda tinha folhas.'),
    N('Eu acho.'),
  ],

  triggers: [
    { id: 'mira', col: 14, dialog: 'meetMira', after: 'miraJoins' },
    { id: 'traca', col: 62, dialog: 'tracaWarning', requires: 'miraJoined' },
    { id: 'vulto', col: 118, dialog: 'vulto', requires: 'stone1', after: 'vultoVanish' },
  ],

  events: {
    firstFragment: 'firstFragment',
    stone0: 'stone0',
    stone1: 'stone1',
    stone2: 'stone2',
    exit: 'exit',
  },

  dialogs: {
    meetMira: [
      M('Ora, ora. Um menino com a gema acordada no peito. Fazia tempo que eu não via uma.'),
      N('Uma raposa… falando? E pegando fogo?'),
      M('Lanterna, não fogo. Eu sou Mira, guardiã das lembranças. Ou do que sobrou delas.'),
      M('Está vendo aquele Murcho? Já foi uma flor-de-orvalho. Esqueceu o que era, e agora só sabe morder.'),
      M('Pule por cima dele. Ou em cima. E se achar um brilho dourado no caminho, pegue: é memória solta, querendo voltar para casa.'),
    ],

    firstFragment: [
      N('Está quente… E eu ouço risadas. De quem são?'),
      M('De alguém que atravessou uma ponte por aqui, muito tempo atrás.'),
      M('Leve isso até a Pedra-Eco logo adiante. Fique perto dela e aperte E.'),
    ],

    stone0: [
      M('Viu? O Bosque só precisava de alguém que lembrasse por ele.'),
      N('Mira… como você sabia que tinha uma ponte aqui?'),
      M('Eu sei de muitas pontes.'),
      M('Ande. A noite não espera.'),
    ],

    tracaWarning: [
      M('Traças-de-Cinza. Comem lembranças velhas e não gostam de dividir.'),
      M('Quando uma tremer em cima de você, saia de baixo.'),
    ],

    stone1: [
      N('A parede… era de mentira?'),
      M('Uma lembrança falsa. Alguém se deu ao trabalho de inventar essa.'),
      N('Quem inventaria uma parede no meio do Bosque?'),
      M('Alguém que não queria visitas.'),
    ],

    vulto: [
      V('Mais uma ponte. Mais uma parede. Você costura o que eu desfiz com tanto cuidado.'),
      N('Quem é você?'),
      V('Alguém que lembra demais.'),
      V('Pare enquanto ainda é leve, pequeno eco.'),
    ],

    // Depois que o Vulto some (ação vultoVanish), a conversa continua:
    afterVulto: [
      N('Mira… ele me chamou de eco.'),
      M('…Ele chama muita coisa de muita coisa.'),
      M('Vamos. Ainda falta uma pedra.'),
    ],

    stone2: [
      M('Flores que lembram como crescer. Isso eu não via fazia tempo.'),
      N('E lá em cima? O chão está tremendo…'),
      M('A passagem para as Minas fica lá. E alguém grande dorme na frente dela.'),
    ],

    bossIntro: [
      R('…Quem pisa nas minhas raízes?'),
      N('Desculpa! Eu só preciso passar pelo arco.'),
      R('Passar. Todos passam. Ninguém fica. Ninguém lembra.'),
      M('Nilo! Quando ela cansar, o botão de flor no topo abre. É lá que a lembrança dela dorme.'),
    ],

    bossDefeat: [
      R('…Folhas. Eu tinha folhas. E crianças subiam em mim para ver o sol nascer.'),
      R('Eu era a Grande Árvore. Como pude esquecer?'),
      M('Ninguém esquece sozinho. Alguém ajudou você.'),
      R('Uma figura de névoa… com uma máscara rachada. Ela disse que doía menos assim.'),
    ],

    exit: [
      M('O Arco das Minas. Daqui em diante, o escuro é mais fundo.'),
      N('Você vem comigo?'),
      M('Alguém precisa iluminar o caminho.'),
      M('E alguém precisa ficar de olho em você.'),
    ],
  },
};

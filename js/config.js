// Configurações centrais do jogo.
// Todos os números de "sensação" (velocidade, pulo, gravidade) ficam aqui,
// para que você possa ajustar o jogo sem caçar valores espalhados pelo código.

// No celular, a tela do jogo fica mais larga para acompanhar o formato do aparelho
// (a maioria é 19,5:9 ou 20:9) e ocupar a tela inteira, sem faixas pretas dos lados.
// A altura (270) não muda: o jogador vê a mesma quantidade de fase para cima e para baixo.
// No computador, continua 480 × 270 (16:9).
function pickWidth() {
  try {
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (!touch) return 480;
    const s = window.screen;
    const ratio = Math.max(s.width, s.height) / Math.min(s.width, s.height);
    const w = Math.round((270 * ratio) / 2) * 2;
    return Math.min(640, Math.max(480, w)); // entre 16:9 e ~21:9
  } catch {
    return 480;
  }
}

export const CONFIG = {
  // Resolução interna (pixel art). O CSS amplia o canvas para caber na tela.
  WIDTH: pickWidth(),
  HEIGHT: 270,
  TILE: 16,

  // Passo fixo da simulação: 60 atualizações por segundo, independente do monitor.
  STEP: 1 / 60,

  PLAYER: {
    WIDTH: 10,             // caixa de colisão (pixels)
    HEIGHT: 18,
    WALK_SPEED: 90,        // pixels por segundo
    RUN_SPEED: 150,
    ACCEL_GROUND: 900,     // quão rápido chega à velocidade máxima no chão
    ACCEL_AIR: 600,        // controle no ar (um pouco menor que no chão)
    FRICTION_GROUND: 1100, // quão rápido para ao soltar a tecla
    GRAVITY: 900,
    FALL_MULTIPLIER: 1.35, // cair é mais rápido que subir: o pulo fica "firme"
    MAX_FALL: 340,
    JUMP_VELOCITY: 300,    // altura do pulo = v² / (2·g) ≈ 50 px ≈ 3 blocos
    JUMP_CUT: 0.45,        // soltar o pulo cedo corta a subida (pulo variável)
    COYOTE_TIME: 0.1,      // ainda pode pular 0,1 s depois de sair da borda
    JUMP_BUFFER: 0.12,     // apertar pulo um pouco antes de tocar o chão também vale

    MAX_HEALTH: 3,         // pontos de energia (os losangos do HUD)
    INVULN_TIME: 1.2,      // segundos piscando, sem levar dano, depois de um golpe
    HURT_TIME: 0.3,        // segundos sem controle durante o empurrão
    KNOCKBACK_X: 110,
    KNOCKBACK_Y: 170,
    STOMP_BOUNCE: 300,     // quique ao pisar num inimigo (segure Espaço para ir mais alto)
    ECHO_JUMP_VELOCITY: 260, // Pulo-Eco (pulo duplo): +≈37 px de altura no ar
    MAX_RISE: -230,        // velocidade máxima de subida numa corrente de ar
  },

  // Regiões novas (Arquipélago, Cidade, Santuário)
  WORLD: {
    CRUMBLE_DELAY: 0.55,   // segundos que a ilha frágil treme antes de cair
    CRUMBLE_RETURN: 2.6,   // segundos até ela voltar
    WIND_WARN: 0.7,        // aviso (fiapos de vento) antes de uma rajada começar
    CLOCK_REACH: 20,       // distância para tocar o Relógio da Praça
  },

  ENEMIES: {
    MURCHO: {
      SPEED: 28,           // patrulha devagar: é o inimigo de aprendizado
    },
    TRACA: {
      HOVER_RANGE: 36,     // quanto voa para cada lado do ponto de origem
      HOVER_SPEED: 1.1,
      DETECT_X: 30,        // o Nilo precisa passar quase embaixo dela
      DETECT_Y: 130,
      WINDUP: 0.4,         // tremida de aviso antes do mergulho (tempo de reagir)
      DIVE_SPEED: 170,
      DIVE_TIME: 0.8,
      RETURN_SPEED: 60,
      COOLDOWN: 1.6,
    },
    SOPRO: {
      IDLE: 1.5,           // tempo parado entre um sopro e outro
      INHALE: 0.65,        // incha antes de soprar (aviso)
      BLOW: 1.3,           // duração da rajada
      REACH: 96,           // alcance da rajada (px)
      FORCE: 210,          // força da rajada (px/s)
    },
    ECO: {
      DELAY: 1.6,          // segundos de atraso da sombra em relação ao Nilo
      SPAWN_DISTANCE: 48,  // a sombra nasce quando o Nilo passa deste ponto
      MAX_CHASE: 14,       // segundos perseguindo até a sombra se cansar
    },
    CRISTALIDEO: {
      SIGHT_X: 150,        // distância em que ele percebe o Nilo
      SIGHT_Y: 24,         // ...se estiverem mais ou menos na mesma altura
      WINDUP: 0.5,         // se encolhe antes de rolar (aviso)
      ROLL_SPEED: 125,
      CRACKED_TIME: 2.4,   // tempo rachado (vulnerável) depois de bater na parede
    },
  },

  BOSS: {
    RAIZ: {
      HEALTH: 3,
      ROOT_TELEGRAPH: 0.9,   // rachaduras brilhando no chão antes das raízes subirem
      ROOTS: [3, 5],         // raízes por ataque: [fase 1, fase 2]
      ROOT_UP: 0.7,          // quanto tempo as raízes ficam de pé
      SWEEP_WINDUP: [0.9, 0.6],
      SWEEP_SPEED: [150, 200],
      TIRED_TIME: [2.6, 2.0],
    },
    TEMPESTADE: {
      HEALTH: 3,
      BOLT_TELEGRAPH: 0.95,  // coluna de aviso antes do raio
      BOLTS: [3, 4],
      GUST_FORCE: 110,      // menor que a corrida (150): correndo contra o vento, o Nilo avança
      GUST_TIME: 2.2,
      LOW_TIME: [2.6, 2.0],  // tempo baixa e cansada (vulnerável)
    },
    ARQUIVISTA: {
      HEALTH: 3,
      PAGE_WARN: 0.7,
      PAGE_SPEED: [120, 160],
      PAGES: [3, 5],
      READ_TIME: [2.6, 2.0], // tempo relendo (vulnerável)
    },
    VULTO: {
      HEALTH: 4,
      MASK_TELEGRAPH: 0.9,
      SHARDS: [4, 6],
      SHARD_SPEED: 240,
      DASH_SPEED: [180, 230],
      CRACKED_TIME: [2.4, 1.9],
    },
    MATRIARCA: {
      HEALTH: 3,
      SHARD_TELEGRAPH: 0.9,  // tempo de aviso (sombra no chão) antes do cristal cair
      SHARD_SPEED: 260,
      SHARDS: [4, 6],        // cristais por chuva: [fase 1, fase 2]
      CHARGE_WINDUP: [0.8, 0.55],
      CHARGE_SPEED: [170, 230],
      DIZZY_TIME: [2.4, 1.8], // tempo vulnerável depois de bater na parede
    },
  },

  MEMORY: {
    STONE_REACH: 22,       // distância (px) da Pedra-Eco para poder ecoar
    FORGOTTEN: 0.7,        // quanto o mundo esquecido perde a cor (0 = nada, 1 = cinza total)
    ZONE_RADIUS: 260,      // raio da cor restaurada em volta de uma Pedra-Eco
    ZONE_GROW: 240,        // velocidade (px/s) da onda de cor
    TILE_DELAY: 0.004,     // segundos por pixel de distância: as peças surgem em onda
    SPRING_BOUNCE: 430,    // quique num Murcho calmo (vira trampolim)
  },

  AUDIO: {
    MASTER: 0.8,
    SFX: 0.7,
    MUSIC: 0.45,
    // Arquivos de som OPCIONAIS. Por padrão tudo é sintetizado.
    // Para usar um arquivo seu: coloque-o em assets/audio/ e registre aqui,
    // por exemplo  jump: 'assets/audio/jump.ogg'. Se o arquivo não carregar,
    // o jogo volta para o som sintetizado sozinho.
    FILES: {},
  },

  DIALOG: {
    CHARS_PER_SECOND: 45,  // velocidade do texto letra por letra
    PUNCTUATION_PAUSE: 0.18, // pausa extra depois de . ! ? …
  },

  SCORE: {
    CRYSTAL: 10,
    ENEMY: 50,
    FRAGMENT: 100,
    REMEMBER: 250,         // por Pedra-Eco ativada
  },

  CAMERA: {
    LOOK_AHEAD: 48,      // a câmera mostra mais do lado para onde o Nilo corre
    LOOK_SPEED: 2.5,     // quão rápido esse "olhar à frente" muda de lado
    FOLLOW_X: 7,         // suavidade horizontal (maior = mais grudada)
    FOLLOW_Y: 4,         // suavidade vertical
    TOP_MARGIN: 64,      // no ar, a câmera só sobe se o Nilo passar desta margem
    BOTTOM_MARGIN: 80,   // ...ou só desce se ele passar desta
  },

  // Mapa de teclas. Cada ação aceita várias teclas (event.code).
  KEYS: {
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    jump: ['Space', 'KeyW', 'ArrowUp'],
    run: ['ShiftLeft', 'ShiftRight'],
    interact: ['KeyE'],
    pause: ['Escape', 'KeyP'],
    confirm: ['Enter', 'Space', 'KeyE'], // avançar diálogos
  },
};

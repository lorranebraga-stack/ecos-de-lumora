# Ecos de Lumora — Documento de Planejamento (Etapa 1)

## 1. Visão geral

Plataforma 2D de exploração em pixel art, jogado no navegador. O jogador atravessa um mundo que está se apagando e, ao recuperar memórias, **reconstrói o próprio cenário**: pontes voltam, plantas viram plataformas, paredes se dissolvem. Cada fase tem dois estados (esquecido e lembrado) e a graça está em escolher quando e onde lembrar.

Pilares:
1. **Controle preciso e leve** — pulo previsível, coyote time, buffer de pulo, pulo variável.
2. **Memória como ferramenta** — lembrar muda a geometria da fase, não só a cor.
3. **Cor = vida** — áreas esquecidas são dessaturadas; o que o jogador restaura ganha cor. A arte comunica a mecânica.

## 2. História

Lumora é um arquipélago de ilhas que flutuam porque *são lembradas*. A Memória Viva, que nasce do Coração da Aurora, mantém tudo existindo: uma árvore que ninguém lembra começa a ficar cinza; uma ponte esquecida some.

Há uma geração, o Coração desapareceu. Desde então, Lumora se apaga aos poucos.

**Nilo** cresceu numa vila na borda do Bosque dos Sussurros. Não lembra dos pais, e acha isso normal: em Lumora, todos esquecem alguma coisa. Numa noite, ao tocar um cristal apagado, ele o vê acender e sente uma lembrança que não é dele. Nilo absorve memórias.

**Mira**, uma guardiã de lembranças antiga e irônica, aparece e se oferece para guiá-lo até o Santuário da Aurora. Ela sabe muito mais do que diz.

**O Vulto** é uma figura de névoa que surge sempre que Nilo restaura algo importante, e desfaz parte do que ele reconstruiu.

### Reviravoltas (reveladas ao longo das cinco regiões)

1. **Minas de Cristal** — As criaturas hostis não são monstros: são habitantes que esqueceram quem eram. Restaurar a memória delas as acalma. Derrotar nem sempre é a melhor saída.
2. **Arquipélago Suspenso** — O Coração não foi roubado. Foi *escondido* de propósito, por quem o protegia.
3. **Cidade Sem Memória** — O Vulto foi o último Guardião da Aurora, e Mira foi sua aprendiz. Ela o ajudou a esconder o Coração e depois se arrependeu.
4. **Santuário da Aurora** — O motivo: a Memória Viva guarda **tudo**, inclusive a lembrança da Grande Queda, uma tragédia que quase destruiu Lumora. O luto coletivo estava fazendo o mundo desmoronar. O Vulto escolheu fazer Lumora esquecer para que ela sobrevivesse. A motivação dele é proteger, não destruir.
5. **Final** — Nilo não é apenas alguém que absorve memórias: ele *é* uma memória. É o último eco do Coração, que tomou forma para ser lembrado. Restaurar o Coração significa que Nilo deixará de ser uma pessoa e voltará a ser o que era.

O dilema final não é "vencer o vilão": é decidir se um mundo deve lembrar da própria dor. O confronto com o Vulto é uma luta e, ao mesmo tempo, uma discussão.

## 3. Personagens

### Nilo — protagonista
- 12–14 anos, curioso, fala pouco e pergunta muito. Coragem nascida da teimosia, não da ausência de medo.
- **Visual:** capuz índigo com ponta caída para trás, túnica verde-azulada, **cachecol laranja longo** (sua assinatura: único tom quente forte nas fases), gema de memória no peito que pulsa.
- **Evolução visual:** a gema muda de cor e o cachecol ganha padrões luminosos a cada habilidade desbloqueada.
- **Animações:** parado (respiração + piscar), corrida, salto (esticado), queda, aterrissagem (achatado). Planejadas: dano, vitória, ecoar.

### Mira — guardiã das lembranças
- Uma raposa-lanterna espectral do tamanho de um gato, com uma chama azul na cauda. Flutua.
- Sarcástica, carinhosa à sua maneira, impaciente. Mente por omissão: responde à pergunta exata e nunca à pergunta certa.
- Mecanicamente: dá dicas contextuais e ilumina áreas escuras nas Minas.

### O Vulto — antagonista
- Silhueta alta de névoa com uma máscara de cristal rachada. A voz é calma.
- Quer manter Lumora esquecida para salvá-la do luto. Acredita que um mundo sem lembranças dolorosas é um mundo vivo.
- Aparece progressivamente: primeiro como sombra ao fundo, depois desfazendo restaurações, depois em diálogos, por fim como chefe.

### Criaturas e inimigos

| Nome | Tipo | Comportamento | Como lidar | Região |
|---|---|---|---|---|
| **Murcho** | Terrestre | Planta seca que patrulha uma plataforma e dá meia-volta na borda | Pular em cima; se receber memória, vira flor-plataforma | Bosque |
| **Traça-de-Cinza** | Voadora | Voa em onda senoidal; mergulha quando o Nilo passa embaixo | Pular em cima durante a subida dela | Bosque, Arquipélago |
| **Cristalídeo** | Terrestre blindado | Imune por cima; enrola-se e rola na direção do Nilo | Desviar até bater na parede e rachar | Minas |
| **Sentinela de Ruína** | Guardião | Estátua parada que dispara ondas de luz em padrão fixo | Só vulnerável depois de atacar (núcleo exposto) | Cidade |
| **Eco Vazio** | Especial | Sombra que repete os movimentos do Nilo com 2 s de atraso | Usar contra ela as próprias armadilhas | Cidade, Santuário |

**Chefes planejados:** Raiz Esquecida (Bosque), Matriarca de Quartzo (Minas), Tempestade Sem Nome (Arquipélago), O Arquivista (Cidade), O Vulto (Santuário).

## 4. Direção de arte

**Escolha: pixel art procedural "noite bioluminescente".**
- Resolução interna de 480×270 e blocos de 16 px, ampliada sem suavização. Fica nítida em qualquer tela e é rápida de desenhar.
- Bases escuras (índigo, violeta profundo) com destaques saturados (turquesa, rosa, âmbar). A luz vem de dentro do mundo — musgo, cogumelos, cristais — e não de um sol.
- **Por que essa escolha:** o tema é memória e esquecimento. Num mundo noturno, a cor *é* a luz, então restaurar uma memória pode literalmente acender a fase. A arte serve à mecânica.
- **Arte por código:** tudo é desenhado com retângulos no Canvas, sem imagens. Cada objeto tem seu próprio `draw()`, então trocar por sprites desenhados no futuro é substituir um método.
- Camadas: céu com aurora → estrelas → morros distantes → fase → personagens → esporos à frente. O parallax por câmera entra na Etapa 5.

### Paletas por região
| Região | Paleta | Clima |
|---|---|---|
| Bosque dos Sussurros | Índigo + turquesa + rosa-cogumelo | Calmo, acolhedor, misterioso |
| Minas de Cristal | Preto-azulado + ciano + lilás | Escuro, eco, perigo |
| Arquipélago Suspenso | Céu pêssego + branco-nuvem + ouro | Vertigem, vento, amplitude |
| Cidade Sem Memória | Sépia apagada + vermelho-desbotado | Melancolia, estranheza |
| Santuário da Aurora | Todas as cores da aurora | Revelação |

## 5. Mecânicas principais

**Movimento (implementado):** aceleração e atrito separados para chão e ar; corrida com Shift; pulo variável (soltar cedo = pulo baixo); gravidade mais forte na descida; coyote time de 0,1 s; buffer de pulo de 0,12 s; colisão por eixos separados contra blocos.

**Sistema de memórias (Etapa 7):**
- Fragmentos de memória são coletáveis espalhados pela fase.
- **Objetos latentes** aparecem como contornos translúcidos (pontes, plantas, escadas). Ficam intangíveis.
- Perto de uma **Pedra-Eco**, apertar **E** gasta fragmentos para *lembrar* aquela área: os objetos latentes viram sólidos, a área ganha cor, inimigos próximos se acalmam.
- Algumas paredes são "lembranças falsas": ecoar faz elas sumirem.
- Mais tarde: habilidade **Lembrança Breve**, que solidifica objetos latentes por poucos segundos em qualquer lugar (desafios de tempo).

**Demais sistemas por etapa:** coletáveis e dano com invulnerabilidade (6), HUD e diálogos (8), checkpoints, salvamento e vitória (9), sons via Web Audio e partículas (10).

## 6. Tecnologia

**HTML5 Canvas + JavaScript puro (módulos ES), sem frameworks e sem etapa de build.**

Motivos:
- Você aprende como um jogo funciona por dentro (laço, física, colisão, câmera), sem "mágica".
- O escopo (plataforma em blocos) não exige um motor de física completo. A colisão de blocos são ~80 linhas.
- Nenhuma instalação via npm: basta o VS Code e um servidor local.
- O Phaser 3 seria vantajoso se o jogo precisasse de física de corpos arbitrários, mapas do Tiled com muitas camadas ou muitos sprites animados por arquivo. Se chegarmos lá, reavaliamos. Até lá, não misturamos abordagens.

**Laço de passo fixo** (60 atualizações/s) garante que o pulo tenha a mesma altura em qualquer monitor.

## 7. Arquitetura

```
ECOS-DE-LUMORA/
├── index.html              Canvas + telas em HTML (menu, pausa, HUD)
├── README.md               Como rodar e o status
├── docs/PLANEJAMENTO.md    Este documento
├── css/style.css           Visual dos menus e do HUD
└── js/
    ├── main.js             Ponto de entrada: cria o jogo, registra cenas, liga botões
    ├── config.js           Todos os números ajustáveis e o mapa de teclas
    ├── core/
    │   ├── Game.js         Laço de passo fixo e troca de cenas
    │   └── Input.js        Teclado → ações; bloqueia a rolagem da página
    ├── game/
    │   ├── Physics.js      Colisão AABB × blocos; função approach()
    │   ├── Player.js       Nilo: controle, física, animação, desenho
    │   ├── Level.js        Lê o mapa em texto, colisão de blocos, desenho dos blocos
    │   └── Background.js   Céu, aurora, estrelas, morros, esporos
    ├── levels/
    │   └── training.js     Mapa da Clareira de Treino
    ├── scenes/
    │   ├── MenuScene.js    Menu principal
    │   └── TrainingScene.js Primeira cena jogável
    └── ui/
        └── Screens.js      Mostra e esconde menu, pausa e HUD
```

**Arquivos que entram nas próximas etapas** (só serão criados quando tiverem conteúdo real):
`core/Camera.js` (5), `game/Enemy.js` e `game/Collectibles.js` (6), `game/MemorySystem.js` (7), `ui/HUD.js` e `ui/DialogBox.js` (8), `core/Storage.js`, `game/Checkpoint.js` e `scenes/LevelScene.js` (9), `core/Audio.js` e `game/Particles.js` (10), `assets/` quando houver sprites ou áudio.

## 8. Escopo da primeira versão jogável (v1.0 = Bosque dos Sussurros completo)

Inclui:
- Menu, pausa, derrota, conclusão de fase.
- Uma fase de ~6 telas com câmera e parallax.
- Nilo com todas as animações básicas.
- 2 inimigos (Murcho e Traça-de-Cinza).
- Cristais (pontuação) e 3 fragmentos de memória.
- 2 Pedras-Eco que transformam o cenário e abrem o caminho.
- 2 checkpoints, 3 corações de energia, invulnerabilidade após dano.
- Salvamento em localStorage, com fallback seguro.
- Sons sintetizados (Web Audio) e opção de silenciar.

Fica fora: as regiões 2 a 5, chefes, Mira jogável como guia completa e remapeamento de teclas.

## 9. Regiões planejadas

| # | Região | Desafio central | Inimigos | Memória | Trilha sugerida |
|---|---|---|---|---|---|
| 1 | Bosque dos Sussurros | Aprender a se mover e ecoar | Murcho, Traça | Flores viram plataformas, ponte reaparece | Harpa + pads, lenta |
| 2 | Minas de Cristal | Escuridão, plataformas móveis | Cristalídeo | Cristais acendem e revelam caminhos | Percussão metálica, eco |
| 3 | Arquipélago Suspenso | Precisão, vento | Traça, ilhas que caem | Ilhas esquecidas voltam a flutuar | Flauta, cordas amplas |
| 4 | Cidade Sem Memória | Enigmas de estado (lembrado × esquecido) | Sentinela, Eco Vazio | Prédios trocam de forma | Piano desafinado, caixa de música |
| 5 | Santuário da Aurora | Tudo junto, chefe final | Todos | O cenário reage a escolhas | Tema principal orquestrado |

---

## 10. Estado na versão 1.4

A jornada planejada está completa: as cinco regiões são jogáveis, cada uma com um chefe, e o Santuário da Aurora fecha a história.
- **Chefes:** Raiz Esquecida (Bosque), Matriarca de Quartzo (Minas), Tempestade Sem Nome (Arquipélago), O Arquivista (Cidade) e o Vulto (Santuário).
- **Missões:** cada região tem missão e objetivos.
- **Estrelas da Aurora:** 15 no total, 3 por região.

Diferenças em relação a este planejamento:
- **Sentinela de Ruína:** não foi feita. A Cidade usa o Eco Vazio e a Traça.
- **Final:** é único, sem escolha. O Nilo convence Orin (o Vulto) a lembrar junto.
- **Escuridão iluminada pela Mira (Minas):** não foi feita.
- **Plataformas móveis:** não foram feitas.

A lista do que falta está no fim do `GUIA-DE-EXPANSAO.md`.

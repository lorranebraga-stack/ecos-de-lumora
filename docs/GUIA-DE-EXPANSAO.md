# Guia de expansão — Ecos de Lumora

Este guia mostra como fazer o jogo crescer **sem refazer o que já existe**. Cada receita aponta para um exemplo real e funcionando: a prévia das **Minas de Cristal** foi construída seguindo exatamente estes passos.

> Regra de ouro: quase tudo é **dado**, não código. Mapas são texto, roteiros são listas de falas, números de jogo ficam em `config.js`. Você só escreve código novo quando cria um *comportamento* novo (um inimigo, um chefe, uma habilidade).

---

## 1. Como as peças se conectam

```
main.js ──registra──► LEVELS { bosque, minas }  ◄── levels/regions.js (ordem, desbloqueio, "prévia")
   │
   └─► LevelScene (uma cena serve para TODAS as regiões)
          ├─ Level ............ mapa em texto, colisão, desenho dos blocos (tema visual)
          ├─ Background ....... fundo com parallax (tema visual)
          ├─ Player ........... Nilo: física, habilidades
          ├─ Enemy.js ......... inimigos (criados pelas letras do mapa)
          ├─ Boss.js .......... chefe (letra 'Q')
          ├─ MemorySystem ..... fragmentos, Pedras-Eco, blocos latentes
          ├─ Collectibles / Checkpoint / AbilityShrine
          ├─ StoryDirector .... quando cada diálogo acontece ◄── story/<região>-story.js
          ├─ HUD / DialogBox .. interface
          └─ game.sfx() ....... sons ◄── audio/sounds.js · audio/music.js
```

O caminho de um dado até a tela: **letra no mapa** → `Level.extractMarkers()` vira uma *entidade* → a cena cria o objeto certo (inimigo, altar, chefe...) → o objeto se atualiza e se desenha.

---

## 2. Receita: nova região

**Exemplo real:** `js/levels/minas.js` + `js/story/minas-story.js`.

1. **Mapa** — crie `js/levels/<id>.js`. Monte trechos de 30 colunas × 20 linhas e junte com `joinSections`. Use as letras da legenda de `Level.js`. Informe o tema visual:
   ```js
   export const MINAS = { name: 'Minas de Cristal', theme: 'minas', shrineAbility: 'pulo-eco', map: joinSections([...]) };
   ```
2. **Tema visual** (opcional) — veja a receita 7. Pode reaproveitar `'bosque'`.
3. **Roteiro** — crie `js/story/<id>-story.js` (receita 6). Sem roteiro também funciona: passe `null`.
4. **Música** — acrescente um tema com o **mesmo id** da região em `audio/music.js`. A cena toca sozinha.
5. **Registrar** — em `js/levels/regions.js`, marque `implemented: true` (e `preview: true` se estiver incompleta). Em `js/main.js`, acrescente em `LEVELS`:
   ```js
   minas: { data: MINAS, story: MINAS_STORY },
   ```
6. **Testar** — copie a ideia de `tests/specs/minas.test.js`: mapa bem formado, contagem de objetos e, principalmente, o **teste de alcance**, que prova que a região pode ser concluída e que cada mecânica é obrigatória.

**Desbloqueio:** automático. Uma região abre quando a anterior (na ordem de `REGIONS`) é concluída.

### Regras de desenho de fase (vindas da física em `config.js`)

| Nilo | Altura | Distância (correndo) |
|---|---|---|
| Pulo comum | ≈ 47 px (3 blocos, no limite) | ≈ 93 px (5–6 blocos) |
| Com Pulo-Eco | ≈ 85 px (5 blocos) | ≈ 10 blocos |

- Degrau confortável: até 2 blocos. Parede "impossível" sem habilidade: 4 blocos.
- Vão impossível sem habilidade: 9+ blocos. Com Pulo-Eco: 12+ (as Minas usam 18).
- Cada trecho ensina **uma** coisa, num lugar seguro, antes de cobrar com perigo.
- Coloque o fragmento **antes** da Pedra-Eco que ele abre.
- O Nilo tem 18 px de altura (mais que um bloco): evite pôr `P`, `K` ou `E` logo abaixo de um teto.

---

## 3. Receita: novo inimigo

**Exemplo real:** `Cristalideo` em `js/game/Enemy.js`.

1. Crie uma classe que estende `Enemy` com `update(dt, level, player)` e `draw(ctx)`.
2. Se o comportamento for especial, mude as regras herdadas:
   - `get harmless()` → encostar machuca? (o Cristalídeo rachado não machuca)
   - `onStomp()` → `'defeat'` (derrotado) ou `'bounce'` (blindado: o Nilo só quica)
   - `remember()` → o que muda quando uma Pedra-Eco acalma a criatura
3. Para sons, escreva `this.sound = 'nome'` na mudança de estado. A cena toca o som se o inimigo estiver perto.
4. Números de comportamento em `config.js` → `ENEMIES.<NOME>`.
5. Escolha uma **letra** em `Level.js` (`ENTITY_CHARS`) e registre a fábrica no fim de `Enemy.js`:
   ```js
   cristalideo: (e, T) => new Cristalideo(e.tx, e.ty, T),
   ```
6. Teste a máquina de estados, como em `minas.test.js` ("vê o Nilo → se encolhe → rola → racha").

**Use uma máquina de estados.** Cada estado é uma regra simples (`idle`, `windup`, `roll`...). É mais fácil de entender, de ajustar e de testar do que um monte de `if`. E todo ataque merece um estado de **aviso** (`windup`) antes: é o que torna o jogo justo.

---

## 4. Receita: nova habilidade

**Exemplo real:** Pulo-Eco (pulo duplo).

1. **Lógica** — em `Player.js`, verifique `this.abilities.has('nome')` onde a habilidade age. O Pulo-Eco recarrega `airJumps` no chão e usa no ar.
2. **Números** — em `config.js` (`PLAYER.ECHO_JUMP_VELOCITY`).
3. **Onde se aprende** — ponha um altar `A` no mapa e diga o que ele ensina com `shrineAbility` nos dados da região.
4. **Aviso e HUD** — texto em `ABILITY_INFO` (`LevelScene.js`) e um "chip" no HUD (`#hud-ability-jump` + `HUD.setOwnedAbilities`).
5. **Salvamento** — automático: o altar chama `progress.addAbility()` e salva na hora. Toda cena começa com as habilidades salvas, em qualquer região.
6. **Desenho de fase** — crie um obstáculo que **só** a habilidade vence, logo depois do altar.
7. **Teste** — a busca de alcance aceita habilidades: `explore(level, probes, { abilities: ['pulo-eco'] })`. Prove que sem ela não passa e com ela passa.

Ideias já previstas no planejamento: **Lembrança Breve** (solidifica blocos latentes por alguns segundos, em qualquer lugar) e **Luz da Mira** (ilumina áreas escuras).

---

## 5. Receita: chefe

**Exemplo real:** `Matriarca` em `js/game/Boss.js`.

**Estrutura de um chefe justo:**
1. **Padrões** que se alternam (`nextPattern`): a Matriarca alterna *chuva* e *investida*.
2. **Aviso antes de tudo**: faixa de luz antes de cada cristal cair; tremida antes da investida.
3. **Janela de vulnerabilidade clara**: só tonta (núcleo rosa visível) ela leva dano.
4. **Fases**: com pouca vida, os números ficam mais difíceis (veja os pares `[fase 1, fase 2]` em `CONFIG.BOSS.MATRIARCA`).
5. **Eventos** em vez de efeitos diretos: o chefe só anota `events.push({ type: 'crash' })`, e a cena decide o som, o tremor e as partículas.

**Arena:** a letra `Q` no mapa. A cena trata o trecho de 30 colunas onde o `Q` está como arena:
- a **coluna 1** do trecho vira um portão (`G`) quando a luta começa;
- a câmera trava no trecho (`camera.lock`);
- a saída `F` fica escondida até o chefe se acalmar (`level.exitHidden`).

Ponha uma **lanterna antes da arena**: perder a luta volta para ela.

**Diálogos:** se o roteiro tiver `bossIntro` e `bossDefeat`, eles tocam sozinhos. As ações `bossStart` e `bossEnd` começam e encerram a luta.

**Chefe novo (v1.4):** herde de `BossBase` (`js/game/bosses/BossBase.js`), que já cuida de vida, fases, dano, "cansado = vulnerável" e eventos. Você só escreve:
- `think(dt, player)`: a máquina de estados (padrões e quando fica vulnerável);
- `updateEffects`, `hazardHits(player)` e `drawEffects(ctx)`: os ataques espalhados pela arena;
- `draw(ctx)`: o corpo;
- opcional: `windAt(player)` (empurrão, como a ventania da Tempestade) e o estado vulnerável (`vulnerableState`).

Depois registre em `js/game/bosses/index.js` e escolha nos dados da região: `boss: 'raiz'`. Exemplos: `RaizEsquecida.js`, `Tempestade.js`, `Arquivista.js` (que troca a cidade com o evento `toggle`) e `VultoBoss.js` (que chama sombras com o evento `summon`). No 3D, os ataques aparecem num recorte do tamanho da arena, sem código extra.

---

## 6. Receita: diálogos e personagens

**Exemplo real:** `js/story/minas-story.js`.

- **Falas:** `N('...')`, `M('...')` ou um falante novo, como `Q('...')` da Matriarca.
- **Quando falar:**
  - `triggers`: quando o Nilo passa de uma coluna (no chão), opcionalmente com `requires` (uma flag) e `after` (uma ação);
  - `events`: ligados a acontecimentos (`firstFragment`, `stone0`, `ability`, `exit`...);
  - `startFlags`: o que já vale desde o início (`miraJoined`).
- **Personagem novo:**
  1. retrato em `ui/Portraits.js` (uma função que desenha 32×32);
  2. "voz" em `audio/sounds.js` → `BLIP_VOICE`;
  3. cor do nome em `css/style.css` → `.who-<nome>`;
  4. acrescente o falante em `SPEAKERS` no `tests/specs/story.test.js`.
- **Ações** (`after`): as que existem estão em `LevelScene.storyAction`. Ação nova? Acrescente lá **e** na lista `ACTIONS` do teste de roteiro.

Os testes de roteiro conferem sozinhos se todo diálogo citado existe e se as falas cabem na caixa.

---

## 7. Receita: cenários e temas visuais

**Exemplo real:** tema `'minas'`.

- **Blocos:** em `Level.js`, `TILE_THEMES` guarda uma paleta por tema. Um tema novo só lista as cores que mudam:
  ```js
  const MINAS_PALETTE = { ...BOSQUE_PALETTE, rock: '#141a2e', moss: '#2a4f8a', ... };
  ```
- **Fundo:** em `Background.js`, o construtor recebe o tema, e `draw()` escolhe o desenho. As Minas trocam o céu por estalactites em camadas (`drawCave`).
- **Trocar a arte por sprites desenhados no futuro:** cada objeto tem seu próprio `draw()`. Para usar uma imagem:
  1. Coloque o arquivo em `assets/sprites/` (de autoria sua ou com licença que permita uso, como CC0 ou CC-BY, e cite em Créditos).
  2. Carregue uma vez: `const img = new Image(); img.src = 'assets/sprites/nilo.png';`
  3. No `draw()`, troque os retângulos por `ctx.drawImage(img, sx, sy, w, h, x, y, w, h)`.
  4. Rode a página de testes: o teste "arquivos" confere se todo arquivo citado no `index.html` existe. Imagens carregadas por código devem ser conferidas jogando.

### 7b. No modo 3D

O 3D fica em `js/render3d/` e **só lê** o estado do jogo. Para um objeto novo aparecer em 3D:

- **Personagem ou objeto com `draw()`:** acrescente um tipo em `KINDS` (`Renderer3D.js`) com a caixa do desenho (em px), a âncora e a profundidade `z`. Depois chame `use(obj, 'tipo')` em `syncCards()`. O desenho 2D vira um recorte iluminado que projeta sombra.
- **Bloco novo do mapa:** desenhe-o em `TerrainBuilder.js` (dentro do laço, com `QuadBuffer.box()`). O terreno é refeito sozinho quando `level.setTile()` muda o mapa.
- **Tema novo de cenário:** uma função `buildX()` em `Scenery.js`, e as cores, a névoa e as luzes em `THEMES` (`Renderer3D.js`).
- **Luz própria** (algo que brilha): acrescente-o em `syncLights()`. As 6 luzes mais próximas da câmera são distribuídas sozinhas.
- **Mundo esquecido:** materiais novos do cenário devem passar por `applyMemoryShader()` para perder a cor junto com o resto.

---

## 8. Receita: sons e música

- **Efeito novo:** uma receita em `audio/sounds.js` (combinando `tone()` e `hiss()`), depois `this.game.sfx('nome')` onde ele acontece. Acrescente o nome em `USED_SOUNDS` no `tests/specs/audio.test.js`.
- **Música nova:** um tema em `audio/music.js` (andamento, acordes, escala). Use o id da região para tocar sozinho, ou chame `audio.playMusic('nome')` (a luta do chefe usa `'chefe'`).
- **Arquivo de som gravado:** `config.js` → `AUDIO.FILES`. Se falhar, o jogo volta para o som sintetizado.
- Ouça tudo em `tests/` → "Ouvir os sons".

---

## 9. Receita: novas peças de memória

Para criar, por exemplo, um **cristal latente que vira escada**:
1. Escolha uma letra para o estado esquecido e outra para o lembrado, e acrescente em `REMEMBERED` (`Level.js`).
2. Desenhe os dois estados em `Level.draw()`.
3. Diga se o estado lembrado é sólido (`isSolid`) ou plataforma (`isPlatform`).
4. Pronto: o `MemorySystem` já faz a onda, a posse pela pedra mais próxima e o salvamento.

---

## 9b. Receitas da v1.4: missões, segredos e mecânicas novas

- **Missão e objetivos:** no roteiro, `mission` e `objectives: [{ text, flag }]`. Flags que a cena marca sozinha: `fragment1..3`, `stone0..2`, `ability`, `bossDefeated`, `clock`, `exit`; e qualquer `id` de gatilho de posição. O teste "toda região tem missão e objetivos que o jogo sabe concluir" confere isso.
- **Segredo:** `H` (passagem que parece rocha) + `S` (Eco Escondido). Coloque o `S` num bolso que só se alcança pela passagem.
- **Vento:** campo `wind` da região. Correntes para cima (`fy` negativo) e rajadas que ligam/desligam (`on`/`off`, com aviso automático). `calmBy: n` faz a pedra `n` acalmar a rajada. A prova de alcance considera só as correntes sempre ligadas.
- **Cidade:** `a`/`b` + relógio `O`. Ponha um relógio no começo de cada enigma: assim o jogador nunca fica preso no estado errado.
- **Eco Vazio (`Y`):** acorda quando o Nilo passa e se desfaz se um bloco aparecer em cima dele (relógio, portão do chefe, ilha que volta). Dorme até o Nilo passar: uma Pedra-Eco ativada antes não o afeta.
- **Personagem 3D novo:** uma classe em `js/render3d/Models3D.js` (com `group`, `update` e `dispose`), registrada em `MODELS` pelo nome da classe do objeto do jogo.

---

## 10. Antes de dizer "está pronto"

- [ ] Página de testes (`/tests/`) → "Rodar todos" → 0 falhas.
- [ ] Teste de alcance novo provando que a região conclui e que cada mecânica é obrigatória.
- [ ] Itens relevantes do `docs/ROTEIRO-DE-TESTES.md` jogados de verdade.
- [ ] Console do navegador (F12) sem mensagens vermelhas.
- [ ] `README.md` atualizado (status e controles).

---

## 11. O que ainda falta no jogo (honestamente)

| Pendência | Situação | Como começar |
|---|---|---|
| Escolha no final | O final é único | Duas Pedras-Eco no Coração, cada uma com um diálogo e um texto de encerramento (`ending`) diferente |
| Plataformas móveis | Não existem | Entidade com `update` que move e carrega o Nilo (somar o deslocamento dela à posição dele quando estiver em cima) |
| Sentinela de Ruína (Cidade) | Planejada, não feita | Inimigo parado com um cone de luz; ver o Nilo no cone dispara um ataque |
| Remapear teclas | Estrutura pronta | As teclas estão em `CONFIG.KEYS`; uma tela pode trocar os códigos e salvar em `progress.data.settings` |
| Controle de videogame | Não iniciado | `navigator.getGamepads()` a cada passo, alimentando as mesmas ações do `Input` |
| Gráficos 3D, Etapa C | Não iniciado | Brilho (bloom) e ajustes finos de luz |
| Arte desenhada à mão | Opcional | Receita 7: trocar os `draw()` por imagens, um objeto por vez |
| Balanceamento | Feito por cálculo e simulação | Jogar de verdade e ajustar `CONFIG` (força do vento, tempo das ilhas frágeis, velocidade dos chefes) |

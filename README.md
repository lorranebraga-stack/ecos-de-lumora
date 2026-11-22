# Ecos de Lumora

Jogo de plataforma 2D original, em HTML5 Canvas e JavaScript puro.
Documentos:
- [docs/PLANEJAMENTO.md](docs/PLANEJAMENTO.md): história, personagens, direção de arte e escopo
- [docs/GUIA-DE-EXPANSAO.md](docs/GUIA-DE-EXPANSAO.md): como adicionar regiões, inimigos, habilidades, chefes, diálogos e cenários
- [docs/ROTEIRO-DE-TESTES.md](docs/ROTEIRO-DE-TESTES.md): testes manuais

**Conteúdo jogável (v1.4): a jornada completa, em 5 regiões, cada uma com um chefe.**

| # | Região | Novidade | Chefe |
|---|---|---|---|
| 1 | Bosque dos Sussurros | memória: ponte, parede falsa, flores | Raiz Esquecida |
| 2 | Minas de Cristal | Cristalídeo e o Pulo-Eco (pulo duplo) | Matriarca de Quartzo |
| 3 | Arquipélago Suspenso | ilhas frágeis, correntes de ar, rajadas, o Sopro | Tempestade Sem Nome |
| 4 | Cidade Sem Memória | Relógio da Praça (prédios lembrados ↔ esquecidos) e o Eco Vazio | O Arquivista |
| 5 | Santuário da Aurora | tudo junto, e o final da história | O Vulto |

**Missões:** cada região tem uma missão e uma lista de objetivos. O objetivo atual fica no canto superior direito; a lista completa aparece na pausa.

**Estrelas da Aurora:** cada região tem 3 (concluir · todos os cristais · achar o **Eco Escondido**, uma estrela dourada guardada atrás de uma passagem secreta). São 15 no total; o Mapa de Lumora mostra quantas você tem. Dica: passagens secretas parecem rocha, mas um brilhinho passa por elas de vez em quando.

## Como rodar

O jogo usa módulos JavaScript (`import`/`export`). Navegadores **bloqueiam módulos abertos direto do arquivo** (`file://`), então é preciso um servidor local. Escolha uma opção:

**Opção A — extensão Live Server (recomendada)**
1. No VS Code, abra a aba Extensões (`Ctrl+Shift+X`), procure **Live Server** (autor: Ritwick Dey) e instale.
2. Abra a pasta `ECOS-DE-LUMORA` em *Arquivo → Abrir Pasta*.
3. Clique com o botão direito em `index.html` → **Open with Live Server**.

**Opção B — terminal (se você tiver Python ou Node.js)**
```
python -m http.server 8000
```
ou
```
npx serve .
```
Depois abra `http://localhost:8000` (ou o endereço que o `serve` mostrar).

## Controles

| Tecla | Ação |
|---|---|
| A / D ou ← / → | Mover |
| Espaço (ou W / ↑) | Pular (segure para ir mais alto) |
| Shift | Correr |
| E | Ecoar memória numa Pedra-Eco · tocar o Relógio da Praça (Cidade) |
| Espaço no ar | Pulo-Eco (depois de aprender no altar das Minas) |
| Esc ou P | Pausar |

## Testes

Com o Live Server rodando, abra **`/tests/`** (ex.: `http://127.0.0.1:5500/tests/`).

- Os testes rápidos rodam sozinhos. "Rodar todos" inclui o teste lento, que percorre a fase inteira.
- Verde = passou. Vermelho mostra o motivo da falha.
- A seção **"Ouvir os sons"** toca cada efeito e as músicas.
- Os testes não mexem no seu salvamento.
- O roteiro de testes manuais está em [`docs/ROTEIRO-DE-TESTES.md`](docs/ROTEIRO-DE-TESTES.md).

## Modo de depuração

Abra o jogo com `?debug` no fim do endereço (ex.: `http://127.0.0.1:5500/index.html?debug`). No console do navegador (F12), a variável `lumora` dá acesso ao jogo:

```js
lumora.scene.player.health = 3      // recupera a energia
lumora.scene.player.x = 2700        // teleporta para perto da saída
lumora.scene.enemies                // lista os inimigos vivos
```

## Como criar um enigma de memória

No mapa (`js/levels/`), use:

| Letra | Esquecido | Lembrado |
|---|---|---|
| `L` | contorno de ponte, atravessa | ponte sólida |
| `v` | contorno de flor, atravessa | plataforma de flor (sobe por baixo) |
| `X` | parede com rachaduras violeta, sólida | some |
| `E` | Pedra-Eco | — |
| `f` | fragmento de memória | — |

Peças das regiões novas (veja os comentários no topo de cada arquivo em `js/levels/`):

| Letra | O que é |
|---|---|
| `%` | ilha frágil: treme, cai e volta depois |
| `H` | passagem secreta: parece rocha, mas dá para atravessar |
| `S` | Eco Escondido (a estrela secreta) |
| `a` / `b` | prédio lembrado / esquecido (sólido no estado 0 / 1 da cidade) |
| `O` | Relógio da Praça: troca o estado da cidade |
| `Y` | Eco Vazio: sombra que repete o caminho do Nilo |
| `s` | Sopro: nuvem que sopra rajadas |
| `Q` | chefe (qual chefe: campo `boss` dos dados da região) |

Correntes de ar ficam no campo `wind` dos dados da região (veja `js/levels/arquipelago.js`).

Cada bloco de memória e cada criatura pertencem à **Pedra-Eco mais próxima**. Ponha o fragmento no caminho, antes da pedra que ele abre.

## Jogar no celular

O jogo funciona em celular e tablet (Android e iPhone):

- **Botões na tela** (só aparecem em aparelhos com toque):
  - esquerda: ◀ ▶, e dá para deslizar o dedo de um para o outro;
  - direita: ⤒ pular, » correr (segure), E ecoar, ❚❚ pausa.
  Dá para usar dois dedos ao mesmo tempo, e um toque na caixa de diálogo avança a fala.
- **Tela inteira:** no celular, a tela do jogo fica mais larga, no formato do aparelho, sem faixas pretas. Com o celular em pé, a página gira sozinha: é só virar o aparelho.
- **Tela cheia automática:** no Android, tocar em Novo jogo / Continuar / Jogar já entra em tela cheia e deita o jogo. O iPhone não permite isso no navegador; instalado na tela inicial, abre sem as barras.
- **Selo do site** (ex.: "Powered by Netlify"): se aparecer no canto, os botões da direita sobem para não ficarem embaixo dele.
- **3D no celular:** começa numa qualidade mais leve, e a qualidade automática ajusta o resto. Se ficar lento, use Configurações → Gráficos: 2D clássico.

### Opção 1: pelo Wi-Fi de casa (para testar)

1. O computador e o celular precisam estar **no mesmo Wi-Fi**.
2. No computador, descubra o IP: no Windows, abra o Prompt de Comando e digite `ipconfig` ("Endereço IPv4", algo como `192.168.0.15`). No Mac/Linux, use `ifconfig` ou as configurações de rede.
3. Ligue o Live Server e, no celular, abra `http://SEU-IP:5500` (ex.: `http://192.168.0.15:5500`).
4. **Não abriu?**
   - No VS Code, abra as Configurações (`Ctrl+,`), procure `liveServer.settings.host` e coloque `0.0.0.0`. Reinicie o Live Server.
   - O Windows pode perguntar sobre o firewall: permita para "Redes privadas".

Nesse modo o jogo roda completo, mas **não dá para instalar como app**: o navegador só permite instalar a partir de `https://`.

### Opção 2: publicar na internet, de graça (para instalar e compartilhar)

Publicando com `https://`, o jogo pode ser **instalado como app** (ícone na tela inicial, abre em tela cheia) e **funciona sem internet** depois da primeira visita.

- **Netlify Drop:** em <https://app.netlify.com/drop>, arraste a pasta `ECOS-DE-LUMORA` e receba um link.
- **GitHub Pages:** suba a pasta num repositório do GitHub e, em Settings → Pages, escolha a branch `main`.

Depois, no celular:
- **Android/Chrome:** menu ⋮ → "Instalar app" (ou "Adicionar à tela inicial");
- **iPhone/Safari:** botão Compartilhar → "Adicionar à Tela de Início".

> Os arquivos do app ficam guardados no aparelho (veja `sw.js`). Quando você publicar uma versão nova, ela aparece na próxima vez que o jogo for aberto com internet.

## Gráficos 3D

Em Configurações: **Gráficos** (3D ou 2D clássico) e **Personagens** (modelos 3D ou recortes de papel, mais leves). Os chefes são sempre recortes.


O jogo é desenhado em **3D com Three.js** (WebGL), sempre jogando de lado:

- terreno com volume e grama;
- câmera em perspectiva, árvores e estalactites 3D ao fundo, névoa;
- luz da lua com sombras e luzes que se movem (gema do Nilo, Mira, cristais, lanternas, Pedras-Eco);
- cristais e fragmentos como joias 3D;
- personagens como "recortes de papel" iluminados, feitos da arte original.

- **Configurações → Gráficos** alterna entre 3D e 2D clássico (fica salvo).
- **Qualidade automática:** se o computador não aguentar, o jogo reduz a resolução e depois as sombras sozinho. O console (F12) avisa quando isso acontece.
- **Sem WebGL?** O jogo usa o 2D automaticamente.
- O Three.js r160 está incluído no projeto (`js/vendor/three/`, licença MIT). Não precisa de internet.
- O código do 3D fica em `js/render3d/`. Ele só **lê** o estado do jogo: física, fases e testes são os mesmos do 2D.

## Som

- Todos os sons e a música são **sintetizados** pelo navegador (`js/audio/`). Não há arquivos de áudio.
- O som só começa depois do primeiro clique ou tecla, porque é uma regra dos navegadores.
- **M** liga/desliga o som. Em Configurações também dá para desligar só a música.
- Para usar um arquivo de som seu, coloque-o em `assets/audio/` e registre em `js/config.js`:
  ```js
  AUDIO: { ..., FILES: { jump: 'assets/audio/jump.ogg' } }
  ```
  Nomes disponíveis: `jump`, `land`, `hurt`, `defeat`, `crystal`, `fragment`, `echo`, `tile`, `dissolve`, `denied`, `lantern`, `stomp`, `spring`, `windup`, `dive`, `vulto`, `blip`, `select`, `complete`. Se o arquivo não carregar, o jogo usa o som sintetizado e avisa no console.

## Salvamento

- O jogo salva sozinho ao acender uma **lanterna** e ao ativar uma **Pedra-Eco**.
- Os dados ficam no `localStorage` do navegador, na chave `ecos-de-lumora/save`. Para ver: F12 → Aplicativo (Application) → Armazenamento local.
- Se o navegador bloquear o salvamento (modo anônimo, por exemplo), o jogo continua funcionando e o progresso vale até fechar a aba.
- Para apagar: Menu → Configurações → Apagar progresso.
- "Reiniciar a fase" (na pausa) descarta o checkpoint salvo daquela fase.

## Como editar a história

Todas as falas do Bosque estão em `js/story/bosque-story.js`, separadas da lógica.

- Para mudar uma fala, edite o texto entre aspas.
- Falantes: `N(...)` Nilo, `M(...)` Mira, `V(...)` Vulto, `NARR(...)` narrador.
- `triggers`: diálogos que tocam quando o Nilo passa de uma coluna do mapa (30 colunas por trecho).
- `events`: diálogos ligados a acontecimentos (1º fragmento, cada pedra, saída).

## Ajustando a sensação do jogo

Todos os números de movimento estão em `js/config.js`, no bloco `PLAYER`. Altere um valor, salve e recarregue a página.

## Status

### Concluído
- [x] Etapa 1 — Planejamento
- [x] Etapa 2 — Ambiente
- [x] Etapa 3 — Estrutura, menu principal, controles, créditos, pausa
- [x] Etapa 4 — Nilo desenhado e animado; movimento, corrida, pulo variável, coyote time, buffer de pulo, colisões
- [x] Etapa 5 — Câmera suave com olhar à frente; parallax em 6 camadas; galhos atravessáveis; espinhos; Bosque dos Sussurros com 6 trechos e arco de saída; renascimento no último ponto seguro
- [x] Etapa 6 — Murcho (patrulha) e Traça-de-Cinza (mergulho); 20 cristais; energia (3) com invulnerabilidade piscante e empurrão; pisão com quique; pontuação; HUD com energia, cristais e pontos; clarão e tremor ao levar dano; partículas; tela de derrota com "Tentar novamente"

- [x] Etapa 7 — Sistema de memórias: 3 fragmentos, 3 Pedras-Eco; ponte latente, parede falsa e escada de flores; criaturas lembradas (Murcho vira trampolim, Traça para de atacar); mundo esquecido dessaturado com a cor voltando em ondas; gema do Nilo dourada quando há fragmento; fase redesenhada para que a memória seja obrigatória

- [x] Etapa 8 — Caixa de diálogo com retratos e texto letra por letra; roteiro do Bosque (prólogo, Mira, fragmento, 3 pedras, aviso da Traça, Vulto, saída); Mira acompanhante; aparição do Vulto; cartão de região; indicador de habilidade; controles na pausa; "Tentar novamente" pula o prólogo

- [x] Etapa 9 — Lanternas e Pedras-Eco como checkpoints; "foto" do progresso; salvamento em localStorage com reserva em memória; Continuar; Mapa de Lumora com desbloqueio; Configurações com apagar progresso (com confirmação); tela de conclusão com tempo, recordes e bônus; Nilo comemorando

- [x] Etapa 10 — ~20 efeitos sonoros sintetizados; música procedural (menu e Bosque); som liberado no primeiro clique/tecla; tecla M, botão no HUD e Configurações (som e música, salvos); arquivos de som opcionais com volta automática ao sintetizado; escurecimento entre cenas; poeira ao pular, aterrissar e correr; evolução visual do Nilo a cada memória

- [x] Etapa 11 — 66 testes automáticos no navegador (`tests/`), página para ouvir os sons, roteiro manual (`docs/ROTEIRO-DE-TESTES.md`); correção na física encontrada pelos testes

- [x] Etapa 12 — Guia de expansão (`docs/GUIA-DE-EXPANSAO.md`) com exemplos funcionando: prévia das **Minas de Cristal** (tema de caverna, música própria), inimigo **Cristalídeo**, habilidade **Pulo-Eco**, chefe **Matriarca de Quartzo**, 14 testes novos (80 no total)

- [x] Gráficos 3D, Etapa A: mundo 3D com Three.js (terreno, cenário, luzes e sombras, névoa, joias 3D, partículas, recortes iluminados, mundo esquecido em shader), opção 2D/3D, qualidade automática; 6 testes novos (86 no total)
- [x] Celular: botões de toque com vários dedos, layout em pé e deitado, áreas seguras, diálogo por toque, tela cheia, app instalável e jogável sem internet, 3D mais leve; 6 testes novos (92 no total)
- [x] v1.4 — **Jornada completa**: Arquipélago Suspenso, Cidade Sem Memória e Santuário da Aurora (com final); chefes novos: Raiz Esquecida (Bosque), Tempestade Sem Nome, O Arquivista e o Vulto; inimigos novos: Sopro e Eco Vazio; ilhas frágeis, correntes de ar, rajadas, Relógio da Praça; missões e objetivos no HUD e na pausa; passagens secretas, Eco Escondido e 15 Estrelas da Aurora; botão "Seguir para a próxima região"
- [x] Gráficos 3D, Etapa B: personagens 3D low-poly (Nilo, Mira, Murcho, Traça, Cristalídeo, Sopro, Eco Vazio, Vulto); opção "Personagens: recortes" nas Configurações para aparelhos mais fracos
- [x] 28 testes novos (120 no total), incluindo a prova de alcance das três regiões novas
- [ ] Gráficos 3D, Etapa C: acabamento (brilho/bloom, reflexos, ajustes finos)

### O que ainda falta
Veja a seção "O que ainda falta no jogo" no fim do [guia de expansão](docs/GUIA-DE-EXPANSAO.md).

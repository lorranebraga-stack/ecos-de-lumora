# Roteiro de testes — Ecos de Lumora

Há dois tipos de teste neste projeto:

| Tipo | Onde | O que cobre | Quem roda |
|---|---|---|---|
| **Automático** | `tests/index.html` (abra pelo Live Server em `/tests/`) | Física, colisões, mapa, inimigos, memória, salvamento, roteiro, áudio, arquivos e a fase inteira | O navegador, sozinho, em segundos |
| **Manual** (este documento) | Jogando | Sensação, visual, menus, som, navegadores | Você |

**Rotina sugerida:** depois de qualquer mudança, rode os testes automáticos (botão "Rodar todos"). Antes de mostrar o jogo para alguém, passe por este roteiro.

Para pular trechos durante os testes manuais, use o modo de depuração: abra `index.html?debug` e, no console (F12), por exemplo `lumora.scene.player.x = 1990` (segunda lanterna) ou `lumora.scene.memory.held = 1` (ganha um fragmento).

Marque cada item: ✅ ok · ❌ problema (anote o que viu) · ➖ não se aplica.

---

## 1. Início e menus

| # | Como testar | Resultado esperado | ✓ |
|---|---|---|---|
| M1 | Abra o jogo pela primeira vez (ou depois de "Apagar progresso") | Menu com o céu animado; **sem** botão "Continuar"; nenhum som antes de clicar | |
| M2 | Navegue com Tab e Enter pelos botões | O foco é visível (losango laranja) e Enter ativa o botão | |
| M3 | Controles → Voltar · Créditos → Voltar | Cada painel abre e volta ao menu principal | |
| M4 | Mapa de Lumora (sem progresso) | Bosque "Disponível" com botão Jogar; as outras regiões "Bloqueada" | |
| M5 | Configurações | Mostra se o salvamento está ativo; botões de Som e Música | |
| M6 | Redimensione a janela (pequena, grande, tela cheia com F11) | O jogo mantém 16:9, sem barras de rolagem e sem distorcer os pixels | |

## 2. Controles e sensação

| # | Como testar | Resultado esperado | ✓ |
|---|---|---|---|
| C1 | Ande com A/D e com as setas | Resposta imediata; aceleração e freada curtas, sem "patinar" | |
| C2 | Toque rápido em Espaço · segure Espaço | Toque = pulo baixo; segurar = pulo de ~3 blocos | |
| C3 | Shift + direção | Corre visivelmente mais rápido; poeira atrás dos pés | |
| C4 | Pule logo depois de sair de uma borda | Ainda pula (tempo de tolerância) | |
| C5 | Aperte Espaço um instante antes de pousar | Pula assim que toca o chão | |
| C6 | Espaço e setas durante o jogo | A página **não** rola | |
| C7 | Segure D, troque de aba ou janela (Alt+Tab) e volte | O Nilo **não** continua andando sozinho | |
| C8 | Esc durante o jogo · Esc de novo | Pausa (música abaixa) e volta | |
| C9 | **Sensação geral:** jogue 2 minutos livremente | Anote: pulo alto/baixo demais? Corrida rápida/lenta? (valores em `js/config.js`) | |

## 3. Câmera e cenário

| # | Como testar | Resultado esperado | ✓ |
|---|---|---|---|
| V1 | Corra para a direita e depois para a esquerda | A câmera mostra mais à frente do Nilo, com transição suave | |
| V2 | Pule várias vezes no lugar | A câmera não "sacode" a cada pulo | |
| V3 | Vá ao começo e ao fim da fase | Nenhuma faixa vazia nas bordas | |
| V4 | Observe o fundo enquanto anda | Camadas em velocidades diferentes (parallax); estrelas, aurora, árvores, névoa | |
| V5 | Início da fase | Mundo sem cor; Nilo, cristais e fragmentos coloridos | |

## 4. Inimigos, dano e derrota

| # | Como testar | Resultado esperado | ✓ |
|---|---|---|---|
| I1 | Encoste num Murcho de lado | Perde 1 losango; tela pisca vermelho e treme; Nilo é empurrado e pisca | |
| I2 | Encoste de novo enquanto pisca | Não perde energia (invulnerável ~1,2 s) | |
| I3 | Pule em cima de um Murcho | Ele some soltando uma florzinha; +50 pontos; Nilo quica | |
| I4 | Fique embaixo da Traça (trecho 3) | Ela treme (aviso) e só então mergulha; dá para desviar | |
| I5 | Caia num abismo · toque espinhos | Perde 1 losango e volta ao último chão firme | |
| I6 | Perca toda a energia | Faíscas, depois a tela "O eco se perdeu" com cristais e pontos | |
| I7 | "Voltar ao último checkpoint" | Volta à última lanterna/pedra com energia cheia, cristais e ponte mantidos | |

## 5. Sistema de memórias

| # | Como testar | Resultado esperado | ✓ |
|---|---|---|---|
| E1 | Na 1ª Pedra-Eco **sem** fragmento, aperte E | Som grave e a mensagem "A Pedra-Eco está fria…" | |
| E2 | Pegue o 1º fragmento | Diálogo; gema do Nilo dourada; indicador "E Ecoar" aceso no HUD | |
| E3 | Perto da pedra | Espiral da pedra pulsa dourado; indicador pulsa; dica "E · Ecoar a memória" | |
| E4 | Aperte E | Onda de cor a partir da pedra; ponte surge em sequência; Murchos próximos ficam verdes | |
| E5 | Pule num Murcho lembrado | Quique bem alto, sem dano | |
| E6 | Observe a muralha (trecho 4) antes de ecoar | Rachaduras violeta denunciam a parede falsa | |
| E7 | Ative a 2ª e a 3ª pedra | Parede se desfaz; flores crescem em escada até o arco | |
| E8 | Depois de cada pedra | Nilo muda: fios dourados no cachecol → capuz brilhante → aura | |
| E9 | Tente passar a ponte sem ecoar (correndo e pulando) | Impossível: o vão é largo demais | |

## 6. História e diálogos

| # | Como testar | Resultado esperado | ✓ |
|---|---|---|---|
| H1 | Novo jogo | Prólogo em itálico, sem retrato; depois o cartão "Região 1" | |
| H2 | Durante uma fala, aperte Espaço · aperte de novo | 1º toque completa o texto; 2º passa para a próxima fala | |
| H3 | Durante um diálogo, tente andar | O Nilo não se move; ao terminar, ele não pula sozinho | |
| H4 | Depois dos degraus | A Mira se apresenta e passa a seguir o Nilo | |
| H5 | Depois da 2ª pedra, siga em frente | O Vulto aparece sobre um bloco, fala e se desfaz em névoa | |
| H6 | Leia todas as falas | Sem erros de digitação; tom de cada personagem coerente | |

## 7. Checkpoints, salvamento e progressão

| # | Como testar | Resultado esperado | ✓ |
|---|---|---|---|
| S1 | Passe por uma lanterna | Ela acende; aviso "Lanterna acesa · progresso salvo" | |
| S2 | Recarregue a página (F5) | "Continuar" aparece com o tempo jogado e retoma na lanterna | |
| S3 | Novo jogo com uma partida salva | Pede confirmação antes de substituir | |
| S4 | Chegue ao arco no alto do penhasco | Diálogo final; Nilo comemora; tela de conclusão com cristais, memórias, tempo e pontos | |
| S5 | Conclua de novo, mais rápido | Selo "recorde!" só no que melhorou | |
| S6 | Mapa de Lumora após concluir | Bosque "Concluída" com recordes; Minas "Caminho aberto · em construção" | |
| S7 | Configurações → Apagar progresso → Cancelar · depois → Apagar tudo | Cancelar não apaga; Apagar tudo some com "Continuar" e recordes | |
| S8 | Abra o jogo numa **janela anônima** | Funciona; o aviso diz "salvo só nesta sessão" | |

## 8. Som

| # | Como testar | Resultado esperado | ✓ |
|---|---|---|---|
| A1 | Primeiro clique no menu | A música calma do menu começa | |
| A2 | Entre no Bosque | Troca para a música do Bosque, sem estalos | |
| A3 | Pule, pegue cristal, leve dano, ecoe | Cada ação tem um som próprio e reconhecível | |
| A4 | Diálogos | Cada personagem tem uma "voz" (bipes) diferente | |
| A5 | Tecla M · botão de alto-falante no HUD | Silencia/retoma; o ícone muda; continua silenciado após recarregar | |
| A6 | Configurações → Música: desligada | Efeitos continuam, música some | |
| A7 | **Avaliação:** volume da música × efeitos | Anote se algo está alto/baixo demais (`js/config.js` → `AUDIO`) | |
| A8 | Página de testes → "Ouvir os sons" | Ouça cada um; anote os que soarem estranhos | |

## 9. Navegadores e situações especiais

| # | Como testar | Resultado esperado | ✓ |
|---|---|---|---|
| N1 | Chrome · Edge · Firefox | Tudo funciona igual (o mundo cinza usa um recurso moderno de mistura de cores) | |
| N2 | Monitor de 144 Hz (se tiver) | Pulo com a mesma altura e mesma velocidade que em 60 Hz | |
| N3 | Sem internet | O jogo funciona; só a fonte muda para a reserva | |
| N4 | Abrir `index.html` com duplo clique (sem servidor) | Tela preta: esperado. Use o Live Server (veja o README) | |
| N5 | Deixe o jogo em outra aba por 1 minuto e volte | Nada "salta" nem quebra; a música volta ao normal | |

## 10. Celular

| # | Como testar | Resultado esperado | ✓ |
|---|---|---|---|
| T1 | Abra o jogo no celular (veja "Jogar no celular" no README) | Menu legível; os botões de toque **não** aparecem no menu | |
| T2 | Novo jogo; toque na caixa de diálogo | Cada toque completa ou avança a fala | |
| T3 | Segure ▶ e deslize o dedo até ◀ sem soltar | O Nilo vira e anda para o outro lado | |
| T4 | Segure ▶ e toque ⤒ com outro dedo | Anda e pula ao mesmo tempo | |
| T5 | Segure » enquanto anda | Corre (poeira atrás dos pés) | |
| T6 | Toque ❚❚ | A pausa abre e os botões de toque somem | |
| T7 | Com o celular em pé (ou rotação travada) | A tela gira sozinha: vire o aparelho e jogue deitado, em tela inteira, sem faixas pretas | |
| T8 | Novo jogo / Continuar (Android) | Entra sozinho em tela cheia e deita o jogo | |
| T8b | Site publicado com selo no canto (ex.: "Powered by Netlify") | Os botões da direita ficam acima do selo, sem ficar tampados | |
| T9 | Aperte o botão de início com um dedo na tela e volte ao jogo | O Nilo não continua andando sozinho | |
| T10 | Jogue 2 minutos em 3D | Fica fluido? Se não, a qualidade cai sozinha; anote o modelo do celular | |
| T11 | Versão publicada (https): instale e abra sem internet | Abre pelo ícone, em tela cheia, e funciona offline | |

## 11. Versão 1.4 — jornada completa

Para pular até uma região: menu → Mapa de Lumora (regiões abrem em ordem). Para testar mais rápido, use o modo de depuração (`?debug`) e, no console, `lumoraProgress.data.levels.bosque = { completed: true, bestScore: 0, bestTime: 0, bestCrystals: 0 }` (repita para as outras) e recarregue.

| # | Como testar | Resultado esperado | ✓ |
|---|---|---|---|
| J1 | Entre numa região | O cartão mostra nome, subtítulo e **Missão**; o canto superior direito mostra o **Objetivo** atual | |
| J2 | Cumpra um objetivo (ex.: pegue o 1º fragmento) | Som curto, aviso "Objetivo concluído" e o próximo objetivo aparece | |
| J3 | Pause (Esc) | A pausa lista a missão e os objetivos, com ✓ nos concluídos | |
| J4 | Bosque: no alto do penhasco | A Raiz Esquecida acorda; raízes avisam (chão brilhando) antes de subir; a varrida dá para pular; cansada, o botão de flor abre | |
| J5 | Bosque: base do penhasco, à direita das flores | A "rocha" com brilhinho é uma passagem: aviso "Uma passagem secreta!" e o **Eco Escondido** | |
| J6 | Arquipélago: ilhas frágeis | Tremem ao pisar, caem logo depois e voltam alguns segundos depois | |
| J7 | Arquipélago: coluna de fiapos subindo | Pular nela leva o Nilo até a ilha alta | |
| J8 | Arquipélago: rajadas | Fiapos fracos avisam ~0,7 s antes; a rajada empurra para trás; esperando, dá para passar | |
| J9 | Arquipélago: paredão de vento | Impossível passar, mesmo correndo; depois de ecoar a pedra, o vento para | |
| J10 | Arquipélago: Tempestade | Raios avisam com coluna de luz; na ventania, correndo contra o vento o Nilo avança; ela desce cansada e a estrela no topo pode ser pisada | |
| J11 | Cidade: Relógio da Praça (E) | Prédios sólidos viram contorno e os contornos viram prédios; dentro de um contorno, o relógio não troca (aviso) | |
| J12 | Cidade: beco | A sombra acorda e segue o Nilo; tocando o relógio quando ela está nos contornos, ela se desfaz | |
| J13 | Cidade: Arquivista | Páginas baixas (pule) e altas (passe por baixo); antes do sino, as prateleiras piscam; relendo, a cabeça pode ser pisada | |
| J14 | Santuário: Vulto | Lascas avisam antes de cair; na investida ele passa baixo (dá para pular); com 2 de vida, chama duas sombras que somem sozinhas | |
| J15 | Santuário: tocar o Coração | Diálogo final, música do final e tela "Fim da jornada" com o texto de encerramento e as estrelas | |
| J16 | Tela de conclusão | Mostra ★★☆ e quais estrelas faltam; botão "Seguir para…" leva direto à próxima região | |
| J17 | Mapa de Lumora | "Estrelas da Aurora: N/15" e as estrelas de cada região | |
| J18 | Configurações → Personagens | 3D: Nilo, Mira e inimigos em 3D; recortes: todos voltam a ser recortes, sem travar | |
| J19 | **Sensação geral** das regiões novas | Anote o que estiver difícil/fácil demais (valores em `js/config.js`: `WORLD`, `ENEMIES.SOPRO`, `BOSS.*`) | |

---

## Registro de problemas

Quando algo falhar, anote assim (facilita muito a correção):

```
Item:      I4
O que fiz: fiquei embaixo da Traça no trecho 3, parado no galho do meio
Esperado:  ela tremer antes de mergulhar
Aconteceu: ela mergulhou sem tremer
Navegador: Chrome 1xx · Windows
Console (F12): (cole aqui qualquer mensagem vermelha)
```
